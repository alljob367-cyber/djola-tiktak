import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clientSchema } from '@/lib/validation/schemas';

// GET — lister les clients du professionnel
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = supabase
      .from('clients')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur clients GET:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des clients' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue clients GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// POST — créer un client avec déduplication par nom + téléphone
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, phone, email, notes } = parsed.data;

    // Vérifier si un client avec le même nom + téléphone existe déjà
    const { data: existing, error: findError } = await supabase
      .from('clients')
      .select('*')
      .eq('profile_id', user.id)
      .eq('name', name)
      .eq('phone', phone)
      .maybeSingle();

    if (findError) {
      console.error('Erreur recherche client:', findError);
      return NextResponse.json({ error: 'Erreur lors de la recherche du client' }, { status: 500 });
    }

    if (existing) {
      // Mettre à jour les informations si nécessaire
      const { data: updated, error: updateError } = await supabase
        .from('clients')
        .update({
          email: email || existing.email,
          notes: notes || existing.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erreur mise à jour client:', updateError);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour du client' }, { status: 500 });
      }

      return NextResponse.json({ data: updated });
    }

    // Créer le nouveau client
    const { data, error } = await supabase
      .from('clients')
      .insert({
        profile_id: user.id,
        name,
        phone,
        email: email || '',
        notes: notes || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur clients POST:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du client' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Erreur inattendue clients POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
