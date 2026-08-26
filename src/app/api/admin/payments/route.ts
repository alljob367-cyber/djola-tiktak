import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ── GET: List payments (optionally filter by status) ─────────

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminSecret = request.headers.get('X-Admin-Secret');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      const cronSecret = request.headers.get('CRON_SECRET');
      if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
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
