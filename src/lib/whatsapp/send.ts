// ============================================================
// Djola TikTak — Envoi WhatsApp via Meta Cloud API
// ============================================================
// Couche d'envoi bas niveau pour le bot de réservation :
// texte simple, listes interactives et boutons de réponse.
//
// Contrairement aux RAPPELS (messages initiés par le business →
// templates approuvés requis hors fenêtre 24h), le bot RÉPOND
// à un message client → fenêtre de service ouverte 24h →
// messages libres autorisés, sans template.
//
// Aucune dépendance npm : appels REST via fetch.
// Env requises : WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
// Optionnel    : WHATSAPP_API_VERSION (défaut v21.0)
// ============================================================

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

/** true si les variables Meta Cloud API sont configurées. */
export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Envoi brut au Graph API. Résilient : ne throw jamais. */
async function graphSend(body: Record<string, unknown>): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn('[wa-send] Meta Cloud API non configurée — message ignoré');
    return { ok: false, error: 'not_configured' };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      console.error('[wa-send] erreur Graph API:', res.status, data.error?.message);
      return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
    }

    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error('[wa-send] exception réseau:', err);
    return { ok: false, error: String(err) };
  }
}

/** Message texte simple (dans la fenêtre de service 24h). */
export function sendWhatsAppText(to: string, body: string): Promise<SendResult> {
  return graphSend({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: true, body },
  });
}

export interface ListRow {
  id: string;
  /** ⚠️ Max 24 caractères (limite Meta) — tronqué automatiquement */
  title: string;
  description?: string;
}

/**
 * Message liste interactive (jusqu'à 10 lignes, 1 section).
 * Fallback automatique en texte numéroté si l'API refuse l'interactif.
 */
export async function sendWhatsAppList(
  to: string,
  bodyText: string,
  rows: ListRow[],
  options: { header?: string; buttonLabel?: string; footer?: string } = {},
): Promise<SendResult> {
  const safeRows = rows.slice(0, 10).map((r) => ({
    id: r.id,
    title: r.title.slice(0, 24),
    ...(r.description ? { description: r.description.slice(0, 72) } : {}),
  }));

  if (safeRows.length === 0) {
    return sendWhatsAppText(to, bodyText);
  }

  const result = await graphSend({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(options.header ? { header: { type: 'text', text: options.header.slice(0, 60) } } : {}),
      body: { text: bodyText },
      ...(options.footer ? { footer: { text: options.footer.slice(0, 60) } } : {}),
      action: {
        button: (options.buttonLabel || 'Choisir').slice(0, 20),
        sections: [{ title: 'Options', rows: safeRows }],
      },
    },
  });

  if (result.ok) return result;

  // Fallback texte numéroté (vieilles versions WhatsApp, erreurs API…)
  console.warn('[wa-send] liste interactive refusée, fallback texte:', result.error);
  const numbered = bodyText + '\n\n' + safeRows.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
  return sendWhatsAppText(to, numbered);
}

export interface ReplyButton {
  id: string;
  /** ⚠️ Max 20 caractères (limite Meta) — tronqué automatiquement */
  title: string;
}

/** Boutons de réponse rapide (max 3). Fallback texte si refusé. */
export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: ReplyButton[],
): Promise<SendResult> {
  const safeButtons = buttons.slice(0, 3).map((b) => ({
    type: 'reply' as const,
    reply: { id: b.id, title: b.title.slice(0, 20) },
  }));

  const result = await graphSend({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: { buttons: safeButtons },
    },
  });

  if (result.ok) return result;

  console.warn('[wa-send] boutons refusés, fallback texte:', result.error);
  const numbered = bodyText + '\n\n' + safeButtons.map((b, i) => `${i + 1}. ${b.reply.title}`).join('\n');
  return sendWhatsAppText(to, numbered);
}
