import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReminderService } from '@/lib/reminders/service';
import { formatReminderDateTime, normalizePhone } from '@/lib/reminders/format';

export const dynamic = 'force-dynamic';

const DEFAULT_TEMPLATE =
  'Bonjour {client} 👋\n\nRappel de votre rendez-vous « {service} » chez {business} : {date} à {heure}.\n\nMerci de confirmer ou de prévenir en cas d\u2019empêchement. À bientôt !';

function fillTemplate(
  template: string,
  vars: { client: string; service: string; business: string; startsAt: Date; timezone: string }
): string {
  const { date, time } = formatReminderDateTime(vars.startsAt, vars.timezone);
  const jour = date.charAt(0).toUpperCase() + date.slice(1);
  return template
    .replaceAll('{client}', vars.client)
    .replaceAll('{service}', vars.service)
    .replaceAll('{business}', vars.business)
    .replaceAll('{date}', jour)
    .replaceAll('{heure}', time);
}

/**
 * POST /api/whatsapp-test — envoie un message WhatsApp de test
 * au numéro fourni par l'utilisateur connecté (page Paramètres).
 * Utilise exactement le même ReminderService que les rappels réels :
 * Meta Cloud API / Twilio si configurés, sinon placeholder (développement).
 */
export async function POST(request: NextRequest) {
  try {
    // Auth : l'utilisateur doit être connecté
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone ?? '').trim();
    const template = String(body.template ?? '').trim();

    if (!phone) {
      return NextResponse.json({ error: 'Numéro de téléphone requis.' }, { status: 400 });
    }
    if (!normalizePhone(phone)) {
      return NextResponse.json(
        { error: 'Numéro invalide. Utilisez le format international, ex. +237 690 000 000.' },
        { status: 400 }
      );
    }

    // Profil de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_name, timezone, currency')
      .eq('id', user.id)
      .single();

    const businessName = profile?.business_name ?? 'Djola TikTak';
    const timezone = profile?.timezone ?? 'Africa/Douala';
    const currency = profile?.currency ?? 'XAF';

    // Prochain RDV réel pour un message réaliste
    const { data: next } = await supabase
      .from('appointments')
      .select('starts_at, ends_at, client:clients(name), service:services(name, price)')
      .eq('profile_id', user.id)
      .gte('starts_at', new Date().toISOString())
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    interface NextJoined {
      starts_at: string;
      ends_at: string;
      client: Array<{ name: string }> | { name: string } | null;
      service: Array<{ name: string; price: number }> | { name: string; price: number } | null;
    }
    const nextApt = next as unknown as NextJoined | null;

    const startsAt = nextApt?.starts_at
      ? new Date(nextApt.starts_at)
      : new Date(Date.now() + 26 * 3600 * 1000);
    const clientName =
      (Array.isArray(nextApt?.client) ? nextApt?.client?.[0]?.name : nextApt?.client?.name) ??
      'Aïcha Ngo';
    const serviceName =
      (Array.isArray(nextApt?.service) ? nextApt?.service?.[0]?.name : nextApt?.service?.name) ??
      'Coupe homme';
    const servicePrice =
      (Array.isArray(nextApt?.service) ? nextApt?.service?.[0]?.price : nextApt?.service?.price) ??
      2000;

    const effectiveTemplate = template || DEFAULT_TEMPLATE;
    const message = fillTemplate(effectiveTemplate, {
      client: clientName,
      service: serviceName,
      business: businessName,
      startsAt,
      timezone,
    });

    // Envoi via le même service que les rappels réels
    const reminderService = getReminderService();
    const results = await reminderService.sendReminder(
      {
        appointmentId: 'test-' + Date.now(),
        clientName,
        clientPhone: phone,
        clientEmail: '',
        serviceName,
        servicePrice,
        businessName,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60000),
        timezone,
        currency,
        customMessage: message,
      },
      ['whatsapp']
    );
    const result = results[0];

    if (!result?.success) {
      return NextResponse.json(
        {
          error: `Échec de l'envoi : ${result.error ?? 'erreur inconnue'}. Vérifiez la configuration WhatsApp (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID).`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        result.messageId?.startsWith('wa-placeholder')
          ? `${message}\n\nℹ️ Mode développement : aucun envoi réel (configurez WHATSAPP_TOKEN et WHATSAPP_PHONE_NUMBER_ID pour activer l'envoi réel).`
          : message,
      messageId: result.messageId,
    });
  } catch (err) {
    console.error('[whatsapp-test]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
