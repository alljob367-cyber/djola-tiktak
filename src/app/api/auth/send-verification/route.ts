import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Djola TikTak <onboarding@resend.dev>';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || !apiKey.startsWith('re_')) {
    return null;
  }
  return new Resend(apiKey);
}

// POST — Send verification email via Resend (bypasses Supabase's unreliable email)
// Accepts { email } in body. Finds the unconfirmed user, generates a token,
// stores it in the DB, and sends a branded email via Resend.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.trim();

    if (!email) {
      return NextResponse.json({ error: 'E-mail requis.' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // 1. Find the user by email (unconfirmed)
    // Use admin API to list users by email
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 });
    }

    const adminRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      }
    );

    if (!adminRes.ok) {
      console.error('[send-verification] Admin API error:', adminRes.status, await adminRes.text());
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    const adminData = await adminRes.json();
    const users = adminData.users || [];

    if (users.length === 0) {
      return NextResponse.json({ error: 'Aucun compte avec cet e-mail.' }, { status: 404 });
    }

    const user = users[0];

    // 2. If user is already confirmed, no need to send
    if (user.email_confirmed_at) {
      return NextResponse.json({ error: 'Cet e-mail est deja verifie. Connectez-vous.' }, { status: 400 });
    }

    // 3. Generate a verification token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    // 4. Store token in user metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        verification_token: token,
        verification_token_expires_at: tokenExpiry,
      },
    });

    if (updateError) {
      console.error('[send-verification] Failed to store token:', updateError);
      return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
    }

    // 5. Build verification URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://djola-tiktak-alljob367-1277s-projects.vercel.app';
    const verifyUrl = `${appUrl}/api/auth/confirm-verification?token=${token}&user_id=${user.id}`;

    // 6. Send via Resend
    const resend = getResendClient();

    if (!resend) {
      // Fallback: use Supabase built-in with emailRedirectTo
      console.warn('[send-verification] Resend non configure, fallback vers Supabase auth.resend');
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
        },
      });

      if (resendError) {
        return NextResponse.json({ error: resendError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        method: 'supabase_fallback',
        message: 'E-mail envoye via le systeme par defaut.',
      });
    }

    const businessName = user.user_metadata?.business_name || '';

    const { data, error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Confirmez votre compte Djola TikTak',
      html: `
        <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e;">
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; color: #ffffff; font-weight: 700;">Djola TikTak</h1>
            <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">Confirmation de votre inscription</p>
          </div>

          <div style="padding: 28px 24px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 8px; font-size: 16px; color: #111827;">Bonjour${businessName ? ` ${businessName}` : ''},</p>

            <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
              Merci de vous etre inscrit sur Djola TikTak ! Cliquez sur le bouton ci-dessous pour activer votre compte et commencer a recevoir des reservations.
            </p>

            <div style="text-align: center; margin-bottom: 28px;">
              <a href="${verifyUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                Confirmer mon e-mail
              </a>
            </div>

            <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">Ce lien expire dans 24 heures.</p>
            <p style="margin: 0; font-size: 13px; color: #6b7280;">
              Si vous n'avez pas cree de compte, ignorez cet e-mail.
            </p>
          </div>

          <div style="padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0;">Djola TikTak — Prenez rendez-vous en toute simplicite</p>
          </div>
        </div>
      `,
    });

    if (sendError) {
      console.error('[send-verification] Resend error:', sendError);
      return NextResponse.json({ error: "Erreur lors de l'envoi de l'e-mail." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      method: 'resend',
      messageId: data?.id,
    });
  } catch (err) {
    console.error('[send-verification] Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur interne.' }, { status: 500 });
  }
}
