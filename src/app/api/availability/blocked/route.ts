import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { blockedSlotSchema } from '@/lib/validation/schemas';

// GET — lister les créneaux bloqués
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(_request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabase
      .from('blocked_slots')
      .select('*')
      .eq('profile_id', user.id)
      .order('starts_at', { ascending: true });

    if (dateFrom) {
      query = query.gte('starts_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('ends_at', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur blocked GET:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des créneaux bloqués' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue blocked GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// POST — créer un créneau bloqué
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = blockedSlotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Vérifier que ends_at est après starts_at
    if (new Date(parsed.data.ends_at) <= new Date(parsed.data.starts_at)) {
      return NextResponse.json({ error: 'La date de fin doit être après la date de début' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('blocked_slots')
      .insert({ ...parsed.data, profile_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Erreur blocked POST:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du créneau bloqué' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Erreur inattendue blocked POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// DELETE — supprimer un créneau bloqué par ID
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID du créneau bloqué requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Erreur blocked DELETE:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression du créneau bloqué' }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Erreur inattendue blocked DELETE:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
