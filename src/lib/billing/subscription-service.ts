/**
 * Subscription Service — server-side only.
 *
 * Manages subscription lifecycle: trial start, activation, cancellation,
 * and plan/limit lookups.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  PlanId,
  BillingPeriod,
  Plan,
  PlanLimit,
  Subscription,
  SubscriptionInfo,
} from '@/types/database';
import { BillingServiceError } from './types';

// ── Default durations ───────────────────────────────────────

const DEFAULT_MONTHLY_DAYS = 30;
const DEFAULT_YEARLY_DAYS = 365;

// ── Service ──────────────────────────────────────────────────

export const subscriptionService = {
  /**
   * Starts a trial subscription for a profile.
   *
   * Delegates to the `start_trial` RPC which creates a new
   * subscription row in the `trialing` state.
   *
   * @param profileId - The UUID of the profile.
   * @returns The new subscription ID.
   */
  async startTrial(profileId: string): Promise<string> {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase.rpc('start_trial', {
      p_profile_id: profileId,
    });

    if (error) {
      throw new BillingServiceError(
        `Failed to start trial for profile ${profileId}`,
        'TRIAL_START_FAILED',
        500,
        { originalError: error.message, profileId },
      );
    }

    if (!data) {
      throw new BillingServiceError(
        'start_trial returned no subscription ID',
        'TRIAL_NO_ID',
        500,
        { profileId },
      );
    }

    return data as string;
  },

  /**
   * Activates a paid subscription for a profile.
   *
   * Calls the `activate_subscription` RPC which transitions a
   * trialing or past_due subscription to `active`.
   *
   * @param profileId      - The UUID of the profile.
   * @param planId         - The plan to activate.
   * @param paymentId      - The payment record ID (or null).
   * @param durationDays   - Override duration (defaults to 30/365 based on billing period).
   * @param billingPeriod  - 'monthly' or 'yearly'.
   * @returns The (possibly new) subscription ID.
   */
  async activateSubscription(
    profileId: string,
    planId: PlanId,
    paymentId: string | null,
    durationDays?: number,
    billingPeriod: BillingPeriod = 'monthly',
  ): Promise<string> {
    const supabase = await createServiceRoleClient();

    const duration =
      durationDays ??
      (billingPeriod === 'yearly' ? DEFAULT_YEARLY_DAYS : DEFAULT_MONTHLY_DAYS);

    const { data, error } = await supabase.rpc('activate_subscription', {
      p_profile_id: profileId,
      p_plan_id: planId,
      p_payment_id: paymentId,
      p_duration_days: duration,
      p_billing_period: billingPeriod,
    });

    if (error) {
      throw new BillingServiceError(
        `Failed to activate subscription for profile ${profileId}`,
        'SUBSCRIPTION_ACTIVATE_FAILED',
        500,
        { originalError: error.message, profileId, planId },
      );
    }

    if (!data) {
      throw new BillingServiceError(
        'activate_subscription returned no subscription ID',
        'ACTIVATION_NO_ID',
        500,
        { profileId, planId },
      );
    }

    return data as string;
  },

  /**
   * Cancels the active/trialing subscription at the end of the
   * current billing period.
   *
   * @param profileId - The UUID of the profile.
   * @param reason    - Optional cancellation reason for analytics.
   */
  async cancelSubscription(
    profileId: string,
    reason?: string,
  ): Promise<void> {
    const supabase = await createServiceRoleClient();

    // Find the active/trialing subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('profile_id', profileId)
      .in('status', ['trialing', 'active'])
      .maybeSingle();

    if (fetchError) {
      throw new BillingServiceError(
        `Failed to fetch subscription for cancellation: ${profileId}`,
        'SUBSCRIPTION_FETCH_FAILED',
        500,
        { originalError: fetchError.message, profileId },
      );
    }

    if (!subscription) {
      throw new BillingServiceError(
        `No active subscription to cancel for profile ${profileId}`,
        'NO_ACTIVE_SUBSCRIPTION',
        404,
        { profileId },
      );
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancellation_reason: reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      throw new BillingServiceError(
        `Failed to cancel subscription ${subscription.id}`,
        'SUBSCRIPTION_CANCEL_FAILED',
        500,
        { originalError: updateError.message, subscriptionId: subscription.id },
      );
    }
  },

  /**
   * Fetches the active or trialing subscription for a profile.
   *
   * @param profileId - The UUID of the profile.
   * @returns The {@link Subscription} or `null` if none found.
   */
  async getSubscription(profileId: string): Promise<Subscription | null> {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
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
        { originalError: error.message, profileId },
      );
    }

    return (data as Subscription) ?? null;
  },

  /**
   * Computes a lightweight subscription info object from the profile
   * record, without joining the subscriptions table.
   *
   * @param profileId - The UUID of the profile.
   * @returns A {@link SubscriptionInfo} object.
   */
  async getSubscriptionInfo(profileId: string): Promise<SubscriptionInfo> {
    const supabase = await createServiceRoleClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'plan, subscription_status, subscription_start, subscription_end, subscription_id',
      )
      .eq('id', profileId)
      .single();

    if (error || !profile) {
      throw new BillingServiceError(
        `Profile not found: ${profileId}`,
        'PROFILE_NOT_FOUND',
        404,
        { profileId },
      );
    }

    const isActive =
      profile.subscription_status === 'active' ||
      profile.subscription_status === 'trialing';

    const isTrial = profile.subscription_status === 'trialing';

    // Compute days remaining
    let daysRemaining: number | null = null;
    if (profile.subscription_end) {
      const end = new Date(profile.subscription_end).getTime();
      const now = Date.now();
      const diffMs = end - now;
      daysRemaining = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
    }

    // Fetch trial_end from the subscription if trialing
    let trialEnd: string | null = null;
    if (isTrial && profile.subscription_id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('trial_end')
        .eq('id', profile.subscription_id)
        .single();
      trialEnd = sub?.trial_end ?? null;
    }

    return {
      plan: profile.plan as PlanId,
      subscription_status: profile.subscription_status,
      subscription_start: profile.subscription_start,
      subscription_end: profile.subscription_end,
      is_active: isActive,
      is_trial: isTrial,
      days_remaining: daysRemaining,
      trial_end: trialEnd,
    };
  },

  /**
   * Returns all active plans ordered by tier priority.
   *
   * @returns An array of {@link Plan} objects.
   */
  async getPlans(): Promise<Plan[]> {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('tier_priority', { ascending: true });

    if (error) {
      throw new BillingServiceError(
        'Failed to fetch plans',
        'PLANS_FETCH_FAILED',
        500,
        { originalError: error.message },
      );
    }

    return (data ?? []) as Plan[];
  },

  /**
   * Returns the plan limit rows for a specific plan.
   *
   * @param planId - The plan identifier.
   * @returns An array of {@link PlanLimit} objects.
   */
  async getPlanLimits(planId: PlanId): Promise<PlanLimit[]> {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('plan_limits')
      .select('*')
      .eq('plan_id', planId);

    if (error) {
      throw new BillingServiceError(
        `Failed to fetch plan limits for ${planId}`,
        'PLAN_LIMITS_FETCH_FAILED',
        500,
        { originalError: error.message, planId },
      );
    }

    return (data ?? []) as PlanLimit[];
  },

  /**
   * Placeholder for future trial-extension logic.
   *
   * Currently a no-op. When implemented, this method could extend
   * a trial period based on referral codes, promotions, or
   * admin overrides.
   *
   * @param _profileId - The UUID of the profile.
   */
  async extendTrialIfNeeded(_profileId: string): Promise<void> {
    // Placeholder — no-op for now.
    // Future: check referral/promo eligibility and extend trial_end.
  },
} as const;
