import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { subscriptionService } from '@/lib/billing/subscription-service';
import type { PlanId } from '@/types/database';

export const dynamic = 'force-dynamic';
// Constant-time comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}


const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// ── Auth helper: X-Admin-Secret header OR authenticated admin email ──

async function isAdmin(request: NextRequest): Promise<boolean> {
  const adminSecret = request.headers.get('X-Admin-Secret');
  if (adminSecret && process.env.ADMIN_SECRET && safeCompare(adminSecret, process.env.ADMIN_SECRET)) {
    return true;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '');
}

// ── GET: List payments (optionally filter by status) ─────────

export async function GET(request: NextRequest) {
  try {
    // Verify admin access — use ADMIN_SECRET only (not CRON_SECRET)
    const adminSecret = request.headers.get('X-Admin-Secret');
    if (!adminSecret || !process.env.ADMIN_SECRET || !safeCompare(adminSecret, process.env.ADMIN_SECRET)) {
      // Fallback: authenticated admin user via session
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const isAuthed = !!user;
      if (!isAuthed) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
      }
      if (ADMIN_EMAILS.length === 0 || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
        return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const provider = searchParams.get('provider');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = await createServiceRoleClient();

    let query = supabase
      .from('payments')
      .select('*, profile:profiles(id, business_name, phone, email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur liste paiements:', error);
      return NextResponse.json({ error: 'Erreur de récupération.' }, { status: 500 });
    }

    // Count pending manual payments
    const { count: pendingCount } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('provider', 'manual');

    return NextResponse.json({
      payments: data || [],
      pendingManualCount: pendingCount ?? 0,
    });
  } catch (error) {
    console.error('Erreur admin payments list:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// ── PATCH: Approve or reject a (manual) payment ──────────────
// Body: { paymentId: string, action: 'approve' | 'reject', note?: string }
// approve → payment.completed + activation de l'abonnement (30 ou 365 jours)
// reject  → payment.failed

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as {
      paymentId?: string;
      action?: 'approve' | 'reject';
      note?: string;
    } | null;

    if (!body?.paymentId || !body.action || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Paramètres invalides : paymentId et action (approve|reject) requis.' },
        { status: 400 },
      );
    }

    const supabase = await createServiceRoleClient();

    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, profile_id, plan_id, plan_name, amount, currency, status, provider, billing_period')
      .eq('id', body.paymentId)
      .maybeSingle();

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 404 });
    }

    if (payment.status === 'completed') {
      return NextResponse.json({ error: 'Ce paiement est déjà validé.' }, { status: 409 });
    }

    // ── REJECT ──
    if (body.action === 'reject') {
      const { error: rejectError } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          external_status: 'rejected_by_admin',
          provider_metadata: { admin_note: body.note || 'Rejeté par l\'administrateur' },
        })
        .eq('id', payment.id);

      if (rejectError) {
        console.error('Erreur rejet paiement:', rejectError);
        return NextResponse.json({ error: 'Erreur lors du rejet.' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, status: 'failed' });
    }

    // ── APPROVE ──
    const now = new Date().toISOString();
    const { error: completeError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        paid_at: now,
        external_status: 'approved_by_admin',
      })
      .eq('id', payment.id);

    if (completeError) {
      console.error('Erreur validation paiement:', completeError);
      return NextResponse.json({ error: 'Erreur lors de la validation.' }, { status: 500 });
    }

    // Activation de l'abonnement (mensuel = 30 j, annuel = 365 j)
    const billingPeriod = payment.billing_period === 'yearly' ? 'yearly' : 'monthly';
    try {
      await subscriptionService.activateSubscription(
        payment.profile_id,
        payment.plan_id as PlanId,
        payment.id,
        billingPeriod === 'yearly' ? 365 : 30,
        billingPeriod,
      );
    } catch (activationError) {
      // On annule le statut completed pour rester cohérent
      await supabase
        .from('payments')
        .update({ status: 'pending', paid_at: null, external_status: null })
        .eq('id', payment.id);
      console.error('Erreur activation abonnement:', activationError);
      return NextResponse.json(
        { error: 'Paiement validé mais activation de l\'abonnement impossible. Réessayez.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      status: 'completed',
      activated: {
        planId: payment.plan_id,
        billingPeriod,
        profileId: payment.profile_id,
      },
    });
  } catch (error) {
    console.error('Erreur admin payments PATCH:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
