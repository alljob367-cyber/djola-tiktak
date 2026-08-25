import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serviceSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET — récupérer un service par ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('profile_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Service non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue service GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// PUT — mettre à jour un service
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que le service appartient à l'utilisateur
    const { data: existing, error: findError } = await supabase
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('profile_id', user.id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Service non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = serviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('services')
      .update(parsed.data)
      .eq('id', id)
      .eq('profile_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Erreur service PUT:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du service' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue service PUT:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// DELETE — supprimer un service
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Erreur service DELETE:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression du service' }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Erreur inattendue service DELETE:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
