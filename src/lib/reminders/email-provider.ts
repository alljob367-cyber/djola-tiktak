// ============================================================
// Email Reminder Provider — Resend integration
// ============================================================

import { Resend } from 'resend';
import type { NotificationProvider, ReminderPayload, ReminderResult } from './types';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || apiKey.startsWith('re_') === false) {
    return null;
  }
  return new Resend(apiKey);
}

function formatDateTime(date: Date, timezone: string): string {
  try {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
  } catch {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

function formatPrice(price: number, currency: string): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency === 'XAF' ? 'XAF' : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
  return formatted;
}

const FROM_EMAIL = 'Djola TikTak <noreply@djola-tiktak.com>';

export class EmailProvider implements NotificationProvider {
  readonly channel = 'email';

  async send(payload: ReminderPayload): Promise<ReminderResult> {
    const resend = getResendClient();

    if (!resend) {
      // Resend non configuré — fallback console.log (développement)
      console.log(`[Email/placeholder] Reminder sent to ${payload.clientEmail}`);
      return { success: true, channel: this.channel, messageId: `email-placeholder-${Date.now()}` };
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://djola-tiktak-gamma.vercel.app';
      const dateTimeStr = formatDateTime(payload.startsAt, payload.timezone);
      const priceStr = payload.servicePrice > 0
        ? formatPrice(payload.servicePrice, payload.currency)
        : 'Gratuit';

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [payload.clientEmail],
        subject: `Rappel de rendez-vous — ${payload.serviceName} chez ${payload.businessName}`,
        html: `
          <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; color: #ffffff;">Djola TikTak</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">Rappel de rendez-vous</p>
            </div>

            <!-- Body -->
            <div style="padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0 0 16px; font-size: 16px;">Bonjour <strong>${payload.clientName}</strong>,</p>

              <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">
                Ceci est un rappel pour votre rendez-vous de demain :
              </p>

              <!-- Appointment card -->
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; width: 120px;">Service</td>
                    <td style="padding: 6px 0; font-weight: 600;">${payload.serviceName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Date & heure</td>
                    <td style="padding: 6px 0; font-weight: 600;">${dateTimeStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Prix</td>
                    <td style="padding: 6px 0; font-weight: 600;">${priceStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Professionnel</td>
                    <td style="padding: 6px 0; font-weight: 600;">${payload.businessName}</td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280; line-height: 1.5;">
                Si vous souhaitez annuler ou modifier ce rendez-vous,
                veuillez contacter le professionnel directement.
              </p>

              <!-- CTA -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${appUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Voir sur Djola TikTak
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="margin: 0;">Djola TikTak — Prenez rendez-vous en toute simplicité</p>
            </div>
          </div>
        `,
      });

      if (error) {
        return { success: false, channel: this.channel, error: error.message };
      }

      return {
        success: true,
        channel: this.channel,
        messageId: data?.id,
      };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}
