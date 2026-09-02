// ============================================================
// Djola TikTak — Webhook Meta WhatsApp Cloud API
// ============================================================
// GET  : vérification du webhook (hub.challenge, WHATSAPP_VERIFY_TOKEN)
// POST : réception des messages clients → bot de réservation
//
// Configuration Meta (App Dashboard → WhatsApp → Configuration) :
//   1. Callback URL : https://<domaine>/api/whatsapp/webhook
//   2. Verify token : la valeur de WHATSAPP_VERIFY_TOKEN
//   3. S'abonner au champ "messages"
//
// ⚠️ IMPORTANT : répondre 200 RAPIDEMENT à Meta, même en cas
// d'erreur interne (sinon Meta désactive le webhook après
// plusieurs échecs). Le traitement est "fire-and-forget" : on
// répond d'abord, on traite ensuite (waitUntil n'est pas dispo
// partout → traitement synchrone borné, Meta tolère quelques
// secondes de latence).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isWhatsAppConfigured } from '@/lib/whatsapp/send';
import { handleWhatsAppMessage } from '@/lib/whatsapp/booking-bot';

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

// ── POST : messages entrants ─────────────────────────────────

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WhatsAppWebhookBody;

    // Accusés de réception (statuses) et autres événements : 200 direct
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) {
      return NextResponse.json({ received: true });
    }

    if (!isWhatsAppConfigured()) {
      console.warn('[wa-webhook] message reçu mais Meta Cloud API non configurée — ignoré');
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
