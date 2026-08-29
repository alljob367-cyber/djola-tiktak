'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
  CalendarCheck,
  ArrowRight,
  Play,
  Clock,
  Bell,
  ShieldCheck,
  TrendingUp,
  Smartphone,
  Lock,
  Sparkles,
  Scissors,
  UtensilsCrossed,
  Store,
  Stethoscope,
  GraduationCap,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { AppMockups } from '@/components/landing/phone-mockups';
import { PacksMarquee } from '@/components/landing/packs-marquee';
import { FaqSection } from '@/components/landing/faq-section';
import { SiteFooter } from '@/components/landing/site-footer';

/* ──────────── ANIMATIONS ──────────── */

/** Apparition douce en cascade (au scroll) */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

/* ──────────── DATA (icônes ; textes via i18n) ──────────── */

const FEATURE_ICONS = [Clock, Bell, ShieldCheck, TrendingUp, Smartphone, Lock];
const INDUSTRY_ICONS = [Scissors, UtensilsCrossed, Stethoscope, Store, Sparkles, GraduationCap];
const INDUSTRY_IMAGES = [
  '/images/industries/salon.png',
  '/images/industries/restaurant.png',
  '/images/industries/pharmacie.png',
  '/images/industries/boutique.png',
  '/images/industries/sante.png',
  '/images/industries/formation.png',
];

const nextAppointments = [
  { time: '10:00', name: 'Marie L.' },
  { time: '11:30', name: 'Emma D.' },
  { time: '14:00', name: 'Sarah K.' },
  { time: '15:30', name: 'Aicha B.' },
];

const timeSlots = ['09:00', '11:00', '14:00', '15:00', '16:00'];

const calendarDays = [
  { d: 29, current: false }, { d: 30, current: false },
  { d: 1, current: true }, { d: 2, current: true }, { d: 3, current: true }, { d: 4, current: true }, { d: 5, current: true },
  { d: 6, current: true }, { d: 7, current: true }, { d: 8, current: true }, { d: 9, current: true }, { d: 10, current: true },
  { d: 11, current: true }, { d: 12, current: true }, { d: 13, current: true }, { d: 14, current: true }, { d: 15, current: true, selected: true },
  { d: 16, current: true }, { d: 17, current: true }, { d: 18, current: true }, { d: 19, current: true }, { d: 20, current: true },
  { d: 21, current: true }, { d: 22, current: true }, { d: 23, current: true }, { d: 24, current: true }, { d: 25, current: true },
  { d: 26, current: true }, { d: 27, current: true }, { d: 28, current: true }, { d: 29, current: true }, { d: 30, current: true },
  { d: 1, current: false }, { d: 2, current: false },
];

/* ──────────── COMPONENTS ──────────── */

