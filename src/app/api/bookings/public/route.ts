import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { publicBookingSchema } from '@/lib/validation/schemas';
import { zonedTimeToUtc, formatDateISO } from '@/lib/availability/engine';
import { findValidPromo, computeDiscount, type PromoCodeRecord } from '@/lib/promo';
import { checkRateLimit, hashIdentifier, getClientIp } from '@/lib/rate-limit';
import { computeDepositAmount } from '@/lib/booking/deposit';
import { bookAtomic } from '@/lib/booking/atomic';
import { stripMissingColumns, trackMissingColumn } from '@/lib/supabase/columns';
import { fireAndForget, pushAppointmentToGoogle } from '@/lib/google/sync';

// Rate limiting persistant (Supabase) : max 5 réservations par IP par heure.
// L'ancien limiter en mémoire était inefficace sur Vercel (multi-instances
// serverless) — voir src/lib/rate-limit.ts et supabase/rate-limit-migration.sql
const BOOKING_RATE_LIMIT = 5;
const BOOKING_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 heure

// POST — réservation publique (sans authentification)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting persistant par IP (fenêtre glissante en base,
    // IP hachée — jamais stockée en clair)
    const ip = getClientIp(request);
    const supabaseRate = await createServiceRoleClient();
    const rl = await checkRateLimit(
      supabaseRate,
      `bk:${hashIdentifier(ip)}`,
      BOOKING_RATE_LIMIT,
      BOOKING_RATE_WINDOW_MS,
    );

    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de réservations en peu de temps. Veuillez réessayer dans une heure.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const supabase = await createServiceRoleClient();

    const body = await request.json();
    const parsed = publicBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { service_id, client_name, client_phone, client_email, starts_at, promo_code, employee_id } = parsed.data;

    // Vérifier que le service existe et est actif
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, duration_minutes, price, profile_id, is_active, deposit_enabled, deposit_type, deposit_value')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service non trouvé' }, { status: 404 });
    }

    if (!service.is_active) {
      return NextResponse.json({ error: 'Ce service n\'est pas disponible à la réservation' }, { status: 400 });
    }

    // Vérifier que le profil du professionnel est actif
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_active, timezone, plan, email')
      .eq('id', service.profile_id)
      .single();

    if (profileError || !profile || !profile.is_active) {
      return NextResponse.json({ error: 'Professionnel non disponible' }, { status: 404 });
    }


    // Vérifier la limite de rendez-vous par jour du plan
    // (bornes de journée dans le fuseau du professionnel)
    const tz = profile.timezone || 'Africa/Malabo';
    const todayStr = formatDateISO(new Date(), tz);
    const todayStart = zonedTimeToUtc(todayStr, 0, tz);
    const todayEnd = zonedTimeToUtc(todayStr, 24 * 60, tz);

    const { count: todayCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', service.profile_id)
      .neq('status', 'cancelled')
      .gte('starts_at', todayStart.toISOString())
      .lt('starts_at', todayEnd.toISOString());

    const profilePlan = (profile.plan as string) || 'starter';
    const PLAN_DEFAULTS: Record<string, number> = { starter: 50, pro: 100, business: -1 };
    let apptLimit = PLAN_DEFAULTS[profilePlan] ?? -1;

    try {
      const { data: planLimit } = await supabase
        .from('plan_limits')
        .select('limit_value')
        .eq('plan_id', profilePlan)
        .eq('limit_key', 'max_appointments_per_day')
        .maybeSingle();
      if (planLimit) apptLimit = planLimit.limit_value;
    } catch {
      // Use defaults on DB error
    }

    // Admin bypass (check via env)
    const ADMIN_EMAILS_LIST = (process.env.ADMIN_EMAILS ?? '')
      .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const isProfileAdmin = profile.email ? ADMIN_EMAILS_LIST.includes(profile.email.toLowerCase()) : false;

    if (!isProfileAdmin && apptLimit !== -1 && (todayCount ?? 0) >= apptLimit) {
      return NextResponse.json(
        { error: "Ce professionnel a atteint sa limite de réservations pour aujourd'hui." },
        { status: 429 },
      );
    }

    // ── Validation du code promo (si fourni) ──
    let validPromo: PromoCodeRecord | null = null;
    let discountAmount = 0;
    if (promo_code && promo_code.trim()) {
      validPromo = await findValidPromo(supabase, service.profile_id, promo_code);
      if (!validPromo) {
        return NextResponse.json({ error: 'Code promo invalide, expiré ou épuisé' }, { status: 400 });
      }
      discountAmount = computeDiscount(service.price ?? 0, validPromo);
    }

    // Calculer ends_at à partir de la durée du service
    const start = new Date(starts_at);
    const end = new Date(start.getTime() + service.duration_minutes * 60 * 1000);
    const ends_at = end.toISOString();

    // Vérifier les chevauchements de créneaux
    const { data: overlapping, error: overlapError } = await supabase
      .from('appointments')
      .select('id')
      .eq('profile_id', service.profile_id)
      .neq('status', 'cancelled')
      .lt('starts_at', ends_at)
      .gt('ends_at', starts_at);

    if (overlapError) {
      console.error('Erreur vérification chevauchement public:', overlapError);
      return NextResponse.json({ error: 'Erreur lors de la vérification des disponibilités' }, { status: 500 });
    }

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json({ error: 'Ce créneau est déjà pris. Veuillez en choisir un autre.' }, { status: 409 });
    }

    // Rechercher ou créer le client (déduplication par nom + téléphone)
    const { data: existingClient, error: clientFindError } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', service.profile_id)
      .eq('name', client_name)
      .eq('phone', client_phone)
      .maybeSingle();

    if (clientFindError) {
      console.error('Erreur recherche client public:', clientFindError);
      return NextResponse.json({ error: 'Erreur lors du traitement de la réservation' }, { status: 500 });
    }

    let client_id: string;

    if (existingClient) {
      client_id = existingClient.id;
    } else {
      const { data: newClient, error: clientCreateError } = await supabase
        .from('clients')
        .insert({
          profile_id: service.profile_id,
          name: client_name,
          phone: client_phone,
          email: client_email || '',
          notes: '',
        })
        .select('id')
        .single();

      if (clientCreateError || !newClient) {
        console.error('Erreur création client public:', clientCreateError);
        return NextResponse.json({ error: 'Erreur lors du traitement de la réservation' }, { status: 500 });
      }

      client_id = newClient.id;
    }

    // ── Appliquer le code promo après création réussie ──
    const applyPromoToAppointment = async (appointmentId: string) => {
      if (!validPromo) return;
      try {
        await supabase
          .from('appointments')
          .update({ promo_code: validPromo.code, discount_amount: discountAmount })
          .eq('id', appointmentId);
        // Incrémenter le compteur d'utilisations (best-effort)
        await supabase
          .from('promo_codes')
          .update({ used_count: validPromo.used_count + 1 })
          .eq('id', validPromo.id);
      } catch (err) {
        // Ne pas faire échouer la réservation pour un souci de compteur
        console.warn('[bookings/public] application code promo best-effort:', err);
      }
    };

    // ── Acompte (anti no-show) : montant TOUJOURS calculé serveur ──
    const depositAmount = computeDepositAmount(
      service as unknown as Parameters<typeof computeDepositAmount>[0],
      discountAmount,
    );
    const prepaymentStatus = depositAmount > 0 ? 'pending' : 'none';

    // ── Employé : validation du choix ou auto-assignation ──
    // Si le client a choisi un employé → vérifier qu'il existe, est actif
    // et appartient au commerce. Sinon → auto-assign (1er employé libre).
    const loadActiveEmployees = async () => {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, display_order')
        .eq('profile_id', service.profile_id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      return employees ?? [];
    };

    let chosenEmployeeId: string | null = null;
    let candidateEmployees: Array<{ id: string; name: string }> = [];

    if (employee_id) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id, name, is_active')
        .eq('id', employee_id)
        .eq('profile_id', service.profile_id)
        .single();
      if (!emp || !emp.is_active) {
        return NextResponse.json(
          { error: 'Le professionnel choisi n\u2019est plus disponible. Choisissez-en un autre ou réessayez sans préférence.' },
          { status: 400 },
        );
      }
      chosenEmployeeId = emp.id;
      candidateEmployees = [{ id: emp.id, name: emp.name }];
    } else {
      candidateEmployees = await loadActiveEmployees();
    }

    /** Tente la réservation atomique pour un employé donné (ou sans employé). */
    const tryBook = async (empId: string | null) =>
      bookAtomic(supabase, {
        p_profile_id: service.profile_id,
        p_service_id: service_id,
        p_client_id: client_id,
        p_starts_at: starts_at,
        p_ends_at: ends_at,
        p_status: 'pending',
        p_notes: '',
        p_employee_id: empId,
        p_deposit_amount: depositAmount,
        p_prepayment_status: prepaymentStatus,
      });

    /** Applique acompte/employé en best-effort si le RPC v1 (sans ces
     *  paramètres) a été utilisé — l'insertion SQL directe échouerait
     *  si les colonnes n'existent pas encore, d'où le stripMissingColumns. */
    const patchExtras = async (appointmentId: string) => {
      if (!depositAmount && !chosenEmployeeId) return;
      try {
        const payload = stripMissingColumns('appointments', {
          ...(chosenEmployeeId ? { employee_id: chosenEmployeeId } : {}),
          ...(depositAmount > 0
            ? { deposit_amount: depositAmount, prepayment_status: prepaymentStatus }
            : {}),
          updated_at: new Date().toISOString(),
        });
        if (Object.keys(payload).length > 1) {
          await supabase.from('appointments').update(payload).eq('id', appointmentId);
        }
      } catch (err) {
        console.warn('[bookings/public] patch acompte/employé best-effort:', err);
      }
    };

    // ── Réservation atomique ──
    // 1) Employé choisi → 1 seul essai.
    // 2) Pas de préférence → auto-assign : on essaie chaque employé actif
    //    dans l'ordre d'affichage jusqu'au premier créneau libre.
    // 3) Aucun employé (ou tous occupés) → réservation au niveau commerce.
    let booked: Awaited<ReturnType<typeof tryBook>> | null = null;
    if (candidateEmployees.length > 0) {
      for (const emp of candidateEmployees) {
        const res = await tryBook(emp.id);
        if (!res.conflict) {
          booked = res;
          break;
        }
        // Erreur non « créneau pris » (ex : RPC absent) → tenter sans employé
        if (res.error && !res.error.includes('déjà pris')) {
          booked = null;
          break;
        }
      }
    }
    if (!booked) {
      booked = await tryBook(chosenEmployeeId);
    }

    if (!booked.conflict && booked.appointment) {
      const rpcAppointment = booked.appointment as { id?: string } | null;
      if (validPromo && rpcAppointment?.id) {
        await applyPromoToAppointment(rpcAppointment.id);
      }
      // Si le RPC v1 a été utilisé (migration en attente), appliquer
      // employé + acompte en best-effort via un UPDATE.
      if (!booked.v2 && rpcAppointment?.id) {
        await patchExtras(rpcAppointment.id);
      }
      // Sync Google Calendar (fire-and-forget — jamais bloquant)
      if (rpcAppointment?.id) {
        fireAndForget(pushAppointmentToGoogle(rpcAppointment.id));
      }
      return NextResponse.json({ data: booked.appointment }, { status: 201 });
    }

    // Conflit réel (créneau pris partout) → 409 au client
    if (booked.conflict && booked.error && booked.error.includes('déjà pris') && candidateEmployees.length > 0 && !employee_id) {
      return NextResponse.json(
        { error: 'Tous nos professionnels sont déjà réservés sur ce créneau. Veuillez en choisir un autre.' },
        { status: 409 },
      );
    }
    if (booked.conflict && booked.error) {
      return NextResponse.json({ error: booked.error }, { status: 409 });
    }

    // ── Fallback : RPC totalement indisponible (jamais déployé) ──
    console.warn('[bookings/public] RPC book_appointment_atomic indisponible, insertion directe :', booked.error);

    const fullInsertPayload = stripMissingColumns('appointments', {
      profile_id: service.profile_id,
      service_id,
      client_id,
      starts_at,
      ends_at,
      status: 'pending' as const,
      notes: '',
      ...(chosenEmployeeId ? { employee_id: chosenEmployeeId } : {}),
      ...(depositAmount > 0
        ? { deposit_amount: depositAmount, prepayment_status: prepaymentStatus }
        : {}),
    });

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert(fullInsertPayload)
      .select(`
        *,
        service:services(*),
        client:clients(*)
      `)
      .single();

    if (aptError && trackMissingColumn('appointments', aptError)) {
      // Colonnes récentes absentes (migration en attente) → payload minimal
      const { data: retried, error: retryError } = await supabase
        .from('appointments')
        .insert({ profile_id: service.profile_id, service_id, client_id, starts_at, ends_at, status: 'pending', notes: '' })
        .select(`
          *,
          service:services(*),
          client:clients(*)
        `)
        .single();
      if (!retryError) {
        if (retried?.id) {
          fireAndForget(pushAppointmentToGoogle(retried.id));
        }
        return NextResponse.json({ data: retried }, { status: 201 });
      }
    }

    if (aptError) {
      console.error('Erreur création rendez-vous public:', aptError);
      return NextResponse.json({ error: 'Erreur lors de la création du rendez-vous' }, { status: 500 });
    }

    if (appointment && validPromo) {
      await applyPromoToAppointment(appointment.id);
    }

    // Sync Google Calendar (fire-and-forget — jamais bloquant)
    if (appointment?.id) {
      fireAndForget(pushAppointmentToGoogle(appointment.id));
    }

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err) {
    console.error('Erreur inattendue bookings public POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
