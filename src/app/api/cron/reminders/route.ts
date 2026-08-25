import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST — endpoint cron pour envoyer les rappels de rendez-vous
// Vérifie le header CRON_SECRET pour l'authentification
export async function POST(request: NextRequest) {
  try {
    // Vérifier le secret du cron
    const cronSecret = request.headers.get('CRON_SECRET');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

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
        profile:profiles(
          id,
          business_name,
          phone,
          timezone
        ),
        client:clients(
          id,
          name,
          phone,
          email
        ),
        service:services(
          id,
          name
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

    const channels: Array<'email' | 'whatsapp' | 'sms'> = ['email', 'whatsapp', 'sms'];
    const processed: string[] = [];
    const errors: string[] = [];

    for (const apt of appointments) {
      if (!apt.client || !apt.profile || !apt.service) continue;

      for (const channel of channels) {
        const key = `${apt.id}:${channel}`;
        if (sentKeys.has(key)) continue;

        // Déterminer si ce canal est disponible
        const canSend =
          (channel === 'email' && apt.client.email) ||
          (channel === 'whatsapp' && apt.client.phone) ||
          (channel === 'sms' && apt.client.phone);

        if (!canSend) continue;

        try {
          // Enregistrer le rappel comme « en cours »
          const { error: insertError } = await supabase
            .from('reminders')
            .insert({
              appointment_id: apt.id,
              channel,
              status: 'pending',
            });

          if (insertError) {
            errors.push(`Échec création rappel ${apt.id}:${channel}`);
            continue;
          }

          // TODO : Intégrer l'envoi réel du rappel (email/WhatsApp/SMS)
          // Pour le moment, on marque comme envoyé
          const { error: updateError } = await supabase
            .from('reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('appointment_id', apt.id)
            .eq('channel', channel);

          if (updateError) {
            errors.push(`Échec mise à jour rappel ${apt.id}:${channel}`);
          } else {
            processed.push(apt.id);
          }
        } catch (err) {
          errors.push(`Erreur rappel ${apt.id}:${channel}: ${String(err)}`);
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
