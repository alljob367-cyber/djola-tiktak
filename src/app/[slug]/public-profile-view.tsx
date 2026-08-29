'use client';

// ============================================================
// Public Profile View — page vitrine STYLE FACEBOOK
// ------------------------------------------------------------
// Structure fidèle à une Page Facebook :
//   1. Photo de couverture (bannière) pleine largeur
//   2. Avatar chevauchant la couverture + nom + badge vérifié
//   3. Barre de boutons d'action (Réserver / WhatsApp / Appeler / Itinéraire / Partager)
//   4. Onglets : Accueil | Services | Offres | À propos
//   5. Colonne gauche : carte « Intro » (infos, contact, paiement, réseaux)
//   6. Colonne droite : fil (annonce en « post », offres, services par catégorie)
// v2.0.0 — refonte Facebook + i18n complet (fr/en/es extensible)
// ============================================================

import { motion, type Variants } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Clock, Phone, ChevronRight, MessageCircle, Globe, ImageOff,
  Wallet, Sparkles, CalendarCheck, MapPin, Users,
  Megaphone, Gift, Copy, Check, Share2, BadgeCheck, Home, LayoutGrid, Tag, Info,
} from 'lucide-react';
import { formatCurrency } from '@/lib/availability/engine';
import { getBusinessType } from '@/lib/business-types';
import { getPublicTheme, heroGradient, themeCssVars, type PublicTheme } from '@/lib/themes';
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from '@/i18n/language-switcher';

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

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 240, damping: 26 } },
};

const revealCard: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 22, delay: i * 0.05 },
  }),
};

type TabKey = 'home' | 'services' | 'offers' | 'about';

// ---------- Icônes réseaux (SVG inline) ----------

const FacebookIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const InstagramIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
);
const TikTokIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 005.58 2.18V2.5a4.83 4.83 0 01-3.77 4.25h3.77z"/></svg>
);
const YouTubeIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.121 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.376-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
);

// ============================================================
// Composants
// ============================================================

