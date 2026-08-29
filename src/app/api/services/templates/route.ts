import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessType } from '@/lib/business-types';
import { checkPlanLimit, requireSubscription, PlanGateError } from '@/lib/plan-gate';

// GET — modèles disponibles pour le type de business de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, business_type')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    const config = getBusinessType(profile.business_type);
    return NextResponse.json({
      business_type: config.key,
      label: config.label,
      categories: config.categories,
      templates: config.templates,
    });
  } catch (err) {
    console.error('Erreur inattendue templates GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// POST — importer une sélection de modèles en un clic
// Body : { template_indexes: number[] }  (indices dans la liste des modèles)
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

    // ── Vérification de l'abonnement ──
    try {
      await requireSubscription(profile, user.email);
    } catch (e) {
      if (e instanceof PlanGateError) {
        return NextResponse.json({ error: e.message, code: e.code, upgradeUrl: '/dashboard/billing' }, { status: e.statusCode });
      }
      throw e;
    }

    const body = await request.json();
    const indexes: number[] = Array.isArray(body?.template_indexes)
      ? body.template_indexes.filter((i: unknown) => typeof i === 'number' && Number.isInteger(i) && i >= 0)
      : [];

    if (indexes.length === 0) {
      return NextResponse.json({ error: 'Aucun modèle sélectionné' }, { status: 400 });
    }

    const config = getBusinessType(profile.business_type);
    const selected = indexes
      .map((i) => config.templates[i])
      .filter(Boolean);

    if (selected.length === 0) {
      return NextResponse.json({ error: 'Modèles introuvables' }, { status: 400 });
    }

    // ── Vérification de la limite du plan (comptage manuel avec ajout) ──
    const gate = await checkPlanLimit({
      profile,
      userEmail: user.email,
      featureKey: 'max_services',
      table: 'services',
    });

    if (!gate.allowed) {
      return NextResponse.json({ error: gate.message, code: 'PLAN_LIMIT_REACHED', upgradeUrl: gate.upgradeUrl, limit: gate.limit, current: gate.current }, { status: 403 });
    }

    // Éviter les doublons : ignorer les modèles dont le nom existe déjà
    const { data: existingServices } = await supabase
      .from('services')
      .select('name')
      .eq('profile_id', user.id);

    const existingNames = new Set((existingServices ?? []).map((s) => s.name.toLowerCase()));
    let toInsert = selected.filter((t) => !existingNames.has(t.name.toLowerCase()));

    if (toInsert.length === 0) {
      return NextResponse.json({ data: [], skipped: selected.length, message: 'Tous ces modèles existent déjà' });
    }

    // Limite du plan : ne garder que ce qui rentre
    let skippedByLimit = 0;
    if (gate.limit !== -1 && existingNames.size + toInsert.length > gate.limit) {
      const allowedCount = Math.max(0, gate.limit - existingNames.size);
      skippedByLimit = toInsert.length - allowedCount;
      toInsert = toInsert.slice(0, allowedCount);
      if (toInsert.length === 0) {
        return NextResponse.json(
          { error: `Limite de ${gate.limit} services atteinte pour votre plan. Passez au plan supérieur pour importer plus de modèles.`, code: 'PLAN_LIMIT_REACHED', upgradeUrl: gate.upgradeUrl, limit: gate.limit, current: existingNames.size },
          { status: 403 },
        );
      }
    }

    const rows = toInsert.map((t) => ({
      profile_id: user.id,
      name: t.name,
      description: t.description,
      category: t.category,
      price: t.price,
      duration_minutes: t.duration_minutes,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from('services')
      .insert(rows)
      .select();

    if (error) {
      console.error('Erreur templates POST:', error);
      return NextResponse.json({ error: 'Erreur lors de l\'import des modèles' }, { status: 500 });
    }

    return NextResponse.json({ data, skipped: selected.length - toInsert.length, skippedByLimit, limit: gate.limit }, { status: 201 });
  } catch (err) {
    console.error('Erreur inattendue templates POST:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
