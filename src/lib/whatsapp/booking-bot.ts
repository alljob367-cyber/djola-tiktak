// ============================================================
// Djola TikTak — Bot de réservation WhatsApp
// ============================================================
// Le client réserve SANS quitter WhatsApp :
//   1. "RDV <slug>" (lien wa.me prérempli depuis la page du commerce)
//   2. Choix du service (liste interactive)
//   3. Choix du créneau (8 prochaines disponibilités sur 7 jours)
//   4. Confirmation (boutons Oui / Non) avec nom du profil WhatsApp
//   5. RDV créé (statut pending, même RPC atomique que le web)
//
// État de conversation persisté dans whatsapp_booking_sessions
// (une ligne par numéro, expiration 30 min).
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateAvailableSlots,
  formatDateISO,
  formatCurrency,
  DAY_NAMES_FR,
  MONTH_NAMES_FR,
} from '@/lib/availability/engine';
import { sendWhatsAppText, sendWhatsAppList, sendWhatsAppButtons } from './send';
import { checkRateLimit } from '@/lib/rate-limit';
import { computeDepositAmount } from '@/lib/booking/deposit';
import { bookAtomic } from '@/lib/booking/atomic';

// ── Constantes ───────────────────────────────────────────────

const SESSION_TTL_MS = 30 * 60 * 1000;   // session expirée après 30 min
const SLOT_HORIZON_DAYS = 7;             // horizon de recherche de créneaux
const MAX_SLOT_OPTIONS = 8;              // options proposées d'un coup (limite liste = 10)

interface SessionRow {
  phone: string;
  state: string;
  profile_id: string | null;
  service_id: string | null;
  client_name: string | null;
  context: {
    slots?: { starts_at: string }[];
    service_name?: string;
    business_name?: string;
    client_name?: string;
    starts_at?: string;
    app_url?: string;
  } | null;
  updated_at: string;
}

// ── Utilitaires ──────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

/** Label FR "Mercredi 10 septembre" pour une date ISO locale. */
function labelDate(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  return `${DAY_NAMES_FR[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES_FR[d.getUTCMonth()]}`;
}

function labelTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// ── Session CRUD ─────────────────────────────────────────────

async function loadSession(supabase: SupabaseClient, phone: string): Promise<SessionRow | null> {
  const { data } = await supabase
    .from('whatsapp_booking_sessions')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (!data) return null;

  // Expiration : trop ancienne → on repart de zéro
  if (Date.now() - new Date(data.updated_at).getTime() > SESSION_TTL_MS) {
    await supabase.from('whatsapp_booking_sessions').delete().eq('phone', phone);
    return null;
  }
  return data as SessionRow;
}

async function saveSession(
  supabase: SupabaseClient,
  phone: string,
  values: Partial<Pick<SessionRow, 'state' | 'profile_id' | 'service_id' | 'client_name' | 'context'>>,
): Promise<void> {
  await supabase
    .from('whatsapp_booking_sessions')
    .upsert({ phone, ...values }, { onConflict: 'phone' });
}

async function resetSession(supabase: SupabaseClient, phone: string): Promise<void> {
  await supabase.from('whatsapp_booking_sessions').delete().eq('phone', phone);
}

// ── Créneaux disponibles ─────────────────────────────────────

interface SlotOption {
  starts_at: string;      // ISO UTC
  label: string;          // "Mer 10 sept · 14:30"
}