/** Carte de service — ALIGNEMENT HORIZONTAL (photo à gauche, contenu à droite) */
function ServiceCard({
  service, currency, slug, index, bookingLabel, theme, t,
}: {
  service: PublicServiceData;
  currency: string;
  slug: string;
  index: number;
  bookingLabel: string;
  theme: PublicTheme;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const P = t.public;
  return (
    <motion.article
      custom={index}
      variants={revealCard}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-30px' }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group flex overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5"
    >
      {/* Photo — à gauche */}
      <Link
        href={`/${slug}/booking?service=${service.id}`}
        className="relative block w-[38%] min-w-[110px] shrink-0 self-stretch overflow-hidden"
      >
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={service.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading={index < 3 ? 'eager' : 'lazy'}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${theme.heroVia}30, ${theme.heroTo}4D)` }}
          >
            <ImageOff size={26} style={{ color: theme.primary }} className="opacity-50" />
          </div>
        )}
        {/* Durée */}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Clock className="size-3" />
          {P.minutes(service.duration_minutes)}
        </span>
      </Link>

      {/* Contenu — à droite */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 font-semibold leading-snug text-foreground">{service.name}</h3>
        {service.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        )}
        {/* Bas : prix + bouton pleine largeur (aucune coupure) */}
        <div className="mt-auto flex flex-col gap-1.5 pt-1.5">
          <div className="flex items-center justify-between gap-2">
            {(service.capacity ?? 1) > 1 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Users className="size-3" />
                {P.capacity(service.capacity ?? 1)}
              </span>
            ) : <span />}
            <span
              className="truncate text-base font-extrabold leading-tight"
              style={{ color: theme.primaryDark }}
            >
              {formatCurrency(service.price, currency)}
            </span>
          </div>
          <Link
            href={`/${slug}/booking?service=${service.id}`}
            className="inline-flex min-h-[38px] w-full items-center justify-center gap-1 rounded-lg text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: theme.primary }}
          >
            <span className="truncate">{bookingLabel}</span>
            <ChevronRight className="size-4 shrink-0" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

/** Carte offre (code promo) — ALIGNEMENT HORIZONTAL compact */
function PromoCard({
  promo, slug, theme, index, t,
}: {
  promo: PublicPromoData;
  slug: string;
  theme: PublicTheme;
  index: number;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const P = t.public;
  const [copied, setCopied] = useState(false);

  const discountLabel =
    promo.discount_type === 'percent'
      ? `-${promo.value} %`
      : `-${Math.round(promo.value).toLocaleString('fr-FR')}`;

  const typeLabel =
    promo.type === 'welcome' ? P.promoWelcome
      : promo.type === 'referral' ? P.promoReferral
        : P.promoLimited;

  return (
    <motion.article
      custom={index}
      variants={revealCard}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-30px' }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{ borderColor: `${theme.primary}33`, background: `linear-gradient(135deg, ${theme.heroVia}12, ${theme.heroTo}20)` }}
    >
      <div className="flex items-center gap-3.5 p-3.5">
        {/* Bloc remise (gauche) */}
        <div
          className="flex w-[88px] shrink-0 flex-col items-center justify-center rounded-xl py-2.5"
          style={{ backgroundColor: `${theme.primary}17` }}
        >
          <span className="text-lg font-extrabold leading-none" style={{ color: theme.primaryDark }}>
            {discountLabel}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: theme.primary }}>
            <Gift className="size-3" />
            {typeLabel}
          </span>
        </div>

        {/* Code + validité (milieu) */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(promo.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch { /* ignore */ }
            }}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 transition-colors hover:bg-white/70 dark:hover:bg-white/10"
            style={{ borderColor: `${theme.primary}55` }}
          >
            <code className="truncate font-mono text-[13px] font-bold text-foreground">{promo.code}</code>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copied ? P.copied : P.copyCode}
            </span>
          </button>
          {promo.valid_until && (
            <p className="truncate text-[11px] text-muted-foreground">
              {P.validUntil(new Date(promo.valid_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }))}
            </p>
          )}
        </div>

        {/* CTA (droite) */}
        <Link
          href={`/${slug}/booking?promo=${promo.code}`}
          title={P.useOffer}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1 rounded-lg px-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] sm:px-4"
          style={{ backgroundColor: theme.primary }}
        >
          <span className="hidden md:inline">{P.useOffer}</span>
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </motion.article>
  );
}

// ============================================================
// Vue principale — structure Page Facebook
// ============================================================

export default function PublicProfileView({ profile, services, promos, initials }: PublicProfileViewProps) {
  const { t } = useI18n();
  const P = t.public;
  const theme = getPublicTheme(profile.theme);
  const businessConfig = getBusinessType(profile.business_type);
  const BusinessIcon = businessConfig.icon;
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [shareCopied, setShareCopied] = useState(false);

  const bookingHref = `/${profile.slug}/booking`;
  const whatsappLink = profile.whatsapp_url || (profile.phone ? `https://wa.me/${profile.phone.replace(/\D/g, '')}` : null);
  const hasPaymentMethods = profile.payment_methods_enabled && (profile.orange_money_phone || profile.mtn_momo_phone);

  // Regroupement par catégorie (catalogue organisé)
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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const tabs: Array<{ key: TabKey; label: string; count?: number; icon: React.ElementType }> = [
    { key: 'home', label: P.tabs.home, icon: Home },
    { key: 'services', label: P.tabs.services, count: services.length, icon: LayoutGrid },
    ...(promos.length > 0 ? [{ key: 'offers' as TabKey, label: P.tabs.offers, count: promos.length, icon: Tag }] : []),
    { key: 'about', label: P.tabs.about, icon: Info },
  ];

  return (
    <div
      className="min-h-screen bg-[#f0f2f5] dark:bg-background"
      style={themeCssVars(theme)}
      dir="ltr"
    >
      {/* ======== CARTE PRINCIPALE (style page Facebook — large) ======== */}
      <div className="mx-auto max-w-7xl px-0 pb-10 pt-0 sm:px-4 sm:pt-6">
        <div className="overflow-hidden bg-card shadow-md sm:rounded-xl">

          {/* ── 1. PHOTO DE COUVERTURE ── */}
          <div className="relative h-40 w-full sm:h-52 lg:h-60">
            {profile.banner_url ? (
              <>
                <img
                  src={profile.banner_url}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.heroFrom}55, ${theme.heroTo}BB)` }} />
              </>
            ) : (
              <div className="absolute inset-0" style={{ background: heroGradient(theme) }}>
                {/* Halos décoratifs */}
                <motion.div
                  aria-hidden
                  className="absolute -left-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
                  animate={{ x: [0, 14, 0] }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  aria-hidden
                  className="absolute -right-16 top-6 size-48 rounded-full bg-white/10 blur-3xl"
                  animate={{ x: [0, -10, 0] }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}
            {/* Sélecteur de langue (visiteur) */}
            <div className="absolute right-3 top-3 z-10">
              <LanguageSwitcher compact />
            </div>
          </div>

          {/* ── 2. EN-TÊTE : AVATAR + NOM + BOUTONS ── */}
          <div className="relative px-4 pb-3 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              {/* Avatar chevauchant la couverture */}
              <div className="flex items-end gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                  className="-mt-10 shrink-0 sm:-mt-12"
                >
                  <div className="rounded-2xl border-4 border-card bg-card shadow-lg" style={{ borderRadius: '1rem' }}>
                    <Avatar className="size-24 sm:size-28 lg:size-32" style={{ borderRadius: '0.85rem' }}>
                      {profile.avatar_url
                        ? <AvatarImage src={profile.avatar_url} alt={profile.business_name} className="object-cover" />
                        : null}
                      <AvatarFallback
                        className="text-3xl font-bold text-white"
                        style={{ backgroundColor: theme.primary, borderRadius: '0.85rem' }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </motion.div>

                {/* Nom + badge vérifié + catégorie */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" className="min-w-0 pb-1 pt-3 sm:pb-2">
                  <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                    <span className="truncate">{profile.business_name}</span>
                    <BadgeCheck className="size-6 shrink-0" style={{ color: theme.primary }} aria-label={P.verified} />
                  </h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    {businessConfig.key !== 'other' && (
                      <span className="inline-flex items-center gap-1.5">
                        <BusinessIcon className="size-4" style={{ color: theme.primary }} />
                        {businessConfig.label}
                      </span>
                    )}
                    <span aria-hidden className="hidden sm:inline">·</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarCheck className="size-3.5" />
                      {P.onAppointment}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Boutons d'action (barre Facebook) */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap items-center gap-2 pb-1"
              >
                <Link
                  href={bookingHref}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: theme.primary }}
                >
                  <CalendarCheck className="size-4" />
                  {P.bookNow}
                </Link>
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={P.whatsapp}
                    className="inline-flex size-[42px] items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
                  >
                    <MessageCircle className="size-4 text-emerald-600" />
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    title={P.call}
                    className="inline-flex size-[42px] items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
                  >
                    <Phone className="size-4" style={{ color: theme.primary }} />
                  </a>
                )}
                {profile.google_maps_url && (
                  <a
                    href={profile.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={P.itinerary}
                    className="inline-flex size-[42px] items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
                  >
                    <MapPin className="size-4 text-red-500" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  title={P.share}
                  className="inline-flex size-[42px] items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
                >
                  {shareCopied ? <Check className="size-4 text-emerald-500" /> : <Share2 className="size-4" />}
                </button>
              </motion.div>
            </div>
          </div>

          {/* ── 3. ONGLETTS (tabs Facebook) ── */}
          <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
            <div className="no-scrollbar flex overflow-x-auto px-2 sm:px-4" role="tablist" aria-label="Navigation">
              {tabs.map(({ key, label, count, icon: TabIcon }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(key)}
                    className="relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors"
                    style={{ color: active ? theme.primary : undefined }}
                  >
                    <TabIcon className={`size-4 ${active ? '' : 'text-muted-foreground'}`} style={active ? { color: theme.primary } : undefined} />
                    <span className={active ? '' : 'text-muted-foreground font-medium'}>{label}</span>
                    {typeof count === 'number' && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[11px] font-bold"
                        style={active
                          ? { backgroundColor: `${theme.primary}22`, color: theme.primary }
                          : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                      >
                        {count}
                      </span>
                    )}
                    {active && (
                      <motion.span
                        layoutId="public-tab-indicator"
                        className="absolute inset-x-2 bottom-0 h-[3px] rounded-full"
                        style={{ backgroundColor: theme.primary }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 4. CONTENU : colonne Intro + fil ── */}
          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[340px_1fr]">

            {/* ==== Colonne gauche : carte Intro ==== */}
            <aside className="space-y-4">
              <motion.section variants={fadeUp} initial="hidden" animate="show" className="rounded-xl border border-border/70 bg-card p-4">
                <h2 className="mb-3 text-base font-bold text-foreground">{P.introTitle}</h2>

                {profile.description && (
                  <p className="mb-4 text-sm leading-relaxed text-foreground/90">{profile.description}</p>
                )}

                <ul className="space-y-3 text-sm">
                  {profile.phone && (
                    <li className="flex items-center gap-2.5 text-foreground/90">
                      <Phone className="size-4 shrink-0" style={{ color: theme.primary }} />
                      <a href={`tel:${profile.phone}`} className="hover:underline">{profile.phone}</a>
                    </li>
                  )}
                  {hasPaymentMethods && (
                    <li className="flex items-center gap-2.5 text-foreground/90">
                      <Wallet className="size-4 shrink-0 text-amber-500" />
                      <span>{P.mobilePayment}</span>
                    </li>
                  )}
                  {profile.google_maps_url && (
                    <li className="flex items-center gap-2.5 text-foreground/90">
                      <MapPin className="size-4 shrink-0 text-red-500" />
                      <a href={profile.google_maps_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{P.findUs}</a>
                    </li>
                  )}
                  {profile.website_url && (
                    <li className="flex items-center gap-2.5 text-foreground/90">
                      <Globe className="size-4 shrink-0" style={{ color: theme.primary }} />
                      <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{P.website}</a>
                    </li>
                  )}
                </ul>

                {/* Réseaux sociaux */}
                {(profile.whatsapp_url || profile.facebook_url || profile.instagram_url || profile.tiktok_url || profile.youtube_url) && (
                  <>
                    <div className="my-3 h-px bg-border" />
                    <div className="flex flex-wrap gap-2">
                      {profile.whatsapp_url && (
                        <a href={profile.whatsapp_url} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="inline-flex size-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition-transform hover:scale-105 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <MessageCircle className="size-4" />
                        </a>
                      )}
                      {profile.facebook_url && (
                        <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" title="Facebook" className="inline-flex size-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-transform hover:scale-105 dark:bg-blue-950/40 dark:text-blue-400">
                          <FacebookIcon />
                        </a>
                      )}
                      {profile.instagram_url && (
                        <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" title="Instagram" className="inline-flex size-9 items-center justify-center rounded-full bg-pink-100 text-pink-700 transition-transform hover:scale-105 dark:bg-pink-950/40 dark:text-pink-400">
                          <InstagramIcon />
                        </a>
                      )}
                      {profile.tiktok_url && (
                        <a href={profile.tiktok_url} target="_blank" rel="noopener noreferrer" title="TikTok" className="inline-flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-900 transition-transform hover:scale-105 dark:bg-gray-800 dark:text-gray-100">
                          <TikTokIcon />
                        </a>
                      )}
                      {profile.youtube_url && (
                        <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer" title="YouTube" className="inline-flex size-9 items-center justify-center rounded-full bg-red-100 text-red-700 transition-transform hover:scale-105 dark:bg-red-950/40 dark:text-red-400">
                          <YouTubeIcon />
                        </a>
                      )}
                    </div>
                  </>
                )}

                {/* CTA Intro */}
                <Link
                  href={bookingHref}
                  className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: theme.primary }}
                >
                  <CalendarCheck className="size-4" />
                  {P.bookNow}
                </Link>
              </motion.section>

              {/* Bloc codes promo (mini) dans Intro */}
              {promos.length > 0 && (
                <motion.section variants={fadeUp} initial="hidden" animate="show" className="rounded-xl border border-border/70 bg-card p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                    <Gift className="size-4" style={{ color: theme.primary }} />
                    {P.offersTitle}
                  </h3>
                  <ul className="space-y-1.5">
                    {promos.slice(0, 4).map((p) => (
                      <li key={p.code} className="flex items-center justify-between gap-2 text-sm">
                        <code className="font-mono font-bold text-foreground">{p.code}</code>
                        <span className="font-bold" style={{ color: theme.primaryDark }}>
                          {p.discount_type === 'percent' ? `-${p.value}%` : `-${Math.round(p.value).toLocaleString('fr-FR')}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.section>
              )}
            </aside>

            {/* ==== Colonne droite : fil de contenu ==== */}
            <main className="min-w-0 space-y-5">
              {(activeTab === 'home' || activeTab === 'offers') && profile.announcement?.enabled && profile.announcement.text?.trim() && (
                <motion.article variants={fadeUp} initial="hidden" animate="show" className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                  <header className="mb-3 flex items-center gap-3">
                    <Avatar className="size-10">
                      {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.business_name} /> : null}
                      <AvatarFallback className="text-sm font-bold text-white" style={{ backgroundColor: theme.primary }}>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-foreground">{profile.business_name}</p>
                      <p className="text-xs text-muted-foreground">{profile.business_name} {P.announcementPosted} 📢</p>
                    </div>
                    <Megaphone className="ml-auto size-5 shrink-0" style={{ color: theme.primary }} />
                  </header>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{profile.announcement.text}</p>
                </motion.article>
              )}

              {/* ── OFFRES ── */}
              {(activeTab === 'home' || activeTab === 'offers') && promos.length > 0 && (
                <motion.section variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                    <Gift className="size-5" style={{ color: theme.primary }} />
                    {P.offersTitle}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {promos.map((promo, i) => (
                      <PromoCard key={promo.code} promo={promo} slug={profile.slug} theme={theme} index={i} t={t} />
                    ))}
                  </div>
                </motion.section>
              )}
              {activeTab === 'offers' && promos.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  {P.offersEmpty}
                </div>
              )}

              {/* ── SERVICES (catalogue organisé par catégorie) ── */}
              {(activeTab === 'home' || activeTab === 'services') && (
                <motion.section variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                      <Sparkles className="size-5" style={{ color: theme.primary }} />
                      {P.servicesTitle}
                      <span className="text-sm font-medium text-muted-foreground">({P.servicesCount(services.length)})</span>
                    </h2>
                  </div>

                  {services.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                      <ImageOff className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                      <h3 className="font-semibold text-foreground">{P.noServicesTitle}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{P.noServicesDesc}</p>
                    </div>
                  ) : (
                    groupedServices.map((group) => (
                      <div key={group.category || '_none'} className="space-y-3">
                        {group.category && (
                          <div className="flex items-center gap-2.5">
                            <span className="h-5 w-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                            <h3 className="text-base font-bold text-foreground">{group.category}</h3>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              {group.services.length}
                            </span>
                          </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                          {group.services.map((service, i) => (
                            <ServiceCard
                              key={service.id}
                              service={service}
                              currency={profile.currency}
                              slug={profile.slug}
                              index={i}
                              bookingLabel={businessConfig.bookingLabel}
                              theme={theme}
                              t={t}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </motion.section>
              )}

              {/* ── À PROPOS ── */}
              {activeTab === 'about' && (
                <motion.section variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
                  <div className="rounded-xl border border-border/70 bg-card p-5">
                    <h2 className="mb-3 text-base font-bold text-foreground">{P.aboutDesc}</h2>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {profile.description || `${profile.business_name} — ${businessConfig.label}. ${P.onAppointment}.`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-5">
                    <h2 className="mb-3 text-base font-bold text-foreground">{P.aboutContact}</h2>
                    <ul className="space-y-2.5 text-sm">
                      {profile.phone && (
                        <li className="flex items-center gap-2.5"><Phone className="size-4" style={{ color: theme.primary }} /><a href={`tel:${profile.phone}`} className="hover:underline">{profile.phone}</a></li>
                      )}
                      {whatsappLink && (
                        <li className="flex items-center gap-2.5"><MessageCircle className="size-4 text-emerald-600" /><a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{P.whatsapp}</a></li>
                      )}
                      {profile.google_maps_url && (
                        <li className="flex items-center gap-2.5"><MapPin className="size-4 text-red-500" /><a href={profile.google_maps_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{P.itinerary}</a></li>
                      )}
                    </ul>
                  </div>
                  {hasPaymentMethods && (
                    <div className="rounded-xl border border-border/70 bg-card p-5">
                      <h2 className="mb-3 text-base font-bold text-foreground">{P.aboutPayments}</h2>
                      <div className="flex flex-wrap gap-2">
                        {profile.orange_money_phone && (
                          <span className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-400">
                            Orange Money
                          </span>
                        )}
                        {profile.mtn_momo_phone && (
                          <span className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-sm font-semibold text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-400">
                            MTN MoMo
                          </span>
                        )}
                      </div>
                      {profile.payment_instructions && (
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{profile.payment_instructions}</p>
                      )}
                    </div>
                  )}
                </motion.section>
              )}
            </main>
          </div>

          {/* ── 5. Pied de carte ── */}
          <div className="flex flex-col items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <span>{P.poweredBy} <span className="font-bold" style={{ color: theme.primary }}>Djola TikTak</span></span>
            <span>{profile.business_name} · {businessConfig.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
