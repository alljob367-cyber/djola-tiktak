import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appointmentCreateSchema } from '@/lib/validation/schemas';
import type { AppointmentStatus } from '@/types/database';
import { requireSubscription, PlanGateError } from '@/lib/plan-gate';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET — lister les rendez-vous avec jointures service + client
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as AppointmentStatus | null;
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        client:clients(*)
      `)
      .eq('profile_id', user.id)
      .order('starts_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (dateFrom) {
      query = query.gte('starts_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('starts_at', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur appointments GET:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des rendez-vous' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue appointments GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// POST — créer un rendez-vous (avec vérification de limite du plan)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer le profil complet
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    // ── Vérification de l'abonnement ──
    try {
      await requireSubscription(profile, user.email);
    } catch (e) {
      if (e instanceof PlanGateError) {
        return NextResponse.json({ error: e.message, code: e.code, upgradeUrl: '/dashboard/billing' }, { status: e.statusCode });
      }
      throw e;
    }

    // ── Vérification de la limite de rendez-vous par jour ──
    // On compte les RDV du jour (non annulés)
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const serviceRole = await createServiceRoleClient();
    const { count: todayCount } = await serviceRole
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .neq('status', 'cancelled')
      .gte('starts_at', dayStart)
      .lt('starts_at', dayEnd);

    // Check plan limit for appointments per day
    const plan = (profile.plan as 'starter' | 'pro' | 'business') || 'starter';
    let apptLimit: number | null = null;
    try {
      const { data: planLimit } = await serviceRole
        .from('plan_limits')
        .select('limit_value')
        .eq('plan_id', plan)
        .eq('limit_key', 'max_appointments_per_day')
        .maybeSingle();
      if (planLimit) apptLimit = planLimit.limit_value;
    } catch (err) {
      console.warn('[appointments] plan_limits query failed, using defaults:', err);
    }

    // Fallback defaults only when DB returned nothing
    if (apptLimit === null) {
      const defaults: Record<string, number> = { starter: 50, pro: 100, business: -1 };
      apptLimit = defaults[plan] ?? -1;
    }

    // Admin bypass
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const isUserAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '');

    if (!isUserAdmin && apptLimit !== -1 && (todayCount ?? 0) >= apptLimit) {
      return NextResponse.json({
        error: `Votre plan « ${plan} » est limité à ${apptLimit} rendez-vous par jour. Passez à un plan supérieur.`,
        code: 'PLAN_LIMIT_REACHED',
        upgradeUrl: '/dashboard/billing',
        limit: apptLimit,
        current: todayCount ?? 0,
      }, { status: 403 });
    }

    const body = await request.json();
    const parsed = appointmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { service_id, client_name, client_phone, client_email, starts_at, notes } = parsed.data;

    // Récupérer le service pour obtenir la durée
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, duration_minutes, profile_id')
      .eq('id', service_id)
      .eq('profile_id', user.id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service non trouvé' }, { status: 404 });
    }

    // Calculer ends_at
    const start = new Date(starts_at);
    const end = new Date(start.getTime() + service.duration_minutes * 60 * 1000);
    const ends_at = end.toISOString();

    // Vérifier les chevauchements de créneaux
    const { data: overlapping, error: overlapError } = await supabase
      .from('appointments')
      .select('id')
      .eq('profile_id', user.id)
      .neq('status', 'cancelled')
      .lt('starts_at', ends_at)
      .gt('ends_at', starts_at);

    if (overlapError) {
      console.error('Erreur vérification chevauchement:', overlapError);
      return NextResponse.json({ error: 'Erreur lors de la vérification des disponibilités' }, { status: 500 });
    }

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json({ error: 'Ce créneau est déjà pris. Veuillez en choisir un autre.' }, { status: 409 });
    }

    // Rechercher ou créer le client (déduplication par nom + téléphone)
    const { data: existingClient, error: clientFindError } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', user.id)
      .eq('name', client_name)
      .eq('phone', client_phone)
      .maybeSingle();

    if (clientFindError) {
      console.error('Erreur recherche client:', clientFindError);
      return NextResponse.json({ error: 'Erreur lors de la recherche du client' }, { status: 500 });
    }

    let client_id: string;

    if (existingClient) {
      client_id = existingClient.id;
    } else {
      // ── Check max_clients plan limit before auto-creating ──
      if (!isUserAdmin) {
        let clientLimit: number | null = null;
        try {
          const { data: clientPlanLimit } = await serviceRole
            .from('plan_limits')
            .select('limit_value')
            .eq('plan_id', plan)
            .eq('limit_key', 'max_clients')
            .maybeSingle();
          if (clientPlanLimit) clientLimit = clientPlanLimit.limit_value;
        } catch (err) {
          console.warn('[appointments] max_clients limit query failed:', err);
        }
        if (clientLimit === null) {
          const clientDefaults: Record<string, number> = { starter: 200, pro: -1, business: -1 };
          clientLimit = clientDefaults[plan] ?? -1;
        }
        if (clientLimit !== -1) {
          const { count: clientCount } = await serviceRole
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('profile_id', user.id);
          if ((clientCount ?? 0) >= clientLimit) {
            return NextResponse.json({
              error: `Votre plan est limité à ${clientLimit} clients. Passez à un plan supérieur.`,
              code: 'CLIENT_LIMIT_REACHED',
              upgradeUrl: '/dashboard/billing',
              limit: clientLimit,
              current: clientCount ?? 0,
            }, { status: 403 });
          }
        }
      }

      const { data: newClient, error: clientCreateError } = await supabase
        .from('clients')
        .insert({
          profile_id: user.id,
          name: client_name,
          phone: client_phone,
          email: client_email || '',
          notes: '',
        })
        .select('id')
        .single();

      if (clientCreateError || !newClient) {
        console.error('Erreur création client:', clientCreateError);
        return NextResponse.json({ error: 'Erreur lors de la création du client' }, { status: 500 });
      }

      client_id = newClient.id;
    }

    // Créer le rendez-vous
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        profile_id: user.id,
        service_id,
        client_id,
        starts_at,
        ends_at,
        status: 'pending',
        notes: notes || '',
      })
      .select(`
        *,
        service:services(*),
        client:clients(*)
      `)
      .single();

    // ── Post-insert overlap guard (defense against TOCTOU race) ──
    if (appointment) {
      const { data: postCheckOverlap } = await serviceRole
        .from('appointments')
        .select('id')
        .eq('profile_id', user.id)
        .neq('status', 'cancelled')
        .neq('id', appointment.id)
        .lt('starts_at', ends_at)
        .gt('ends_at', start);

      if (postCheckOverlap && postCheckOverlap.length > 0) {
        await serviceRole.from('appointments').delete().eq('id', appointment.id);
        return NextResponse.json({ error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.' }, { status: 409 });
      }
    }

    if (aptError) {
      console.error('Erreur création rendez-vous:', aptError);
      return NextResponse.json({ error: 'Erreur lors de la création du rendez-vous' }, { status: 500 });
    }

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err) {
    console.error('Erreur inattendue appointments POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
