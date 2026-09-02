import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isGoogleConfigured } from '@/lib/google/calendar';

// GET — statut de l'intégration Google Calendar du pro connecté.
// Aucun token renvoyé au client : uniquement des champs sûrs.
export async function GET() {
  try {
    const configured = isGoogleConfigured();
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('google_calendar_integrations')
      .select('google_email, calendar_id, sync_enabled, block_busy')
      .eq('profile_id', user.id)
      .maybeSingle();

    // 42P01 = table absente (migration SQL non exécutée) → dégradation gracieuse
    const migrationPending = Boolean(error && (error as { code?: string }).code === '42P01');
    if (error && !migrationPending) {
      console.error('[integrations/google GET]', error.message);
    }

    return NextResponse.json({
      configured,
      migrationPending,
      connected: Boolean(data),
      email: data?.google_email ?? null,
      syncEnabled: data?.sync_enabled ?? true,
      blockBusy: data?.block_busy ?? true,
    });
  } catch (err) {
    console.error('Erreur inattendue integrations/google GET:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// PATCH — activer/désactiver la sync ou le blocage par busy Google
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, boolean> = {};

    if (typeof body.sync_enabled === 'boolean') {
      updates.sync_enabled = body.sync_enabled;
    }
    if (typeof body.block_busy === 'boolean') {
      updates.block_busy = body.block_busy;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide à mettre à jour' }, { status: 400 });
    }

    // RLS : propriétaire uniquement. 42P01 → migration non passée.
    const { error } = await supabase
      .from('google_calendar_integrations')
      .update(updates)
      .eq('profile_id', user.id);

    if (error) {
      if ((error as { code?: string }).code === '42P01') {
        return NextResponse.json(
          { error: 'Migration SQL google-calendar-migration.sql non exécutée.' },
          { status: 503 },
        );
      }
      console.error('[integrations/google PATCH]', error.message);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Erreur inattendue integrations/google PATCH:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
