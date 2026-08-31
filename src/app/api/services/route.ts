import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serviceSchema } from '@/lib/validation/schemas';
import { checkPlanLimit, requireSubscription, PlanGateError } from '@/lib/plan-gate';
import { stripMissingColumns, trackMissingColumn } from '@/lib/supabase/columns';

// GET — lister les services de l'utilisateur authentifié
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer le profil de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur services GET:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des services' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue services GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// POST — créer un service (avec vérification de limite du plan)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer le profil complet (avec infos d'abonnement)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    // ── Vérification de l'abonnement ──
    try {
      await requireSubscription(profile, user.email);
    } catch (e) {
      if (e instanceof PlanGateError) {
        return NextResponse.json({ error: e.message, code: e.code, upgradeUrl: '/dashboard/billing' }, { status: e.statusCode });
      }
      throw e;
    }

    // ── Vérification de la limite du plan ──
    const gate = await checkPlanLimit({
      profile,
      userEmail: user.email,
      featureKey: 'max_services',
      table: 'services',
    });

    if (!gate.allowed) {
      return NextResponse.json({ error: gate.message, code: 'PLAN_LIMIT_REACHED', upgradeUrl: gate.upgradeUrl, limit: gate.limit, current: gate.current }, { status: 403 });
    }

    const body = await request.json();
    const parsed = serviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Insertion — si la colonne metadata (paramètres spécifiques au métier)
    // n'existe pas encore en base, on retente sans elle : le service est
    // créé quand même, le front signale que les champs spécifiques sont
    // ignorés jusqu'à l'exécution de la migration SQL.
    const fullPayload = { ...parsed.data, profile_id: user.id };
    const insertPayload = stripMissingColumns('services', fullPayload);
    let { data, error } = await supabase
      .from('services')
      .insert(insertPayload)
      .select()
      .single();

    if (error && trackMissingColumn('services', error)) {
      const retryPayload = stripMissingColumns('services', fullPayload);
      const retry = await supabase
        .from('services')
        .insert(retryPayload)
        .select()
        .single();
      if (retry.error) {
        console.error('Erreur services POST (retry):', retry.error);
        return NextResponse.json({ error: 'Erreur lors de la création du service' }, { status: 500 });
      }
      return NextResponse.json({
        data: retry.data,
        // champ présent = les paramètres spécifiques n'ont pas été enregistrés
        metadata_skipped: Boolean(parsed.data.metadata),
      }, { status: 201 });
    }

    if (error) {
      console.error('Erreur services POST:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du service' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Erreur inattendue services POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
