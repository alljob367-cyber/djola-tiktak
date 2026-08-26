// ============================================================
// ElevenLabs API Client
// Minimal abstraction over the ElevenLabs REST API for TTS and
// outbound conversational AI calls.
// ============================================================

import type {
  ElevenLabsCallResponse,
  ElevenLabsTTSResponse,
} from './types';

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
const MODEL = 'eleven_multilingual_v2';
const TTS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';
const CALL_ENDPOINT = 'https://api.elevenlabs.io/v1/convai/calls';

/** Returns the configured API key or throws. */
function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error(
      'Clé API ElevenLabs non configurée. Vérifiez la variable d\'environnement ELEVENLABS_API_KEY.',
    );
  }
  return key;
}

/** Shared headers for every ElevenLabs request. */
function buildHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'xi-api-key': getApiKey(),
  };
}

// ── Public client ────────────────────────────────────────────

export const elevenlabsClient = {
  /**
   * Returns the configured voice ID, falling back to the default Rachel voice.
   */
  getVoiceId(): string {
    return process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  },

  /**
   * Generates speech audio from text using the ElevenLabs TTS endpoint.
   *
   * @param text    - The text to convert to speech.
   * @param voiceId - Optional voice ID override; defaults to env or Rachel.
   * @returns The audio buffer and the number of characters processed.
   */
  async generateTTS(
    text: string,
    voiceId?: string,
  ): Promise<{ audioBuffer: ArrayBuffer; charactersProcessed: number }> {
    const voice = voiceId ?? this.getVoiceId();
    const url = `${TTS_ENDPOINT}/${voice}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'corps de la réponse indisponible');
      throw new Error(
        `Échec de la synthèse vocale ElevenLabs (HTTP ${response.status}) : ${errorBody}`,
      );
    }

    const audioBuffer: ArrayBuffer = await response.arrayBuffer();
    const charactersProcessed = text.length;

    return { audioBuffer, charactersProcessed };
  },

  /**
   * Initiates an outbound conversational AI call via ElevenLabs.
   *
   * Requires both `ELEVENLABS_AGENT_ID` and `ELEVENLABS_PHONE_NUMBER_ID`
   * environment variables to be set.
   *
   * @param phone - The destination phone number (E.164 format preferred).
   * @param data  - Key/value pairs forwarded to the agent as dynamic prompt variables.
   * @returns The call ID assigned by ElevenLabs.
   */
  async makeOutboundCall(
    phone: string,
    data: Record<string, string>,
  ): Promise<{ callId: string }> {
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;

    if (!agentId || !phoneNumberId) {
      throw new Error(
        'Agent ou numéro ElevenLabs non configuré. Vérifiez les variables ELEVENLABS_AGENT_ID et ELEVENLABS_PHONE_NUMBER_ID.',
      );
    }

    const response = await fetch(CALL_ENDPOINT, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        agent_id: agentId,
        phone_number_id: phoneNumberId,
        number_to_call: phone,
        data,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'corps de la réponse indisponible');
      throw new Error(
        `Échec de l\'appel sortant ElevenLabs (HTTP ${response.status}) : ${errorBody}`,
      );
    }

    const callData: ElevenLabsCallResponse = await response.json();
    return { callId: callData.id };
  },
} as const;
