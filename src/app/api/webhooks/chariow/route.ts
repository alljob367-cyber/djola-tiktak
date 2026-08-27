import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { chariowProvider } from '@/lib/billing/providers/chariow-provider';
import type { ChariowWebhookPayload } from '@/lib/billing/providers/chariow-provider';
import { subscriptionService } from '@/lib/billing/subscription-service';
import type { PlanId } from '@/types/database';

export const dynamic = 'force-dynamic';

// ── Helpers ──────────────────────────────────────────────────

const VALID_PLANS: readonly PlanId[] = ['starter', 'pro', 'business'] as const;

function isValidPlanId(value: string | undefined): value is PlanId {
  return typeof value === 'string' && (VALID_PLANS as readonly string[]).includes(value);
}

// ── POST Handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createServiceRoleClient();

  // --- 1. Read raw body & verify signature ---
  const rawBody: string = await request.text();
  const signature = request.headers.get('x-chariow-signature')
    ?? request.headers.get('x-webhook-signature')
    ?? null;

  const isValid = chariowProvider.verifyWebhook(rawBody, signature);
  if (!isValid) {
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 401 });
  }

  // --- 2. Parse payload ---
  let payload: ChariowWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ChariowWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const saleData = payload.data;
  const eventType: string = payload.event;
  const saleId: string = saleData.id;

  // --- 3. Upsert webhook_event (idempotent deduplication) ---
  // Uses upsert to handle concurrent deliveries atomically.
  // If (provider, event_id) already exists with 'success', we skip processing.
  const { data: webhookEvent, error: insertEventError } = await supabase
    .from('webhook_events')
    .upsert({
      provider: 'chariow',
      event_type: eventType,
      event_id: saleId,
      payload: payload as unknown as Record<string, unknown>,
      status: 'processing',
    }, {
      onConflict: 'provider,event_id',
      ignoreDuplicates: true,
    })
    .select('id, status')
    .maybeSingle();

  // If upsert didn't insert (duplicate), check if already processed
  if (!webhookEvent || insertEventError) {
    // Row already exists — check its status
    if (!insertEventError) {
      // Duplicate ignored, already exists
      return NextResponse.json({ received: true });
    }
    console.error('[chariow-webhook] Erreur upsert webhook_event:', insertEventError?.message);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }

  if (webhookEvent.status === 'success') {
    return NextResponse.json({ received: true });
  }

  const webhookEventId: string = webhookEvent.id;

  // Helper to mark success / failure
  const markSuccess = async (profileId?: string | null, paymentId?: string | null) => {
    await supabase
      .from('webhook_events')
      .update({
        status: 'success',
        processed_at: new Date().toISOString(),
        ...(profileId ? { profile_id: profileId } : {}),
        ...(paymentId ? { payment_id: paymentId } : {}),
      })
      .eq('id', webhookEventId);
  };

  const markFailed = async (errorMessage: string) => {
    await supabase
      .from('webhook_events')
      .update({
        status: 'failed',
        error_message: errorMessage,
        processed_at: new Date().toISOString(),
      })
      .eq('id', webhookEventId);
  };

  // --- 5. Route event type ---
  try {
    if (eventType === 'sale.completed') {
      return await handleSaleCompleted(supabase, saleData, saleId, markSuccess, markFailed);
    }

    if (eventType === 'sale.refunded') {
      return await handleSaleRefunded(supabase, saleData, saleId, markSuccess, markFailed);
    }

    // Unknown event — acknowledge but don't process
    console.log(`[chariow-webhook] Événement non traité : ${eventType}`);
    await markSuccess();
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error(`[chariow-webhook] Erreur traitement ${eventType}:`, message);
    await markFailed(message);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// ── sale.completed ───────────────────────────────────────────

async function handleSaleCompleted(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  saleData: ChariowWebhookPayload['data'],
  saleId: string,
  markSuccess: (profileId?: string | null, paymentId?: string | null) => Promise<void>,
  markFailed: (message: string) => Promise<void>,
): Promise<NextResponse> {
  // a) Extract metadata
  const metadata = saleData.custom_metadata;

  if (!metadata || typeof metadata !== 'object') {
    await markFailed('Métadonnées personnalisées manquantes ou malformées.');
    return NextResponse.json(
      { error: 'Métadonnées personnalisées manquantes ou malformées.' },
      { status: 400 },
    );
  }

  const profileId = metadata.profile_id;
  const rawPlanId = metadata.plan_id;

  if (!profileId || typeof profileId !== 'string') {
    await markFailed('profile_id manquant dans les métadonnées.');
    return NextResponse.json(
      { error: 'Identifiant de profil manquant.' },
      { status: 400 },
    );
  }

  if (!isValidPlanId(rawPlanId)) {
    await markFailed(`Plan invalide : ${rawPlanId}`);
    return NextResponse.json(
      { error: 'Plan d\'abonnement invalide.' },
      { status: 400 },
    );
  }

  const planId: PlanId = rawPlanId;

  // b) Find or create payment
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('external_id', saleId)
    .maybeSingle();

  let paymentId: string;

  if (existingPayment) {
    if (existingPayment.status === 'completed') {
      // Already fully processed
      await markSuccess(profileId, existingPayment.id);
      return NextResponse.json({ received: true });
    }

    // status is 'pending' or 'processing' — complete it
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        external_status: 'completed',
      })
      .eq('id', existingPayment.id);

    if (updateError) {
      throw new Error(`Échec de la mise à jour du paiement : ${updateError.message}`);
    }

    paymentId = existingPayment.id;
  } else {
    // Create new payment record
    const amount = saleData.amount?.value ?? 0;
    const currency = saleData.amount?.currency ?? 'XAF';
    const productName = saleData.product_name ?? planId;

    const { data: newPayment, error: insertPaymentError } = await supabase
      .from('payments')
      .insert({
        profile_id: profileId,
        plan_id: planId,
        plan_name: productName,
        amount,
        currency,
        status: 'completed',
        provider: 'chariow',
        external_id: saleId,
        external_status: 'completed',
        paid_at: new Date().toISOString(),
        billing_period: (metadata.billing_period === 'yearly' ? 'yearly' : 'monthly'),
      })
      .select('id')
      .single();

    if (insertPaymentError || !newPayment) {
      throw new Error(`Échec de la création du paiement : ${insertPaymentError?.message}`);
    }

    paymentId = newPayment.id;
  }

  // c) Determine billing period from metadata or default to monthly
  const billingPeriod = (metadata.billing_period === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly';

  // d) Activate subscription via service
  const subscriptionId = await subscriptionService.activateSubscription(
    profileId,
    planId,
    paymentId,
    billingPeriod === 'yearly' ? 365 : 30,
    billingPeriod,
  );

  // d) Update profile chariow_customer_id if not set
  if (saleData.customer?.email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('chariow_customer_id')
      .eq('id', profileId)
      .single();

    if (profile && !profile.chariow_customer_id) {
      await supabase
        .from('profiles')
        .update({ chariow_customer_id: saleId })
        .eq('id', profileId);
    }
  }

  // e) Mark webhook event as success with references
  await markSuccess(profileId, paymentId);

  console.log(
    `[chariow-webhook] Abonnement activé — profil: ${profileId}, plan: ${planId}, paiement: ${paymentId}, abonnement: ${subscriptionId}`,
  );

  return NextResponse.json({ received: true });
}