/** Cherche les prochains créneaux d'un service sur l'horizon configuré. */
async function findUpcomingSlots(
  supabase: SupabaseClient,
  profileId: string,
  serviceId: string,
  durationMinutes: number,
  timezone: string,
): Promise<SlotOption[]> {
  // Données hebdomadaires (1 requête chacune, horizon complet)
  const [{ data: availability }, { data: blocked }, { data: appts }] = await Promise.all([
    supabase
      .from('availability')
      .select('day_of_week, start_time, end_time, is_active')
      .eq('profile_id', profileId)
      .eq('is_active', true),
    supabase
      .from('blocked_slots')
      .select('starts_at, ends_at')
      .eq('profile_id', profileId),
    supabase
      .from('appointments')
      .select('starts_at, ends_at, status')
      .eq('profile_id', profileId)
      .neq('status', 'cancelled'),
  ]);

  const options: SlotOption[] = [];

  // Prochains jours, aujourd'hui inclus (midi UTC pour éviter les
  // décalages de fuseau sur les bornes locales)
  const now = new Date();
  const todayStr = formatDateISO(now, timezone);
  const todayNoon = new Date(`${todayStr}T12:00:00Z`);
  const days: Date[] = [];
  for (let i = 0; i < SLOT_HORIZON_DAYS; i++) {
    const d = new Date(todayNoon);
    d.setUTCDate(d.getUTCDate() + i);
    days.push(d);
  }

  for (const day of days) {
    if (options.length >= MAX_SLOT_OPTIONS) break;

    const slots = generateAvailableSlots({
      availability: availability || [],
      blockedSlots: blocked || [],
      appointments: appts || [],
      date: day,
      durationMinutes,
      timezone,
    });

    for (const slot of slots) {
      if (options.length >= MAX_SLOT_OPTIONS) break;
      // Ignorer les créneaux déjà passés (aujourd'hui)
      if (slot.starts_at.getTime() <= now.getTime() + 30 * 60 * 1000) continue;

      const dateISO = formatDateISO(slot.starts_at, timezone);
      const dayLabel = labelDate(dateISO).replace(
        DAY_NAMES_FR[new Date(`${dateISO}T12:00:00Z`).getUTCDay()],
        DAY_NAMES_FR[new Date(`${dateISO}T12:00:00Z`).getUTCDay()].slice(0, 3),
      );
      options.push({
        starts_at: slot.starts_at.toISOString(),
        label: `${dayLabel} · ${labelTime(slot.starts_at, timezone)}`,
      });
    }
  }

  return options;
}

// ── Étapes du flux ───────────────────────────────────────────

async function sendServiceList(
  supabase: SupabaseClient,
  phone: string,
  profile: { id: string; business_name: string; currency: string; timezone: string },
): Promise<void> {
  const { data: services } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes')
    .eq('profile_id', profile.id)
    .eq('is_active', true)
    .order('name')
    .limit(10);

  if (!services || services.length === 0) {
    await sendWhatsAppText(
      phone,
      `😔 ${profile.business_name} n'a pas encore de services en ligne.\nContactez-le directement ou réservez depuis sa page.`,
    );
    await resetSession(supabase, phone);
    return;
  }

  const rows = services.map((s) => ({
    id: `svc_${s.id}`,
    title: s.name,
    description: `${formatCurrency(s.price ?? 0, profile.currency)} · ${s.duration_minutes} min`,
  }));

  await saveSession(supabase, phone, {
    state: 'await_service',
    profile_id: profile.id,
    context: { business_name: profile.business_name },
  });

  await sendWhatsAppList(
    phone,
    `👋 Bienvenue chez *${profile.business_name}* !\n\nQuel service souhaitez-vous réserver ?`,
    rows,
    { buttonLabel: 'Voir les services', footer: 'Djola TikTak' },
  );
}

async function sendSlotList(
  supabase: SupabaseClient,
  phone: string,
  session: SessionRow,
  service: { id: string; name: string; duration_minutes: number },
  profile: { id: string; timezone: string },
): Promise<void> {
  const slots = await findUpcomingSlots(
    supabase,
    profile.id,
    service.id,
    service.duration_minutes,
    profile.timezone,
  );

  if (slots.length === 0) {
    await sendWhatsAppText(
      phone,
      `😔 Aucun créneau disponible pour *${service.name}* dans les ${SLOT_HORIZON_DAYS} prochains jours.\n\nTapez *MENU* pour voir d'autres services.`,
    );
    await sendServiceList(supabase, phone, {
      id: profile.id,
      business_name: session.context?.business_name || 'ce commerce',
      currency: 'XAF',
      timezone: profile.timezone,
    });
    return;
  }

  await saveSession(supabase, phone, {
    state: 'await_slot',
    service_id: service.id,
    context: {
      ...(session.context || {}),
      slots: slots.map((s) => ({ starts_at: s.starts_at })),
      service_name: service.name,
    },
  });

  const rows = slots.map((s, i) => ({ id: `slot_${i}`, title: s.label }));
  await sendWhatsAppList(
    phone,
    `✨ *${service.name}* — choisissez votre créneau :`,
    rows,
    { buttonLabel: 'Créneaux', footer: `${SLOT_HORIZON_DAYS} prochains jours` },
  );
}

