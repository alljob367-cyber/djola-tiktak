import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Fields safe to expose in the public profile API
const PUBLIC_PROFILE_FIELDS = [
  'id', 'business_name', 'slug', 'description', 'avatar_url',
  'phone', 'email', 'currency', 'timezone',
  'whatsapp_url', 'facebook_url', 'instagram_url', 'tiktok_url', 'website_url',
  'payment_methods_enabled', 'payment_instructions',
  'orange_money_phone', 'orange_money_name',
  'mtn_momo_phone', 'mtn_momo_name',
  'created_at',
];

// GET — profil public avec services (pour la page de réservation)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createServiceRoleClient();

    // Récupérer le profil par slug — only public fields
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_FIELDS.join(', '))
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    // Récupérer les services actifs
    const profileId = (profile as unknown as Record<string, unknown>).id as string;
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (servicesError) {
      console.error('Erreur services profil public:', servicesError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des services' }, { status: 500 });
    }

    const result = {
      ...(profile as unknown as Record<string, unknown>),
      services: services || [],
    };

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Erreur inattendue profil public GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
