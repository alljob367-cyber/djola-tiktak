// ============================================================
// Djola TikTak — Rate limiter persistant (Supabase)
// ============================================================
// Remplace l'ancien limiter en mémoire (Map JS) qui était
// inefficace sur Vercel : les fonctions serverless s'exécutent
// sur plusieurs instances isolées, chacune avec son propre
// compteur → la limite était contournable.
//
// Principe : fenêtre glissante persistée en base via la table
// `rate_limit_hits` (voir supabase/rate-limit-migration.sql).
// Le service role est requis (RLS bloque anon/authenticated).
//
// SÉCURITÉ : fail-open. Si Supabase échoue, on autorise la
// requête plutôt que de casser les réservations (la disponibilité
// passe avant la protection anti-spam). Les erreurs sont loggées.
// ============================================================

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitResult {
  allowed: boolean;
  /** Requêtes restantes dans la fenêtre (si allowed) */
  remaining: number;
  /** Secondes à attendre avant réessai (si bloqué) */
  retryAfterSec: number;
}

/**
 * Identifiant anonymisé : l'IP brute n'est JAMAIS stockée en clair
 * (conformité RGPD / protection des données personnelles).
 * Un sel optionnel (RATE_LIMIT_SALT) durcit le hachage.
 */
export function hashIdentifier(raw: string): string {
  return createHash('sha256')
    .update(`${raw}:${process.env.RATE_LIMIT_SALT || 'djola-tiktak-v1'}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Vérifie et enregistre un hit dans la fenêtre glissante.
 *
 * @param supabase   Client service role
 * @param identifier Identifiant canonique, ex : "bk:abc123..." (booking), "wa:2376..." (WhatsApp)
 * @param limit      Nombre max de requêtes dans la fenêtre
 * @param windowMs   Durée de la fenêtre en millisecondes
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  try {
    // 1. Compter les hits dans la fenêtre glissante
    const { count, error } = await supabase
      .from('rate_limit_hits')
      .select('id', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .gte('created_at', windowStart);

    if (error) throw error;

    if ((count ?? 0) >= limit) {
      return { allowed: false, remaining: 0, retryAfterSec: Math.ceil(windowMs / 1000) };
    }

    // 2. Enregistrer ce hit
    const { error: insertError } = await supabase
      .from('rate_limit_hits')
      .insert({ identifier });

    if (insertError) throw insertError;

    // 3. Nettoyage probabiliste (5% des appels) — évite une table
    //    infinie sans dépendre d'un cron externe
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      supabase
        .from('rate_limit_hits')
        .delete()
        .lt('created_at', cutoff)
        .then(({ error: purgeError }) => {
          if (purgeError) console.warn('[rate-limit] purge best-effort échouée:', purgeError.message);
        });
    }

    return { allowed: true, remaining: Math.max(0, limit - 1 - (count ?? 0)), retryAfterSec: 0 };
  } catch (err) {
    // Fail-open : ne jamais bloquer les clients pour un souci technique
    console.error('[rate-limit] erreur Supabase (fail-open):', err);
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
  }
}

/** Extrait l'IP client depuis les headers Vercel/Next (proxiés). */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
