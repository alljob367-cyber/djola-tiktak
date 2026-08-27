import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// ⚠️ TEMPORAIRE — Supprimer après test
// Envoie un email de test pour vérifier que Resend fonctionne
export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.startsWith('re_') === false) {
    return NextResponse.json({ error: 'RESEND_API_KEY non configurée sur Vercel' }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Djola TikTak <onboarding@resend.dev>',
      to: ['alljob367@gmail.com'],
      subject: '✅ Test Djola TikTak — Rappels email actifs',
      html: `
        <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, sans-serif; padding: 32px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; color: #fff; font-size: 24px;">Djola TikTak</h1>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #22c55e; margin: 0 0 16px;">✅ Les rappels par email fonctionnent !</h2>
            <p style="color: #374151; line-height: 1.6;">Ceci est un email de test. Les vrais rappels de rendez-vous seront envoyés automatiquement par le cron chaque heure pour les RDV prévus dans les 24 prochaines heures.</p>
            <table style="width: 100%; margin-top: 20px; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Service</td><td style="font-weight: 600;">Coupe homme</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="font-weight: 600;">lundi 1 septembre 2025 à 10:00</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Prix</td><td style="font-weight: 600;">2 000 XAF</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Professionnel</td><td style="font-weight: 600;">Barber du Quartier</td></tr>
            </table>
            <p style="margin-top: 24px; font-size: 13px; color: #9ca3af; text-align: center;">Si tu vois cet email, tout est opérationnel. Tu peux supprimer cet endpoint de test.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Email envoyé à alljob367@gmail.com',
      resendId: data?.id,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}
