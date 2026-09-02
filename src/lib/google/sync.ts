// ============================================================
// Djola TikTak — Synchronisation RDV ↔ Google Calendar
// ------------------------------------------------------------
// Fonctions « fire-and-forget » : ne JAMAIS faire échouer une
// réservation ni ralentir la réponse HTTP à cause de Google.
// Appelées depuis : réservation publique, création manuelle,
// bot WhatsApp, annulation/suppression de RDV.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createCalendarEvent, deleteCalendarEvent } from './calendar';
import { stripMissingColumns } from '@/lib/supabase/columns';

interface AppointmentDetails {
  id: string;
  profile_id: string;
  starts_at: string;
  ends_at: string;
  service_name?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  google_event_id?: string | null;
}

/** Charge les détails d'un RDV (service + client) pour l'agenda. */
async function loadAppointmentDetails(
  appointmentId: string,
): Promise<AppointmentDetails | null> {
  try {
    const supabase = await createServiceRoleClient();
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, profile_id, starts_at, ends_at, google_event_id,
        service:services(name),
        client:clients(name, phone)
      `)
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) {
      // Relation employees/services absente ? On retente minimal.
      const msg = `${error.message ?? ''}`.toLowerCase();
      if (error.code === 'PGRST200' || msg.includes('relation')) {
        const { data: minimal } = await supabase
          .from('appointments')
          .select('id, profile_id, starts_at, ends_at, google_event_id')
          .eq('id', appointmentId)
          .maybeSingle();
        return (minimal as AppointmentDetails) ?? null;
      }
      console.error('[gcal-sync] chargement RDV:', error.message);
      return null;
    }
    if (!data) return null;

    const service = data.service as { name?: string } | { name?: string }[] | null;
    const client = data.client as { name?: string; phone?: string } | { name?: string; phone?: string }[] | null;
    const s = Array.isArray(service) ? service[0] : service;
    const c = Array.isArray(client) ? client[0] : client;

    return {
      ...(data as unknown as AppointmentDetails),
      service_name: s?.name ?? null,
      client_name: c?.name ?? null,
      client_phone: c?.phone ?? null,
    };
  } catch (err) {
    console.error('[gcal-sync] exception chargement RDV:', err);
    return null;
  }
}

/** Récupère le fuseau du pro (best-effort). */
async function loadTimezone(profileId: string): Promise<string> {
  try {
    const supabase = await createServiceRoleClient();
    const { data } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', profileId)
      .maybeSingle();
    return (data as { timezone?: string } | null)?.timezone || 'Africa/Malabo';
  } catch {
    return 'Africa/Malabo';
  }
}

/** Persiste le google_event_id sur le RDV (best-effort, tolère migration absente). */
async function saveEventId(appointmentId: string, eventId: string | null): Promise<void> {
  try {
    const supabase = await createServiceRoleClient();
    const payload = stripMissingColumns('appointments', { google_event_id: eventId });
    if (Object.keys(payload).length === 0) return; // colonne absente (migration en attente)
    await supabase.from('appointments').update(payload).eq('id', appointmentId);
  } catch (err) {
    console.warn('[gcal-sync] persistance google_event_id:', err);
  }
}

/**
 * Pousse un RDV vers l'agenda Google du pro (création d'événement).
 * Best-effort : jamais d'exception, jamais d'attente critique.
 * À appeler avec `.catch(() => {})` depuis les routes.
 */
export async function pushAppointmentToGoogle(appointmentId: string): Promise<void> {
  try {
    const appt = await loadAppointmentDetails(appointmentId);
    if (!appt) return;
    if (appt.google_event_id) return; // déjà synchronisé

    const timezone = await loadTimezone(appt.profile_id);
    const summaryParts = [appt.service_name, appt.client_name].filter(Boolean);
    const eventId = await createCalendarEvent(appt.profile_id, {
      summary: summaryParts.join(' — ') || 'Rendez-vous',
      description: [
        appt.client_name ? `Client : ${appt.client_name}` : null,
        appt.client_phone ? `Téléphone : ${appt.client_phone}` : null,
        'Rendez-vous géré via Djola TikTak',
      ]
        .filter(Boolean)
        .join('\n'),
      startsAt: appt.starts_at,
      endsAt: appt.ends_at,
      timezone,
      sourceUrl: process.env.NEXT_PUBLIC_APP_URL || undefined,
    });

    if (eventId) {
      await saveEventId(appointmentId, eventId);
      console.log('[gcal-sync] événement créé:', eventId, 'pour RDV', appointmentId);
    }
  } catch (err) {
    console.warn('[gcal-sync] push RDV (silencieux):', err);
  }
}

/**
 * Retire un RDV de l'agenda Google (annulation ou suppression).
 * Accepte soit l'ID du RDV (chargement DB), soit directement
 * le couple (profileId, eventId) si déjà connu.
 * Best-effort : jamais d'exception.
 */
export async function removeAppointmentFromGoogle(
  profileId: string,
  googleEventId: string | null | undefined,
  appointmentId?: string,
): Promise<void> {
  try {
    let eventId = googleEventId ?? null;
    if (!eventId && appointmentId) {
      const appt = await loadAppointmentDetails(appointmentId);
      eventId = appt?.google_event_id ?? null;
    }
    if (!eventId) return;
    const ok = await deleteCalendarEvent(profileId, eventId);
    if (ok && appointmentId) {
      await saveEventId(appointmentId, null);
    }
    console.log('[gcal-sync] événement supprimé:', eventId, ok ? '' : '(échec best-effort)');
  } catch (err) {
    console.warn('[gcal-sync] suppression RDV (silencieux):', err);
  }
}

/** Variante fire-and-forget utilisable dans les routes : void pushAppointmentToGoogle(id) */
export function fireAndForget(promise: Promise<void>): void {
  promise.catch(() => {});
}
