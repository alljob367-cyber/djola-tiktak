// ============================================================
// Reminder formatting — messages FR + normalisation E.164
// Partagé par les providers SMS / WhatsApp
// ============================================================

import type { ReminderPayload } from './types';

/**
 * Normalise un numéro de téléphone vers le format E.164 (+2376XXXXXXXX)
 * requis par Twilio, WhatsApp Cloud API et Africa's Talking.
 *
 * Gère : espaces, tirets, parenthèses, préfixes 00 / + / 237,
 * et les numéros locaux camerounais (9 chiffres commençant par 6).
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[\s\-().]/g, '');
  if (!digits) return null;

  // Déjà au format E.164
  if (/^\+\d{8,15}$/.test(digits)) return digits;

  // Préfixe international 00XX → +XX
  if (/^00\d{8,15}$/.test(digits)) return `+${digits.slice(2)}`;

  // Déjà préfixé par l'indicatif sans "+" (ex : 2376XXXXXXXX)
  const defaultCc = (process.env.DEFAULT_COUNTRY_CODE || '237').replace(/\D/g, '');
  if (new RegExp(`^${defaultCc}\\d{6,12}$`).test(digits)) {
    return `+${digits}`;
  }

  // Numéro local camerounais : 9 chiffres commençant par 6 (mobile)
  if (defaultCc === '237' && /^6\d{8}$/.test(digits)) {
    return `+237${digits}`;
  }

  // Autre numéro long sans indicatif — on tente l'indicatif par défaut
  if (/^\d{9,12}$/.test(digits)) {
    return `+${defaultCc}${digits}`;
  }

  // Format non reconnu — renvoyer tel quel (le fournisseur signalera l'erreur)
  return digits;
}

/** Formate la date/heure du RDV dans le fuseau du professionnel. */
export function formatReminderDateTime(date: Date, timezone: string): { date: string; time: string; full: string } {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  };
  let full: string;
  try {
    full = date.toLocaleDateString('fr-FR', opts);
  } catch {
    full = date.toLocaleDateString('fr-FR', { ...opts, timeZone: undefined });
  }
  try {
    const d = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone });
    const t = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
    return { date: d, time: t, full };
  } catch {
    return {
      date: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      full,
    };
  }
}

/** Prix compact pour SMS : "5 000 FCFA" / "10 €". */
export function formatReminderPrice(price: number, currency: string): string {
  try {
    if (currency === 'XAF' || currency === 'XOF') {
      return `${new Intl.NumberFormat('fr-FR').format(price)} FCFA`;
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

/** Message SMS court (≤ ~320 caractères, 1-2 segments). */
export function buildSmsMessage(payload: ReminderPayload): string {
  const { date, time } = formatReminderDateTime(payload.startsAt, payload.timezone);
  const price = formatReminderPrice(payload.servicePrice, payload.currency);
  const jour = date.charAt(0).toUpperCase() + date.slice(1);
  return (
    `Rappel RDV : ${payload.businessName} vous attend ${jour} a ${time} ` +
    `pour "${payload.serviceName}" (${price}). ` +
    `Merci d'arriver a l'heure. A bientot !`
  );
}

/** Message WhatsApp riche (retours à la ligne + emoji autorisés). */
export function buildWhatsAppMessage(payload: ReminderPayload): string {
  const { date, time } = formatReminderDateTime(payload.startsAt, payload.timezone);
  const price = formatReminderPrice(payload.servicePrice, payload.currency);
  const jour = date.charAt(0).toUpperCase() + date.slice(1);
  return (
    `🔔 *Rappel de rendez-vous*\n\n` +
    `Bonjour ${payload.clientName} 👋\n\n` +
    `${payload.businessName} vous attend :\n` +
    `📅 ${jour}\n` +
    `🕐 À ${time}\n` +
    `💅 Service : ${payload.serviceName}\n` +
    `💰 Prix : ${price}\n\n` +
    `Merci d'arriver quelques minutes en avance. À bientôt !`
  );
}
