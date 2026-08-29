'use client';

// ============================================================
// Public Profile View — page vitrine du professionnel
// Client component : animations framer-motion
// (les données sont récupérées côté serveur par page.tsx,
//  avec sélection EXPLICITE des champs publics — jamais *)
// v1.1.0 : bannière, thème de couleurs, bandeau d'annonce,
//          section Offres (codes promo), liens Maps/YouTube
// ============================================================

import { motion, type Variants } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock, Phone, ChevronRight, MessageCircle, Globe, ImageOff,
  Wallet, Star, Sparkles, CalendarCheck, MapPin, Users,
  Megaphone, Gift, Copy, Check,
} from 'lucide-react';
import { formatCurrency } from '@/lib/availability/engine';
import { getBusinessType } from '@/lib/business-types';
import { getPublicTheme, heroGradient, themeCssVars, type PublicTheme } from '@/lib/themes';

export interface PublicProfileData {
  id: string;
  business_name: string;
  business_type?: string | null;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  banner_url?: string | null;
  theme?: string | null;
  announcement?: { enabled: boolean; text: string } | null;
  phone: string | null;
  currency: string;
  timezone: string;
  whatsapp_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
  google_maps_url?: string | null;
  youtube_url?: string | null;
  payment_methods_enabled: boolean | null;
  orange_money_phone: string | null;
  orange_money_name: string | null;
  mtn_momo_phone: string | null;
  mtn_momo_name: string | null;
  payment_instructions: string | null;
}

export interface PublicServiceData {
  id: string;
  name: string;
  description: string | null;
  category?: string | null;
  capacity?: number | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
}

export interface PublicPromoData {
  code: string;
  type: 'promo' | 'welcome' | 'referral';
  discount_type: 'percent' | 'fixed';
  value: number;
  valid_until: string | null;
}

interface PublicProfileViewProps {
  profile: PublicProfileData;
  services: PublicServiceData[];
  promos: PublicPromoData[];
  initials: string;
}

// ---------- Animations ----------

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

const revealCard: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 22, delay: i * 0.07 },
  }),
};

// ---------- Composants ----------