async function proposeConfirmation(
  supabase: SupabaseClient,
  phone: string,
  session: SessionRow,
  slot: { starts_at: string },
  profile: { business_name: string; timezone: string },
  service: { name: string },
  waName: string,
): Promise<void> {
  const dateISO = formatDateISO(new Date(slot.starts_at), profile.timezone);
  const heure = labelTime(new Date(slot.starts_at), profile.timezone);

  await saveSession(supabase, phone, {
    state: 'await_confirm',
    context: { ...(session.context || {}), starts_at: slot.starts_at, client_name: waName },
  });

  const clientLabel = waName ? `au nom de *${waName}*` : '';
  await sendWhatsAppButtons(
    phone,
    `📋 *Récapitulatif*\n\n🏪 ${profile.business_name}\n💅 ${service.name}\n📅 ${labelDate(dateISO)}\n🕐 ${heure}\n${clientLabel ? `👤 ${clientLabel}\n` : ''}\nConfirmez-vous ce rendez-vous ?`,
    [
      { id: 'confirm_yes', title: '✅ Confirmer' },
      { id: 'confirm_no', title: '↩️ Autre créneau' },
    ],
  );
}

async function confirmBooking(
  supabase: SupabaseClient,
  phone: string,
  session: SessionRow,
): Promise<void> {
  const ctx = session.context || {};
  const profileId = session.profile_id!;
  const serviceId = session.service_id!;
  const startsAt = ctx.starts_at!;
  const clientName = ctx.client_name || 'Client WhatsApp';

  // Service (durée, acompte) + profil (devise, fuseau, paiements)
  const [{ data: service }, { data: profile }] = await Promise.all([
    supabase.from('services').select('id, name, duration_minutes, price, is_active, deposit_enabled, deposit_type, deposit_value').eq('id', serviceId).single(),
    supabase.from('profiles').select('id, business_name, timezone, currency, is_active, payment_methods_enabled, orange_money_phone, mtn_momo_phone, payment_instructions').eq('id', profileId).single(),
  ]);

  if (!service || !profile || !profile.is_active || !service.is_active) {
    await sendWhatsAppText(phone, '😔 Ce service n\'est plus disponible. Tapez *MENU* pour recommencer.');
    await resetSession(supabase, phone);
    return;
  }

  const start = new Date(startsAt);
  const end = new Date(start.getTime() + service.duration_minutes * 60 * 1000);

  // Limite anti-abus : max 3 réservations créées par numéro WhatsApp / 24h
  const rl = await checkRateLimit(supabase, `wabook:${phone}`, 3, 24 * 60 * 60 * 1000);
  if (!rl.allowed) {
    await sendWhatsAppText(
      phone,
      '⚠️ Vous avez déjà créé plusieurs rendez-vous aujourd\'hui. Réessayez demain ou contactez le commerce directement.',
    );
    return;
  }

  // Client : trouver ou créer (dédup par nom + téléphone, comme le web)
  let clientId: string | null = null;
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', profileId)
    .eq('name', clientName)
    .eq('phone', phone)
    .maybeSingle();

  if (existing) {
    clientId = existing.id;
  } else {
    const { data: created } = await supabase
      .from('clients')
      .insert({ profile_id: profileId, name: clientName, phone, email: '', notes: 'Via WhatsApp' })
      .select('id')
      .single();
    clientId = created?.id ?? null;
  }

  if (!clientId) {
    await sendWhatsAppText(phone, '😔 Une erreur est survenue. Réessayez dans quelques instants.');
    return;
  }

  // Réservation atomique (même RPC que le web — pas de double réservation)
  // + auto-assign employé : on essaie chaque employé actif dans l'ordre
  // d'affichage jusqu'au premier créneau libre (comme le web).
  const depositAmount = computeDepositAmount(
    service as unknown as Parameters<typeof computeDepositAmount>[0],
    0,
  );
  const prepaymentStatus = depositAmount > 0 ? 'pending' : 'none';

  const { data: activeEmployees } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const tryBook = (empId: string | null) =>
    bookAtomic(supabase, {
      p_profile_id: profileId,
      p_service_id: serviceId,
      p_client_id: clientId,
      p_starts_at: start.toISOString(),
      p_ends_at: end.toISOString(),
      p_status: 'pending',
      p_notes: 'Réservé via WhatsApp 📱',
      p_employee_id: empId,
      p_deposit_amount: depositAmount,
      p_prepayment_status: prepaymentStatus,
    });

  let rpc: Awaited<ReturnType<typeof tryBook>> | null = null;
  const candidates = (activeEmployees ?? []).map((e: { id: string }) => e.id);
  for (const empId of candidates) {
    const res = await tryBook(empId);
    if (!res.conflict) {
      rpc = res;
      break;
    }
    if (res.error && !res.error.includes('déjà pris')) {
      rpc = null;
      break;
    }
  }
  if (!rpc) {
    rpc = await tryBook(null);
  }
  const { conflict, error, appointment } = rpc;

  if (error) {
    console.error('[wa-bot] erreur RPC book_appointment_atomic:', error);
    await sendWhatsAppText(phone, '😔 Une erreur est survenue. Réessayez dans quelques instants.');
    return;
  }

  if (conflict) {
    // Créneau pris entre-temps → reproposer des créneaux
    await sendWhatsAppText(phone, '⏰ Oups, ce créneau vient d\'être pris ! Choisissez-en un autre :');
    await sendSlotList(supabase, phone, session, service, { id: profileId, timezone: profile.timezone });
    return;
  }

  const dateISO = formatDateISO(start, profile.timezone);
  const appUrl = ctx.app_url || '';

  // Employé assigné (retourné par le RPC v2)
  const assignedEmployee = (appointment as { employee?: { name?: string } | null } | null)?.employee;
  const employeeLine = assignedEmployee?.name ? `👩\u200d⚕️ Avec : ${assignedEmployee.name}\n` : '';

  // Ligne acompte : montant + méthode de paiement du commerce
  let depositLine = '';
  if (depositAmount > 0) {
    const momo = [
      profile.payment_methods_enabled && profile.orange_money_phone ? 'Orange Money' : '',
      profile.payment_methods_enabled && profile.mtn_momo_phone ? 'MTN MoMo' : '',
    ].filter(Boolean).join(' ou ');
    depositLine = `\n💰 *Acompte à verser : ${formatCurrency(depositAmount, profile.currency)}*${momo ? ` via ${momo}` : ''}\nLe rendez-vous sera confirmé après réception de l'acompte.`;
  }

  await sendWhatsAppText(
    phone,
    `🎉 *Rendez-vous confirmé !*\n\n🏪 ${profile.business_name}\n💅 ${service.name}${employeeLine}\n📅 ${labelDate(dateISO)}\n🕐 ${labelTime(start, profile.timezone)}\n${depositLine}\n\n⏳ En attente de validation du commerce. Vous recevrez un rappel avant le rendez-vous.\n${appUrl ? `\n🔗 Gérer mon RDV : ${appUrl}` : ''}`,
  );
  await resetSession(supabase, phone);
}

