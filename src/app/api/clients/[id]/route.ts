import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE — supprimer un client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que le client appartient bien à l'utilisateur connecté
    const { data: client, error: findError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (findError || !client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    // Supprimer les rendez-vous associés d'abord
    await supabase.from('appointments').delete().eq('client_id', id);

    // Supprimer le client
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erreur suppression client:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erreur inattendue clients DELETE:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// PUT — mettre à jour un client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, email, notes } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Nom et téléphone requis' }, { status: 400 });
    }

    // Vérifier l'appartenance du client
    const { data: existing, error: findError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('clients')
      .update({
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || '',
        notes: notes?.trim() || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour client:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue clients PUT:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
