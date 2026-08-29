'use client';

import Image from 'next/image';
import Link from 'next/link';
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
  Users,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from '@/i18n/language-switcher';

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

function LimeIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lime ${className || ''}`}>
      {children}
    </div>
  );
}

function BookingWidget() {
  const { t } = useI18n();
  const w = t.landing.widget;
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-[#111816] p-6 shadow-2xl">
      {/* Glow effect */}
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-lime/10 blur-[80px]" />

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
                  {idx === 0 && <div className="h-2 w-2 rounded-full bg-lime" />}
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
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6 lg:px-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-lime/40 bg-lime/10">
              <CalendarCheck className="h-5 w-5 text-lime" />
            </div>
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
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-lime px-6 py-2.5 text-sm font-semibold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]"
            >
              {L.nav.tryFree}
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28">
        {/* Radial glow behind widget */}
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-lime/[0.04] blur-[120px]" />

        <div className="relative mx-auto grid max-w-[1280px] gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-12">
          {/* Left — Copy */}
          <div className="flex flex-col justify-center">
            <span className="mb-6 inline-flex items-center rounded-full bg-lime/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-lime">
              {L.hero.badge}
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-[1.1] tracking-tight">
              {L.hero.titleA}
              <br />
              <span className="text-lime">{L.hero.titleB}</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
              {L.hero.subtitle}
            </p>

            {/* Checklist */}
            <ul className="mt-8 flex flex-col gap-3">
              {L.hero.checks.map((item) => (
                <li key={item} className="flex items-center gap-3 text-[15px] text-gray-200">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-lime" />
                  {item}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-lime px-7 py-3.5 text-[15px] font-bold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]"
              >
                {L.hero.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-white/5"
              >
                <Play className="h-4 w-4" />
                {L.hero.ctaSecondary}
              </Link>
            </div>

            {/* Trust line */}
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <span className="text-[13px] text-gray-600">
                {L.hero.trustLine}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['bg-amber-600', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'].map((c, i) => (
                    <div
                      key={i}
                      className={`h-9 w-9 rounded-full ${c} ring-2 ring-[#0a0f0d] flex items-center justify-center text-[10px] font-bold text-white`}
                    >
                      {['AL', 'FC', 'KD', 'MN'][i]}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-1 text-sm font-bold text-white">4,9/5</span>
                  </div>
                  <span className="text-[11px] text-gray-500">{L.hero.trustRating}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Booking Widget */}
          <div className="hidden lg:block">
            <BookingWidget />
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES STRIP ═══════ */}
      <section id="fonctionnalités" className="border-y border-white/[0.06] bg-[#0d1210] py-16">
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5 lg:px-12">
          {L.features.cards.map((f, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <div
                key={f.title}
                className="group rounded-xl border border-white/[0.06] bg-[#111816] p-6 transition-colors hover:border-white/[0.12]"
              >
                <Icon className="h-7 w-7 text-lime" strokeWidth={1.5} />
                <h3 className="mt-4 text-[15px] font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ PRO SHOWCASE ═══════ */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-16 px-6 lg:grid-cols-2 lg:px-12">
          {/* Left — Image + Floating cards */}
          <div className="relative">
            {/* Main image placeholder */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2420] to-[#111816]">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                <Sparkles className="h-16 w-16 text-lime/30 mb-3" />
                <span className="text-sm">Photo professionnel</span>
              </div>

              {/* Floating card: RDV du jour */}
              <div className="absolute top-[15%] -left-4 sm:-left-8 rounded-xl border border-white/[0.1] bg-[#111816]/95 p-4 backdrop-blur-xl shadow-xl">
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
              </div>

              {/* Floating card: CA */}
              <div className="absolute bottom-[20%] -left-4 sm:-left-6 rounded-xl border border-white/[0.1] bg-[#111816]/95 p-4 backdrop-blur-xl shadow-xl">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">{L.showcase.revenue}</p>
                <p className="mt-1 text-2xl font-bold text-white">250 000 CFA</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-lime" />
                  <span className="text-xs text-lime font-medium">{L.showcase.revenueGrowth}</span>
                </div>
              </div>

              {/* Floating card: Next appointments */}
              <div className="absolute -right-4 sm:-right-8 top-[25%] rounded-xl border border-white/[0.1] bg-[#111816]/95 p-4 backdrop-blur-xl shadow-xl">
                <p className="mb-3 text-[11px] uppercase tracking-wider text-gray-500">{L.showcase.nextAppointments}</p>
                {nextAppointments.map((a) => (
                  <div key={a.time} className="flex items-center gap-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                    <span className="text-xs font-medium text-white">{a.time}</span>
                    <span className="text-xs text-gray-400">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Content */}
          <div>
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
            <div className="mt-10 grid grid-cols-2 gap-6">
              {L.showcase.stats.map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-bold text-lime">{s.value}</p>
                  <p className="mt-1 text-[13px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-lime px-7 py-3.5 text-[15px] font-bold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]"
              >
                Essayer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#fonctionnalités"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-white/5"
              >
                Voir toutes les fonctionnalités
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ INDUSTRIES ═══════ */}
      <section className="border-y border-white/[0.06] py-20 lg:py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <div className="text-center">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-lime mb-4">
              {L.industries.badge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold">{L.industries.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] text-gray-400">
              {L.industries.subtitle}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {L.industries.items.map((ind, i) => {
              const Icon = INDUSTRY_ICONS[i];
              return (
              <div
                key={ind.label}
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
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="tarifs" className="py-20 lg:py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          {/* Header */}
          <div className="text-center">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-lime mb-4">
              {L.pricing.badge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold">{L.pricing.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] text-gray-400">
              {L.pricing.subtitle}
            </p>
          </div>

          {/* Plans grid */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {L.pricing.plans.map((plan, i) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                  i === 1
                    ? 'border-lime/40 bg-[#111816] shadow-[0_0_60px_rgba(200,255,0,0.06)] scale-[1.02]'
                    : 'border-white/[0.08] bg-[#111816] hover:border-white/15'
                }`}
              >
                {/* Badge */}
                {i === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-black">
                    {L.pricing.popular}
                  </span>
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
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={i === 3 ? '#' : '/register'}
                  className={`mt-7 inline-flex items-center justify-center rounded-lg px-6 py-3 text-[14px] font-semibold transition-all ${
                    i === 1
                      ? 'bg-lime text-black hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]'
                      : 'border border-white/15 text-white hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>

          {/* Bottom note */}
          <p className="mt-10 text-center text-[13px] text-gray-600">
            {L.pricing.note}
          </p>
        </div>
      </section>

      {/* ═══════ BOTTOM CTA ═══════ */}
      <section className="py-20">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
          <div className="rounded-2xl border border-white/[0.08] bg-[#111816] px-8 py-12 sm:px-14 sm:py-14">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">{L.cta.title}</h2>
                <p className="mt-3 max-w-lg text-[15px] text-gray-400">
                  {L.cta.subtitle}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-lg bg-lime px-7 py-3.5 text-[15px] font-bold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]"
                >
                  {L.cta.primary}
                </Link>
                <Link
                  href="#"
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-white/5"
                >
                  {L.cta.secondary}
                </Link>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center lg:justify-end gap-6 text-[12px] text-gray-600">
              <span>{L.cta.noCard}</span>
              <span>{L.cta.demo}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 sm:flex-row lg:px-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-lime/40 bg-lime/10">
              <CalendarCheck className="h-4 w-4 text-lime" />
            </div>
            <span className="text-sm font-semibold text-white">
              Djola <span className="text-lime">TikTak</span>
            </span>
          </Link>
          <p className="text-sm text-gray-600">{L.footer.tagline}</p>
        </div>
      </footer>
    </div>
  );
}
