import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/availability/engine';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, ChevronRight, MessageCircle, Globe, ImageOff, Wallet, CheckCircle2, Star } from 'lucide-react';

interface PageProps { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServiceRoleClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !profile) notFound();

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const activeServices = services || [];
  const initials = profile.business_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  // Build social links array
  const socialLinks: Array<{ label: string; href: string; icon: React.ReactNode; bg: string }> = [];
  if (profile.whatsapp_url) socialLinks.push({ label: 'WhatsApp', href: profile.whatsapp_url, icon: <MessageCircle size={18} />, bg: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' });
  if (profile.facebook_url) socialLinks.push({ label: 'Facebook', href: profile.facebook_url, icon: <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' });
  if (profile.instagram_url) socialLinks.push({ label: 'Instagram', href: profile.instagram_url, icon: <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>, bg: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400' });
  if (profile.tiktok_url) socialLinks.push({ label: 'TikTok', href: profile.tiktok_url, icon: <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 005.58 2.18V2.5a4.83 4.83 0 01-3.77 4.25h3.77z"/></svg>, bg: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100' });
  if (profile.website_url) socialLinks.push({ label: 'Site web', href: profile.website_url, icon: <Globe size={18} />, bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' });

  // Payment methods
  const hasPaymentMethods = profile.payment_methods_enabled && (profile.orange_money_phone || profile.mtn_momo_phone);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-background">
      {/* Header */}
      <header className="bg-emerald-600 text-white">
        <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="size-24 border-4 border-white/20 shadow-lg">
              {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.business_name} className="object-cover" /> : null}
              <AvatarFallback className="bg-emerald-500 text-2xl font-bold text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{profile.business_name}</h1>
              {profile.description && <p className="max-w-sm text-sm text-emerald-100 leading-relaxed">{profile.description}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-emerald-100">
              {profile.phone && (
                <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm transition-colors hover:bg-white/20">
                  <Phone className="size-4" /><span>{profile.phone}</span>
                </a>
              )}
              {hasPaymentMethods && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/20 px-3 py-1.5 backdrop-blur-sm">
                  <Wallet className="size-4" /><span>Paiement anticipé disponible</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Social links bar */}
      {socialLinks.length > 0 && (
        <div className="mx-auto max-w-lg px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {socialLinks.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:opacity-80 ${s.bg}`}>
                {s.icon}
                {s.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Payment Methods Section */}
      {hasPaymentMethods && (
        <div className="mx-auto max-w-lg px-4 pb-4 sm:px-6">
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <Star className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Paiement anticipé prioritaire</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">Payez en avance pour être prioritaire</p>
                </div>
              </div>

              <div className="space-y-2">
                {profile.orange_money_phone && (
                  <a href={`tel:${profile.orange_money_phone}`} className="flex items-center justify-between rounded-lg border border-orange-200 bg-white p-3 transition-colors hover:bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:bg-orange-950/40">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-900/40">
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">OM</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Orange Money</p>
                        <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">{profile.orange_money_phone}</p>
                      </div>
                    </div>
                    {profile.orange_money_name && (
                      <span className="text-xs text-muted-foreground">{profile.orange_money_name}</span>
                    )}
                  </a>
                )}

                {profile.mtn_momo_phone && (
                  <a href={`tel:${profile.mtn_momo_phone}`} className="flex items-center justify-between rounded-lg border border-yellow-200 bg-white p-3 transition-colors hover:bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/40">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-md bg-yellow-100 dark:bg-yellow-900/40">
                        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">MTN</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">MTN Mobile Money</p>
                        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">{profile.mtn_momo_phone}</p>
                      </div>
                    </div>
                    {profile.mtn_momo_name && (
                      <span className="text-xs text-muted-foreground">{profile.mtn_momo_name}</span>
                    )}
                  </a>
                )}
              </div>

              {profile.payment_instructions && (
                <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  {profile.payment_instructions}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Services */}
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Services disponibles</h2>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{activeServices.length}</Badge>
        </div>

        {activeServices.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><p className="text-muted-foreground">Aucun service disponible pour le moment.</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {activeServices.map((service) => (
              <Card key={service.id} className="group transition-shadow hover:shadow-md overflow-hidden">
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Service image */}
                  {service.image_url ? (
                    <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                      <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <ImageOff size={20} className="text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 className="truncate text-base font-semibold text-foreground">{service.name}</h3>
                    {service.description && <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700"><Clock className="size-3.5" />{service.duration_minutes} min</span>
                      <span className="text-base font-bold text-foreground">{formatCurrency(service.price, profile.currency)}</span>
                    </div>
                  </div>
                  <Link href={`/${slug}/booking?service=${service.id}`}>
                    <Button className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px] min-w-[44px]" size="default">Réserver<ChevronRight className="size-4" /></Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-lg px-4 pb-8 pt-4 sm:px-6">
        <p className="text-center text-xs text-muted-foreground">Propulsé par Djola TikTak</p>
      </footer>
    </div>
  );
}
