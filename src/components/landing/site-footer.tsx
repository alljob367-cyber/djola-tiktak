'use client';

/* ============================================================
 * Pied de page professionnel — Djola TikTak
 * Colonnes Produit / Entreprise / Légal + paiements + réseaux
 * ============================================================ */

import Link from 'next/link';
import { CalendarCheck, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { PaymentLogosRow } from './payment-logos';

export function SiteFooter() {
  const { t } = useI18n();
  const F = t.landing.footerV2;

  const productLinks = [
    { label: F.product.features, href: '/#fonctionnalités' },
    { label: F.product.pricing, href: '/#tarifs' },
    { label: F.product.app, href: '/#application' },
    { label: F.product.industries, href: '/#métiers' },
    { label: F.product.faq, href: '/#faq' },
  ];

  const companyLinks = [
    { label: F.company.about, href: '/#à-propos' },
    { label: F.company.contact, href: 'mailto:contact@djola-tiktak.com' },
    { label: F.company.demo, href: '/register' },
    { label: F.company.affiliates, href: '/register' },
  ];

  const legalLinks = [
    { label: F.legal.mentions, href: '/legal/mentions-legales' },
    { label: F.legal.cgu, href: '/legal/cgu' },
    { label: F.legal.cgv, href: '/legal/cgv' },
    { label: F.legal.privacy, href: '/legal/confidentialite' },
    { label: F.legal.cookies, href: '/legal/cookies' },
  ];

  const socials = [
    { icon: Facebook, label: 'Facebook', href: 'https://facebook.com/djolatiktak' },
    { icon: Instagram, label: 'Instagram', href: 'https://instagram.com/djolatiktak' },
    { icon: Twitter, label: 'X (Twitter)', href: 'https://x.com/djolatiktak' },
    { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com/company/djola-tiktak' },
    { icon: Youtube, label: 'YouTube', href: 'https://youtube.com/@djolatiktak' },
  ];

  return (
    <footer className="border-t border-white/[0.06] bg-[#080c0a]">
      {/* ───── Bande réseaux sociaux ───── */}
      <div className="border-b border-white/[0.05] bg-gradient-to-r from-lime/[0.04] via-transparent to-lime/[0.04]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-3 px-6 py-4 lg:px-12">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
            {F.followUs}
          </span>
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={s.label}
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-gray-400 transition-all hover:-translate-y-0.5 hover:border-lime/40 hover:text-lime"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ───── Corps du footer ───── */}
      <div className="mx-auto max-w-[1280px] px-6 py-14 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Marque */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-lime/40 bg-lime/10">
                <CalendarCheck className="h-5 w-5 text-lime" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Djola <span className="text-lime">TikTak</span>
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-gray-500">
              {F.description}
            </p>

            {/* Contact */}
            <div className="mt-6 flex flex-col gap-2.5 text-[13px] text-gray-500">
              <span className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-lime/70" />
                {F.contact.address}
              </span>
              <a href="mailto:contact@djola-tiktak.com" className="flex items-center gap-2.5 transition-colors hover:text-gray-300">
                <Mail className="h-4 w-4 shrink-0 text-lime/70" />
                contact@djola-tiktak.com
              </a>
              <a href="tel:+237690000000" className="flex items-center gap-2.5 transition-colors hover:text-gray-300">
                <Phone className="h-4 w-4 shrink-0 text-lime/70" />
                +237 6 90 00 00 00
              </a>
            </div>
          </div>

          {/* Produit */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">{F.product.title}</h3>
            <ul className="mt-5 flex flex-col gap-3">
              {productLinks.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-[13px] text-gray-500 transition-colors hover:text-lime">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">{F.company.title}</h3>
            <ul className="mt-5 flex flex-col gap-3">
              {companyLinks.map((l) => (
                <li key={l.href + l.label}>
                  <a href={l.href} className="text-[13px] text-gray-500 transition-colors hover:text-lime">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">{F.legal.title}</h3>
            <ul className="mt-5 flex flex-col gap-3">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] text-gray-500 transition-colors hover:text-lime">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ───── Moyens de paiement ───── */}
        <div className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-6">
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
            {F.paymentsTitle}
          </p>
          <PaymentLogosRow />
          <p className="mt-4 text-center text-[11px] text-gray-600">
            {F.paymentsNote}
          </p>
        </div>
      </div>

      {/* ───── Barre du bas ───── */}
      <div className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row lg:px-12">
          <p className="text-[12px] text-gray-600">
            © {new Date().getFullYear()} Djola TikTak. {F.rights}
          </p>
          <div className="flex items-center gap-5">
            <p className="text-[12px] text-gray-600">
              {F.madeIn}
            </p>
            <LanguageSwitcher compact />
          </div>
        </div>
      </div>
    </footer>
  );
}
