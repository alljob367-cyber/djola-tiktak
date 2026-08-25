// ============================================================
// Voice Reminder Provider — Uses ElevenLabs for audio generation
// ============================================================

import type { NotificationProvider, ReminderPayload, ReminderResult } from './types';

export async function generateReminderAudio(payload: ReminderPayload): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn('[ElevenLabs] API key not configured');
    return null;
  }

  try {
    const dateStr = payload.startsAt.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const timeStr = payload.startsAt.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const message = `Bonjour ${payload.clientName}. Ceci est un rappel de votre rendez-vous de ${payload.serviceName} prévu ${dateStr} à ${timeStr} chez ${payload.businessName}. Merci de votre confiance et à bientôt.`;

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: message,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[ElevenLabs] API error:', response.status, errorData);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[ElevenLabs] Error generating audio:', error);
    return null;
  }
}

export class VoiceProvider implements NotificationProvider {
  readonly channel = 'voice';

  async send(payload: ReminderPayload): Promise<ReminderResult> {
    try {
      const audio = await generateReminderAudio(payload);
      if (!audio) {
        return {
          success: false,
          channel: this.channel,
          error: 'Impossible de générer le message vocal',
        };
      }

      // Placeholder — integrate with Twilio Voice API or similar to deliver the audio
      console.log(`[Voice] Audio reminder generated (${audio.length} bytes) for ${payload.clientPhone}`);
      return { success: true, channel: this.channel, messageId: `voice-${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}