// ── Aiguillage principal ─────────────────────────────────────

export async function handleWhatsAppMessage(
  supabase: SupabaseClient,
  from: string,
  waName: string,
  rawText: string,
): Promise<void> {
  const text = normalize(rawText);
  const session = await loadSession(supabase, from);

  // ── Commandes globales ──
  if (['ANNULER', 'CANCEL', 'STOP'].includes(text)) {
    await resetSession(supabase, from);
    await sendWhatsAppText(from, '❌ Réservation annulée. Tapez *RDV <code du commerce>* pour recommencer.');
    return;
  }

  // Commande "RDV <slug>" / "BOOK <slug>" / "RESERVER <slug>"
  const cmdMatch = rawText.match(/^\s*(?:rdv|book|r[eé]server?)\s+([a-z0-9-]{3,60})\s*$/i);
  if (cmdMatch) {
    const slug = cmdMatch[1].toLowerCase();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_name, currency, timezone, is_active')
      .eq('slug', slug)
      .maybeSingle();

    if (!profile || !profile.is_active) {
      await sendWhatsAppText(
        from,
        `🤔 Je ne trouve pas le commerce « ${slug} ».\nVérifiez le code sur sa page de réservation (ex : *RDV salon-ella*).`,
      );
      return;
    }

    await sendServiceList(supabase, from, profile);
    return;
  }

  // ── États de conversation ──
  if (!session) {
    await sendWhatsAppText(
      from,
      '👋 Bonjour ! Je suis l\'assistant de réservation *Djola TikTak*.\n\nPour réserver, envoyez :\n*RDV <code du commerce>*\n\n💡 Le code figure sur la page de réservation du commerce (ex : *RDV salon-ella*).',
    );
    return;
  }

  switch (session.state) {
    case 'await_service': {
      // Réponse par numéro ou par nom de service
      const { data: services } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('profile_id', session.profile_id!)
        .eq('is_active', true)
        .order('name')
        .limit(10);

      if (!services || services.length === 0) {
        await resetSession(supabase, from);
        return;
      }

      const idx = parseInt(text, 10);
      const chosen = Number.isInteger(idx) && idx >= 1 && idx <= services.length
        ? services[idx - 1]
        : services.find((s) => normalize(s.name) === text || normalize(s.name).includes(text));

      if (!chosen) {
        await sendWhatsAppText(from, '🤔 Je n\'ai pas compris. Tapez le *numéro* du service ou *ANNULER* pour arrêter.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, timezone')
        .eq('id', session.profile_id!)
        .single();

      await sendSlotList(supabase, from, session, chosen, profile ?? { id: session.profile_id!, timezone: 'Africa/Malabo' });
      return;
    }

    case 'await_slot': {
      const slots = session.context?.slots || [];
      const idx = parseInt(text, 10);
      const chosenIdx = Number.isInteger(idx) && idx >= 1 && idx <= slots.length ? idx - 1 : -1;

      if (chosenIdx < 0) {
        await sendWhatsAppText(from, '🤔 Tapez le *numéro* du créneau souhaité, *MENU* pour revoir les services, ou *ANNULER*.');
        return;
      }

      const [{ data: profile }, { data: service }] = await Promise.all([
        supabase.from('profiles').select('business_name, timezone').eq('id', session.profile_id!).single(),
        supabase.from('services').select('name').eq('id', session.service_id!).single(),
      ]);
      if (!profile || !service) {
        await resetSession(supabase, from);
        await sendWhatsAppText(from, '😔 Session expirée. Tapez *RDV <code du commerce>* pour recommencer.');
        return;
      }

      await proposeConfirmation(supabase, from, session, slots[chosenIdx], profile, service, waName || session.client_name || '');
      return;
    }

    case 'await_confirm': {
      const isYes = ['OUI', 'O', 'CONFIRME', 'CONFIRMER', '1'].includes(text)
        || text === 'CONFIRM_YES';
      const isNo = ['NON', 'N', '2', 'AUTRE', 'CHANGER'].includes(text) || text === 'CONFIRM_NO';

      if (isYes) {
        await confirmBooking(supabase, from, session);
        return;
      }
      if (isNo) {
        // Retour à la liste de créneaux
        const { data: profile } = await supabase
          .from('profiles').select('id, timezone').eq('id', session.profile_id!).single();
        const { data: service } = await supabase
          .from('services').select('id, name, duration_minutes').eq('id', session.service_id!).single();
        if (profile && service) {
          await sendSlotList(supabase, from, session, service, { id: profile.id, timezone: profile.timezone });
          return;
        }
        await resetSession(supabase, from);
        await sendWhatsAppText(from, '😔 Session expirée. Tapez *RDV <code du commerce>* pour recommencer.');
        return;
      }
      await sendWhatsAppText(from, '🤔 Répondez *OUI* ou *NON*, ou *ANNULER* pour arrêter.');
      return;
    }

    default: {
      await resetSession(supabase, from);
      await sendWhatsAppText(
        from,
        '👋 Pour réserver, envoyez *RDV <code du commerce>* (le code est sur la page de réservation du commerce).',
      );
    }
  }
}
