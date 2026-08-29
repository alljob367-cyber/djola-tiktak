import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { promoCodeCreateSchema } from '@/lib/validation/schemas';
import { normalizePromoCode } from '@/lib/promo';

export const dynamic = 'force-dynamic';

// GET — lister les codes promo du professionnel connecté
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur promo-codes GET:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des codes promo' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue promo-codes GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// POST — créer un code promo
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = promoCodeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { code, type, discount_type, value, max_uses, valid_from, valid_until, show_on_page } = parsed.data;
    const normalizedCode = normalizePromoCode(code);

    if (discount_type === 'percent' && value > 100) {
      return NextResponse.json({ error: 'Une réduction en pourcentage ne peut pas dépasser 100 %' }, { status: 400 });
    }

    if (valid_from && valid_until && valid_from > valid_until) {
      return NextResponse.json({ error: 'La date de fin doit être après la date de début' }, { status: 400 });
    }

    // Anti-doublon (contrainte UNIQUE profile_id + code aussi en base)
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('profile_id', user.id)
      .eq('code', normalizedCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Ce code existe déjà' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        profile_id: user.id,
        code: normalizedCode,
        type,
        discount_type,
        value,
        max_uses: max_uses ?? null,
        valid_from: valid_from ?? null,
        valid_until: valid_until ?? null,
        show_on_page,
        active: true,
      })
      .select()
      .single();

    if (error) {
      // 23505 = violation contrainte unique (course concurrente)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ce code existe déjà' }, { status: 409 });
      }
      console.error('Erreur promo-codes POST:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du code promo' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Erreur inattendue promo-codes POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
