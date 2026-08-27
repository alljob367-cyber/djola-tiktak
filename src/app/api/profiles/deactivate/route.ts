import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST — désactiver son propre profil
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Erreur désactivation profil:', error);
      return NextResponse.json({ error: 'Erreur lors de la désactivation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erreur inattendue deactivate:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
