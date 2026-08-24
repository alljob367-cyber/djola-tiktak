import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appointmentCreateSchema } from '@/lib/validation/schemas';
import type { AppointmentStatus } from '@/types/database';

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

// POST — créer un rendez-vous
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = appointmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
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
