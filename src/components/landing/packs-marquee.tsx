'use client';

/* ============================================================
 * Bande défilante infinie (marquee) avec les packs tarifaires
 * ============================================================ */

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

/** Un pack dans la bande */
function PackPill({ name, price, highlight = false }: { name: string; price: string; highlight?: boolean }) {
  return (
    <div
      className={`mx-3 flex shrink-0 items-center gap-3 rounded-full border px-6 py-3 backdrop-blur-sm ${
        highlight
          ? 'border-lime/50 bg-lime/10 shadow-[0_0_30px_rgba(200,255,0,0.15)]'
          : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <Zap className={`h-4 w-4 ${highlight ? 'text-lime' : 'text-gray-500'}`} />
      <span className="text-sm font-bold tracking-wide text-white">{name}</span>
      <span className={`text-sm font-extrabold ${highlight ? 'text-lime' : 'text-gray-400'}`}>{price}</span>
    </div>
  );
}

/** Bande défilante complète */
export function PacksMarquee() {
  const { t } = useI18n();
  const M = t.landing.marquee;

  // Les packs (nom + prix courts) — répétés pour la boucle infinie
  const packs = M.packs.map((p) => ({
    name: p.name,
    price: p.price,
    highlight: p.highlight,
  }));
  // Double la liste pour un défilement sans couture
  const loop = [...packs, ...packs, ...packs];

  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0d1210] py-10">
      {/* Dégradés latéraux pour fondre les bords */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0a0f0d] to-transparent sm:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0a0f0d] to-transparent sm:w-40" />

      {/* Titre au-dessus */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-500"
      >
        {M.title}
      </motion.p>

      {/* Piste défilante */}
      <div className="relative flex overflow-hidden">
        <motion.div
          className="flex w-max"
          animate={{ x: ['0%', '-66.666%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        >
          {loop.map((p, i) => (
            <PackPill key={i} name={p.name} price={p.price} highlight={p.highlight} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
