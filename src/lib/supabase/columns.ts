// ============================================================
// Tolérance aux colonnes SQL récentes/non migrées
// ------------------------------------------------------------
// Contexte : les migrations Supabase sont appliquées manuellement
// (Dashboard → SQL Editor). Entre le déploiement du code et
// l'exécution de la migration, des colonnes récentes peuvent
// être absentes de la base (ex : services.metadata).
// Ce module permet de « désactiver » proprement les colonnes
// manquantes : l'app reste 100 % fonctionnelle, les champs
// concernés sont simplement ignorés jusqu'à la migration.
// ============================================================

import type { PostgrestError } from '@supabase/supabase-js';

/** Cache module : table → colonnes connues comme absentes */
const missingColumns = new Map<string, Set<string>>();

export interface PgErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/**
 * Détecte une erreur PostgreSQL/PostgREST « colonne inexistante ».
 * - PostgREST : code PGRST204 (« Could not find the 'x' column… »)
 * - PostgreSQL : code 42703 (« column "x" of relation… does not exist »)
 */
export function isMissingColumnError(error: PgErrorLike | PostgrestError | null | undefined): boolean {
  if (!error) return false;
  const code = (error as PgErrorLike).code;
  if (code === 'PGRST204' || code === '42703') return true;
  const msg = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return (
    (msg.includes('could not find the') && msg.includes('column')) ||
    (msg.includes('column') && msg.includes('does not exist'))
  );
}

/**
 * Extrait le nom de la colonne manquante depuis le message d'erreur.
 * Formats gérés :
 *   « Could not find the 'metadata' column of 'services' in the schema cache »
 *   « column "metadata" of relation "services" does not exist »
 */
export function extractMissingColumn(error: PgErrorLike | PostgrestError | null | undefined): string | null {
  if (!error) return null;
  const msg = `${error.message ?? ''} ${error.details ?? ''}`;
  let m = /could not find the ['"]([\w]+)['"]\s+column/i.exec(msg);
  if (m) return m[1];
  m = /column\s+["']([\w]+)["']\s+of\s+relation/i.exec(msg);
  if (m) return m[1];
  return null;
}

/** Mémorise qu'une colonne est absente (cache module, par instance serveur) */
export function rememberMissingColumn(table: string, column: string): void {
  let set = missingColumns.get(table);
  if (!set) {
    set = new Set();
    missingColumns.set(table, set);
  }
  set.add(column);
}

/**
 * Retire du payload d'écriture les colonnes connues comme absentes.
 * À utiliser AVANT un insert/update, ou après un échec (avec
 * rememberMissingColumn) pour retenter.
 */
export function stripMissingColumns<T extends Record<string, unknown>>(
  table: string,
  payload: T,
): T {
  const missing = missingColumns.get(table);
  if (!missing || missing.size === 0) return payload;
  const out: Record<string, unknown> = { ...payload };
  let changed = false;
  for (const col of missing) {
    if (col in out) {
      delete out[col];
      changed = true;
    }
  }
  return (changed ? (out as T) : payload);
}

/**
 * Construit la liste SELECT en excluant les colonnes absentes.
 * S'utilise côté serveur (service role ou client authentifié).
 */
export function selectFieldsFor(table: string, fields: string[]): string {
  const missing = missingColumns.get(table);
  const kept = missing && missing.size > 0 ? fields.filter((f) => !missing.has(f)) : fields;
  return kept.join(', ');
}

/**
 * Enregistre une erreur « colonne manquante » dans le cache.
 * Retourne true si l'erreur concernait bien une colonne absente.
 */
export function trackMissingColumn(
  table: string,
  error: PgErrorLike | PostgrestError | null | undefined,
): boolean {
  if (!isMissingColumnError(error)) return false;
  const col = extractMissingColumn(error);
  if (col) rememberMissingColumn(table, col);
  return true;
}
