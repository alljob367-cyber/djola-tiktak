import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serviceSchema } from '@/lib/validation/schemas';
import { stripMissingColumns, trackMissingColumn } from '@/lib/supabase/columns';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET — récupérer un service par ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('profile_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Service non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue service GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// PUT — mettre à jour un service
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que le service appartient à l'utilisateur
    const { data: existing, error: findError } = await supabase
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('profile_id', user.id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Service non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = serviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Mise à jour — tolérante à l'absence de la colonne metadata
    // (paramètres spécifiques au métier) si la migration n'est pas passée.
    const fullPayload = { ...parsed.data };
    let { data, error } = await supabase
      .from('services')
      .update(stripMissingColumns('services', fullPayload))
      .eq('id', id)
      .eq('profile_id', user.id)
      .select()
      .single();

    if (error && trackMissingColumn('services', error)) {
      const retry = await supabase
        .from('services')
        .update(stripMissingColumns('services', fullPayload))
        .eq('id', id)
        .eq('profile_id', user.id)
        .select()
        .single();
      if (retry.error) {
        console.error('Erreur service PUT (retry):', retry.error);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour du service' }, { status: 500 });
      }
      return NextResponse.json({ data: retry.data, metadata_skipped: Boolean(parsed.data.metadata) });
    }

    if (error) {
      console.error('Erreur service PUT:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du service' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue service PUT:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// DELETE — supprimer un service (vérifie qu'aucun RDV n'existe)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que le service appartient à l'utilisateur
    const { data: existing, error: findError } = await supabase
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('profile_id', user.id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Service non trouvé' }, { status: 404 });
    }

    // Vérifier s'il existe des rendez-vous liés (non annulés)
    const { count: aptCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', id)
      .neq('status', 'cancelled');

    if (aptCount && aptCount > 0) {
      return NextResponse.json({
        error: `Impossible de supprimer ce service : ${aptCount} rendez-vous actifs y sont liés. Annulez ou supprimez d'abord les rendez-vous.`,
        code: 'HAS_ACTIVE_APPOINTMENTS',
        appointmentCount: aptCount,
      }, { status: 409 });
    }

    // Supprimer les rendez-vous annulés liés, puis le service
    await supabase.from('appointments').delete().eq('service_id', id);

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Erreur service DELETE:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression du service' }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Erreur inattendue service DELETE:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
