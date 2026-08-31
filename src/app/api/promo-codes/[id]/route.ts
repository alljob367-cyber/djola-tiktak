import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { promoCodeUpdateSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH — modifier un code promo (activer/désactiver, visibilité, limites)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = promoCodeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // La clause .eq('profile_id', user.id) garantit la propriété
    // (RLS l'impose aussi côté base)
    const { data, error } = await supabase
      .from('promo_codes')
      .update(parsed.data)
      .eq('id', id)
      .eq('profile_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Code promo introuvable' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue promo-codes PATCH:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// DELETE — supprimer un code promo
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Erreur promo-codes DELETE:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erreur inattendue promo-codes DELETE:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
