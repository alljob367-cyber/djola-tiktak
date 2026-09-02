// ============================================================
// Djola TikTak — Envoi WhatsApp : Meta Cloud API OU Twilio
// ============================================================
// Double fournisseur avec détection automatique :
//   1. META Cloud API (recommandé — gratuit jusqu'à 1 000
//      conversations/mois, listes/boutons interactifs)
//   2. TWILIO WhatsApp (fallback — sandbox facile pour tester)
// Si les deux sont configurés → Meta prioritaire.
// Si aucun → mode placeholder (logs, succès factice).
//
// Contrairement aux RAPPELS (messages initiés par le business →
// templates approuvés requis hors fenêtre 24h), le bot RÉPOND
// à un message client → fenêtre de service ouverte 24h →
// messages libres autorisés.
//
// ⚠️ Twilio ne supporte pas les listes/boutons interactifs via
// l'API Messages standard → repli automatique en texte numéroté.
//
// Aucune dépendance npm : appels REST via fetch.
// Env Meta   : WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
//              (+ WHATSAPP_API_VERSION, défaut v21.0)
// Env Twilio : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//              TWILIO_WHATSAPP_FROM (ex : +14155238886 sandbox)
// ============================================================

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

export type WhatsAppBackend = 'meta' | 'twilio' | 'placeholder';

/** Fournisseur actif : Meta prioritaire, sinon Twilio, sinon placeholder. */
export function detectWhatsAppBackend(): WhatsAppBackend {
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) return 'meta';
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  ) {
    return 'twilio';
  }
  return 'placeholder';
}

/** true si au moins un fournisseur WhatsApp est configuré. */
export function isWhatsAppConfigured(): boolean {
  return detectWhatsAppBackend() !== 'placeholder';
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// ── META CLOUD API ───────────────────────────────────────────

async function metaSend(body: Record<string, unknown>): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { ok: false, error: 'meta_not_configured' };
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
      console.error('[wa-send/meta] erreur Graph API:', res.status, data.error?.message);
      return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
    }

    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error('[wa-send/meta] exception réseau:', err);
    return { ok: false, error: String(err) };
  }
}

// ── TWILIO WHATSAPP ──────────────────────────────────────────

async function twilioSend(text: string, to: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    return { ok: false, error: 'twilio_not_configured' };
  }

  try {
    const body = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: `whatsapp:${from}`,
      Body: text,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
    };

    if (!res.ok) {
      console.error('[wa-send/twilio] erreur API:', res.status, data.message);
      return { ok: false, error: data.message || `HTTP ${res.status}` };
    }

    return { ok: true, messageId: data.sid };
  } catch (err) {
    console.error('[wa-send/twilio] exception réseau:', err);
    return { ok: false, error: String(err) };
  }
}

// ── API PUBLIQUE ─────────────────────────────────────────────

/** Message texte simple : Meta, sinon Twilio, sinon placeholder. */
export async function sendWhatsAppText(to: string, body: string): Promise<SendResult> {
  const backend = detectWhatsAppBackend();

  if (backend === 'meta') {
    return metaSend({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: true, body },
    });
  }

  if (backend === 'twilio') {
    return twilioSend(body, to);
  }

  console.warn('[wa-send/placeholder] aucun fournisseur WhatsApp configuré — message ignoré');
  return { ok: false, error: 'not_configured' };
}

export interface ListRow {
  id: string;
  /** ⚠️ Max 24 caractères (limite Meta) — tronqué automatiquement */
  title: string;
  description?: string;
}

/**
 * Message liste interactive (Meta uniquement, jusqu'à 10 lignes).
 * Sur Twilio : repli automatique en texte numéroté (pas d'interactif
 * disponible via l'API Messages standard).
 */
export async function sendWhatsAppList(
  to: string,
  bodyText: string,
  rows: ListRow[],
  options: { header?: string; buttonLabel?: string; footer?: string } = {},
): Promise<SendResult> {
  const backend = detectWhatsAppBackend();

  // Texte numéroté commun (utilisé tel quel sur Twilio, en fallback Meta)
  const numberedText =
    bodyText + '\n\n' + rows.slice(0, 10).map((r, i) => `${i + 1}. ${r.title}`).join('\n');

  if (backend === 'meta') {
    const safeRows = rows.slice(0, 10).map((r) => ({
      id: r.id,
      title: r.title.slice(0, 24),
      ...(r.description ? { description: r.description.slice(0, 72) } : {}),
    }));

    if (safeRows.length === 0) {
      return sendWhatsAppText(to, bodyText);
    }

    const result = await metaSend({
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
    console.warn('[wa-send/meta] liste interactive refusée, fallback texte:', result.error);
    return sendWhatsAppText(to, numberedText);
  }

  if (backend === 'twilio') {
    return twilioSend(numberedText, to);
  }

  console.warn('[wa-send/placeholder] aucun fournisseur WhatsApp configuré — message ignoré');
  return { ok: false, error: 'not_configured' };
}

export interface ReplyButton {
  id: string;
  /** ⚠️ Max 20 caractères (limite Meta) — tronqué automatiquement */
  title: string;
}

/**
 * Boutons de réponse rapide (max 3, Meta uniquement).
 * Sur Twilio : repli automatique en texte numéroté.
 */
export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: ReplyButton[],
): Promise<SendResult> {
  const backend = detectWhatsAppBackend();

  const numberedText =
    bodyText + '\n\n' + buttons.slice(0, 3).map((b, i) => `${i + 1}. ${b.title}`).join('\n');

  if (backend === 'meta') {
    const safeButtons = buttons.slice(0, 3).map((b) => ({
      type: 'reply' as const,
      reply: { id: b.id, title: b.title.slice(0, 20) },
    }));

    const result = await metaSend({
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

    console.warn('[wa-send/meta] boutons refusés, fallback texte:', result.error);
    return sendWhatsAppText(to, numberedText);
  }

  if (backend === 'twilio') {
    return twilioSend(numberedText, to);
  }

  console.warn('[wa-send/placeholder] aucun fournisseur WhatsApp configuré — message ignoré');
  return { ok: false, error: 'not_configured' };
}
