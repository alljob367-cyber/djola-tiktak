import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isGoogleConfigured, buildAuthUrl } from '@/lib/google/calendar';
import { signOAuthState } from '@/lib/google/crypto';

// GET — lance le consentement OAuth Google pour le pro connecté.
export async function GET() {
  try {
    if (!isGoogleConfigured()) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google=not_configured', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google=auth_required', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
      );
    }

    const state = signOAuthState(user.id);
    if (!state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google=error', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
      );
    }

    return NextResponse.redirect(buildAuthUrl(state));
  } catch (err) {
    console.error('Erreur inattendue integrations/google/connect:', err);
    return NextResponse.redirect(
      new URL('/dashboard/settings?google=error', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    );
  }
}
