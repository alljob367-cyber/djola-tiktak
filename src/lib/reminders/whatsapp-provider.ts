// ============================================================
// WhatsApp Reminder Provider — Meta Cloud API (exclusif)
// ============================================================
// Twilio a été retiré du projet (décision produit) : Meta
// WhatsApp Cloud API est la seule voie WhatsApp. Elle est
// GRATUITE jusqu'à 1 000 conversations de service / mois, ce
// qui couvre largement les rappels d'une petite activité.
// Aucune dépendance npm : appels REST via fetch.
//
// Si WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID ne sont pas
// définis → mode placeholder (succès factice, logs locaux).
//
// ⚠️ Meta Cloud API n'accepte que des "templates" approuvés
// pour les messages initiés hors fenêtre de 24h. Un rappel à
// J-1 vers un client qui n'a jamais écrit au numéro est un
// "business-initiated message" → utiliser un template approuvé
// de catégorie UTILITY (ex : appointment_reminder).
// ============================================================

import type { NotificationProvider, ReminderPayload, ReminderResult } from './types';
import { buildWhatsAppMessage, normalizePhone, formatReminderDateTime, formatReminderPrice } from './format';

// ------------------------------------------------------------
// Meta WhatsApp Cloud API (officielle, gratuite jusqu'à
// 1 000 conversations/mois)
// Env : WHATSAPP_TOKEN (jeton permanent),
//       WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME (optionnel)
// ------------------------------------------------------------
async function sendViaMeta(payload: ReminderPayload, to: string): Promise<ReminderResult> {
  const token = process.env.WHATSAPP_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

  let messageBody: Record<string, unknown>;

  if (templateName) {
    // Template approuvé (requis hors fenêtre 24h)
    const { date, time } = formatReminderDateTime(payload.startsAt, payload.timezone);
    const jour = date.charAt(0).toUpperCase() + date.slice(1);
    messageBody = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'fr' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: payload.clientName },
              { type: 'text', text: payload.businessName },
              { type: 'text', text: jour },
              { type: 'text', text: time },
              { type: 'text', text: payload.serviceName },
              { type: 'text', text: formatReminderPrice(payload.servicePrice, payload.currency) },
            ],
          },
        ],
      },
    };
  } else {
    // Message libre — ne passe QUE si le client a écrit dans les
    // dernières 24h (fenêtre de session). Tentative best-effort.
    messageBody = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: false, body: payload.customMessage ?? buildWhatsAppMessage(payload) },
    };
  }

  const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messageBody),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      channel: 'whatsapp',
      error: `Meta WhatsApp: ${data?.error?.message || `HTTP ${res.status}`}`,
    };
  }

  return {
    success: true,
    channel: 'whatsapp',
    messageId: data?.messages?.[0]?.id || `wa-meta-${Date.now()}`,
  };
}

export class WhatsAppProvider implements NotificationProvider {
  readonly channel = 'whatsapp';

  private isConfigured(): boolean {
    return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  async send(payload: ReminderPayload): Promise<ReminderResult> {
    try {
      if (!this.isConfigured()) {
        // Meta Cloud API non configurée — placeholder (développement)
        console.log(`[WhatsApp/placeholder] Rappel pour ${payload.clientPhone} : ${payload.customMessage ?? buildWhatsAppMessage(payload)}`);
        return { success: true, channel: this.channel, messageId: `wa-placeholder-${Date.now()}` };
      }

      const to = normalizePhone(payload.clientPhone);
      if (!to) {
        return { success: false, channel: this.channel, error: 'Numéro de téléphone manquant' };
      }

      return sendViaMeta(payload, to);
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}
