import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// ── GET: List payments (optionally filter by status) ─────────

export async function GET(request: NextRequest) {
  try {
    // Verify admin access — use ADMIN_SECRET only (not CRON_SECRET)
    const adminSecret = request.headers.get('X-Admin-Secret');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      // Fallback: authenticated admin user via session
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || ADMIN_EMAILS.length === 0 || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
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
