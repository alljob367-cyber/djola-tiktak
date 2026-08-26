/**
 * Billing Service — server-side only.
 *
 * Abstract billing layer that decouples payment initiation from the
 * specific payment provider. Currently backed by Chariow, but the
 * interface allows swapping providers without touching API routes.
 *
 * Flow:
 *   BillingService.createCheckout() → PaymentProvider.createCheckout()
 *     → Creates pending payment row in DB
 *     → Returns checkout URL to redirect the user
 *
 *   Webhook handler → PaymentProvider.handleWebhook()
 *     → Updates payment status
 *     → Activates/cancels subscription
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { BillingServiceError } from './types';
import type { PlanId, BillingPeriod, Payment } from '@/types/database';

// ── Provider interface ───────────────────────────────────────

/** Result of a checkout initiation. */
export interface CheckoutResult {
  checkoutUrl: string;
  paymentId: string;
  externalId: string;
  planId: PlanId;
  planName: string;
  billingPeriod: BillingPeriod;
}

/**
 * Minimal interface a payment provider must implement.
 * This allows adding new providers (e.g. Stripe, PayPal) without
 * modifying the billing service or API routes.
 */
export interface PaymentProvider {
  /** Human-readable provider name (e.g. 'chariow'). */
  readonly name: string;

  /**
   * Initiate a checkout session for a plan.
   *
   * @param params - Checkout parameters.
   * @returns The checkout URL and external payment ID.
   */
  createCheckout(params: {
    profileId: string;
    planId: PlanId;
    planName: string;
    amount: number;
    currency: string;
    billingPeriod: BillingPeriod;
    email: string;
    fullName: string;
    phone: string;
  }): Promise<{ checkoutUrl: string; externalId: string }>;

  /**
   * Verify an incoming webhook signature.
   *
   * @param rawBody   - The raw request body string.
   * @param signature - The signature header value (may be null).
   * @returns Whether the webhook is authentic.
   */
  verifyWebhook(rawBody: string, signature: string | null): boolean;
}

// ── Chariow provider adapter ─────────────────────────────────

async function getChariowProvider(): Promise<PaymentProvider> {
  // Dynamic import to avoid circular deps and keep billing-service
  // as the single entry point.
  const { chariowProvider } = await import('./providers/chariow-provider');
  return chariowProvider;
}

// ── Plan commercial data (fallback for pricing display) ──────

interface PlanCommercial {
  name: string;
  price_monthly: number;
  price_yearly: number;
}

const PLANS_COMMERCIAL: Record<PlanId, PlanCommercial> = {
  starter: {
    name: 'Starter',
    price_monthly: 3000,
    price_yearly: 30000,
  },
  pro: {
    name: 'Pro',
    price_monthly: 10000,
    price_yearly: 100000,
  },
  business: {
    name: 'Business',
    price_monthly: 25000,
    price_yearly: 250000,
  },
};

// ── Service ──────────────────────────────────────────────────

export const billingService = {
  /**
   * Get commercial info for a plan (pricing display).
   * Falls back to hardcoded data if DB is unavailable.
   *
   * @param planId - The plan identifier.
   * @returns Plan commercial data or null.
   */
  getPlanCommercial(planId: PlanId): PlanCommercial | null {
    return PLANS_COMMERCIAL[planId] ?? null;
  },

  /**
   * Initiate a checkout flow for a plan.
   *
   * Steps:
   *  1. Create a pending payment row in the DB.
   *  2. Delegate to the payment provider to create a checkout session.
   *  3. Update the payment row with the external ID and checkout URL.
   *  4. Return the checkout result.
   *
   * If the provider call fails, the payment is marked as 'failed'.
   *
   * @param params - Checkout parameters.
   * @returns A {@link CheckoutResult}.
   */
  async createCheckout(params: {
    profileId: string;
    planId: PlanId;
    billingPeriod: BillingPeriod;
    email: string;
    fullName: string;
    phone: string;
  }): Promise<CheckoutResult> {
    const { profileId, planId, billingPeriod, email, fullName, phone } = params;

    const plan = this.getPlanCommercial(planId);
    if (!plan) {
      throw new BillingServiceError(
        `Plan introuvable: ${planId}`,
        'PLAN_NOT_FOUND',
        400,
        { planId },
      );
    }

    const amount = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly;

    // 1. Create pending payment
    const supabase = await createServiceRoleClient();

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        profile_id: profileId,
        plan_id: planId,
        plan_name: plan.name,
        amount,
        currency: 'XAF',
        status: 'pending',
        provider: 'chariow',
        billing_period: billingPeriod,
      })
      .select('id')
      .single();

    if (paymentError || !payment) {
      throw new BillingServiceError(
        'Impossible de créer le paiement. Réessayez.',
        'PAYMENT_CREATE_FAILED',
        500,
        { originalError: paymentError?.message, profileId, planId },
      );
    }

    // 2. Call provider
    try {
      const provider = await getChariowProvider();
      const { checkoutUrl, externalId } = await provider.createCheckout({
        profileId,
        planId,
        planName: plan.name,
        amount,
        currency: 'XAF',
        billingPeriod,
        email,
        fullName,
        phone,
      });

      // 3. Update payment with external references
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          external_id: externalId,
          checkout_url: checkoutUrl,
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error(
          '[billing-service] Échec MAJ paiement avec références externes:',
          updateError.message,
        );
        // Non-blocking — the checkout URL is still valid
      }

      return {
        checkoutUrl,
        paymentId: payment.id,
        externalId,
        planId,
        planName: plan.name,
        billingPeriod,
      };
    } catch (providerError) {
      // Mark payment as failed
      await supabase
        .from('payments')
        .update({ status: 'failed', failed_at: new Date().toISOString() })
        .eq('id', payment.id);

      const message =
        providerError instanceof Error
          ? providerError.message
          : 'Erreur lors de la création du paiement.';

      throw new BillingServiceError(
        message,
        'CHECKOUT_PROVIDER_FAILED',
        400,
        { provider: 'chariow', profileId, planId },
      );
    }
  },

  /**
   * Fetch recent payments for a profile.
   *
   * @param profileId - The UUID of the profile.
   * @param limit     - Max number of payments to return (default 10).
   * @returns An array of {@link Payment} objects.
   */
  async getPaymentHistory(
    profileId: string,
    limit: number = 10,
  ): Promise<Payment[]> {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new BillingServiceError(
        'Échec de la récupération de l\'historique des paiements.',
        'PAYMENT_HISTORY_FAILED',
        500,
        { originalError: error.message, profileId },
      );
    }

    return (data ?? []) as Payment[];
  },

  /**
   * Get a single payment by ID (for receipt or status check).
   *
   * @param paymentId - The UUID of the payment.
   * @returns The {@link Payment} or null.
   */
  async getPayment(paymentId: string): Promise<Payment | null> {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (error) {
      throw new BillingServiceError(
        'Échec de la récupération du paiement.',
        'PAYMENT_FETCH_FAILED',
        500,
        { originalError: error.message, paymentId },
      );
    }

    return (data as Payment) ?? null;
  },
} as const;
