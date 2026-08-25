import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ProfileWithServices } from '@/types/database';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET — profil public avec services (pour la page de réservation)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createServiceRoleClient();

    // Récupérer le profil par slug
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    // Récupérer les services actifs
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (servicesError) {
      console.error('Erreur services profil public:', servicesError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des services' }, { status: 500 });
    }

    const result: ProfileWithServices = {
      ...profile,
      services: services || [],
    };

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Erreur inattendue profil public GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
