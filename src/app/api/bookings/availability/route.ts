import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateAvailableSlots, zonedTimeToUtc, formatDateISO } from '@/lib/availability/engine';
import { checkRateLimit, hashIdentifier, getClientIp } from '@/lib/rate-limit';
import { getIntegration, fetchBusyIntervals, type BusyInterval } from '@/lib/google/calendar';

// Anti-scraping : max 120 consultations de créneaux par IP par heure
const AVAIL_RATE_LIMIT = 120;
const AVAIL_RATE_WINDOW_MS = 60 * 60 * 1000;

// ── Cache mémoire freeBusy Google (par instance serverless) ──
// Réduit la latence quand un client explore plusieurs dates.
// TTL 60 s — suffisant car les agendas externes changent rarement
// à la seconde près, et le RPC atomique reste la vérité finale
// anti-double-réservation. Fail-open : aucune erreur ne bloque
// jamais l'affichage des créneaux.
const GOOGLE_BUSY_CACHE = new Map<string, { intervals: BusyInterval[] | null; expires: number }>();
const GOOGLE_BUSY_CACHE_TTL_MS = 60 * 1000;

async function getGoogleBusyCached(
  profileId: string,
  timeMin: string,
  timeMax: string,
): Promise<BusyInterval[] | null> {
  const cacheKey = `${profileId}:${timeMin}`;
  const cached = GOOGLE_BUSY_CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.intervals;
  }
  // Intégration absente → évite un appel freeBusy inutile
  const integration = await getIntegration(profileId);
  if (!integration || !integration.block_busy) {
    GOOGLE_BUSY_CACHE.set(cacheKey, { intervals: null, expires: Date.now() + GOOGLE_BUSY_CACHE_TTL_MS });
    return null;
  }
  const intervals = await fetchBusyIntervals(profileId, timeMin, timeMax, integration);
  GOOGLE_BUSY_CACHE.set(cacheKey, { intervals, expires: Date.now() + GOOGLE_BUSY_CACHE_TTL_MS });
  return intervals;
}

// GET — endpoint public pour récupérer les créneaux disponibles
// Paramètres de requête : slug, service_id, date (YYYY-MM-DD)
export async function GET(request: NextRequest) {
  try {
    // Rate limiting léger (fail-open) pour empêcher le scraping massif
    // de créneaux tout en laissant les pages publiques respirer
    const ip = getClientIp(request);
    const supabaseRate = await createServiceRoleClient();
    const rl = await checkRateLimit(
      supabaseRate,
      `av:${hashIdentifier(ip)}`,
      AVAIL_RATE_LIMIT,
      AVAIL_RATE_WINDOW_MS,
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const service_id = searchParams.get('service_id');
    const dateStr = searchParams.get('date');

    if (!slug || !service_id || !dateStr) {
      return NextResponse.json(
        { error: 'Les paramètres slug, service_id et date sont requis' },
        { status: 400 }
      );
    }

    // Valider le format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { error: 'Date invalide — format attendu : YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, timezone, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    // Récupérer le service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, duration_minutes, is_active')
      .eq('id', service_id)
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service non trouvé' }, { status: 404 });
    }

    const timezone = profile.timezone || 'Africa/Malabo';

    // Récupérer les disponibilités hebdomadaires
    const { data: availabilityRules, error: availError } = await supabase
      .from('availability')
      .select('day_of_week, start_time, end_time, is_active')
      .eq('profile_id', profile.id)
      .eq('is_active', true);

    if (availError) {
      console.error('Erreur récupération disponibilités:', availError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des disponibilités' }, { status: 500 });
    }

    // Calculer les bornes de la journée DANS LE FUSEAU DU PROFESSIONNEL
    // (indépendant du fuseau du serveur)
    const dayStart = zonedTimeToUtc(dateStr, 0, timezone);
    const dayEnd = zonedTimeToUtc(dateStr, 24 * 60, timezone);

    // Récupérer les créneaux bloqués pour cette journée
    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('starts_at, ends_at')
      .eq('profile_id', profile.id)
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString());

    if (blockedError) {
      console.error('Erreur récupération créneaux bloqués:', blockedError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des créneaux bloqués' }, { status: 500 });
    }

    // Récupérer les rendez-vous existants pour cette journée
    const { data: appointments, error: aptError } = await supabase
      .from('appointments')
      .select('starts_at, ends_at, status')
      .eq('profile_id', profile.id)
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString());

    if (aptError) {
      console.error('Erreur récupération rendez-vous:', aptError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des rendez-vous' }, { status: 500 });
    }

    // ── Créneaux occupés dans l'agenda Google du pro (sync bidirectionnelle) ──
    // Les événements externes (perso, autre activité…) bloquent des créneaux.
    // fire-and-forget logique : échec → null → aucun blocage (fail-open).
    let googleBusy: BusyInterval[] = [];
    try {
      const intervals = await getGoogleBusyCached(
        profile.id,
        dayStart.toISOString(),
        dayEnd.toISOString(),
      );
      googleBusy = intervals ?? [];
    } catch (err) {
      console.warn('[bookings/availability] busy Google (fail-open):', err);
    }

    // Générer les créneaux disponibles
    const slots = generateAvailableSlots({
      availability: availabilityRules || [],
      blockedSlots: [
        ...(blockedSlots || []),
        ...googleBusy.map((b) => ({ starts_at: b.starts_at, ends_at: b.ends_at })),
      ],
      appointments: appointments || [],
      date: dayStart,
      durationMinutes: service.duration_minutes,
      timezone,
    });

    return NextResponse.json({
      data: slots.map((slot) => ({
        starts_at: slot.starts_at.toISOString(),
        ends_at: slot.ends_at.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Erreur inattendue bookings availability GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

