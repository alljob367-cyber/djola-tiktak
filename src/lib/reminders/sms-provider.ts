// ============================================================
// SMS Reminder Provider — Africa's Talking (exclusif)
// Détection automatique selon les variables d'environnement.
// Aucune dépendance npm : appels REST via fetch.
//
// Twilio a été retiré du projet (décision produit) : pour les SMS,
// Africa's Talking est l'agrégateur africain (tarifs locaux, très
// inférieurs aux tarifs Twilio ~0,32 $/SMS au Cameroun).
// Si aucune variable n'est configurée → mode placeholder (succès
// factice), même comportement que le provider email non configuré.
// ============================================================

import type { NotificationProvider, ReminderPayload, ReminderResult } from './types';
import { buildSmsMessage, normalizePhone } from './format';

// ------------------------------------------------------------
// Africa's Talking — https://africastalking.com
// Env : AFRICASTALKING_API_KEY, AFRICASTALKING_USERNAME,
//       AFRICASTALKING_SENDER_ID (optionnel)
// ------------------------------------------------------------
async function sendViaAfricasTalking(to: string, message: string): Promise<ReminderResult> {
  const apiKey = process.env.AFRICASTALKING_API_KEY!;
  const username = process.env.AFRICASTALKING_USERNAME!;
  const senderId = process.env.AFRICASTALKING_SENDER_ID || undefined;
  const isSandbox = username.toLowerCase() === 'sandbox';

  const body = new URLSearchParams({
    username,
    to,
    message,
    ...(senderId ? { from: senderId } : {}),
  });

  const url = isSandbox
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apiKey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));
  const recipients = data?.SMSMessageData?.Recipients?.[0];

  if (!res.ok) {
    const detail = data?.SMSMessageData?.Message || `HTTP ${res.status}`;
    return { success: false, channel: 'sms', error: `Africa's Talking: ${detail}` };
  }

  // statusCode AT : 100 (Queued) / 101 (Processed) = succès ; 4xx/5xx = échec
  const statusCode = String(recipients?.statusCode ?? '');
  if (recipients && !statusCode.startsWith('1')) {
    return {
      success: false,
      channel: 'sms',
      error: `Africa's Talking: ${recipients.status || `code ${statusCode}`}`,
    };
  }

  return {
    success: true,
    channel: 'sms',
    messageId: recipients?.messageId || `at-${Date.now()}`,
  };
}

export class SMSProvider implements NotificationProvider {
  readonly channel = 'sms';

  private isConfigured(): boolean {
    return Boolean(process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME);
  }

  async send(payload: ReminderPayload): Promise<ReminderResult> {
    try {
      if (!this.isConfigured()) {
        // Aucun fournisseur configuré — placeholder (développement)
        console.log(`[SMS/placeholder] Rappel pour ${payload.clientPhone} : ${buildSmsMessage(payload)}`);
        return { success: true, channel: this.channel, messageId: `sms-placeholder-${Date.now()}` };
      }

      const to = normalizePhone(payload.clientPhone);
      if (!to) {
        return { success: false, channel: this.channel, error: 'Numéro de téléphone manquant' };
      }

      const message = buildSmsMessage(payload);

      return sendViaAfricasTalking(to, message);
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}
