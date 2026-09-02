'use client';

// ============================================================
// Djola TikTak — Bouton flottant "Réserver via WhatsApp"
// ============================================================
// Ouvre le bot de réservation avec un message prérempli :
//   "RDV <slug>" → le bot enchaîne service → créneau → confirmation.
//
// Affiché uniquement si NEXT_PUBLIC_WHATSAPP_BOOKING_NUMBER est
// configuré (numéro WhatsApp Business de la plateforme, celui
// connecté à Meta Cloud API). Indépendant du WhatsApp personnel
// du commerce déjà présent sur la page.
// ============================================================

import { WhatsAppBotIcon } from './icons-whatsapp';

interface WhatsAppBookingButtonProps {
  slug: string;
  /** Libellé affiché (i18n géré par l'appelant si besoin) */
  label?: string;
}

export function WhatsAppBookingButton({
  slug,
  label = 'Réserver via WhatsApp',
}: WhatsAppBookingButtonProps) {
  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_NUMBER;

  if (!botNumber) return null;

  const href = `https://wa.me/${botNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`RDV ${slug}`)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed bottom-4 left-4 z-40 inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition-all hover:scale-105 hover:bg-[#1EBE5B] active:scale-95"
    >
      <WhatsAppBotIcon className="size-5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">RDV</span>
    </a>
  );
}
