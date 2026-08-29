import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Constant-time comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Vérifie le secret du cron depuis plusieurs sources :
 * - Header `CRON_SECRET: <secret>` (GitHub Actions)
 * - Header `Authorization: Bearer <secret>` (Vercel Cron natif)
 * Retourne true si l'une des méthodes correspond au secret configuré.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  // Méthode 1 : header dédié CRON_SECRET (GitHub Actions)
  const headerSecret = request.headers.get('CRON_SECRET');
  if (headerSecret && safeCompare(headerSecret, expected)) {
    return true;
  }

  // Méthode 2 : Authorization: Bearer (Vercel Cron)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7);
    if (bearer && safeCompare(bearer, expected)) {
      return true;
    }
  }

  return false;
}

async function handleExpire(): Promise<NextResponse> {
  try {
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
          message: "Erreur lors de l'expiration des abonnements.",
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

// ── GET : support natif de Vercel Cron (qui envoie des requêtes GET) ──
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  return handleExpire();
}

// ── POST : support GitHub Actions / appels manuels ──
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  return handleExpire();
}

