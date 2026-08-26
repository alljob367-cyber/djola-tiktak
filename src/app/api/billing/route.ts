import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createServiceRoleClient } from '@/lib/supabase/server';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { usageService } from '@/lib/billing/usage-service';
import { entitlementService } from '@/lib/billing/entitlement-service';
import { BillingServiceError } from '@/lib/billing/types';
import type { ConsumptionAlertLevel, UsageSummaryItem } from '@/lib/billing/types';
import type {
  Subscription,
  Plan,
  PlanLimit,
  PlanId,
  Payment,
} from '@/types/database';

export const dynamic = 'force-dynamic';

// ── GET: Billing dashboard data ───────────────────────────────

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser();
    const profileId = profile.id;

    // 1. Fetch subscription info from profile
    const subInfo = await subscriptionService.getSubscriptionInfo(profileId);

    // 2. Fetch the active/trialing subscription row
    const subscription: Subscription | null =
      await subscriptionService.getSubscription(profileId);

    // 3. Fetch available plans (ordered by tier_priority)
    const plans: Plan[] = await subscriptionService.getPlans();

    // 4. Fetch plan limits for the user's current plan
    const limits: PlanLimit[] = await subscriptionService.getPlanLimits(
      subInfo.plan,
    );

    // 5. Fetch usage summary
    const usage: UsageSummaryItem[] =
      await usageService.getUsageSummary(profileId);

    // 6. Fetch recent payments (last 10)
    const supabase = await createServiceRoleClient();
    const { data: paymentRows } = await supabase
      .from('payments')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(10);

    const payments: Payment[] = Array.isArray(paymentRows)
      ? (paymentRows as Payment[])
      : [];

    // 7. Calculate voice_credits consumption alert
    const voiceUsage = usage.find((u) => u.limit_key === 'voice_credits');
    let voiceAlert: {
      level: ConsumptionAlertLevel;
      used: number;
      total: number;
      remaining: number;
    } = {
      level: 'none',
      used: 0,
      total: 0,
      remaining: 0,
    };

    if (voiceUsage && voiceUsage.limit_value !== -1) {
      const ratio = voiceUsage.current_usage / voiceUsage.limit_value;
      let level: ConsumptionAlertLevel = 'none';
      if (ratio >= 1) level = 'exhausted';
      else if (ratio >= 0.85) level = 'critical';
      else if (ratio >= 0.7) level = 'warning';

      voiceAlert = {
        level,
        used: voiceUsage.current_usage,
        total: voiceUsage.limit_value,
        remaining: Math.max(0, voiceUsage.remaining),
      };
    }

    return NextResponse.json({
      subscription: subInfo,
      plans,
      limits,
      usage,
      payments,
      alerts: {
        voice_credits: voiceAlert,
      },
    });
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    if (error instanceof Error && error.message === 'Non authentifié.') {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }
    console.error('Erreur tableau de bord facturation:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}

// ── POST: Cancel or change plan ───────────────────────────────

type CancelBody = { action: 'cancel'; reason?: string };
type ChangePlanBody = { action: 'change_plan'; planId: string };
type BillingPostBody = CancelBody | ChangePlanBody;

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser();
    const body = (await request.json()) as BillingPostBody;

    if (!body?.action) {
      return NextResponse.json(
        { error: 'Action manquante. Spécifiez « cancel » ou « change_plan ».' },
        { status: 400 },
      );
    }

    // ── Cancel subscription ───────────────────────────────────
    if (body.action === 'cancel') {
      const { reason } = body;
      await subscriptionService.cancelSubscription(profile.id, reason);
      return NextResponse.json({
        success: true,
        message: 'Abonnement annulé. Il restera actif jusqu\'à la fin de la période en cours.',
      });
    }

    // ── Change plan → redirect to checkout ─────────────────────
    if (body.action === 'change_plan') {
      const { planId } = body;

      if (!planId || !['starter', 'pro', 'business'].includes(planId)) {
        return NextResponse.json(
          {
            error:
              'Plan invalide. Choisissez parmi : starter, pro, business.',
          },
          { status: 400 },
        );
      }

      // Forward to the checkout endpoint which handles the full flow
      // We return the plan so the client can redirect to /api/checkout
      return NextResponse.json({
        action: 'redirect_to_checkout',
        planId: planId as PlanId,
      });
    }

    return NextResponse.json(
      { error: 'Action non reconnue.' },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    if (error instanceof Error && error.message === 'Non authentifié.') {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }
    if (
      error instanceof Error &&
      error.message === 'No active subscription to cancel'
    ) {
      return NextResponse.json(
        { error: 'Aucun abonnement actif à annuler.' },
        { status: 404 },
      );
    }
    console.error('Erreur action facturation:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}
