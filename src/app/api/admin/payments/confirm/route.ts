import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAdminStatus } from '@/lib/admin-guard';
import { subscriptionService } from '@/lib/billing/subscription-service';

export const dynamic = 'force-dynamic';
// Constant-time comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}




// ── POST: Admin confirms or rejects a manual payment ─────────

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin access — ADMIN_SECRET only (not CRON_SECRET)
    const adminSecret = request.headers.get('X-Admin-Secret');
    if (!adminSecret || !process.env.ADMIN_SECRET || !safeCompare(adminSecret, process.env.ADMIN_SECRET)) {
      // Fallback: session admin (rôle DB OU ADMIN_EMAILS) via guard central
      const status = await getAdminStatus();
      if (!status.authenticated) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
      }
      if (!status.isAdmin) {
        return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
      }
    }

    const body = (await request.json()) as {
      paymentId: string;
      action: 'confirm' | 'reject';
      reason?: string;
    };

    const { paymentId, action, reason } = body;

    if (!paymentId || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Paramètres invalides. Fournissez paymentId et action (confirm/reject).' },
        { status: 400 },
      );
    }

    const supabase = await createServiceRoleClient();

    // 2. Fetch the payment
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: 'Paiement introuvable.' },
        { status: 404 },
      );
    }

    // 3. Only process pending manual payments
    if (payment.status !== 'pending' || payment.provider !== 'manual') {
      return NextResponse.json(
        { error: `Ce paiement n'est pas en attente (statut: ${payment.status}, provider: ${payment.provider}).` },
        { status: 400 },
      );
    }

    if (action === 'reject') {
      // 4a. Reject the payment
      const { error: rejectError } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          provider_metadata: {
            ...(payment.provider_metadata || {}),
            rejection_reason: reason || "Paiement rejeté par l'administrateur.",
            rejected_at: new Date().toISOString(),
          },
        })
        .eq('id', paymentId);

      if (rejectError) {
        console.error('Erreur rejet paiement:', rejectError);
        return NextResponse.json({ error: 'Erreur lors du rejet.' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Paiement rejeté.',
        paymentId,
      });
    }

    // 4b. Activate the subscription FIRST, then confirm payment
    // This ensures we don't mark payment as completed without activation
    let subscriptionId: string | undefined;
    try {
      // Calculate duration based on billing period
      const durationDays = payment.billing_period === 'yearly' ? 365 : 30;
      subscriptionId = await subscriptionService.activateSubscription(
        payment.profile_id,
        payment.plan_id,
        paymentId,
        durationDays,
        payment.billing_period || 'monthly',
      );
    } catch (subError) {
      console.error('Erreur activation abonnement:', subError);
      return NextResponse.json(
        { error: "Échec de l'activation de l'abonnement. Le paiement reste en attente." },
        { status: 500 },
      );
    }

    // 5. Only confirm payment AFTER successful subscription activation
    const { error: confirmError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        external_status: 'manual_confirmed',
        provider_metadata: {
          ...(payment.provider_metadata || {}),
          confirmed_at: new Date().toISOString(),
          confirmed_by: 'admin',
        },
      })
      .eq('id', paymentId);

    if (confirmError) {
      console.error('Erreur confirmation paiement après activation:', confirmError);
      // Payment update failed but subscription was activated — log for manual review
      console.error('[admin-payments] CRITICAL: Subscription activated but payment not marked completed. Manual intervention needed.');
      return NextResponse.json(
        { error: "Abonnement activé mais erreur lors de la mise à jour du paiement. Contactez le support." },
        { status: 500 },
      );
    }

    console.log(
      `[admin-payments] Paiement manuel confirmé — profil: ${payment.profile_id}, plan: ${payment.plan_id}, paiement: ${paymentId}, abonnement: ${subscriptionId}`,
    );

    return NextResponse.json({
      success: true,
      message: 'Paiement confirmé et abonnement activé.',
      paymentId,
      subscriptionId,
    });
  } catch (error) {
    console.error('Erreur admin payments:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
