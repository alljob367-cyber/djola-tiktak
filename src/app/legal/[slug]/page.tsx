'use client';

/* ============================================================
 * Pages légales dynamiques
 * /legal/mentions-legales | cgu | cgv | confidentialite | cookies
 * ============================================================ */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarCheck, FileText, ShieldCheck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import { SiteFooter } from '@/components/landing/site-footer';

export const LEGAL_SLUGS = ['mentions-legales', 'cgu', 'cgv', 'confidentialite', 'cookies'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export default function LegalPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const { t } = useI18n();
  const LG = t.legal;

  const doc = (LG.docs as Record<string, (typeof LG.docs)['cgu']>)[slug];

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white">
      {/* Navbar minimal */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[900px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-lime/40 bg-lime/10">
              <CalendarCheck className="h-5 w-5 text-lime" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Djola <span className="text-lime">TikTak</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {LG.backHome}
          </Link>
        </div>
      </nav>

      {/* Contenu */}
      <main className="mx-auto max-w-[900px] px-6 pb-20 pt-32">
        {doc ? (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* En-tête */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-lime/30 bg-lime/10">
                {slug === 'confidentialite' || slug === 'cookies' ? (
                  <ShieldCheck className="h-6 w-6 text-lime" />
                ) : (
                  <FileText className="h-6 w-6 text-lime" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white">{doc.title}</h1>
                <p className="mt-1 text-[13px] text-gray-500">
                  {LG.updatedLabel} : {doc.updated}
                </p>
              </div>
            </div>

            {/* Sections */}
            <div className="mt-10 flex flex-col gap-8">
              {doc.sections.map((section, i) => (
                <motion.section
                  key={section.h}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-2xl border border-white/[0.06] bg-[#0d1210] p-6 sm:p-8"
                >
                  <h2 className="flex items-start gap-3 text-lg font-bold text-white">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-lime/10 text-[11px] font-extrabold text-lime">
                      {i + 1}
                    </span>
                    {section.h}
                  </h2>
                  <div className="mt-4 flex flex-col gap-3 pl-9">
                    {section.p.map((paragraph, j) => (
                      <p key={j} className="text-[14px] leading-relaxed text-gray-400">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>
          </motion.article>
        ) : (
          /* Document introuvable */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.08] bg-[#0d1210] p-12 text-center"
          >
            <FileText className="mx-auto h-14 w-14 text-gray-600" />
            <h1 className="mt-5 text-2xl font-bold text-white">{LG.notFoundTitle}</h1>
            <p className="mx-auto mt-3 max-w-md text-[14px] text-gray-500">{LG.notFoundText}</p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-lime px-6 py-3 text-sm font-bold text-black transition-all hover:brightness-110"
            >
              <ArrowLeft className="h-4 w-4" />
              {LG.backHome}
            </Link>
          </motion.div>
        )}

        {/* Liens vers les autres documents légaux */}
        <div className="mt-14 border-t border-white/[0.06] pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-600">{LG.otherDocs}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {LEGAL_SLUGS.filter((s) => s !== slug).map((s) => {
              const other = (LG.docs as Record<string, (typeof LG.docs)['cgu']>)[s];
              if (!other) return null;
              return (
                <Link
                  key={s}
                  href={`/legal/${s}`}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-[13px] text-gray-400 transition-all hover:border-lime/40 hover:text-lime"
                >
                  {other.title}
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
