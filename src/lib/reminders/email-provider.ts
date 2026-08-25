// ============================================================
// Email Reminder Provider
// ============================================================

import type { NotificationProvider, ReminderPayload, ReminderResult } from './types';

export class EmailProvider implements NotificationProvider {
  readonly channel = 'email';

  async send(payload: ReminderPayload): Promise<ReminderResult> {
    try {
      // Placeholder — integrate with Resend, SendGrid, or Supabase Edge Function
      console.log(`[Email] Reminder sent to ${payload.clientEmail}`);
      return { success: true, channel: this.channel, messageId: `email-${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}