function ServiceCard({
  service, currency, slug, index, bookingLabel, theme,
}: {
  service: PublicServiceData;
  currency: string;
  slug: string;
  index: number;
  bookingLabel: string;
  theme: PublicTheme;
}) {
  return (
    <motion.div
      custom={index}
      variants={revealCard}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="h-full"
    >
      <Card className="group h-full overflow-hidden border-border/70 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-black/5">
        <CardContent className="flex h-full flex-col p-0">
          {/* Photo du service */}
          <Link
            href={`/${slug}/booking?service=${service.id}`}
            className="relative block aspect-[4/3] overflow-hidden"
          >
            {service.image_url ? (
              <img
                src={service.image_url}
                alt={service.name}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                loading={index < 2 ? 'eager' : 'lazy'}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${theme.heroVia}2E, ${theme.heroTo}4D)` }}
              >
                <ImageOff size={28} style={{ color: theme.primary }} className="opacity-60" />
              </div>
            )}
            {/* Badge prix */}
            <span className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold shadow-md backdrop-blur-sm ${theme.chipBg} ${theme.chipText}`}>
              {formatCurrency(service.price, currency)}
            </span>
            {/* Badge durée */}
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <Clock className="size-3" />
              {service.duration_minutes} min
            </span>
            {/* Badge capacité (table / groupe) */}
            {(service.capacity ?? 1) > 1 && (
              <span className={`absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold shadow-md backdrop-blur-sm ${theme.chipBg} ${theme.chipText}`}>
                <Users className="size-3" />
                {service.capacity} places
              </span>
            )}
          </Link>

          {/* Infos + CTA */}
          <div className="flex flex-1 flex-col gap-2 p-3.5">
            <h3 className="line-clamp-1 font-semibold leading-tight text-foreground">
              {service.name}
            </h3>
            {service.description && (
              <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            )}
            <Link
              href={`/${slug}/booking?service=${service.id}`}
              className="mt-auto inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-[var(--pt-primary)] font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--pt-primary-dark)] hover:shadow-md active:scale-[0.98]"
            >
              {bookingLabel}
              <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PromoCard({
  promo, slug, currency, theme, index,
}: {
  promo: PublicPromoData;
  slug: string;
  currency: string;
  theme: PublicTheme;
  index: number;
}) {
  const [copied, setCopied] = useState(false);

  const discountLabel =
    promo.discount_type === 'percent'
      ? `-${promo.value} %`
      : `-${Math.round(promo.value).toLocaleString('fr-FR')} ${currency}`;

  const typeLabel =
    promo.type === 'welcome' ? 'Offre de bienvenue'
      : promo.type === 'referral' ? 'Invitation'
        : 'Offre limitée';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <motion.div
      custom={index}
      variants={revealCard}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden border-border/70 shadow-sm" style={{ background: `linear-gradient(135deg, ${theme.heroVia}14, ${theme.heroTo}26)` }}>
        <CardContent className="flex h-full flex-col gap-2.5 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: theme.primary }}>
              <Gift className="size-3.5" />
              {typeLabel}
            </span>
            <span className="text-lg font-extrabold" style={{ color: theme.primaryDark }}>
              {discountLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            title="Copier le code"
            className={`group flex w-full items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 transition-colors ${theme.softBorder} bg-white/60 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10`}
          >
            <code className="font-mono text-sm font-bold tracking-widest text-foreground">
              {promo.code}
            </code>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copied ? 'Copié !' : 'Copier'}
            </span>
          </button>

          {promo.valid_until && (
            <p className="text-[11px] text-muted-foreground">
              Jusqu'au {new Date(promo.valid_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </p>
          )}

          <Link
            href={`/${slug}/booking?promo=${promo.code}`}
            className="mt-auto inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[var(--pt-primary)] text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--pt-primary-dark)] active:scale-[0.98]"
          >
            Profiter de l'offre
            <ChevronRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------- Vue principale ----------

export default function PublicProfileView({ profile, services, promos, initials }: PublicProfileViewProps) {
  const theme = getPublicTheme(profile.theme);
  const businessConfig = getBusinessType(profile.business_type);
  const BusinessIcon = businessConfig.icon;

  const announcement =
    profile.announcement?.enabled && profile.announcement.text?.trim()
      ? profile.announcement
      : null;

  // Regroupement du catalogue par catégorie
  const groupedServices = useMemo(() => {
    const groups: Array<{ category: string; services: PublicServiceData[] }> = [];
    const noCategory: PublicServiceData[] = [];
    for (const s of services) {
      const cat = (s.category || '').trim();
      if (cat) {
        let g = groups.find((x) => x.category === cat);
        if (!g) { g = { category: cat, services: [] }; groups.push(g); }
        g.services.push(s);
      } else {
        noCategory.push(s);
      }
    }
    if (noCategory.length > 0) groups.push({ category: '', services: noCategory });
    return groups;
  }, [services]);

  const hasCategoryGroups =
    groupedServices.length > 1 || (groupedServices[0]?.category ?? '') !== '';

  const socialLinks: Array<{ label: string; href: string; icon: React.ReactNode; bg: string }> = [];
  if (profile.whatsapp_url) socialLinks.push({ label: 'WhatsApp', href: profile.whatsapp_url, icon: <MessageCircle size={16} />, bg: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' });
  if (profile.facebook_url) socialLinks.push({ label: 'Facebook', href: profile.facebook_url, icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' });
  if (profile.instagram_url) socialLinks.push({ label: 'Instagram', href: profile.instagram_url, icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>, bg: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400' });
  if (profile.tiktok_url) socialLinks.push({ label: 'TikTok', href: profile.tiktok_url, icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 005.58 2.18V2.5a4.83 4.83 0 01-3.77 4.25h3.77z"/></svg>, bg: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100' });
  if (profile.google_maps_url) socialLinks.push({ label: 'Nous trouver', href: profile.google_maps_url, icon: <MapPin size={16} />, bg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' });
  if (profile.youtube_url) socialLinks.push({ label: 'YouTube', href: profile.youtube_url, icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.121 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.376-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, bg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' });
  if (profile.website_url) socialLinks.push({ label: 'Site web', href: profile.website_url, icon: <Globe size={16} />, bg: `${theme.chipBg} ${theme.chipText}` });

  const hasPaymentMethods = profile.payment_methods_enabled && (profile.orange_money_phone || profile.mtn_momo_phone);
  const whatsappLink = profile.whatsapp_url || (profile.phone ? `https://wa.me/${profile.phone.replace(/\D/g, '')}` : null);

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        ...themeCssVars(theme),
        backgroundImage: `linear-gradient(to bottom, ${theme.heroVia}14, transparent 340px)`,
      }}
    >
      {/* ======== BANDEAU D'ANNONCE (marketing) ======== */}
      {announcement && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-20 text-white"
          style={{ background: heroGradient(theme) }}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-2.5 sm:px-6">
            <motion.span
              aria-hidden
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
              className="shrink-0"
            >
              <Megaphone className="size-4" />
            </motion.span>
            <p className="text-sm font-medium leading-snug">{announcement.text}</p>
          </div>
        </motion.div>
      )}

      {/* ======== HERO ======== */}
      <header className="relative overflow-hidden text-white" style={{ background: heroGradient(theme) }}>
        {/* Bannière personnalisée (image de couverture) */}
        {profile.banner_url && (
          <>
            <img
              src={profile.banner_url}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${theme.heroFrom}D9, ${theme.heroVia}B3 50%, ${theme.heroTo}D9)` }}
            />
          </>
        )}

        {/* Décor animé : halos flottants */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -left-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl"
            animate={{ x: [0, 18, 0], y: [0, 12, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -right-20 top-10 size-56 rounded-full blur-3xl"
            style={{ backgroundColor: `${theme.heroTo}29` }}
            animate={{ x: [0, -14, 0], y: [0, 16, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 left-1/3 size-40 rounded-full bg-yellow-300/10 blur-2xl"
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative mx-auto max-w-2xl px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-12"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Avatar avec halo pulsant */}
            <motion.div variants={item} className="relative">
              <motion.span
                aria-hidden
                className="absolute -inset-1.5 rounded-full bg-white/25 blur-md"
                animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.06, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Avatar className="relative size-28 border-4 border-white/30 shadow-2xl sm:size-32">
                {profile.avatar_url
                  ? <AvatarImage src={profile.avatar_url} alt={profile.business_name} className="object-cover" />
                  : null}
                <AvatarFallback className="text-3xl font-bold text-white" style={{ backgroundColor: theme.heroFrom }}>{initials}</AvatarFallback>
              </Avatar>
              {/* Pastille "disponible" */}
              <span
                className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full border-[3px] shadow"
                style={{ backgroundColor: theme.primary, borderColor: theme.heroTo }}
                title="Disponible"
              >
                <CalendarCheck className="size-3 text-white" />
              </span>
            </motion.div>

            {/* Nom + badge vérifié */}
            <motion.div variants={item} className="flex flex-col items-center gap-1.5">
              <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight drop-shadow-sm sm:text-4xl">
                {profile.business_name}
                <Sparkles className="size-5 text-yellow-300 drop-shadow" aria-label="Professionnel vérifié" />
              </h1>
              {/* Badge métier */}
              {businessConfig.key !== 'other' && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 18 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
                >
                  <BusinessIcon className="size-3.5" />
                  {businessConfig.label}
                </motion.span>
              )}
              {profile.description && (
                <motion.p
                  className="max-w-md text-sm leading-relaxed text-white/95"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55, duration: 0.6 }}
                >
                  {profile.description}
                </motion.p>
              )}
            </motion.div>

            {/* Chips infos */}
            <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-2.5 text-sm">
              {profile.phone && (
                <motion.a
                  href={`tel:${profile.phone}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 font-medium backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  <Phone className="size-4" /><span>{profile.phone}</span>
                </motion.a>
              )}
              {hasPaymentMethods && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/25 px-3.5 py-2 font-medium text-yellow-50 backdrop-blur-sm">
                  <Wallet className="size-4" /><span>Paiement mobile disponible</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 font-medium backdrop-blur-sm">
                <MapPin className="size-4" />
                <span>Sur rendez-vous</span>
              </span>
            </motion.div>

            {/* CTA principaux */}
            <motion.div variants={item} className="mt-1 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <motion.a
                href="#services"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold shadow-lg transition-shadow hover:shadow-xl"
                style={{ color: theme.primaryDark }}
              >
                <CalendarCheck className="size-5" />
                Voir le catalogue ({services.length})
              </motion.a>
              {whatsappLink && (
                <motion.a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <MessageCircle className="size-5" />
                  Discuter sur WhatsApp
                </motion.a>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Vague de transition */}
        <svg aria-hidden viewBox="0 0 1440 64" className="relative block w-full fill-background align-bottom" preserveAspectRatio="none" style={{ height: 36 }}>
          <path d="M0,32 C240,64 480,0 720,16 C960,32 1200,64 1440,32 L1440,64 L0,64 Z" />
        </svg>
      </header>

      {/* ======== RÉSEAUX SOCIAUX ======== */}
      {socialLinks.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl px-4 pt-5 sm:px-6"
        >
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {socialLinks.map((s) => (
              <motion.a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.96 }}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-shadow hover:shadow-md ${s.bg}`}
              >
                {s.icon}
                {s.label}
              </motion.a>
            ))}
          </div>
        </motion.section>
      )}

      {/* ======== OFFRES DU MOMENT (marketing) ======== */}
      {promos.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-2xl px-4 pt-8 sm:px-6"
        >
          <div className="mb-4 flex items-center gap-2.5">
            <div className={`flex size-9 items-center justify-center rounded-xl ${theme.softBg}`} style={{ color: theme.primary }}>
              <Gift className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground sm:text-xl">Offres du moment</h2>
              <p className="text-xs text-muted-foreground">Réductions à utiliser lors de votre réservation</p>
            </div>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {promos.map((promo, i) => (
              <PromoCard
                key={promo.code}
                promo={promo}
                slug={profile.slug}
                currency={profile.currency}
                theme={theme}
                index={i}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* ======== CATALOGUE DE SERVICES ======== */}
      <main id="services" className="mx-auto max-w-2xl scroll-mt-4 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, x: -18 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className={`flex size-9 items-center justify-center rounded-xl ${theme.softBg}`} style={{ color: theme.primary }}>
              <BusinessIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground sm:text-xl">Notre catalogue</h2>
              <p className="text-xs text-muted-foreground">
                {services.length} {businessConfig.serviceNoun}{services.length > 1 ? 's' : ''} disponible{services.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={theme.chipBg ? `${theme.chipBg} ${theme.chipText}` : ''}>
            Réservation en ligne
          </Badge>
        </motion.div>

        {services.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className={`flex size-14 items-center justify-center rounded-full ${theme.softBg}`} style={{ color: theme.primary }}>
                  <CalendarCheck className="size-6" />
                </div>
                <p className="font-medium text-foreground">Aucun service disponible pour le moment</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Revenez bientôt ou contactez directement le professionnel pour prendre rendez-vous.
                </p>
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="mt-1 inline-flex items-center gap-2 rounded-lg bg-[var(--pt-primary)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[var(--pt-primary-dark)]"
                  >
                    <Phone className="size-4" /> Appeler
                  </a>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : hasCategoryGroups ? (
          /* Catalogue organisé par catégories */
          <div className="space-y-8">
            {groupedServices.map((group) => (
              <section key={group.category || 'general'}>
                <motion.div
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="mb-3.5 flex items-center gap-2.5"
                >
                  <span
                    className="h-7 w-1 rounded-full"
                    style={{ background: `linear-gradient(to bottom, ${theme.primary}, ${theme.heroTo})` }}
                  />
                  <h3 className="text-base font-bold text-foreground sm:text-lg">{group.category}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${theme.chipBg} ${theme.chipText}`}>
                    {group.services.length}
                  </span>
                </motion.div>
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4">
                  {group.services.map((service, i) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      currency={profile.currency}
                      slug={profile.slug}
                      index={i}
                      bookingLabel={businessConfig.bookingLabel}
                      theme={theme}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4">
            {services.map((service, i) => (
              <ServiceCard
                key={service.id}
                service={service}
                currency={profile.currency}
                slug={profile.slug}
                index={i}
                bookingLabel={businessConfig.bookingLabel}
                theme={theme}
              />
            ))}
          </div>
        )}
      </main>

      {/* ======== PAIEMENT MOBILE MONEY ======== */}
      {hasPaymentMethods && (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-2xl px-4 pb-10 sm:px-6"
        >
          <Card className="overflow-hidden border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <motion.div
                  className="flex size-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40"
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                >
                  <Star className="size-5 text-amber-600 dark:text-amber-400" />
                </motion.div>
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Paiement anticipé prioritaire</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">Payez en avance pour être prioritaire</p>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {profile.orange_money_phone && (
                  <motion.a
                    href={`tel:${profile.orange_money_phone}`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-between rounded-xl border border-orange-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md dark:border-orange-900/40 dark:bg-orange-950/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">OM</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Orange Money</p>
                        <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{profile.orange_money_phone}</p>
                      </div>
                    </div>
                    {profile.orange_money_name && (
                      <span className="text-xs text-muted-foreground">{profile.orange_money_name}</span>
                    )}
                  </motion.a>
                )}

                {profile.mtn_momo_phone && (
                  <motion.a
                    href={`tel:${profile.mtn_momo_phone}`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-between rounded-xl border border-yellow-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md dark:border-yellow-900/40 dark:bg-yellow-950/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
                        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">MTN</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">MTN Mobile Money</p>
                        <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">{profile.mtn_momo_phone}</p>
                      </div>
                    </div>
                    {profile.mtn_momo_name && (
                      <span className="text-xs text-muted-foreground">{profile.mtn_momo_name}</span>
                    )}
                  </motion.a>
                )}
              </div>

              {profile.payment_instructions && (
                <p className="mt-3.5 text-xs leading-relaxed text-amber-800 dark:text-amber-400">
                  {profile.payment_instructions}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* ======== FOOTER ======== */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl px-4 pb-10 pt-2 sm:px-6"
      >
        <div className="flex flex-col items-center gap-1.5 border-t border-border/60 pt-6 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            Propulsé par
            <span className="font-bold" style={{ color: theme.primary }}>Djola TikTak</span>
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Réservation en ligne simple et rapide
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
