import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createServiceRoleClient } from '@/lib/supabase/server';
import { BillingServiceError } from '@/lib/billing/types';
import type { PlanId, BillingPeriod } from '@/types/database';

export const dynamic = 'force-dynamic';

const VALID_PLANS: PlanId[] = ['starter', 'pro', 'business'];

/** Pricing data — mirrors the DB seed data. */
const PLAN_PRICES: Record<PlanId, { name: string; monthly: number; yearly: number }> = {
  starter: { name: 'Starter', monthly: 3000, yearly: 30000 },
  pro:     { name: 'Pro',     monthly: 10000, yearly: 100000 },
  business:{ name: 'Business', monthly: 25000, yearly: 250000 },
};

// ── POST: Create a manual (Mobile Money) payment request ───────

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedUser();
    const body = (await request.json()) as {
      planId?: string;
      billingPeriod?: BillingPeriod;
      paymentMethod?: 'orange_money' | 'mtn_momo';
    };

    const { planId, billingPeriod, paymentMethod } = body;

    // 1. Validate plan
    if (!planId || !VALID_PLANS.includes(planId as PlanId)) {
      return NextResponse.json(
        { error: 'Plan invalide. Choisissez parmi : starter, pro, business.' },
        { status: 400 },
      );
    }

    const selectedPlan = planId as PlanId;
    const period: BillingPeriod = billingPeriod === 'yearly' ? 'yearly' : 'monthly';
    const plan = PLAN_PRICES[selectedPlan];
    const amount = period === 'yearly' ? plan.yearly : plan.monthly;

    // 2. Validate payment method
    if (paymentMethod && !['orange_money', 'mtn_momo'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Méthode de paiement invalide. Choisissez : orange_money ou mtn_momo.' },
        { status: 400 },
      );
    }

    // 3. Check for existing pending manual payment for this profile
    const supabase = await createServiceRoleClient();

    const { data: existingPending } = await supabase
      .from('payments')
      .select('id, status, created_at')
      .eq('profile_id', user.id)
      .eq('provider', 'manual')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      // Return existing pending payment instead of creating a duplicate
      return NextResponse.json({
        paymentId: existingPending.id,
        status: 'pending',
        message: 'Vous avez déjà une demande de paiement en attente. Effectuez le transfert et contactez le support pour validation.',
        planId: selectedPlan,
        planName: plan.name,
        amount,
        currency: 'XAF',
        billingPeriod: period,
        paymentMethod: paymentMethod || null,
      });
    }

    // 4. Create payment record with status 'pending'
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        profile_id: user.id,
        plan_id: selectedPlan,
        plan_name: plan.name,
        amount,
        currency: 'XAF',
        status: 'pending',
        provider: 'manual',
        billing_period: period,
        provider_metadata: {
          payment_method: paymentMethod || 'mobile_money',
          contact_phone: profile.phone || null,
          contact_email: profile.email || user.email || null,
        },
      })
      .select('id')
      .single();

    if (paymentError || !payment) {
      console.error('Erreur création paiement manuel:', paymentError);
      return NextResponse.json(
        { error: 'Impossible de créer la demande de paiement. Réessayez.' },
        { status: 500 },
      );
    }

    // 5. Get payment instructions (phone numbers from env)
    const instructions = getPaymentInstructions(amount, plan.name, period);

    return NextResponse.json({
      paymentId: payment.id,
      status: 'pending',
      planId: selectedPlan,
      planName: plan.name,
      amount,
      currency: 'XAF',
      billingPeriod: period,
      paymentMethod: paymentMethod || null,
      instructions,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Non authentifié.') {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }
    console.error('Erreur paiement manuel:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}

// ── Payment instructions helper ───────────────────────────────

interface PaymentInstructions {
  orange_money?: {
    phone: string;
    name: string;
  };
  mtn_momo?: {
    phone: string;
    name: string;
  };
  amount: number;
  currency: string;
  planName: string;
  billingPeriod: string;
  notes: string[];
}

function getPaymentInstructions(
  amount: number,
  planName: string,
  period: BillingPeriod,
): PaymentInstructions {
  const instructions: PaymentInstructions = {
    amount,
    currency: 'XAF',
    planName,
    billingPeriod: period === 'yearly' ? 'Annuel' : 'Mensuel',
    notes: [
      'Effectuez le transfert vers l\'un des numéros ci-dessus.',
      'Envoyez la capture d\'écran de confirmation à support@djola-tiktak.com ou via WhatsApp.',
      'Votre abonnement sera activé dans les 30 minutes après validation.',
      'Conservez votre reçu de transfert comme preuve de paiement.',
    ],
  };

  // Orange Money
  const omPhone = process.env.ORANGE_MONEY_PHONE;
  const omName = process.env.ORANGE_MONEY_NAME;
  if (omPhone && omPhone !== 'placeholder') {
    instructions.orange_money = { phone: omPhone, name: omName || 'Djola TikTak' };
  }

  // MTN Mobile Money
  const mtnPhone = process.env.MTN_MOMO_PHONE;
  const mtnName = process.env.MTN_MOMO_NAME;
  if (mtnPhone && mtnPhone !== 'placeholder') {
    instructions.mtn_momo = { phone: mtnPhone, name: mtnName || 'Djola TikTak' };
  }

  return instructions;
}

// Export for reuse in admin
export { getPaymentInstructions };
export type { PaymentInstructions };
