// ============================================================
// Reminder Service — Orchestrates all notification providers
// ============================================================

import type { ReminderPayload, ReminderResult, NotificationProvider } from './types';
import { EmailProvider } from './email-provider';
import { SMSProvider } from './sms-provider';
import { WhatsAppProvider } from './whatsapp-provider';
import { VoiceProvider } from './voice-provider';

export class ReminderService {
  private providers: Map<string, NotificationProvider>;

  constructor() {
    this.providers = new Map();
    this.registerProvider(new EmailProvider());
    // Register additional providers as needed:
    // this.registerProvider(new SMSProvider());
    // this.registerProvider(new WhatsAppProvider());
    // this.registerProvider(new VoiceProvider());
  }

  registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  async sendReminder(payload: ReminderPayload, channels: string[] = ['email']): Promise<ReminderResult[]> {
    const results: ReminderResult[] = [];

    for (const channel of channels) {
      const provider = this.providers.get(channel);
      if (provider) {
        const result = await provider.send(payload);
        results.push(result);
      } else {
        results.push({
          success: false,
          channel,
          error: `Fournisseur non configuré: ${channel}`,
        });
      }
    }

    return results;
  }

  /**
   * Build a reminder payload from appointment + related data.
   * Call this from the cron endpoint before sending.
   */
  buildPayload(data: {
    appointmentId: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    serviceName: string;
    servicePrice: number;
    businessName: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    currency: string;
  }): ReminderPayload {
    return {
      appointmentId: data.appointmentId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail,
      serviceName: data.serviceName,
      servicePrice: data.servicePrice,
      businessName: data.businessName,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      timezone: data.timezone,
      currency: data.currency,
    };
  }
}

// Singleton instance
let instance: ReminderService | null = null;

export function getReminderService(): ReminderService {
  if (!instance) {
    instance = new ReminderService();
  }
  return instance;
}