// ── sale.refunded ────────────────────────────────────────────

async function handleSaleRefunded(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  saleData: ChariowWebhookPayload['data'],
  saleId: string,
  markSuccess: (profileId?: string | null, paymentId?: string | null) => Promise<void>,
  markFailed: (message: string) => Promise<void>,
): Promise<NextResponse> {
  // a) Find payment by external_id
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, profile_id, status')
    .eq('external_id', saleId)
    .maybeSingle();

  if (paymentError) {
    throw new Error(`Erreur recherche paiement remboursé : ${paymentError.message}`);
  }

  if (!payment) {
    console.warn(`[chariow-webhook] Aucun paiement trouvé pour le remboursement (sale: ${saleId})`);
    await markSuccess();
    return NextResponse.json({ received: true });
  }

  // b) Update payment to refunded
  if (payment.status !== 'refunded') {
    const { error: refundError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        external_status: 'refunded',
      })
      .eq('id', payment.id);

    if (refundError) {
      throw new Error(`Échec de la mise à jour du remboursement : ${refundError.message}`);
    }
  }

  // c) Cancel active subscription for the profile
  const { data: activeSubscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('profile_id', payment.profile_id)
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  if (activeSubscription) {
    const { error: cancelError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: false,
        cancellation_reason: 'Remboursement Chariow',
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeSubscription.id);

    if (cancelError) {
      throw new Error(`Échec de l'annulation de l'abonnement : ${cancelError.message}`);
    }
  }

  console.log(
    `[chariow-webhook] Remboursement traité — profil: ${payment.profile_id}, paiement: ${payment.id}`,
  );

  await markSuccess(payment.profile_id, payment.id);
  return NextResponse.json({ received: true });
}
