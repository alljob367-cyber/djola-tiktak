// ============================================================
// WhatsApp Reminder Provider
// ============================================================

import type { NotificationProvider, ReminderPayload, ReminderResult } from './types';

export class WhatsAppProvider implements NotificationProvider {
  readonly channel = 'whatsapp';

  async send(payload: ReminderPayload): Promise<ReminderResult> {
    try {
      // Placeholder — integrate with Twilio WhatsApp API, Meta Business API, or similar
      console.log(`[WhatsApp] Reminder sent to ${payload.clientPhone}`);
      return { success: true, channel: this.channel, messageId: `wa-${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}