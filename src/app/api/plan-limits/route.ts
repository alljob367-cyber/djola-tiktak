import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/plan-gate';
import type { PlanId } from '@/types/database';

export const dynamic = 'force-dynamic';

// Default limits when DB is not available
const DEFAULTS: Record<string, Record<PlanId, number>> = {
  max_services:              { starter: 5,   pro: -1, business: -1 },
  max_clients:               { starter: 200, pro: -1, business: -1 },
  max_appointments_per_day:  { starter: 50,  pro: 100, business: -1 },
  max_employees:             { starter: 1,   pro: 3,   business: 10 },
  max_calendars:             { starter: 1,   pro: 3,   business: -1 },
  voice_credits:             { starter: 50,  pro: 200, business: 500 },
};

const FEATURE_LABELS: Record<string, string> = {
  max_services: 'Services',
  max_clients: 'Clients',
  max_appointments_per_day: 'RDV / jour',
  max_employees: 'Professionnels',
  max_calendars: 'Calendriers',
  voice_credits: 'Crédits vocaux IA',
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    const plan = (profile.plan as PlanId) || 'starter';
    const isUserAdmin = isAdmin(user.email);

    // Fetch plan limits from DB
    let limits: Record<string, number> = {};
    try {
      const serviceRole = await createServiceRoleClient();
      const { data: planLimits } = await serviceRole
        .from('plan_limits')
        .select('limit_key, limit_value')
        .eq('plan_id', plan);

      if (Array.isArray(planLimits)) {
        for (const row of planLimits) {
          limits[row.limit_key] = row.limit_value;
        }
      }
    } catch {
      // plan_limits table not available, use defaults
    }

    // Fill in defaults for missing keys
    for (const [key, planDefaults] of Object.entries(DEFAULTS)) {
      if (!(key in limits)) {
        limits[key] = planDefaults[plan] ?? 0;
      }
    }

    // Count current usage
    const serviceRole = await createServiceRoleClient();
    const counts: Record<string, number> = {};

    // Services count
    const { count: servicesCount } = await serviceRole
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id);
    counts.max_services = servicesCount ?? 0;

    // Clients count
    const { count: clientsCount } = await serviceRole
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id);
    counts.max_clients = clientsCount ?? 0;

    // Today's appointments count
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const { count: apptsCount } = await serviceRole
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .neq('status', 'cancelled')
      .gte('starts_at', dayStart)
      .lt('starts_at', dayEnd);
    counts.max_appointments_per_day = apptsCount ?? 0;

    // Build response
    const features = Object.entries(limits).map(([key, limit]) => ({
      key,
      label: FEATURE_LABELS[key] || key,
      limit: isUserAdmin ? -1 : limit,
      current: isUserAdmin ? 0 : (counts[key] ?? 0),
      unlimited: isUserAdmin || limit === -1,
      reached: !isUserAdmin && limit !== -1 && (counts[key] ?? 0) >= limit,
    }));

    return NextResponse.json({
      isAdmin: isUserAdmin,
      plan,
      subscriptionStatus: profile.subscription_status,
      features,
    });
  } catch (err) {
    console.error('Erreur plan-limits:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
