import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { subscriptionService } from '@/lib/billing/subscription-service';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// ── POST: Admin confirms or rejects a manual payment ─────────

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin access — ADMIN_SECRET only (not CRON_SECRET)
    const adminSecret = request.headers.get('X-Admin-Secret');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      // Fallback: authenticated admin user via session
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || ADMIN_EMAILS.length === 0 || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
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

    // 4b. Confirm the payment
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
      console.error('Erreur confirmation paiement:', confirmError);
      return NextResponse.json({ error: 'Erreur lors de la confirmation.' }, { status: 500 });
    }

    // 5. Activate the subscription
    try {
      const subscriptionId = await subscriptionService.activateSubscription(
        payment.profile_id,
        payment.plan_id,
        paymentId,
        30,
        payment.billing_period || 'monthly',
      );

      console.log(
        `[admin-payments] Paiement manuel confirmé — profil: ${payment.profile_id}, plan: ${payment.plan_id}, paiement: ${paymentId}, abonnement: ${subscriptionId}`,
      );

      return NextResponse.json({
        success: true,
        message: 'Paiement confirmé et abonnement activé.',
        paymentId,
        subscriptionId,
      });
    } catch (subError) {
      console.error('Erreur activation abonnement:', subError);
      return NextResponse.json(
        { error: "Paiement confirmé mais échec de l'activation de l'abonnement. Contactez le support technique." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Erreur admin payments:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
