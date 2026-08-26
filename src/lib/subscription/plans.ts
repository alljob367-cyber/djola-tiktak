// ============================================================
// Djola TikTak — Plan definitions & utility functions
// NOTE: Les limites de chaque plan sont dans la table `plan_limits`
// en base de données. Ce fichier ne conserve que les infos
// commerciales et les utilitaires de formatage.
// ============================================================

import type { PlanId } from '@/types/database';

// ── Plan commercial data (fallback — source of truth is DB `plans` table) ──

interface PlanCommercial {
  name: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
}

const PLANS_DATA: Record<PlanId, PlanCommercial> = {
  starter: {
    name: 'Starter',
    price_monthly: 3000,
    price_yearly: 30000,
    description: 'Parfait pour démarrer votre activité de prise de rendez-vous.',
  },
  pro: {
    name: 'Pro',
    price_monthly: 10000,
    price_yearly: 100000,
    description: 'Pour les professionnels qui veulent automatiser et développer.',
  },
  business: {
    name: 'Business',
    price_monthly: 25000,
    price_yearly: 250000,
    description: 'Solution complète pour les entreprises.',
  },
};

/** Get plan commercial info by ID. Returns null if plan not found. */
export function getPlan(planId: PlanId): PlanCommercial | null {
  return PLANS_DATA[planId] ?? null;
}

/** Chariow product ID mapping (to be configured via env vars) */
export const CHARIOW_PRODUCT_IDS: Record<PlanId, string> = {
  starter: process.env.CHARIOW_PRODUCT_STARTER || 'starter_product_id',
  pro: process.env.CHARIOW_PRODUCT_PRO || 'pro_product_id',
  business: process.env.CHARIOW_PRODUCT_BUSINESS || 'business_product_id',
};

/** Ordered plan IDs from lowest to highest tier */
export const PLAN_ORDER: PlanId[] = ['starter', 'pro', 'business'];

/** Format price in FCFA */
export function formatPrice(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA';
}

/** Get the next tier plan (for upgrade suggestions) */
export function getNextPlan(currentPlan: PlanId): PlanId | null {
  const idx = PLAN_ORDER.indexOf(currentPlan);
  if (idx < PLAN_ORDER.length - 1) {
    return PLAN_ORDER[idx + 1];
  }
  return null;
}

/** Check if a plan tier is higher than another */
export function isHigherTier(a: PlanId, b: PlanId): boolean {
  return PLAN_ORDER.indexOf(a) > PLAN_ORDER.indexOf(b);
}

/** Calculate days remaining in subscription */
export function getDaysRemaining(subscriptionEnd: string | null): number | null {
  if (!subscriptionEnd) return null;
  const end = new Date(subscriptionEnd);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Check if subscription is currently active or in trial */
export function isSubscriptionActive(
  subscriptionStatus: string,
  subscriptionEnd: string | null,
): boolean {
  if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') return false;
  if (!subscriptionEnd) return false;
  return new Date(subscriptionEnd) > new Date();
}
