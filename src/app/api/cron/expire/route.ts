import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST — endpoint cron pour expirer les abonnements échus
// Déclenché par GitHub Actions (quotidiennement)
// Vérifie le header CRON_SECRET pour l'authentification
export async function POST(request: NextRequest) {
  try {
    // 1. Verify CRON_SECRET header
    const cronSecret = request.headers.get('CRON_SECRET');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    // 2. Call the expire_subscriptions() RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'expire_subscriptions',
    );

    if (rpcError) {
      console.error('Erreur RPC expire_subscriptions:', rpcError);
      return NextResponse.json(
        {
          success: false,
          expired_count: 0,
          message: `Erreur lors de l'expiration des abonnements : ${rpcError.message}`,
        },
        { status: 500 },
      );
    }

    const expiredCount = (rpcData as number) ?? 0;

    // 3. Check for expiring trials (trial_end < now() AND trial_end > now() - 1 day)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: expiringTrials, error: trialsError } = await supabase
      .from('subscriptions')
      .select('id, profile_id, trial_end')
      .eq('status', 'trialing')
      .lt('trial_end', now.toISOString())
      .gt('trial_end', oneDayAgo.toISOString());

    if (trialsError) {
      console.error('Erreur vérification essais expirés:', trialsError);
      // Non-blocking — log but continue
    }

    const expiringTrialCount = Array.isArray(expiringTrials)
      ? expiringTrials.length
      : 0;

    const messageParts: string[] = [
      `${expiredCount} abonnement(s) expiré(s).`,
    ];

    if (expiringTrialCount > 0) {
      messageParts.push(
        `${expiringTrialCount} essai(s) arrivant à échéance dans les dernières 24h.`,
      );
    }

    return NextResponse.json({
      success: true,
      expired_count: expiredCount,
      message: messageParts.join(' '),
    });
  } catch (error) {
    console.error('Erreur inattendue cron expire:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 },
    );
  }
}
