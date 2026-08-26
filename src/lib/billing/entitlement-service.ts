/**
 * Entitlement Service — server-side only.
 *
 * Provides methods to check whether a profile is allowed to use
 * a given feature based on its current plan, subscription status,
 * and consumed usage.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Subscription, UsageSummaryItem } from '@/types/database';
import { BillingServiceError } from './types';
import type {
  EntitlementCheckResult,
  ConsumptionAlertLevel,
  ProfileEntitlements,
} from './types';

// ── Helpers ──────────────────────────────────────────────────

const UPGRADE_URL = '/dashboard/billing';

/**
 * Resolves the current period start for a subscription.
 * Falls back to the subscription's current_period_start column.
 */
function getPeriodStart(subscription: Subscription | null): string {
  if (!subscription) return new Date(0).toISOString();
  return subscription.current_period_start;
}

// ── Service ──────────────────────────────────────────────────

export const entitlementService = {
  /**
   * Fetches a full entitlement snapshot for a profile.
   *
   * Combines profile data, active subscription, and per-feature
   * usage from the `get_usage_summary` RPC.
   *
   * @param profileId - The UUID of the profile.
   * @returns A {@link ProfileEntitlements} object.
   */
  async getProfileEntitlements(profileId: string): Promise<ProfileEntitlements> {
    const supabase = await createServiceRoleClient();

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan, subscription_status, subscription_start, subscription_end, subscription_id')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      throw new BillingServiceError(
        `Profile not found: ${profileId}`,
        'PROFILE_NOT_FOUND',
        404,
        { profileId },
      );
    }

    // Fetch active subscription (trialing or active)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('profile_id', profileId)
      .in('status', ['trialing', 'active'])
      .maybeSingle();

    if (subError) {
      throw new BillingServiceError(
        `Failed to fetch subscription for profile ${profileId}`,
        'SUBSCRIPTION_FETCH_FAILED',
        500,
        { originalError: subError.message },
      );
    }

    // Fetch usage summary via RPC
    const { data: usageData, error: usageError } = await supabase.rpc(
      'get_usage_summary',
      { p_profile_id: profileId },
    );

    if (usageError) {
      throw new BillingServiceError(
        `Failed to fetch usage summary for profile ${profileId}`,
        'USAGE_SUMMARY_FAILED',
        500,
        { originalError: usageError.message },
      );
    }

    const summaryItems: UsageSummaryItem[] = (usageData ?? []) as UsageSummaryItem[];

    // Build per-feature entitlement results
    const limits: EntitlementCheckResult[] = summaryItems.map((item) => {
      const isUnlimited = item.limit_value === -1;
      const current = item.current_usage;
      const remaining = isUnlimited ? Infinity : Math.max(0, item.limit_value - current);

      return {
        allowed: isUnlimited || current < item.limit_value,
        limit: item.limit_value,
        current,
        remaining,
        upgradeUrl: UPGRADE_URL,
      };
    });

    return {
      plan: {
        id: profile.plan,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            billingPeriod: subscription.billing_period,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          }
        : null,
      trial: {
        isTrial: subscription?.status === 'trialing',
        trialStart: subscription?.trial_start ?? null,
        trialEnd: subscription?.trial_end ?? null,
      },
      limits,
    };
  },

  /**
   * Checks whether a profile is allowed to use a specific feature.
   *
   * @param profileId - The UUID of the profile.
   * @param featureKey - The plan limit key (e.g. 'voice_credits').
   * @returns An {@link EntitlementCheckResult}.
   */
  async canUseFeature(
    profileId: string,
    featureKey: string,
  ): Promise<EntitlementCheckResult> {
    const supabase = await createServiceRoleClient();

    // Fetch profile to check subscription status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan, subscription_status, subscription_end')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      throw new BillingServiceError(
        `Profile not found: ${profileId}`,
        'PROFILE_NOT_FOUND',
        404,
        { profileId },
      );
    }

    // Reject expired or cancelled subscriptions
    if (
      profile.subscription_status === 'expired' ||
      profile.subscription_status === 'cancelled'
    ) {
      return {
        allowed: false,
        limit: 0,
        current: 0,
        remaining: 0,
        message: `Subscription is ${profile.subscription_status}. Please renew your plan.`,
        upgradeUrl: UPGRADE_URL,
      };
    }

    // Fetch plan limit for the feature
    const { data: planLimit, error: limitError } = await supabase
      .from('plan_limits')
      .select('limit_key, limit_value, unit_label')
      .eq('plan_id', profile.plan)
      .eq('limit_key', featureKey)
      .maybeSingle();

    if (limitError) {
      throw new BillingServiceError(
        `Failed to fetch plan limits for feature ${featureKey}`,
        'PLAN_LIMIT_FETCH_FAILED',
        500,
        { originalError: limitError.message, featureKey },
      );
    }

    // If there is no plan limit row, the feature is not gated
    if (!planLimit) {
      return {
        allowed: true,
        limit: -1,
        current: 0,
        remaining: Infinity,
        message: 'Feature not gated by plan limits.',
      };
    }

    const isUnlimited = planLimit.limit_value === -1;

    // Fetch active subscription for period start
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, current_period_start')
      .eq('profile_id', profileId)
      .in('status', ['trialing', 'active'])
      .maybeSingle();

    const periodStart = getPeriodStart(subscription as Subscription | null);

    // Count current usage for this feature in the current period
    const { count, error: countError } = await supabase
      .from('usage_records')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('usage_type', featureKey)
      .in('status', ['reserved', 'completed'])
      .gte('created_at', periodStart);

    if (countError) {
      throw new BillingServiceError(
        `Failed to count usage for feature ${featureKey}`,
        'USAGE_COUNT_FAILED',
        500,
        { originalError: countError.message, featureKey },
      );
    }

    const current = count ?? 0;
    const remaining = isUnlimited ? Infinity : Math.max(0, planLimit.limit_value - current);
    const allowed = isUnlimited || current < planLimit.limit_value;

    return {
      allowed,
      limit: planLimit.limit_value,
      current,
      remaining,
      message: allowed
        ? undefined
        : `You have reached the ${planLimit.unit_label} limit for your plan.`,
      upgradeUrl: UPGRADE_URL,
    };
  },

  /**
   * Shortcut to check voice credit entitlement.
   *
   * @param profileId - The UUID of the profile.
   * @returns An {@link EntitlementCheckResult} for voice_credits.
   */
  async canUseVoiceReminder(profileId: string): Promise<EntitlementCheckResult> {
    return this.canUseFeature(profileId, 'voice_credits');
  },

  /**
   * Checks whether a profile has an active or trialing subscription.
   *
   * @param profileId - The UUID of the profile.
   * @returns An object with `active`, `subscription` (if active), and `reason`.
   */
  async requireActiveSubscription(profileId: string): Promise<{
    active: boolean;
    subscription: Subscription | null;
    reason: string;
  }> {
    const supabase = await createServiceRoleClient();

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('profile_id', profileId)
      .in('status', ['trialing', 'active'])
      .maybeSingle();

    if (error) {
      throw new BillingServiceError(
        `Failed to fetch subscription for profile ${profileId}`,
        'SUBSCRIPTION_FETCH_FAILED',
        500,
        { originalError: error.message },
      );
    }

    if (!subscription) {
      return {
        active: false,
        subscription: null,
        reason: 'No active or trialing subscription found.',
      };
    }

    return {
      active: true,
      subscription,
      reason: `Subscription is ${subscription.status}.`,
    };
  },

  /**
   * Returns the consumption alert level for a feature.
   *
   * | Level      | Usage >= Limit |
   * |------------|----------------|
   * | `none`      | < 70%         |
   * | `warning`   | >= 70%        |
   * | `critical`  | >= 85%        |
   * | `exhausted` | >= 100%       |
   *
   * @param profileId - The UUID of the profile.
   * @param featureKey - The plan limit key to check.
   * @returns A {@link ConsumptionAlertLevel}.
   */
  async getConsumptionAlertLevel(
    profileId: string,
    featureKey: string,
  ): Promise<ConsumptionAlertLevel> {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase.rpc('get_usage_summary', {
      p_profile_id: profileId,
    });

    if (error) {
      throw new BillingServiceError(
        `Failed to fetch usage summary for alert level: ${featureKey}`,
        'USAGE_SUMMARY_FAILED',
        500,
        { originalError: error.message, featureKey },
      );
    }

    const items: UsageSummaryItem[] = (data ?? []) as UsageSummaryItem[];
    const item = items.find((i) => i.limit_key === featureKey);

    // No matching limit — not gated, no alert
    if (!item || item.limit_value === -1) {
      return 'none';
    }

    const ratio = item.current_usage / item.limit_value;

    if (ratio >= 1) return 'exhausted';
    if (ratio >= 0.85) return 'critical';
    if (ratio >= 0.7) return 'warning';
    return 'none';
  },
} as const;
