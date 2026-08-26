// ============================================================
// ElevenLabs API — Type definitions
// ============================================================

/** Request payload for the text-to-speech endpoint. */
export interface ElevenLabsTTSRequest {
  text: string;
  voice_id?: string;
  model?: string;
}

/** Response from the text-to-speech endpoint. */
export interface ElevenLabsTTSResponse {
  audioBuffer: ArrayBuffer;
  charactersProcessed: number;
}

/** Request payload for an outbound conversational AI call. */
export interface ElevenLabsCallRequest {
  agent_id: string;
  phone_number_id: string;
  number_to_call: string;
  data: Record<string, string>;
}

/** Response from the outbound call endpoint. */
export interface ElevenLabsCallResponse {
  id: string;
  status: string;
}

/** Unified result for any voice generation operation (TTS or call). */
export interface VoiceGenerationResult {
  success: boolean;
  audioBuffer?: ArrayBuffer;
  callId?: string;
  error?: string;
  charactersProcessed: number;
  estimatedCost: number;
}
