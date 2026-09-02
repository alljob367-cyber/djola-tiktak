import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { employeeSchema } from '@/lib/validation/schemas';
import { checkPlanLimit, PlanGateError } from '@/lib/plan-gate';
import { stripMissingColumns, trackMissingColumn } from '@/lib/supabase/columns';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── PATCH : modifier un employé (ou activer/désactiver) ──
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = employeeSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Réactivation : vérifier la limite du plan (employés actifs)
    if (parsed.data.is_active === true) {
      const { data: target } = await supabase
        .from('employees')
        .select('id, is_active')
        .eq('id', id)
        .eq('profile_id', user.id)
        .single();

      if (target && !target.is_active) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profile) {
          return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
        }

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
      }
    }

    const payload = stripMissingColumns('employees', {
      ...parsed.data,
      email: parsed.data.email ?? undefined,
      updated_at: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('employees')
      .update(payload)
      .eq('id', id)
      .eq('profile_id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Erreur employees PATCH:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue employees PATCH:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// ── DELETE : supprimer un employé ──
// Les rendez-vous passés conservent leur historique :
// appointments.employee_id passe à NULL (ON DELETE SET NULL).
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Erreur employees DELETE:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erreur inattendue employees DELETE:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
