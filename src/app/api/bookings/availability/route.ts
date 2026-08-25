import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateAvailableSlots } from '@/lib/availability/engine';

// GET — endpoint public pour récupérer les créneaux disponibles
// Paramètres de requête : slug, service_id, date
export async function GET(request: NextRequest) {
  try {
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

    // Parser la date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

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

    // Calculer les bornes de la journée
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

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

    // Générer les créneaux disponibles
    const slots = generateAvailableSlots({
      availability: availabilityRules || [],
      blockedSlots: blockedSlots || [],
      appointments: appointments || [],
      date,
      durationMinutes: service.duration_minutes,
      timezone: profile.timezone || 'Africa/Malabo',
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
