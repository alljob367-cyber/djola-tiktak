// ============================================================
// Djola TikTak — Intégration Google Calendar (fetch pur)
// ------------------------------------------------------------
// Aucune dépendance npm : OAuth 2.0 + Calendar API v3 via fetch.
//   • Connexion OAuth consentement (offline → refresh_token)
//   • Tokens chiffrés AES-256-GCM en base (google-calendar-migration.sql)
//   • Push des RDV Djola → événements Google
//   • freeBusy : les événements Google bloquent des créneaux
// Dégradation gracieuse : si la migration n'est pas passée
// (42P01) ou si Google n'est pas configuré, tout échoue en
// silence — l'app continue de fonctionner normalement.
// ============================================================

import { createServiceRoleClient } from '@/lib/supabase/server';
import { encryptToken, decryptToken } from './crypto';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface GCalIntegration {
  profile_id: string;
  google_email: string | null;
  calendar_id: string;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  sync_enabled: boolean;
  block_busy: boolean;
}

/** Google OAuth configuré côté serveur ? */
export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** URL de redirection OAuth (priorité à GOOGLE_REDIRECT_URI, sinon APP_URL). */
export function getRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI;
  if (explicit) return explicit;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${appUrl}/api/integrations/google/callback`;
}

/** URL de consentement Google. */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',        // nécessaire pour obtenir un refresh_token
    prompt: 'consent',             // force le refresh_token à chaque connexion
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Échange le code d'autorisation contre les tokens. */
export async function exchangeCodeForTokens(
  code: string,
): Promise<{ access_token: string; refresh_token: string | null; expires_in: number; email: string | null } | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error('[gcal] échange de code échoué:', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      id_token?: string;
    };
    if (!data.access_token) return null;

    // Email du compte Google depuis l'id_token (payload base64)
    let email: string | null = null;
    if (data.id_token) {
      try {
        const payloadB64 = data.id_token.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        email = typeof payload.email === 'string' ? payload.email : null;
      } catch {
        email = null;
      }
    }
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      expires_in: data.expires_in ?? 3600,
      email,
    };
  } catch (err) {
    console.error('[gcal] exception échange de code:', err);
    return null;
  }
}

/** Lit l'intégration d'un profil (service-role). Retourne null si absente/erreur. */
export async function getIntegration(profileId: string): Promise<GCalIntegration | null> {
  try {
    const supabase = await createServiceRoleClient();
    const { data, error } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) {
      if ((error as { code?: string }).code === '42P01') return null; // migration non exécutée
      console.error('[gcal] lecture intégration:', error.message);
      return null;
    }
    return (data as GCalIntegration) ?? null;
  } catch (err) {
    console.error('[gcal] exception lecture intégration:', err);
    return null;
  }
}

/**
 * Retourne un access token valide : le rafraîchit si expiré
 * (marge 60 s) et persiste le nouveau token chiffré.
 * Token révoqué (invalid_grant) → intégration supprimée,
 * l'utilisateur devra reconnecter son agenda.
 */
export async function getValidAccessToken(profileId: string): Promise<string | null> {
  const integration = await getIntegration(profileId);
  if (!integration) return null;

  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
  const accessToken = decryptToken(integration.access_token_enc);

  if (accessToken && expiresAt - 60_000 > Date.now()) {
    return accessToken;
  }

  const refreshToken = decryptToken(integration.refresh_token_enc);
  if (!refreshToken) {
    console.warn('[gcal] pas de refresh_token — reconnexion requise:', profileId);
    return null;
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 400 || res.status === 401 || res.status === 403) {
      // Token révoqué ou compte déconnecté → nettoyer l'intégration
      console.warn('[gcal] refresh_token invalide, intégration supprimée:', profileId);
      const supabase = await createServiceRoleClient();
      await supabase.from('google_calendar_integrations').delete().eq('profile_id', profileId);
      return null;
    }
    if (!res.ok) {
      console.error('[gcal] refresh échoué:', res.status);
      return null;
    }

    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    // Persister le nouveau token (best-effort)
    try {
      const supabase = await createServiceRoleClient();
      await supabase
        .from('google_calendar_integrations')
        .update({
          access_token_enc: encryptToken(data.access_token),
          token_expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
        })
        .eq('profile_id', profileId);
    } catch (err) {
      console.warn('[gcal] persistance token rafraîchi:', err);
    }

    return data.access_token;
  } catch (err) {
    console.error('[gcal] exception refresh token:', err);
    return null;
  }
}

/** Crée un événement dans l'agenda Google du pro. Retourne l'eventId ou null. */
export async function createCalendarEvent(
  profileId: string,
  event: {
    summary: string;
    description?: string;
    startsAt: string; // ISO UTC
    endsAt: string;   // ISO UTC
    timezone?: string;
    sourceUrl?: string;
  },
): Promise<string | null> {
  const integration = await getIntegration(profileId);
  if (!integration || !integration.sync_enabled) return null;

  const accessToken = await getValidAccessToken(profileId);
  if (!accessToken) return null;

  try {
    const res = await fetch(
      `${API_BASE}/calendars/${encodeURIComponent(integration.calendar_id || 'primary')}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: { dateTime: event.startsAt, timeZone: event.timezone || 'Africa/Malabo' },
          end: { dateTime: event.endsAt, timeZone: event.timezone || 'Africa/Malabo' },
          reminders: {
            useDefault: true,
          },
          source: event.sourceUrl
            ? { title: 'Djola TikTak', url: event.sourceUrl }
            : { title: 'Djola TikTak' },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      console.error('[gcal] création événement échouée:', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch (err) {
    console.error('[gcal] exception création événement:', err);
    return null;
  }
}

/** Supprime un événement Google (best-effort, silencieux si 404/410). */
export async function deleteCalendarEvent(
  profileId: string,
  calendarEventId: string,
): Promise<boolean> {
  const integration = await getIntegration(profileId);
  if (!integration) return false;

  const accessToken = await getValidAccessToken(profileId);
  if (!accessToken) return false;

  try {
    const res = await fetch(
      `${API_BASE}/calendars/${encodeURIComponent(integration.calendar_id || 'primary')}/events/${encodeURIComponent(calendarEventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    // 404/410 : déjà supprimé → considérer comme succès
    return res.ok || res.status === 404 || res.status === 410;
  } catch (err) {
    console.error('[gcal] exception suppression événement:', err);
    return false;
  }
}

export interface BusyInterval {
  starts_at: string; // ISO UTC
  ends_at: string;   // ISO UTC
}

/**
 * Interrogation freeBusy : créneaux occupés de l'agenda Google
 * sur la fenêtre [timeMin, timeMax[. Échoue en silence.
 * `integrationReady` permet d'éviter une relecture DB inutile.
 */
export async function fetchBusyIntervals(
  profileId: string,
  timeMin: string,
  timeMax: string,
  integrationReady?: GCalIntegration | null,
): Promise<BusyInterval[] | null> {
  const integration = integrationReady !== undefined ? integrationReady : await getIntegration(profileId);
  if (!integration || !integration.block_busy) return null;

  const accessToken = await getValidAccessToken(profileId);
  if (!accessToken) return null;

  try {
    const res = await fetch(`${API_BASE}/freeBusy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: integration.calendar_id || 'primary' }],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      console.error('[gcal] freeBusy échoué:', res.status);
      return null;
    }
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
    };
    const busy = data.calendars?.[integration.calendar_id || 'primary']?.busy ?? [];
    return busy.map((b) => ({ starts_at: b.start, ends_at: b.end }));
  } catch (err) {
    console.error('[gcal] exception freeBusy:', err);
    return null;
  }
}
