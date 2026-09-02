import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST — déconnecte l'agenda Google du pro connecté
// (supprime l'intégration ; les RDV déjà poussés restent dans Google).
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { error } = await supabase
      .from('google_calendar_integrations')
      .delete()
      .eq('profile_id', user.id);

    if (error) {
      if ((error as { code?: string }).code === '42P01') {
        // Table absente = de facto déconnecté
        return NextResponse.json({ data: { success: true } });
      }
      console.error('[integrations/google/disconnect]', error.message);
      return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Erreur inattendue integrations/google/disconnect:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
