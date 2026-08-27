// ============================================================
// Djola TikTak — Plan-based access restriction
// Admin users (ADMIN_EMAILS env var) bypass all limits.
// ============================================================

import { createServiceRoleClient, createClient } from '@/lib/supabase/server';
import type { Profile, PlanId } from '@/types/database';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// ── Default limits when DB plan_limits table is not available ──
const DEFAULT_LIMITS: Record<string, Record<PlanId, number>> = {
  max_services:              { starter: 5,   pro: -1, business: -1 },
  max_clients:               { starter: 200, pro: -1, business: -1 },
  max_appointments_per_day:  { starter: 50,  pro: 100, business: -1 },
  max_employees:             { starter: 1,   pro: 3,   business: 10 },
  max_calendars:             { starter: 1,   pro: 3,   business: -1 },
  voice_credits:             { starter: 50,  pro: 200, business: 500 },
};

export interface PlanGateResult {
  allowed: boolean;
  isAdmin: boolean;
  plan: PlanId;
  subscriptionStatus: string | null;
  limit: number;       // -1 = unlimited
  current: number;
  featureKey: string;
  message: string;
  upgradeUrl: string;
}

/**
 * Check if a user's email is in the admin list.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  if (ADMIN_EMAILS.length === 0) return false; // No admin list configured
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Check if a profile has an active or trialing subscription.
 * Returns true for admins regardless.
 */
export function hasActiveSubscription(profile: Profile): boolean {
  if (ADMIN_EMAILS.length === 0) return true; // No admin list = open access (dev mode)
  const status = profile.subscription_status;
  return status === 'active' || status === 'trialing';
}

/**
 * Server-side plan limit check.
 *
 * 1. Admin users → always allowed
 * 2. No subscription / expired / cancelled → blocked
 * 3. Check DB plan_limits table, fallback to DEFAULT_LIMITS
 * 4. Count current usage in real-time
 *
 * @returns PlanGateResult with `allowed` flag
 */
export async function checkPlanLimit(params: {
  profile: Profile;
  userEmail: string | null | undefined;
  featureKey: string;
  table: string;       // DB table to count (services, clients, appointments)
  profileIdColumn?: string; // defaults to 'profile_id'
  extraQuery?: (query: any) => any; // optional extra query modifiers
}): Promise<PlanGateResult> {
  const {
    profile,
    userEmail,
    featureKey,
    table,
    profileIdColumn = 'profile_id',
    extraQuery,
  } = params;

  const upgradeUrl = '/dashboard/billing';
  const plan = (profile.plan as PlanId) || 'starter';

  // ── Admin bypass ──
  if (isAdmin(userEmail)) {
    return {
      allowed: true,
      isAdmin: true,
      plan,
      subscriptionStatus: profile.subscription_status ?? null,
      limit: -1,
      current: 0,
      featureKey,
      message: '',
      upgradeUrl,
    };
  }

  // ── Check subscription status ──
  const subStatus = profile.subscription_status ?? null;
  if (!subStatus || subStatus === 'expired' || subStatus === 'cancelled' || subStatus === 'past_due') {
    return {
      allowed: false,
      isAdmin: false,
      plan,
      subscriptionStatus: subStatus,
      limit: 0,
      current: 0,
      featureKey,
      message: subStatus === 'expired'
        ? 'Votre abonnement a expiré. Renouvelez votre plan pour continuer.'
        : subStatus === 'cancelled'
          ? 'Votre abonnement a été annulé. Choisissez un plan pour continuer.'
          : 'Vous n\'avez pas d\'abonnement actif. Choisissez un plan pour continuer.',
      upgradeUrl,
    };
  }

  // ── Get the limit for this feature/plan ──
  let limitValue: number | null = null;

  try {
    const supabase = await createServiceRoleClient();
    const { data: planLimit } = await supabase
      .from('plan_limits')
      .select('limit_value')
      .eq('plan_id', plan)
      .eq('limit_key', featureKey)
      .maybeSingle();

    if (planLimit) {
      limitValue = planLimit.limit_value;
    }
  } catch {
    // plan_limits table might not exist yet, use defaults
  }

  // Fallback to defaults only when DB returned nothing
  if (limitValue === null && DEFAULT_LIMITS[featureKey]?.[plan] !== undefined) {
    limitValue = DEFAULT_LIMITS[featureKey][plan];
  } else if (limitValue === null) {
    // Feature not in defaults and not in DB → unlimited
    limitValue = -1;
  }

  // -1 means unlimited
  if (limitValue === -1) {
    return {
      allowed: true,
      isAdmin: false,
      plan,
      subscriptionStatus: subStatus,
      limit: -1,
      current: 0,
      featureKey,
      message: '',
      upgradeUrl,
    };
  }

  // ── Count current usage ──
  try {
    const supabase = await createServiceRoleClient();
    let query = supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(profileIdColumn, profile.id);

    if (extraQuery) {
      query = extraQuery(query);
    }

    const { count, error } = await query;

    if (error) {
      // On DB error, allow the action but log warning
      console.warn(`[plan-gate] Error counting ${table}:`, error.message);
      return { allowed: true, isAdmin: false, plan, subscriptionStatus: subStatus, limit: limitValue, current: 0, featureKey, message: '', upgradeUrl };
    }

    const current = count ?? 0;
    const allowed = current < limitValue;

    const featureLabels: Record<string, string> = {
      max_services: 'services',
      max_clients: 'clients',
      max_appointments_per_day: 'rendez-vous par jour',
      max_employees: 'professionnels',
      max_calendars: 'calendriers',
      voice_credits: 'crédits vocaux',
    };

    const label = featureLabels[featureKey] || featureKey;

    return {
      allowed,
      isAdmin: false,
      plan,
      subscriptionStatus: subStatus,
      limit: limitValue,
      current,
      featureKey,
      message: allowed
        ? ''
        : `Votre plan « ${plan} » est limité à ${limitValue} ${label}. Passez à un plan supérieur pour en ajouter plus.`,
      upgradeUrl,
    };
  } catch {
    // On error, allow action
    return { allowed: true, isAdmin: false, plan, subscriptionStatus: subStatus, limit: limitValue, current: 0, featureKey, message: '', upgradeUrl };
  }
}

/**
 * Convenience: require an active subscription or throw.
 * Admins always pass.
 */
export async function requireSubscription(profile: Profile, userEmail: string | null | undefined): Promise<void> {
  if (isAdmin(userEmail)) return;

  const status = profile.subscription_status;
  if (!status || status === 'expired' || status === 'cancelled' || status === 'past_due') {
    throw new PlanGateError(
      status === 'expired'
        ? 'Votre abonnement a expiré.'
        : 'Aucun abonnement actif. Veuillez choisir un plan.',
      'SUBSCRIPTION_REQUIRED',
      403,
    );
  }
}

export class PlanGateError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'PlanGateError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
