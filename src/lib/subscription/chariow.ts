/**
 * LEGACY — Chariow utilities.
 *
 * The canonical implementation lives in:
 *   src/lib/billing/providers/chariow-provider.ts
 *
 * This file re-exports for backward compatibility with
 * existing imports (e.g. checkout/route.ts, webhooks/chariow/route.ts).
 * New code should import from lib/billing/ directly.
 */

export { chariowProvider } from '@/lib/billing/providers/chariow-provider';
export type { ChariowWebhookPayload } from '@/lib/billing/providers/chariow-provider';

// Re-export convenience functions that the checkout route uses
import { chariowProvider } from '@/lib/billing/providers/chariow-provider';
import type { PlanId, BillingPeriod } from '@/types/database';

/**
 * Create a Chariow checkout session (legacy wrapper).
 *
 * @deprecated Use billingService.createCheckout() instead.
 */
export async function createCheckout(params: {
  productId?: string;  // ignored — provider uses env vars
  email: string;
  fullName: string;
  phone: string;
  profileId: string;
  planId: string;
  billingPeriod?: BillingPeriod;
}): Promise<{ checkoutUrl: string; saleId: string }> {
  const { checkoutUrl, externalId } = await chariowProvider.createCheckout({
    profileId: params.profileId,
    planId: params.planId as PlanId,
    planName: params.planId,
    amount: 0, // provider reads from plan config
    currency: 'XAF',
    billingPeriod: params.billingPeriod ?? 'monthly',
    email: params.email,
    fullName: params.fullName,
    phone: params.phone,
  });
  return { checkoutUrl, saleId: externalId };
}

/** Verify a Chariow webhook signature (legacy wrapper). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  return chariowProvider.verifyWebhook(rawBody, signature);
}