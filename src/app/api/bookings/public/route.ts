import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { publicBookingSchema } from '@/lib/validation/schemas';

// Rate limiting: max 5 bookings per IP per hour
const BOOKING_RATE_LIMIT = 5;
const BOOKING_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ipBookingCache = new Map<string, { count: number; windowStart: number }>();

// Simple in-memory rate limiter (resets on deploy, acceptable for single-instance)
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipBookingCache.get(ip);

  if (!entry || now - entry.windowStart > BOOKING_RATE_WINDOW_MS) {
    ipBookingCache.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= BOOKING_RATE_LIMIT) {
    return true;
  }

  entry.count++;
  return false;
}

// POST — réservation publique (sans authentification)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting par IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Trop de réservations en peu de temps. Veuillez réessayer dans une heure.' },
        { status: 429 },
      );
    }

    const supabase = await createServiceRoleClient();

    const body = await request.json();
    const parsed = publicBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { service_id, client_name, client_phone, client_email, starts_at } = parsed.data;

    // Vérifier que le service existe et est actif
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, duration_minutes, profile_id, is_active')
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
      .select('id, is_active, timezone')
      .eq('id', service.profile_id)
      .single();

    if (profileError || !profile || !profile.is_active) {
      return NextResponse.json({ error: 'Professionnel non disponible' }, { status: 404 });
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

    // Créer le rendez-vous
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        profile_id: service.profile_id,
        service_id,
        client_id,
        starts_at,
        ends_at,
        status: 'pending',
        notes: '',
      })
      .select(`
        *,
        service:services(*),
        client:clients(*)
      `)
      .single();

    if (aptError) {
      console.error('Erreur création rendez-vous public:', aptError);
      return NextResponse.json({ error: 'Erreur lors de la création du rendez-vous' }, { status: 500 });
    }

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err) {
    console.error('Erreur inattendue bookings public POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
