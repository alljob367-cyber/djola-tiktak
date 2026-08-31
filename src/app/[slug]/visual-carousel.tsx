'use client';

// ============================================================
// Carrousel de visuels — page d'atterrissage publique
// ------------------------------------------------------------
// Met en valeur les photos des services dans un carrousel
// défilant (style Facebook) : image pleine largeur, nom du
// service, prix, durée + bouton « Réserver ».
// Défilement automatique (4,5 s), pause au survol, boucle,
// navigation tactile, flèches + points indicateurs.
// ============================================================

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, CalendarCheck, Camera } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';
import { formatCurrency } from '@/lib/availability/engine';
import type { PublicServiceData } from './public-profile-view';
import type { PublicTheme } from '@/lib/themes';

export interface VisualCarouselProps {
  /** Services avec photo (les autres sont exclus en amont) */
  slides: PublicServiceData[];
  slug: string;
  currency: string;
  bookingLabel: string;
  theme: PublicTheme;
  /** libellés i18n : titre, réserver, min, visuel */
  labels: {
    title: string;
    book: string;
    minutes: (n: number) => string;
    badge: string;
  };
}

const AUTOPLAY_MS = 4500;

export function VisualCarousel({
  slides,
  slug,
  currency,
  bookingLabel,
  theme,
  labels,
}: VisualCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi | undefined>(undefined);
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(slides.length);
  const [paused, setPaused] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Suivi de la slide active (points indicateurs)
  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  // Défilement automatique — en boucle, pause au survol/toucher
  React.useEffect(() => {
    if (paused || !api || slides.length < 2) return;
    timerRef.current = setInterval(() => {
      api.scrollNext();
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [api, paused, slides.length]);

  if (slides.length < 2) return null;

  return (
    <motion.section
      variants={revealSection}
      initial="hidden"
      animate="show"
      className="overflow-hidden rounded-xl border border-border/70 bg-card"
      aria-label={labels.title}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Titre */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Camera className="size-4" style={{ color: theme.primary }} />
          {labels.title}
        </h2>
        <span className="text-xs text-muted-foreground">
          {slides.length} {labels.badge}{slides.length > 1 ? 's' : ''}
        </span>
      </div>

      <Carousel
        opts={{ loop: true, align: 'start' }}
        setApi={setApi}
        className="mt-3"
      >
        <CarouselContent className="m-0">
          {slides.map((service) => (
            <CarouselItem key={service.id} className="pl-0 basis-full">
              <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/8]">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${theme.heroVia}40, ${theme.heroTo}66)` }}
                  >
                    <Camera className="size-10 opacity-40" style={{ color: theme.primary }} />
                  </div>
                )}

                {/* Dégradé + informations */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 pt-14">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      {service.category && (
                        <span
                          className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/95"
                          style={{ backgroundColor: theme.primary }}
                        >
                          {service.category}
                        </span>
                      )}
                      <h3 className="truncate text-base font-bold text-white drop-shadow-sm sm:text-lg">
                        {service.name}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-3 text-xs font-medium text-white/90">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {labels.minutes(service.duration_minutes)}
                        </span>
                        {service.price > 0 ? (
                          <span>{formatCurrency(service.price, currency)}</span>
                        ) : null}
                      </p>
                    </div>
                    <Link
                      href={`/${slug}/booking?service=${service.id}`}
                      className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.03] active:scale-[0.97]"
                      style={{ backgroundColor: theme.primary }}
                      aria-label={`${labels.book} — ${service.name}`}
                    >
                      <CalendarCheck className="size-4" />
                      <span className="hidden sm:inline">{labels.book}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Flèches (à l'intérieur, au-dessus de l'image) */}
        <CarouselPrevious
          className="left-2 top-1/2 z-10 h-9 w-9 border-white/30 bg-black/40 text-white hover:bg-black/60 hover:text-white sm:h-10 sm:w-10"
          aria-label="Visuel précédent"
        />
        <CarouselNext
          className="right-2 top-1/2 z-10 h-9 w-9 border-white/30 bg-black/40 text-white hover:bg-black/60 hover:text-white sm:h-10 sm:w-10"
          aria-label="Visuel suivant"
        />
      </Carousel>

      {/* Points indicateurs */}
      <div className="flex items-center justify-center gap-1.5 pb-3 pt-3" role="tablist" aria-label={labels.title}>
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={`Visuel ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === current ? 20 : 8,
              backgroundColor: i === current ? theme.primary : 'rgba(128,128,128,0.45)',
            }}
          />
        ))}
      </div>
    </motion.section>
  );
}

const revealSection = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 240, damping: 26 } },
};

export default VisualCarousel;
