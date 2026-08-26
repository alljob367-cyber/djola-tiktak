import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { subscriptionService } from '@/lib/billing/subscription-service';
import type { SubscriptionInfo, PlanId } from '@/types/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/subscription
 * Returns lightweight subscription info for the authenticated profile.
 * Prefer /api/billing for full dashboard data.
 */
export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser();

    const subInfo: SubscriptionInfo =
      await subscriptionService.getSubscriptionInfo(profile.id);

    return NextResponse.json({ subscription: subInfo });
  } catch (error) {
    if (error instanceof Error && error.message === 'Non authentifié.') {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Profil introuvable.') {
      return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });
    }
    console.error('Erreur récupération abonnement:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}
