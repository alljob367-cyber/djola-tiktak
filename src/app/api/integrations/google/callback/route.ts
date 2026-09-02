import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isGoogleConfigured, exchangeCodeForTokens } from '@/lib/google/calendar';
import { verifyOAuthState, encryptToken } from '@/lib/google/crypto';

const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

// GET — callback OAuth Google : échange du code + enregistrement
// des tokens chiffrés. Le navigateur est redirigé vers /dashboard/settings.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const googleError = searchParams.get('error');

  if (googleError) {
    console.warn('[integrations/google/callback] refus utilisateur:', googleError);
    return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=cancelled`);
  }

  if (!code || !state || !isGoogleConfigured()) {
    return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=error`);
  }

  try {
    // 1) L'utilisateur doit être connecté ET correspondre au state signé
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=auth_required`);
    }

    const stateUserId = verifyOAuthState(state);
    if (!stateUserId || stateUserId !== user.id) {
      console.warn('[integrations/google/callback] state invalide ou utilisateur différent');
      return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=error`);
    }

    // 2) Échange du code contre les tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=error`);
    }

    // 3) Upsert de l'intégration (tokens chiffrés AES-256-GCM)
    //    prompt=consent garantit un refresh_token neuf à chaque connexion.
    if (!tokens.refresh_token) {
      // Sans refresh_token la connexion mourrait dans 1 h — on refuse
      // proprement pour éviter une intégration fantôme.
      console.error('[integrations/google/callback] refresh_token manquant');
      return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=error`);
    }

    const serviceRole = await createServiceRoleClient();
    const { error: upsertError } = await serviceRole
      .from('google_calendar_integrations')
      .upsert(
        {
          profile_id: user.id,
          google_email: tokens.email,
          calendar_id: 'primary',
          access_token_enc: encryptToken(tokens.access_token),
          refresh_token_enc: encryptToken(tokens.refresh_token),
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        },
        { onConflict: 'profile_id' },
      );

    if (upsertError) {
      if ((upsertError as { code?: string }).code === '42P01') {
        return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=migration_pending`);
      }
      console.error('[integrations/google/callback] upsert:', upsertError.message);
      return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=error`);
    }

    return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=connected`);
  } catch (err) {
    console.error('Erreur inattendue integrations/google/callback:', err);
    return NextResponse.redirect(`${APP_URL()}/dashboard/settings?google=error`);
  }
}
