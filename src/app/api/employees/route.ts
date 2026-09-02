import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { employeeSchema } from '@/lib/validation/schemas';
import { checkPlanLimit, PlanGateError } from '@/lib/plan-gate';
import { stripMissingColumns, trackMissingColumn } from '@/lib/supabase/columns';

// ── GET : lister les employés de l'utilisateur authentifié ──
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('profile_id', user.id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      // Table absente (migration en attente) → liste vide plutôt qu'un crash
      if (trackMissingColumn('employees', error) || error.code === '42P01') {
        return NextResponse.json({ data: [], migrationPending: true });
      }
      console.error('Erreur employees GET:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des employés' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error('Erreur inattendue employees GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// ── POST : ajouter un employé (limite du plan : max_employees) ──
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Limite du plan (starter 1, pro 3, business 10 — admin bypass)
    const gate = await checkPlanLimit({
      profile,
      userEmail: user.email ?? null,
      featureKey: 'max_employees',
      table: 'employees',
    });

    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: gate.message,
          limit: gate.limit,
          current: gate.current,
          upgradeUrl: gate.upgradeUrl,
          code: 'PLAN_LIMIT',
        },
        { status: 402 },
      );
    }

    const payload = stripMissingColumns('employees', {
      profile_id: profile.id,
      name: parsed.data.name,
      position: parsed.data.position,
      phone: parsed.data.phone,
      email: parsed.data.email || '',
      color: parsed.data.color,
      is_active: parsed.data.is_active,
      display_order: parsed.data.display_order,
    });

    const { data, error } = await supabase
      .from('employees')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (trackMissingColumn('employees', error) || error.code === '42P01') {
        // Table absente (migration SQL en attente)
        return NextResponse.json(
          {
            error: 'La table employés n\u2019existe pas encore en base. Exécutez supabase/employees-migration.sql dans le SQL Editor Supabase.',
            code: 'MIGRATION_PENDING',
          },
          { status: 503 },
        );
      }
      console.error('Erreur employees POST:', error);
      return NextResponse.json({ error: 'Erreur lors de la création de l\u2019employé' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof PlanGateError) {
      return NextResponse.json({ error: err.message, code: 'PLAN_LIMIT' }, { status: 402 });
    }
    console.error('Erreur inattendue employees POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
