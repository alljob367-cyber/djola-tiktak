// ============================================================
// Djola TikTak — Réservation atomique avec employé + acompte
// (RPC book_appointment_atomic v2 — migration employees v2.0.0)
// ------------------------------------------------------------
// Dégradation gracieuse : si la migration v2 n'a pas encore été
// exécutée (RPC sans p_employee_id/p_deposit_amount), on retente
// automatiquement avec l'ancienne signature v1 — l'app continue
// de fonctionner, simplement sans employé/acompte jusqu'à la
// migration. Même philosophie que src/lib/supabase/columns.ts.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AtomicBookingParams {
  p_profile_id: string;
  p_service_id: string;
  p_client_id: string;
  p_starts_at: string;
  p_ends_at: string;
  p_status?: string;
  p_notes?: string;
  p_employee_id?: string | null;
  p_deposit_amount?: number;
  p_prepayment_status?: string;
}

export interface AtomicBookingResult {
  conflict: boolean;
  error?: string;
  appointment?: Record<string, unknown> | null;
  /** true si le RPC v2 (employé + acompte) est disponible en base */
  v2: boolean;
}

const RPC_NAME = 'book_appointment_atomic';

function isLegacySignatureError(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  // PostgREST PGRST202 « Could not find the function … » quand la
  // signature appelée ne matche aucune fonction existante.
  return (
    m.includes(RPC_NAME) &&
    (m.includes('could not find the function') ||
      m.includes('p_employee_id') ||
      m.includes('p_deposit_amount') ||
      m.includes('p_prepayment_status') ||
      m.includes('signature'))
  );
}

/**
 * Crée un rendez-vous via le RPC atomique, en tentant d'abord la
 * signature v2 (employé + acompte), puis en retombant sur la v1 si
 * la migration n'est pas encore passée.
 */
export async function bookAtomic(
  supabase: SupabaseClient,
  params: AtomicBookingParams,
): Promise<AtomicBookingResult> {
  const hasExtras =
    params.p_employee_id != null ||
    (params.p_deposit_amount != null && params.p_deposit_amount > 0) ||
    (params.p_prepayment_status && params.p_prepayment_status !== 'none');

  // ── Tentative v2 (uniquement si on a quelque chose à transmettre) ──
  if (hasExtras) {
    const { data, error } = await supabase.rpc(RPC_NAME, {
      p_profile_id: params.p_profile_id,
      p_service_id: params.p_service_id,
      p_client_id: params.p_client_id,
      p_starts_at: params.p_starts_at,
      p_ends_at: params.p_ends_at,
      p_status: params.p_status ?? 'pending',
      p_notes: params.p_notes ?? '',
      p_employee_id: params.p_employee_id ?? null,
      p_deposit_amount: params.p_deposit_amount ?? 0,
      p_prepayment_status: params.p_prepayment_status ?? 'none',
    });

    if (!error && data) {
      return {
        conflict: Boolean(data.conflict),
        error: data.error ?? undefined,
        appointment: (data.appointment as Record<string, unknown>) ?? null,
        v2: true,
      };
    }

    if (error && !isLegacySignatureError(error.message)) {
      // Vraie erreur (contrainte, connexion…) — ne pas masquer
      return { conflict: true, error: error.message, v2: true };
    }
    // Signature v2 absente → retomber sur v1 ci-dessous
  }

  // ── Signature v1 (rétrocompatibilité avant migration) ──
  const { data, error } = await supabase.rpc(RPC_NAME, {
    p_profile_id: params.p_profile_id,
    p_service_id: params.p_service_id,
    p_client_id: params.p_client_id,
    p_starts_at: params.p_starts_at,
    p_ends_at: params.p_ends_at,
    p_status: params.p_status ?? 'pending',
    p_notes: params.p_notes ?? '',
  });

  if (error) {
    return { conflict: true, error: error.message, v2: false };
  }
  if (!data) {
    return { conflict: true, error: 'Réponse RPC vide', v2: false };
  }

  return {
    conflict: Boolean(data.conflict),
    error: data.error ?? undefined,
    appointment: (data.appointment as Record<string, unknown>) ?? null,
    v2: false,
  };
}
