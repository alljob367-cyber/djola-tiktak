import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { selectFieldsFor, trackMissingColumn } from '@/lib/supabase/columns';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Fields safe to expose in the public profile API
const PUBLIC_PROFILE_FIELDS = [
  'id', 'business_name', 'business_type', 'slug', 'description', 'avatar_url',
  'phone', 'email', 'currency', 'timezone',
  'whatsapp_url', 'facebook_url', 'instagram_url', 'tiktok_url', 'website_url',
  'linkedin_url', 'twitter_url', 'telegram_url',
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

    // Récupérer le profil par slug — only public fields.
    // Tolérant aux colonnes réseaux récentes absentes (migration non passée).
    let profile: Record<string, unknown> | null = null;
    let profileError: unknown = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error } = await supabase
        .from('profiles')
        .select(selectFieldsFor('profiles', PUBLIC_PROFILE_FIELDS))
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      profile = (data as unknown as Record<string, unknown> | null) ?? null;
      profileError = error ?? null;
      if (!error || !trackMissingColumn('profiles', error)) break;
    }

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    // Récupérer les services actifs — select * est sûr ici (aucun champ
    // sensible dans services), metadata incluse si la colonne existe.
    const profileId = profile.id as string;
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
      ...profile,
      services: services || [],
    };

    // Employés actifs (gestion d'équipe) — champs publics uniquement.
    // En cas de table absente (migration en attente) → liste vide silencieuse.
    let employees: Array<Record<string, unknown>> = [];
    try {
      const { data: staff, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, position, color, display_order')
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (employeesError) {
        // 42P01 = table inexistante — toléré tant que la migration n'est pas passée
        if (employeesError.code !== '42P01') {
          console.warn('Erreur employees profil public (non bloquante):', employeesError.message);
        }
      } else {
        employees = staff ?? [];
      }
    } catch {
      // Non bloquant : la réservation fonctionne sans employés
    }

    return NextResponse.json({ data: { ...result, employees } });
  } catch (err) {
    console.error('Erreur inattendue profil public GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
