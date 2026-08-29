'use client';

/* ============================================================
 * Section FAQ — Questions fréquentes (landing page)
 * Accordéon animé (framer-motion), 2 colonnes sur desktop.
 * Contenu traduit via i18n (landing.faq) — fr/en/es.
 * ============================================================ */

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HelpCircle, Mail } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { COMPANY } from '@/lib/company';

export function FaqSection() {
  const { t } = useI18n();
  const F = t.landing.faq;
  // La 1re question est ouverte par défaut
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const items = F.items;

  return (
    <section id="faq" className="relative border-b border-white/[0.06] bg-[#0d1210] py-20 lg:py-24">
      {/* Halo décoratif */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[600px] -translate-x-1/2 rounded-full bg-lime/[0.05] blur-[100px]"
      />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        {/* ── En-tête de section ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/[0.08] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-lime">
            <HelpCircle className="h-3.5 w-3.5" />
            {F.badge}
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {F.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-gray-400">
            {F.subtitle}
          </p>
        </motion.div>

        {/* ── Grille de questions (2 colonnes desktop) ── */}
        <div className="mt-12 grid items-start gap-4 lg:grid-cols-2">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: (i % 2) * 0.08 }}
                className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
                  isOpen
                    ? 'border-lime/30 bg-[#111816]'
                    : 'border-white/[0.06] bg-[#111816] hover:border-white/[0.14]'
                }`}
              >
                {/* Bouton question */}
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-extrabold transition-colors ${
                        isOpen ? 'bg-lime/15 text-lime' : 'bg-white/[0.05] text-gray-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`text-[15px] font-semibold ${isOpen ? 'text-white' : 'text-gray-300'}`}>
                      {item.q}
                    </span>
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="shrink-0 text-gray-500"
                  >
                    <ChevronDown className={`h-4.5 w-4.5 ${isOpen ? 'text-lime' : ''}`} />
                  </motion.span>
                </button>

                {/* Réponse animée */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <p className="px-5 pb-5 pl-[60px] text-[13.5px] leading-relaxed text-gray-400 sm:px-6 sm:pb-6 sm:pl-[64px]">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* ── Bloc contact final ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-10 flex flex-col items-center justify-between gap-5 rounded-2xl border border-white/[0.06] bg-[#111816] px-8 py-7 sm:flex-row"
        >
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-bold text-white">{F.stillQuestion}</h3>
            <p className="mt-1 text-[13px] text-gray-500">{F.stillText}</p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="shrink-0">
            <a
              href={`mailto:${COMPANY.email}`}
              className="inline-flex items-center gap-2 rounded-lg bg-lime px-6 py-3 text-sm font-bold text-black transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(184,255,57,0.25)]"
            >
              <Mail className="h-4 w-4" />
              {F.contactCta}
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
