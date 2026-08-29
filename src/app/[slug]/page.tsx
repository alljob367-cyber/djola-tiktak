import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import PublicProfileView, {
  type PublicProfileData,
  type PublicServiceData,
} from './public-profile-view';

interface PageProps { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic';

// Champs publics uniquement — ne JAMAIS sélectionner * (fuite PII :
// email privé, statut d'abonnement, identifiant client Chariow...)
const PUBLIC_FIELDS = [
  'id', 'business_name', 'business_type', 'slug', 'description', 'avatar_url', 'phone',
  'currency', 'timezone',
  'whatsapp_url', 'facebook_url', 'instagram_url', 'tiktok_url', 'website_url',
  'payment_methods_enabled',
  'orange_money_phone', 'orange_money_name',
  'mtn_momo_phone', 'mtn_momo_name', 'payment_instructions',
].join(', ');

const PUBLIC_SERVICE_FIELDS = [
  'id', 'name', 'description', 'category', 'capacity', 'price', 'duration_minutes', 'image_url',
].join(', ');

// Métadonnées dynamiques pour le partage (Open Graph)
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const supabase = await createServiceRoleClient();
    const { data } = await supabase
      .from('profiles')
      .select('business_name, description, avatar_url')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    if (!data) return { title: 'Professionnel introuvable | Djola TikTak' };
    return {
      title: `${data.business_name} | Réservation en ligne`,
      description: data.description || `Prenez rendez-vous chez ${data.business_name} en quelques clics.`,
      openGraph: {
        title: data.business_name,
        description: data.description || `Prenez rendez-vous chez ${data.business_name}.`,
        images: data.avatar_url ? [{ url: data.avatar_url }] : undefined,
      },
    };
  } catch {
    return { title: 'Djola TikTak' };
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  // Service role : la page publique ne dépend pas des politiques RLS
  // "public_read" qui exposeraient toute la table via l'anon key.
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_FIELDS)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  const profile = data as unknown as PublicProfileData | null;
  if (error || !profile) notFound();

  const { data: services } = await supabase
    .from('services')
    .select(PUBLIC_SERVICE_FIELDS)
    .eq('profile_id', profile.id)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('created_at', { ascending: true });

  const activeServices = (services as unknown as PublicServiceData[]) || [];
  const initials = profile.business_name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return <PublicProfileView profile={profile} services={activeServices} initials={initials} />;
}
