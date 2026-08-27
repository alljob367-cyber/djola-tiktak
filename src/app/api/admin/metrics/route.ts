import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function isAdmin(userEmail: string | undefined): Promise<boolean> {
  if (!userEmail) return false;
  if (ADMIN_EMAILS.length === 0) return false; // No admin list configured
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (!(await isAdmin(user.email))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const db = await createServiceRoleClient();

    // ── Dates ────────────────────────────────────────────────
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(now);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Lundi
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

    // ── Parallel queries ─────────────────────────────────────
    const [
      { count: totalProfiles },
      { count: totalAppointments },
      { count: totalServices },
      { count: totalClients },
      { count: activeProfiles },
      { count: todayAppointments },
      { count: weekAppointments },
      { count: weekNewProfiles },
      { count: monthNewProfiles },
      monthAptsRes,
      lastMonthAptsRes,
      recentRes,
      allAptServicesRes,
      remindersRes,
      profilesListRes,
    ] = await Promise.all([
      db.from('profiles').select('*', { count: 'exact', head: true }),
      db.from('appointments').select('*', { count: 'exact', head: true }),
      db.from('services').select('*', { count: 'exact', head: true }),
      db.from('clients').select('*', { count: 'exact', head: true }),
      db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      db.from('appointments').select('*', { count: 'exact', head: true })
        .gte('starts_at', `${todayStr}T00:00:00`).lt('starts_at', `${todayStr}T23:59:59`),
      db.from('appointments').select('*', { count: 'exact', head: true })
        .gte('starts_at', startOfWeek.toISOString()),
      db.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString()),
      db.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),
      // Ce mois : RDV avec statut + prix
      db.from('appointments')
        .select('id, status, profile_id, starts_at, service:services!inner(price)')
        .gte('starts_at', startOfMonth),
      // Mois dernier
      db.from('appointments')
        .select('id, status, service:services!inner(price)')
        .gte('starts_at', startOfLastMonth).lt('starts_at', endOfLastMonth),
      // 15 derniers RDV
      db.from('appointments')
        .select(`
          id, status, starts_at, created_at,
          service:services(name, price, duration_minutes),
          client:clients(name, phone),
          profile:profiles!inner(business_name)
        `)
        .order('created_at', { ascending: false }).limit(15),
      // Tous les RDV non annulés avec service (pour top services)
      db.from('appointments')
        .select('service:services(name, price)')
        .neq('status', 'cancelled'),
      // Reminders
      db.from('reminders').select('status'),
      // Profils avec nom
      db.from('profiles').select('id, business_name, is_active, created_at, timezone, currency')
        .order('created_at', { ascending: false }).limit(50),
    ]);

    // ── Calculs ──────────────────────────────────────────────
    const monthApts = (monthAptsRes.data ?? []) as {
      id: string; status: string; profile_id: string; service: { price: number }[] }[];
    const lastMonthApts = (lastMonthAptsRes.data ?? []) as {
      id: string; status: string; service: { price: number }[] }[];

    const statusBreakdown: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
    const profileActivity: Record<string, number> = {};
    let monthlyRevenue = 0;
    let lastMonthRevenue = 0;

    for (const apt of monthApts) {
      statusBreakdown[apt.status] = (statusBreakdown[apt.status] || 0) + 1;
      profileActivity[apt.profile_id] = (profileActivity[apt.profile_id] || 0) + 1;
      if (apt.status === 'completed' && apt.service?.[0]?.price) {
        monthlyRevenue += apt.service[0].price;
      }
    }

    for (const apt of lastMonthApts) {
      if (apt.status === 'completed' && apt.service?.[0]?.price) {
        lastMonthRevenue += apt.service[0].price;
      }
    }

    const monthTotal = monthApts.length;
    const lastMonthTotal = lastMonthApts.length;
    const aptGrowth = lastMonthTotal > 0 ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100) : (monthTotal > 0 ? 100 : 0);
    const revenueGrowth = lastMonthRevenue > 0 ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : (monthlyRevenue > 0 ? 100 : 0);
    const completionRate = monthTotal > 0 ? Math.round(((statusBreakdown.completed || 0) / monthTotal) * 100) : 0;

    // Top services
    const allSvc = (allAptServicesRes.data ?? []) as { service: { name: string; price: number }[] }[];
    const svcMap: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const a of allSvc) {
      if (a.service?.[0]) {
        const n = a.service[0].name;
        const p = a.service[0].price;
        if (!svcMap[n]) svcMap[n] = { name: n, count: 0, revenue: 0 };
        svcMap[n].count++;
        svcMap[n].revenue += p;
      }
    }
    const topServices = Object.values(svcMap).sort((a, b) => b.count - a.count).slice(0, 8);

    // Reminders
    const remData = (remindersRes.data ?? []) as { status: string }[];
    const reminderStats = {
      total: remData.length,
      sent: remData.filter((r) => r.status === 'sent').length,
      pending: remData.filter((r) => r.status === 'pending').length,
      failed: remData.filter((r) => r.status === 'failed').length,
    };

    // Top profiles this month
    const profilesList = (profilesListRes.data ?? []) as { id: string; business_name: string }[];
    const profileMap = Object.fromEntries(profilesList.map((p) => [p.id, p.business_name]));
    const topProfiles = Object.entries(profileActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({
        profile_id: id,
        business_name: profileMap[id] || 'Inconnu',
        appointment_count: count,
      }));

    return NextResponse.json({
      data: {
        totalProfiles: totalProfiles ?? 0,
        totalAppointments: totalAppointments ?? 0,
        totalServices: totalServices ?? 0,
        totalClients: totalClients ?? 0,
        activeProfiles: activeProfiles ?? 0,
        todayAppointments: todayAppointments ?? 0,
        weekAppointments: weekAppointments ?? 0,
        monthAppointments: monthTotal,
        weekNewProfiles: weekNewProfiles ?? 0,
        monthNewProfiles: monthNewProfiles ?? 0,
        statusBreakdown,
        monthlyRevenue,
        lastMonthRevenue,
        revenueGrowth,
        aptGrowth,
        reminderStats,
        topServices,
        topProfiles,
        recentAppointments: recentRes.data ?? [],
        completionRate,
        profilesList: profilesListRes.data ?? [],
      },
    });
  } catch (err) {
    console.error('Erreur admin metrics:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
