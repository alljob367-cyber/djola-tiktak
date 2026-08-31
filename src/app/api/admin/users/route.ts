// ============================================================
// /api/admin/users — Gestion des utilisateurs & plans (ADMIN ONLY)
// ------------------------------------------------------------
// GET   /api/admin/users?q=&plan=&role=&status=&page=
//       → liste paginée des profils avec plan, rôle et statut
// PATCH /api/admin/users  { profileId, plan?, isActive?, role? }
//       → SEUL L'ADMIN contrôle les plans, l'activation et les rôles
//
// Protections :
//   - impossible de modifier son propre rôle (ni auto-promotion,
//     ni auto-rétrogradation) ;
//   - impossible de rétrograder le DERNIER administrateur.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminApi, countAdmins } from '@/lib/admin-guard';
import {
  selectFieldsFor,
  stripMissingColumns,
  trackMissingColumn,
} from '@/lib/supabase/columns';
import type { PlanId } from '@/types/database';

export const dynamic = 'force-dynamic';

const USER_FIELDS = [
  'id',
  'business_name',
  'slug',
  'email',
  'phone',
  'plan',
  'subscription_status',
  'subscription_end',
  'is_active',
  'role',
  'created_at',
];

const PLANS: PlanId[] = ['starter', 'pro', 'business'];
const ROLES = ['user', 'admin'] as const;
const PAGE_SIZE = 50;

// ── GET : liste des utilisateurs ─────────────────────────────

export async function GET(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    const plan = searchParams.get('plan') ?? '';
    const role = searchParams.get('role') ?? '';
    const status = searchParams.get('status') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

    const db = await createServiceRoleClient();

    // Sélection tolérante (colonne role potentiellement absente)
    let select = selectFieldsFor('profiles', USER_FIELDS);
    let query = db.from('profiles').select(select, { count: 'exact' });

    if (q) {
      const like = `%${q.replace(/[%,]/g, '')}%`;
      query = query.or(`business_name.ilike.${like},email.ilike.${like},slug.ilike.${like}`);
    }
    if (PLANS.includes(plan as PlanId)) query = query.eq('plan', plan);
    if (role === 'user' || role === 'admin') query = query.eq('role', role);
    if (status) query = query.eq('subscription_status', status);

    query = query.order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    let { data, count, error } = await query;

    // Retry sans `role` si la colonne manque (migration 10 non exécutée)
    if (error && trackMissingColumn('profiles', error)) {
      const fallback = USER_FIELDS.filter((f) => f !== 'role').join(', ');
      let retry = db.from('profiles').select(fallback, { count: 'exact' });
      if (q) {
        const like = `%${q.replace(/[%,]/g, '')}%`;
        retry = retry.or(`business_name.ilike.${like},email.ilike.${like},slug.ilike.${like}`);
      }
      if (PLANS.includes(plan as PlanId)) retry = retry.eq('plan', plan);
      if (status) retry = retry.eq('subscription_status', status);
      retry = retry.order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      const result = await retry;
      data = result.data;
      count = result.count;
      error = result.error;
    }

    if (error) {
      console.error('[admin-users] GET:', error.message);
      return NextResponse.json({ error: 'Erreur base de données.' }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
      // true = colonne role absente (migration 10 non exécutée)
      roleColumnMissing: !select.split(',').map((f) => f.trim()).includes('role'),
    });
  } catch (err) {
    console.error('[admin-users] GET inattendu:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ── PATCH : modification plan / activation / rôle ────────────

interface PatchBody {
  profileId?: string;
  plan?: string;
  isActive?: boolean;
  role?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  try {
    const body = (await request.json()) as PatchBody;
    const profileId = (body.profileId ?? '').trim();

    if (!UUID_RE.test(profileId)) {
      return NextResponse.json({ error: 'profileId invalide.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    // ── Plan : SEUL L'ADMIN ATTRIBUE LES PLANS ──
    if (body.plan !== undefined) {
      if (!PLANS.includes(body.plan as PlanId)) {
        return NextResponse.json(
          { error: 'Plan invalide. Valeurs : starter, pro, business.' },
          { status: 400 },
        );
      }
      updates.plan = body.plan;
      updates.subscription_status = 'active';
      updates.subscription_start = new Date().toISOString();
      updates.subscription_end = null;
    }

    // ── Activation / désactivation ──
    if (body.isActive !== undefined) {
      updates.is_active = body.isActive === true;
    }

    // ── Rôle : protections anti-verrouillage ──
    if (body.role !== undefined) {
      if (body.role !== 'user' && body.role !== 'admin') {
        return NextResponse.json(
          { error: 'Rôle invalide. Valeurs : user, admin.' },
          { status: 400 },
        );
      }
      if (profileId === guard.status.userId) {
        return NextResponse.json(
          { error: 'Vous ne pouvez pas modifier votre propre rôle administrateur.' },
          { status: 400 },
        );
      }
      if (body.role === 'user') {
        // Interdire la rétrogradation du DERNIER admin
        const admins = await countAdmins();
        if (admins <= 1) {
          return NextResponse.json(
            { error: 'Impossible de rétrograder le dernier administrateur de l\'application.' },
            { status: 409 },
          );
        }
      }
      updates.role = body.role;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Rien à modifier. Fournissez plan, isActive ou role.' },
        { status: 400 },
      );
    }

    const db = await createServiceRoleClient();
    let payload = stripMissingColumns('profiles', updates);
    const strippedRole = 'role' in updates && !('role' in payload);

    let { data, error } = await db
      .from('profiles')
      .update(payload)
      .eq('id', profileId)
      .select(selectFieldsFor('profiles', USER_FIELDS));

    // Retry sans colonnes manquantes
    if (error && trackMissingColumn('profiles', error)) {
      const missing = Object.keys(updates).filter((k) => k !== 'role');
      if (missing.length === 0) {
        return NextResponse.json(
          {
            error:
              'La migration « admin-role-migration.sql » n\'est pas exécutée. ' +
              'Exécutez-la dans Supabase (SQL Editor) pour gérer les rôles.',
            migrationNeeded: true,
          },
          { status: 409 },
        );
      }
      const retryPayload = stripMissingColumns('profiles', updates);
      const result = await db
        .from('profiles')
        .update(retryPayload)
        .eq('id', profileId)
        .select(USER_FIELDS.filter((f) => f !== 'role').join(', '));
      data = result.data;
      error = result.error;
      if (strippedRole && !error) {
        return NextResponse.json(
          {
            error:
              'Champs mis à jour, mais la migration « admin-role-migration.sql » est requise ' +
              'pour changer les rôles.',
            migrationNeeded: true,
            partialSuccess: true,
            data: data?.[0] ?? null,
          },
          { status: 200 },
        );
      }
    }

    if (error) {
      console.error('[admin-users] PATCH:', error.message);
      return NextResponse.json({ error: 'Erreur base de données.' }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ data: data[0] });
  } catch (err) {
    console.error('[admin-users] PATCH inattendu:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