function BookingWidget() {
  const { t } = useI18n();
  const w = t.landing.widget;
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-[#111816] p-6 shadow-2xl">
      {/* Glow effect animé */}
      <motion.div
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -inset-4 -z-10 rounded-3xl bg-lime/10 blur-[80px]"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white text-base font-semibold">{w.title}</h3>
        <span className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-gray-400 font-mono">
          votre-business.djola-tiktak.com
          <ExternalLink className="w-3 h-3" />
        </span>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left: Services */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">{w.chooseService}</p>
          <div className="flex flex-col gap-2">
            {w.services.map((s, idx) => (
              <label
                key={s.name}
                className={`relative flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                  idx === 0
                    ? 'border-lime/30 bg-lime/[0.08]'
                    : 'border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    idx === 0 ? 'border-lime' : 'border-white/30'
                  }`}
                >
                  {idx === 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-2 w-2 rounded-full bg-lime"
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${idx === 0 ? 'text-white' : 'text-gray-300'}`}>{s.name}</span>
                  <span className="text-xs text-gray-500">{s.duration} • {s.price}</span>
                </div>
              </label>
            ))}
          </div>
          <button className="mt-2 text-xs text-lime underline underline-offset-2">{w.seeAllServices}</button>
        </div>

        {/* Right: Calendar + Time */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">{w.chooseSlot}</p>

          {/* Mini calendar */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-white">{w.monthName}</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {w.days.map((d) => (
                <span key={d} className="text-[10px] text-gray-600 py-1">{d}</span>
              ))}
              {calendarDays.map((day, i) => (
                <span
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs mx-auto ${
                    day.selected
                      ? 'bg-lime text-black font-bold'
                      : day.current
                        ? 'text-white hover:bg-white/5'
                        : 'text-gray-700'
                  }`}
                >
                  {day.d}
                </span>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((t) => (
              <button
                key={t}
                className={`rounded-md py-2 text-xs font-medium transition-colors ${
                  t === '14:00'
                    ? 'border border-lime/50 text-lime'
                    : 'bg-white/[0.03] text-gray-300 hover:bg-white/[0.06]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── PAGE ──────────── */

export default function LandingPage() {
  const { t } = useI18n();
  const L = t.landing;

  /* Barre de progression du scroll */
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  const navLinks: Array<{ label: string; href: string }> = [
    { label: L.nav.home, href: '#accueil' },
    { label: L.nav.features, href: '#fonctionnalités' },
    { label: L.nav.pricing, href: '#tarifs' },
    { label: L.nav.about, href: '#à-propos' },
    { label: L.nav.faq, href: '#faq' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white">
      {/* ═══════ NAVBAR ═══════ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
        {/* Barre de progression */}
        <motion.div
          style={{ scaleX: progress }}
          className="absolute inset-x-0 top-0 h-0.5 origin-left bg-lime"
        />
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6 lg:px-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-lime/40 bg-lime/10"
            >
              <CalendarCheck className="h-5 w-5 text-lime" />
            </motion.div>
            <span className="text-lg font-bold tracking-tight text-white">
              Djola <span className="text-lime">TikTak</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-gray-400 transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              {L.nav.login}
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-lime px-6 py-2.5 text-sm font-semibold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]"
              >
                {L.nav.tryFree}
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section id="accueil" className="relative pt-32 pb-20 lg:pt-40 lg:pb-24">
        {/* Halos animés */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-lime/[0.04] blur-[120px]"
        />
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="pointer-events-none absolute left-0 top-0 h-[400px] w-[400px] rounded-full bg-emerald-500/[0.05] blur-[100px]"
        />

        <div className="relative mx-auto grid max-w-[1280px] gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-12">
          {/* Left — Copy (entrée en cascade) */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="flex flex-col justify-center"
          >
            <motion.span
              variants={fadeUp}
              className="mb-6 inline-flex w-fit items-center rounded-full bg-lime/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-lime"
            >
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-lime"
              />
              {L.hero.badge}
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-[1.1] tracking-tight"
            >
              {L.hero.titleA}
              <br />
              <span className="text-lime">{L.hero.titleB}</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
              {L.hero.subtitle}
            </motion.p>

            {/* Checklist */}
            <motion.ul variants={fadeUp} className="mt-8 flex flex-col gap-3">
              {L.hero.checks.map((item) => (
                <motion.li
                  key={item}
                  variants={fadeUp}
                  className="flex items-center gap-3 text-[15px] text-gray-200"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-lime" />
                  {item}
                </motion.li>
              ))}
            </motion.ul>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-lime px-7 py-3.5 text-[15px] font-bold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]"
                >
                  {L.hero.ctaPrimary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-white/5"
                >
                  <Play className="h-4 w-4" />
                  {L.hero.ctaSecondary}
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust line */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-6">
              <span className="text-[13px] text-gray-600">{L.hero.trustLine}</span>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['bg-amber-600', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'].map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + i * 0.12, type: 'spring', stiffness: 260 }}
                      className={`h-9 w-9 rounded-full ${c} ring-2 ring-[#0a0f0d] flex items-center justify-center text-[10px] font-bold text-white`}
                    >
                      {['AL', 'FC', 'KD', 'MN'][i]}
                    </motion.div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.3 + i * 0.08 }}
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      </motion.span>
                    ))}
                    <span className="ml-1 text-sm font-bold text-white">4,9/5</span>
                  </div>
                  <span className="text-[11px] text-gray-500">{L.hero.trustRating}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right — Booking Widget flottant */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.7, type: 'spring', stiffness: 50, damping: 16 }}
            className="hidden lg:block"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <BookingWidget />
            </motion.div>
          </motion.div>
        </div>

        {/* Indicateur de scroll */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="mt-14 flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-10 w-6 items-start justify-center rounded-full border border-white/15 p-1.5"
          >
            <div className="h-2 w-1 rounded-full bg-lime" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ BANDE DÉFILANTE DES PACKS ═══════ */}
      <PacksMarquee />

      {/* ═══════ FEATURES STRIP ═══════ */}
      <section id="fonctionnalités" className="border-b border-white/[0.06] bg-[#0d1210] py-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mx-auto grid max-w-[1280px] grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5 lg:px-12"
        >
          {L.features.cards.map((f, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group rounded-xl border border-white/[0.06] bg-[#111816] p-6 transition-colors hover:border-lime/20"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 200 }}
                >
                  <Icon className="h-7 w-7 text-lime" strokeWidth={1.5} />
                </motion.div>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-400">{f.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ═══════ APPLICATION MOBILE (MOCKUPS) ═══════ */}
      <section id="application" className="relative py-20 lg:py-24">
        {/* En-tête de section */}
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-lime/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-lime">
              <Smartphone className="h-3.5 w-3.5" />
              {L.appSection.badge}
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              {L.appSection.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-gray-400">
              {L.appSection.subtitle}
            </p>
          </motion.div>
        </div>

        {/* Téléphones animés */}
        <AppMockups />
      </section>

      {/* ═══════ PRO SHOWCASE ═══════ */}
      <section className="border-y border-white/[0.06] bg-[#0d1210] py-20 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-16 px-6 lg:grid-cols-2 lg:px-12">
          {/* Left — Image + Floating cards */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 50, damping: 16 }}
            className="relative"
          >
            {/* Main image placeholder */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2420] to-[#111816]">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-16 w-16 text-lime/30 mb-3" />
                </motion.div>
                <span className="text-sm">Photo professionnel</span>
              </div>

              {/* Floating card: RDV du jour */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 90 }}
                className="absolute top-[15%] -left-4 sm:-left-8 rounded-xl border border-white/[0.1] bg-[#111816]/95 p-4 backdrop-blur-xl shadow-xl"
              >
                <p className="text-[11px] uppercase tracking-wider text-gray-500">{L.showcase.todayAppointments}</p>
                <p className="mt-1 text-3xl font-bold text-white">12</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-lime" />
                  <span className="text-xs text-lime font-medium">{L.showcase.vsYesterday}</span>
                </div>
                {/* Sparkline SVG */}
                <svg className="mt-2 h-8 w-20" viewBox="0 0 80 30" fill="none">
                  <polyline
                    points="0,25 12,20 24,22 36,15 48,18 60,8 72,10 80,4"
                    stroke="#c8ff00"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>

              {/* Floating card: CA */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 90 }}
                className="absolute bottom-[20%] -left-4 sm:-left-6 rounded-xl border border-white/[0.1] bg-[#111816]/95 p-4 backdrop-blur-xl shadow-xl"
              >
                <p className="text-[11px] uppercase tracking-wider text-gray-500">{L.showcase.revenue}</p>
                <p className="mt-1 text-2xl font-bold text-white">250 000 CFA</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-lime" />
                  <span className="text-xs text-lime font-medium">{L.showcase.revenueGrowth}</span>
                </div>
              </motion.div>

              {/* Floating card: Next appointments */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 90 }}
                className="absolute -right-4 sm:-right-8 top-[25%] rounded-xl border border-white/[0.1] bg-[#111816]/95 p-4 backdrop-blur-xl shadow-xl"
              >
                <p className="mb-3 text-[11px] uppercase tracking-wider text-gray-500">{L.showcase.nextAppointments}</p>
                {nextAppointments.map((a, i) => (
                  <motion.div
                    key={a.time}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1 + i * 0.12 }}
                    className="flex items-center gap-2.5 py-1"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                    <span className="text-xs font-medium text-white">{a.time}</span>
                    <span className="text-xs text-gray-400">{a.name}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Right — Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 50, damping: 16 }}
          >
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-lime mb-5">
              {L.showcase.badge}
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
              {L.showcase.titleA}
              <br />
              {L.showcase.titleB}
            </h2>

            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-gray-400">
              {L.showcase.subtitle}
            </p>

            {/* Stats grid */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mt-10 grid grid-cols-2 gap-6"
            >
              {L.showcase.stats.map((s) => (
                <motion.div key={s.label} variants={fadeUp}>
                  <p className="text-3xl font-bold text-lime">{s.value}</p>
                  <p className="mt-1 text-[13px] text-gray-400">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-lime px-7 py-3.5 text-[15px] font-bold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]"
                >
                  {L.showcase.ctaPrimary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="#fonctionnalités"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-white/5"
                >
                  {L.showcase.ctaSecondary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ INDUSTRIES ═══════ */}
      <section id="métiers" className="py-20 lg:py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-lime mb-4">
              {L.industries.badge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold">{L.industries.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] text-gray-400">
              {L.industries.subtitle}
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {L.industries.items.map((ind, i) => {
              const Icon = INDUSTRY_ICONS[i];
              return (
              <motion.div
                key={ind.label}
                variants={fadeUp}
                whileHover={{ y: -8, transition: { duration: 0.25 } }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111816] transition-all hover:border-lime/20 hover:shadow-[0_0_40px_rgba(200,255,0,0.04)]"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={INDUSTRY_IMAGES[i]}
                    alt={ind.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111816] via-transparent to-transparent" />
                  {/* Icon badge */}
                  <div className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-xl border border-lime/30 bg-[#111816]/90 backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-lime" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white">{ind.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{ind.desc}</p>
                </div>
              </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="tarifs" className="border-t border-white/[0.06] bg-[#0d1210] py-20 lg:py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-lime mb-4">
              {L.pricing.badge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold">{L.pricing.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] text-gray-400">
              {L.pricing.subtitle}
            </p>
          </motion.div>

          {/* Plans grid */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {L.pricing.plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                whileHover={{ y: -8, transition: { duration: 0.25 } }}
                className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                  i === 1
                    ? 'border-lime/40 bg-[#111816] shadow-[0_0_60px_rgba(200,255,0,0.06)] lg:scale-[1.03]'
                    : 'border-white/[0.08] bg-[#111816] hover:border-white/15'
                }`}
              >
                {/* Badge */}
                {i === 1 && (
                  <motion.span
                    animate={{ boxShadow: ['0 0 0px rgba(200,255,0,0)', '0 0 20px rgba(200,255,0,0.3)', '0 0 0px rgba(200,255,0,0)'] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-black"
                  >
                    {L.pricing.popular}
                  </motion.span>
                )}

                {/* Plan name */}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{plan.desc}</p>

                {/* Price */}
                <div className="mt-6 flex items-baseline gap-1">
                  {plan.price ? (
                    <>
                      <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                      <span className="text-sm text-gray-500">FCFA{L.pricing.perMonth}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-extrabold text-white">{L.pricing.quote}</span>
                  )}
                </div>

                {/* Divider */}
                <div className="my-6 h-px bg-white/[0.06]" />

                {/* Features */}
                <ul className="flex flex-col gap-3 flex-1">
                  {plan.features.map((f, j) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + j * 0.06 }}
                      className="flex items-start gap-2.5 text-[14px]"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                      <span className="text-gray-300">{f}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-7">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href={i === 3 ? '#' : '/register'}
                      className={`inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-[14px] font-semibold transition-all ${
                        i === 1
                          ? 'bg-lime text-black hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]'
                          : 'border border-white/15 text-white hover:bg-white/5'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-10 text-center text-[13px] text-gray-600"
          >
            {L.pricing.note}
          </motion.p>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <FaqSection />

      {/* ═══════ BOTTOM CTA ═══════ */}
      <section id="à-propos" className="py-20">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 60, damping: 16 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111816] px-8 py-12 sm:px-14 sm:py-14"
          >
            {/* Halo animé */}
            <motion.div
              animate={{ x: ['-20%', '20%', '-20%'] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[500px] -translate-x-1/2 rounded-full bg-lime/[0.06] blur-[80px]"
            />
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">{L.cta.title}</h2>
                <p className="mt-3 max-w-lg text-[15px] text-gray-400">
                  {L.cta.subtitle}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-lg bg-lime px-7 py-3.5 text-[15px] font-bold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]"
                  >
                    {L.cta.primary}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="#"
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-white/5"
                  >
                    {L.cta.secondary}
                  </Link>
                </motion.div>
              </div>
            </div>
            <div className="relative mt-6 flex flex-wrap justify-center lg:justify-end gap-6 text-[12px] text-gray-600">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-lime/70" />
                {L.cta.noCard}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-lime/70" />
                {L.cta.demo}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FOOTER COMPLET ═══════ */}
      <SiteFooter />
    </div>
  );
}
