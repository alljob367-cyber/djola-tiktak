import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { profileSchema } from '@/lib/validation/schemas';

// GET — récupérer son propre profil
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue profiles GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// PUT — mettre à jour son propre profil
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { slug } = parsed.data;

    // Vérifier l'unicité du slug
    if (slug) {
      const { data: slugExisting, error: slugError } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', slug)
        .neq('id', user.id)
        .maybeSingle();

      if (slugError) {
        console.error('Erreur vérification slug:', slugError);
        return NextResponse.json({ error: 'Erreur lors de la vérification du slug' }, { status: 500 });
      }

      if (slugExisting) {
        return NextResponse.json({ error: 'Ce slug est déjà utilisé. Veuillez en choisir un autre.' }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Erreur profiles PUT:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du profil' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue profiles PUT:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
