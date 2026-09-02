// ============================================================
// Djola TikTak — Webhook WhatsApp DOUBLE FOURNISSEUR
// ============================================================
// Accepte les messages entrants de DEUX sources :
//
//   1. META CLOUD API (JSON, recommandé)
//      GET  : vérification hub.challenge (WHATSAPP_VERIFY_TOKEN)
//      POST : payload JSON { entry: [{ changes: [...] }] }
//      Config : Meta App Dashboard → WhatsApp → Configuration
//               URL : https://<domaine>/api/whatsapp/webhook
//
//   2. TWILIO WHATSAPP (form-encoded, fallback)
//      POST : payload x-www-form-urlencoded (From, Body, ProfileName)
//      Config : Twilio Console → Messaging → Try it out → WhatsApp
//               settings → "When a message comes in" → cette URL
//      Signature X-Twilio-Signature vérifiée (HMAC-SHA1).
//
// Le bot répond ensuite via le même fournisseur que le message
// entrant (détecté automatiquement — voir src/lib/whatsapp/send.ts).
//
// ⚠️ IMPORTANT : répondre 200 RAPIDEMENT à Meta/Twilio, même en
// cas d'erreur interne (sinon le fournisseur désactive le webhook
// après plusieurs échecs).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isWhatsAppConfigured } from '@/lib/whatsapp/send';
import { handleWhatsAppMessage } from '@/lib/whatsapp/booking-bot';
import { createHmac } from 'crypto';

export const dynamic = 'force-dynamic';

// ── GET : vérification initiale du webhook par Meta ──────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token && challenge && expectedToken && token === expectedToken) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// ── Types Meta ───────────────────────────────────────────────

interface WhatsAppWebhookBody {
  entry?: {
    changes?: {
      value?: {
        contacts?: { profile?: { name?: string }; wa_id?: string }[];
        messages?: {
          from: string;
          type: string;
          text?: { body?: string };
          interactive?: {
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string };
          };
        }[];
      };
    }[];
  }[];
}

// ── Validation signature Twilio (HMAC-SHA1) ──────────────────
// https://www.twilio.com/docs/usage/security#validating-requests

function isValidTwilioSignature(request: NextRequest, params: Record<string, string>): boolean {
  const signature = request.headers.get('x-twilio-signature');
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!signature || !authToken) return false;

  // Reconstituer l'URL publique exacte appelée par Twilio
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  if (!host) return false;
  const url = `${proto}://${host}${request.nextUrl.pathname}`;

  // Concat : URL + paires triées par clé (clé puis valeur, sans séparateur)
  const data = url + Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join('');

  const expected = createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
  return expected === signature;
}

// ── POST : messages entrants (Meta OU Twilio) ────────────────

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // ── Format TWILIO (form-encoded) ──
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formText = await request.text();
      const params = Object.fromEntries(new URLSearchParams(formText)) as Record<string, string>;

      if (!isValidTwilioSignature(request, params)) {
        console.warn('[wa-webhook] signature Twilio invalide — requête rejetée');
        return new NextResponse('Forbidden', { status: 403 });
      }

      const from = (params.From || '').replace('whatsapp:', '').replace(/\D/g, '');
      const body = (params.Body || '').trim();
      const waName = params.ProfileName || '';

      if (!from || !body) {
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      if (!isWhatsAppConfigured()) {
        console.warn('[wa-webhook] message Twilio reçu mais aucun fournisseur configuré — ignoré');
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      const supabase = await createServiceRoleClient();
      const rl = await checkRateLimit(supabase, `wamsg:${from}`, 20, 5 * 60 * 1000);
      if (!rl.allowed) {
        console.warn(`[wa-webhook] rate limit atteint pour ${from}`);
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      await handleWhatsAppMessage(supabase, from, waName, body);

      // Twilio attend du TwiML (ou vide) — réponse vide = pas de réponse automatique
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // ── Format META (JSON) ──
    const body = (await request.json()) as WhatsAppWebhookBody;

    // Accusés de réception (statuses) et autres événements : 200 direct
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) {
      return NextResponse.json({ received: true });
    }

    if (!isWhatsAppConfigured()) {
      console.warn('[wa-webhook] message reçu mais aucun fournisseur WhatsApp configuré — ignoré');
      return NextResponse.json({ received: true });
    }

    const from = message.from; // numéro client, format international sans "+"
    const waName = value?.contacts?.[0]?.profile?.name || '';

    // Extraire le texte selon le type de message
    let text = '';
    if (message.type === 'text' && message.text?.body) {
      text = message.text.body;
    } else if (message.type === 'interactive') {
      text = message.interactive?.button_reply?.id
        || message.interactive?.list_reply?.id
        || message.interactive?.button_reply?.title
        || message.interactive?.list_reply?.title
        || '';
    } else {
      // audio/image/location... : on ignore silencieusement
      return NextResponse.json({ received: true });
    }

    if (!text.trim()) {
      return NextResponse.json({ received: true });
    }

    // Anti-spam : 20 messages par numéro / 5 min (fail-open)
    const supabase = await createServiceRoleClient();
    const rl = await checkRateLimit(supabase, `wamsg:${from}`, 20, 5 * 60 * 1000);
    if (!rl.allowed) {
      console.warn(`[wa-webhook] rate limit atteint pour ${from}`);
      return NextResponse.json({ received: true });
    }

    await handleWhatsAppMessage(supabase, from, waName, text);
    return NextResponse.json({ received: true });
  } catch (err) {
    // Toujours 200 : Meta réessaie avec backoff exponentiel sur les erreurs,
    // et désactive le webhook en cas d'échecs répétés.
    console.error('[wa-webhook] erreur de traitement:', err);
    return NextResponse.json({ received: true });
  }
}
