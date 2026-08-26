// ============================================================
// Djola TikTak — Feature gating helper (LEGACY — prefer entitlementService)
// ============================================================

import type { Profile, PlanId } from '@/types/database';

export type FeatureKey = 'professionals_count' | 'services_count' | 'reminders_count';

export interface FeatureCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  message: string;
  upgradeUrl: string;
}

/**
 * Check if a profile can use a feature based on their current plan.
 * This is a simplified client-side check — the real enforcement
 * happens server-side via entitlementService.
 */
export function canUseFeature(
  profile: Profile,
  feature: FeatureKey,
  currentCount: number,
): FeatureCheckResult {
  // No active subscription means very limited access
  const planId: PlanId = profile.plan || 'starter';
  const subStatus = profile.subscription_status;

  // If expired or cancelled, block everything except viewing
  if (subStatus === 'expired' || subStatus === 'cancelled') {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      message: 'Votre abonnement a expiré. Renouvelez votre plan pour continuer.',
      upgradeUrl: '/dashboard/billing',
    };
  }

  // Default limits per plan (simplified — real limits in plan_limits table)
  const limits: Record<FeatureKey, Record<PlanId, number>> = {
    professionals_count: { starter: 1, pro: 3, business: 10 },
    services_count: { starter: 5, pro: -1, business: -1 },
    reminders_count: { starter: 50, pro: 200, business: 500 },
  };

  const limit = limits[feature]?.[planId] ?? 0;
  const isUnlimited = limit === -1;
  const allowed = isUnlimited || currentCount < limit;

  if (allowed) {
    return {
      allowed: true,
      limit,
      current: currentCount,
      message: '',
      upgradeUrl: '',
    };
  }

  const featureMessages: Record<FeatureKey, string> = {
    professionals_count: `Votre plan est limité à ${limit} professionnel(s). Passez à un plan supérieur pour en ajouter plus.`,
    services_count: `Votre plan est limité à ${limit} prestation(s). Passez à un plan supérieur pour en créer plus.`,
    reminders_count: `Vous avez atteint la limite de ${limit} rappels ce mois. Passez à un plan supérieur pour plus de rappels.`,
  };

  return {
    allowed: false,
    limit,
    current: currentCount,
    message: featureMessages[feature],
    upgradeUrl: '/dashboard/billing',
  };
}

/**
 * Simple boolean check without detailed messaging.
 */
export function hasFeature(
  profile: Profile,
  feature: FeatureKey,
  currentCount: number,
): boolean {
  return canUseFeature(profile, feature, currentCount).allowed;
}
