import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReminderService } from '@/lib/reminders/service';

// Constant-time comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// POST — endpoint cron pour envoyer les rappels de rendez-vous
// Vérifie le header CRON_SECRET pour l'authentification
export async function POST(request: NextRequest) {
  try {
    // Vérifier le secret du cron
    const cronSecret = request.headers.get('CRON_SECRET');
    if (!cronSecret || !process.env.CRON_SECRET || !safeCompare(cronSecret, process.env.CRON_SECRET)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const reminderService = getReminderService();

    // Calculer la fenêtre de 24 heures
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Récupérer les rendez-vous dans les prochaines 24h
    // qui n'ont pas encore de rappel envoyé
    const { data: appointments, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id,
        starts_at,
        ends_at,
        status,
        profile:profiles(
          id,
          business_name,
          phone,
          timezone,
          currency
        ),
        client:clients(
          id,
          name,
          phone,
          email
        ),
        service:services(
          id,
          name,
          price
        )
      `)
      .gte('starts_at', now.toISOString())
      .lte('starts_at', in24h.toISOString())
      .neq('status', 'cancelled');

    if (aptError) {
      console.error('Erreur récupération rappels:', aptError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des rendez-vous' }, { status: 500 });
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ data: { processed: 0, message: 'Aucun rappel à envoyer' } });
    }

    // Récupérer les rappels déjà envoyés pour ces rendez-vous
    const appointmentIds = appointments.map((a) => a.id);
    const { data: existingReminders, error: remindersError } = await supabase
      .from('reminders')
      .select('appointment_id, channel')
      .in('appointment_id', appointmentIds);

    if (remindersError) {
      console.error('Erreur récupération rappels existants:', remindersError);
      return NextResponse.json({ error: 'Erreur lors de la vérification des rappels' }, { status: 500 });
    }

    // Construire un set des rappels déjà envoyés
    const sentKeys = new Set(
      (existingReminders || []).map((r) => `${r.appointment_id}:${r.channel}`)
    );

    const processed: string[] = [];
    const errors: string[] = [];

    // Type the Supabase join result
    interface AptClient { id: string; name: string; phone: string; email: string }
    interface AptProfile { id: string; business_name: string; phone: string; timezone: string; currency: string }
    interface AptService { id: string; name: string; price: number }
    interface AppointmentJoined {
      id: string;
      starts_at: string;
      ends_at: string;
      status: string;
      client: AptClient | null;
      profile: AptProfile | null;
      service: AptService | null;
    }

    for (const apt of appointments as unknown as AppointmentJoined[]) {
      const client = apt.client;
      const profile = apt.profile;
      const service = apt.service;
      if (!client || !profile || !service) continue;

      // Déterminer les canaux disponibles
      const channels: string[] = [];
      if (client.email) channels.push('email');
      // SMS et WhatsApp seront activés quand ces providers seront intégrés
      // if (client.phone) channels.push('sms');
      // if (client.phone) channels.push('whatsapp');

      for (const channel of channels) {
        const key = `${apt.id}:${channel}`;
        if (sentKeys.has(key)) continue;

        try {
          // Insérer le rappel en base (pending)
          const { data: reminderRow, error: insertError } = await supabase
            .from('reminders')
            .insert({
              appointment_id: apt.id,
              channel,
              status: 'pending',
            })
            .select('id')
            .maybeSingle();

          if (insertError || !reminderRow) {
            errors.push(`Échec création rappel ${apt.id}:${channel}`);
            continue;
          }

          // Construire le payload et envoyer via ReminderService
          const payload = reminderService.buildPayload({
            appointmentId: apt.id,
            clientName: client.name,
            clientPhone: client.phone,
            clientEmail: client.email,
            serviceName: service.name,
            servicePrice: service.price,
            businessName: profile.business_name,
            startsAt: apt.starts_at,
            endsAt: apt.ends_at,
            timezone: profile.timezone,
            currency: profile.currency || 'XAF',
          });

          const results = await reminderService.sendReminder(payload, [channel]);

          // Mettre à jour le statut du rappel en fonction du résultat
          const result = results[0];
          if (result?.success) {
            await supabase
              .from('reminders')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
              })
              .eq('id', reminderRow.id);

            processed.push(apt.id);
            console.log(
              `[cron/reminders] ✅ ${channel} envoyé pour RDV ${apt.id} → ${client.email}`,
            );
          } else {
            await supabase
              .from('reminders')
              .update({
                status: 'failed',
                error_message: result?.error || 'Erreur inconnue',
              })
              .eq('id', reminderRow.id);

            errors.push(`Échec envoi ${apt.id}:${channel} — ${result?.error}`);
            console.error(
              `[cron/reminders] ❌ ${channel} échoué pour RDV ${apt.id}: ${result?.error}`,
            );
          }
        } catch (err) {
          errors.push(`Erreur rappel ${apt.id}:${channel}: ${String(err)}`);
          console.error(`[cron/reminders] Erreur ${apt.id}:${channel}:`, err);
        }
      }
    }

    return NextResponse.json({
      data: {
        processed: processed.length,
        total: appointments.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (err) {
    console.error('Erreur inattendue cron reminders:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
