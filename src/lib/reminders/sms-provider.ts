// ============================================================
// SMS Reminder Provider — Africa's Talking OU Twilio
// Détection automatique selon les variables d'environnement.
// Aucune dépendance npm : appels REST via fetch.
//
// Priorité : Africa's Talking (moins cher en Afrique) > Twilio
// Si aucun n'est configuré → mode placeholder (succès factice),
// même comportement que le provider email non configuré.
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

// ------------------------------------------------------------
// Twilio — https://www.twilio.com
// Env : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
// ------------------------------------------------------------
async function sendViaTwilio(to: string, message: string): Promise<ReminderResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_PHONE_NUMBER!;

  const body = new URLSearchParams({ To: to, From: from, Body: message });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      channel: 'sms',
      error: `Twilio: ${data?.message || `HTTP ${res.status}`}`,
    };
  }

  return { success: true, channel: 'sms', messageId: data?.sid || `tw-${Date.now()}` };
}

export class SMSProvider implements NotificationProvider {
  readonly channel = 'sms';

  private detectBackend(): 'africastalking' | 'twilio' | null {
    if (process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME) {
      return 'africastalking';
    }
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      return 'twilio';
    }
    return null;
  }

  async send(payload: ReminderPayload): Promise<ReminderResult> {
    try {
      const backend = this.detectBackend();

      if (!backend) {
        // Aucun fournisseur configuré — placeholder (développement)
        console.log(`[SMS/placeholder] Rappel pour ${payload.clientPhone} : ${buildSmsMessage(payload)}`);
        return { success: true, channel: this.channel, messageId: `sms-placeholder-${Date.now()}` };
      }

      const to = normalizePhone(payload.clientPhone);
      if (!to) {
        return { success: false, channel: this.channel, error: 'Numéro de téléphone manquant' };
      }

      const message = buildSmsMessage(payload);

      return backend === 'africastalking'
        ? sendViaAfricasTalking(to, message)
        : sendViaTwilio(to, message);
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}
