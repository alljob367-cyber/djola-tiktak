import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { profileSchema, businessTypeSchema, themeSchema, announcementSchema } from '@/lib/validation/schemas';

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

    // Allow partial updates (e.g. avatar_url only)
    const partialUpdate = !body.business_name || !body.slug;
    const parsed = partialUpdate
      ? z.object({
          business_name: z.string().max(100).optional(),
          business_type: businessTypeSchema.optional(),
          slug: z.string().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
          description: z.string().max(500).optional(),
          phone: z.string().max(20).optional(),
          email: z.string().email('Email invalide').optional().or(z.literal('')).optional(),
          currency: z.string().optional(),
          timezone: z.string().optional(),
          avatar_url: z.string().max(500).optional().or(z.literal('')).optional(),
          banner_url: z.string().max(500).optional().or(z.literal('')).optional(),
          theme: themeSchema.optional(),
          announcement: announcementSchema.nullable().optional(),
          whatsapp_url: z.string().max(300).optional().or(z.literal('')).optional(),
          google_maps_url: z.string().max(300).optional().or(z.literal('')).optional(),
          youtube_url: z.string().max(300).optional().or(z.literal('')).optional(),
          facebook_url: z.string().max(300).optional().or(z.literal('')).optional(),
          instagram_url: z.string().max(300).optional().or(z.literal('')).optional(),
          tiktok_url: z.string().max(300).optional().or(z.literal('')).optional(),
          website_url: z.string().max(300).optional().or(z.literal('')).optional(),
          payment_methods_enabled: z.boolean().optional(),
          orange_money_phone: z.string().max(30).optional().or(z.literal('')).optional(),
          orange_money_name: z.string().max(100).optional().or(z.literal('')).optional(),
          mtn_momo_phone: z.string().max(30).optional().or(z.literal('')).optional(),
          mtn_momo_name: z.string().max(100).optional().or(z.literal('')).optional(),
          payment_instructions: z.string().max(500).optional().or(z.literal('')).optional(),
        }).safeParse(body)
      : profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { slug } = parsed.data;

    // Vérifier l'unicité du slug (only if slug is provided and changed)
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
