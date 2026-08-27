import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createServiceRoleClient } from '@/lib/supabase/server';
import { createCheckout } from '@/lib/subscription/chariow';
import { CHARIOW_PRODUCT_IDS, getPlan } from '@/lib/subscription/plans';
import type { PlanId, BillingPeriod } from '@/types/database';

export const dynamic = 'force-dynamic';

const VALID_PLANS: PlanId[] = ['starter', 'pro', 'business'];

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user and fetch profile
    const { user, profile } = await getAuthenticatedUser();

    // 2. Parse request body
    const body = await request.json();
    const { planId, billingPeriod } = body as {
      planId?: string;
      billingPeriod?: BillingPeriod;
    };

    if (!planId || !VALID_PLANS.includes(planId as PlanId)) {
      return NextResponse.json(
        { error: 'Plan invalide. Choisissez parmi : starter, pro, business.' },
        { status: 400 },
      );
    }

    const selectedPlan = planId as PlanId;
    const plan = getPlan(selectedPlan);
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan introuvable.' },
        { status: 400 },
      );
    }

    const period: BillingPeriod = billingPeriod === 'yearly' ? 'yearly' : 'monthly';
    const planName: string = plan.name;
    const amount = period === 'yearly' ? plan.price_yearly : plan.price_monthly;

    // 3. Get the Chariow product ID
    const productId = CHARIOW_PRODUCT_IDS[selectedPlan];
    if (
      !productId ||
      productId.startsWith('starter_product_id') ||
      productId.startsWith('pro_product_id') ||
      productId.startsWith('business_product_id')
    ) {
      return NextResponse.json(
        { error: 'Le produit Chariow pour ce plan n\'est pas encore configuré. Veuillez contacter le support.' },
        { status: 503 },
      );
    }

    // 4. Create a pending payment record using service role client
    const supabase = await createServiceRoleClient();

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        profile_id: user.id,
        plan_id: selectedPlan,
        plan_name: planName,
        amount,
        currency: 'XAF',
        status: 'pending',
        provider: 'chariow',
        billing_period: period,
      })
      .select('id')
      .single();

    if (paymentError || !payment) {
      console.error('Erreur création paiement:', paymentError);
      return NextResponse.json(
        { error: 'Impossible de créer le paiement. Réessayez.' },
        { status: 500 },
      );
    }

    // 5. Call Chariow API to create checkout session
    try {
      if (!profile.phone) {
        await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
        return NextResponse.json({ error: 'Veuillez configurer votre numéro de téléphone dans votre profil avant de payer.' }, { status: 400 });
      }
      const { checkoutUrl, saleId } = await createCheckout({
        productId,
        email: profile.email || user.email || '',
        fullName: profile.business_name || 'Utilisateur',
        phone: profile.phone || '',
        profileId: user.id,
        planId: selectedPlan,
      });

      // 6. Update payment record with Chariow sale ID and checkout URL
      await supabase
        .from('payments')
        .update({
          external_id: saleId,
          checkout_url: checkoutUrl,
        })
        .eq('id', payment.id);

      return NextResponse.json({
        checkoutUrl,
        paymentId: payment.id,
        saleId,
        planId: selectedPlan,
        planName,
        billingPeriod: period,
      });
    } catch (chariowError) {
      // Update payment as failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      const message =
        chariowError instanceof Error
          ? chariowError.message
          : 'Erreur lors de la création du paiement.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Non authentifié.') {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Profil introuvable.') {
      return NextResponse.json(
        { error: 'Profil introuvable.' },
        { status: 404 },
      );
    }
    console.error('Erreur checkout:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}
