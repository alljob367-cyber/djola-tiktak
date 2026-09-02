'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, CalendarDays, TrendingUp } from 'lucide-react';

/**
 * Statistiques animées du tableau de bord Djola TikTak.
 * — Compteurs incrémentaux (easeOutExpo) déclenchés à l'apparition
 * — Entrée échelonnée (stagger) + effet de survol
 * — Accents lime de l'identité Djola en mode sombre
 */
export function AnimatedStats({
  totalClients,
  todayCount,
  monthlyRevenueLabel,
  clientsLabel,
  clientsSub,
  todayLabel,
  todaySub,
  revenueLabel,
  revenueSub,
}: {
  totalClients: number;
  todayCount: number;
  monthlyRevenueLabel: string;
  clientsLabel: string;
  clientsSub: string;
  todayLabel: string;
  todaySub: string;
  revenueLabel: string;
  revenueSub: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
      }}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <StatCard
        icon={Users}
        label={clientsLabel}
        sub={clientsSub}
        value={<CountUp value={totalClients} />}
        iconBg="bg-teal-600 dark:bg-[#c8ff00]/15"
        iconColor="text-white dark:text-[#c8ff00]"
      />
      <StatCard
        icon={CalendarDays}
        label={todayLabel}
        sub={todaySub}
        value={<CountUp value={todayCount} />}
        iconBg="bg-emerald-600 dark:bg-[#7ee08a]/15"
        iconColor="text-white dark:text-[#7ee08a]"
      />
      <StatCard
        icon={TrendingUp}
        label={revenueLabel}
        sub={revenueSub}
        value={<CountUpText text={monthlyRevenueLabel} />}
        iconBg="bg-teal-700 dark:bg-[#f5c518]/15"
        iconColor="text-white dark:text-[#f5c518]"
      />
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 18 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
      }}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="rounded-xl border border-border bg-card text-card-foreground shadow-sm"
    >
      <div className="p-4 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} transition-transform motion-reduce:transform-none`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Compteur numérique animé. */
function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setDisplay(value);
            return;
          }
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            setDisplay(Math.round(value * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display.toLocaleString('fr-FR')}</span>;
}

/** Anime l'affichage d'un montant formaté (ex. 56 000 FCFA)
 *  en incrémentant la partie numérique. */
function CountUpText({ text }: { text: string }) {
  // Sépare les chiffres du reste (espaces insécables inclus)
  const match = text.match(/^([\d\s\u202f.,]*\d)(.*)$/);
  if (!match) return <span>{text}</span>;
  const numericPart = match[1].replace(/[^\d]/g, '');
  const suffix = match[2];
  const target = Number(numericPart || '0');

  return (
    <span>
      <CountUp value={target} />
      <span className="text-lg font-semibold">{suffix}</span>
    </span>
  );
}
