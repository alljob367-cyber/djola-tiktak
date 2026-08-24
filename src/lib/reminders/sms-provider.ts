// ============================================================
// SMS Reminder Provider
// ============================================================

import type { NotificationProvider, ReminderPayload, ReminderResult } from './types';

export class SMSProvider implements NotificationProvider {
  readonly channel = 'sms';

  async send(payload: ReminderPayload): Promise<ReminderResult> {
    try {
      // Placeholder — integrate with Twilio, Africa's Talking, or similar
      console.log(`[SMS] Reminder sent to ${payload.clientPhone}`);
      return { success: true, channel: this.channel, messageId: `sms-${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}
