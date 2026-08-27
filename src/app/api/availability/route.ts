import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { availabilitySchema } from '@/lib/validation/schemas';

// GET — lister les disponibilités de l'utilisateur
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('profile_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Erreur availability GET:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des disponibilités' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue availability GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// POST — créer une disponibilité
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = availabilitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('availability')
      .insert({ ...parsed.data, profile_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Erreur availability POST:', error);
      return NextResponse.json({ error: 'Erreur lors de la création de la disponibilité' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Erreur inattendue availability POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// PUT — mise à jour en bloc (bulk upsert)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'La liste des disponibilités est requise' }, { status: 400 });
    }

    // Valider chaque élément
    const validatedItems: Array<{
      profile_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_active: boolean;
    }> = [];
    for (const item of items) {
      const parsed = availabilitySchema.safeParse(item);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }
      validatedItems.push({ ...parsed.data, profile_id: user.id });
    }

    // Supprimer toutes les disponibilités existantes puis insérer les nouvelles
    // dans une transaction logique : on insert d'abord, puis delete si insert réussit
    const { data: insertedData, error: insertError } = await supabase
      .from('availability')
      .insert(validatedItems)
      .select()
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (insertError) {
      console.error('Erreur availability PUT (insert):', insertError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour des disponibilités' }, { status: 500 });
    }

    // Insert succeeded — now safely remove old entries (different from new ones)
    const newIds = (insertedData ?? []).map((item: { id?: string }) => item.id).filter(Boolean);
    if (newIds.length > 0) {
      await supabase
        .from('availability')
        .delete()
        .eq('profile_id', user.id)
        .not('id', 'in', `(${newIds.join(',')})`);
    }

    return NextResponse.json({ data: insertedData });
  } catch (err) {
    console.error('Erreur inattendue availability PUT:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// DELETE — supprimer une disponibilité par ID
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
      return NextResponse.json({ error: 'ID de disponibilité requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Erreur availability DELETE:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression de la disponibilité' }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Erreur inattendue availability DELETE:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
