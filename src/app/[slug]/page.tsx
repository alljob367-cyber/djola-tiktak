import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/availability/engine';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Phone, ChevronRight } from 'lucide-react';
import type { ProfileWithServices } from '@/types/database';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServiceRoleClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !profile) {
    notFound();
  }

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const activeServices = services || [];
  const initials = profile.business_name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-background">
      {/* Header */}
      <header className="bg-emerald-600 text-white">
        <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="size-24 border-4 border-white/20 shadow-lg">
              {profile.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.business_name}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-emerald-500 text-2xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {profile.business_name}
              </h1>
              {profile.description && (
                <p className="max-w-sm text-sm text-emerald-100 leading-relaxed">
                  {profile.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-emerald-100">
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <Phone className="size-4" />
                  <span>{profile.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Services */}
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            Services disponibles
          </h2>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            {activeServices.length}
          </Badge>
        </div>

        {activeServices.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                Aucun service disponible pour le moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeServices.map((service) => (
              <Card
                key={service.id}
                className="group transition-shadow hover:shadow-md"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 className="truncate text-base font-semibold text-foreground">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <Clock className="size-3.5" />
                        {service.duration_minutes} min
                      </span>
                      <span className="text-base font-bold text-foreground">
                        {formatCurrency(service.price, profile.currency)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/${slug}/booking?service=${service.id}`}>
                    <Button
                      className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px] min-w-[44px]"
                      size="default"
                    >
                      Réserver
                      <ChevronRight className="size-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-lg px-4 pb-8 pt-4 sm:px-6">
        <p className="text-center text-xs text-muted-foreground">
          Propulsé par Djola TikTak
        </p>
      </footer>
    </div>
  );
}
