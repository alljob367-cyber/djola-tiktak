// ============================================================
// Codes promo — logique partagée (réductions, bienvenue, invitations)
// Utilisé par : /api/promo/validate, /api/bookings/public,
// dashboard (manager de codes), page publique (section Offres).
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export type PromoType = 'promo' | 'welcome' | 'referral';
export type PromoDiscountType = 'percent' | 'fixed';

export interface PromoCodeRecord {
  id: string;
  profile_id: string;
  code: string;
  type: PromoType;
  discount_type: PromoDiscountType;
  value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  show_on_page: boolean;
  created_at: string;
}

export const PROMO_TYPE_LABELS: Record<PromoType, string> = {
  promo: 'Réduction',
  welcome: 'Bienvenue',
  referral: 'Invitation',
};

/**
 * Recherche un code promo valide pour un profil donné.
 * - insensible à la casse
 * - actif
 * - dans la fenêtre de validité (dates incluses)
 * - pas épuisé (max_uses)
 * Retourne null si aucun code ne correspond.
 */
export async function findValidPromo(
  supabase: SupabaseClient,
  profileId: string,
  rawCode: string,
): Promise<PromoCodeRecord | null> {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code || code.length > 40) return null;

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('profile_id', profileId)
    .eq('code', code)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;
  const promo = data as PromoCodeRecord;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (promo.valid_from && today < promo.valid_from) return null;
  if (promo.valid_until && today > promo.valid_until) return null;
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return null;

  return promo;
}

/**
 * Calcule le montant de la remise pour un prix donné.
 * - percent : prix × valeur / 100 (arrondi à l'entier, FCFA sans centimes)
 * - fixed   : valeur plafonnée au prix (jamais de remise négative)
 */
export function computeDiscount(price: number, promo: Pick<PromoCodeRecord, 'discount_type' | 'value'>): number {
  const p = Math.max(0, Number(price) || 0);
  const v = Math.max(0, Number(promo.value) || 0);
  if (promo.discount_type === 'percent') {
    return Math.min(p, Math.round((p * Math.min(v, 100)) / 100));
  }
  return Math.min(p, Math.round(v));
}

/** Libellé court de la remise : "-20 %" ou "-1 000 FCFA". */
export function promoDiscountLabel(
  promo: Pick<PromoCodeRecord, 'discount_type' | 'value'>,
  currency = 'XAF',
): string {
  if (promo.discount_type === 'percent') {
    return `-${promo.value} %`;
  }
  const rounded = Math.round(Number(promo.value) || 0);
  return `-${rounded.toLocaleString('fr-FR')} ${currency}`;
}

/** Formatage simple du montant FCFA (1 000 XAF). */
export function formatAmount(amount: number, currency = 'XAF'): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} ${currency}`;
}

/** Normalise un code saisi : majuscules, sans espaces, A-Z 0-9 uniquement. */
export function normalizePromoCode(input: string): string {
  return (input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24);
}

/** Génère un code lisible, ex : DJOLA-7K2M */
export function generatePromoCode(prefix = 'PROMO'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans caractères ambigus (O, 0, I, 1)
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${normalizePromoCode(prefix).slice(0, 10) || 'PROMO'}-${suffix}`;
}
