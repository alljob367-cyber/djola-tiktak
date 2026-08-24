// ============================================================
// Reminder System — Provider-agnostic notification architecture
// ============================================================

export interface ReminderPayload {
  appointmentId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceName: string;
  servicePrice: number;
  businessName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  currency: string;
}

export interface ReminderResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  readonly channel: string;
  send(payload: ReminderPayload): Promise<ReminderResult>;
}
