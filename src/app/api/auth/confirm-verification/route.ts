import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET — Confirm email verification via custom token (Resend flow)
// Query params: token, user_id
// Verifies the token stored in user_metadata, then confirms the email via Supabase Admin API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const userId = searchParams.get('user_id');

    if (!token || !userId) {
      return NextResponse.json({ error: 'Parametres manquants.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuration manquante.' }, { status: 500 });
    }

    // 1. Get user to verify token from metadata
    const adminRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      }
    );

    if (!adminRes.ok) {
      console.error('[confirm-verification] User fetch error:', adminRes.status);
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    const userData = await adminRes.json();
    const user = userData.user;
    const meta = user.user_metadata || {};

    // 2. Verify token
    const storedToken = meta.verification_token;
    const tokenExpiresAt = meta.verification_token_expires_at;

    if (!storedToken || storedToken !== token) {
      console.error('[confirm-verification] Token mismatch for user:', userId);
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
      console.error('[confirm-verification] Token expired for user:', userId);
      return NextResponse.redirect(new URL('/login?error=token_expired', request.url));
    }

    // 3. If already confirmed, redirect to login
    if (user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/login?verified=1', request.url));
    }

    // 4. Confirm the email via Supabase Admin API
    const confirmRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${userId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_confirm: true }),
      }
    );

    if (!confirmRes.ok) {
      const errText = await confirmRes.text();
      console.error('[confirm-verification] Confirm error:', confirmRes.status, errText);
      return NextResponse.redirect(new URL('/login?error=confirm_failed', request.url));
    }

    // 5. Clean up the token from metadata
    const supabase = await createServiceRoleClient();
    const { error: cleanupError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...meta,
        verification_token: null,
        verification_token_expires_at: null,
      },
    });

    if (cleanupError) {
      console.warn('[confirm-verification] Token cleanup failed:', cleanupError);
    }

    // 6. Redirect to login with success
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    return NextResponse.redirect(new URL('/login?verified=1', appUrl || request.url));
  } catch (err) {
    console.error('[confirm-verification] Unexpected error:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
