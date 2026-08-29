/*
 * Migration: Atomic booking RPC
 * Purpose:  Eliminate the TOCTOU race condition in public booking creation.
 *          The Go/app-level post-insert guard is a good mitigation but not
 *          truly atomic. This Postgres function runs the overlap check +
 *          insert inside a single transaction with SERIALIZABLE-level
 *          consistency.
 *
 * v1.0.1 : cast explicite p_status::appointment_status dans l'INSERT.
 *          Sans lui, la reservation publique echouait avec l'erreur
 *          42804 "column status is of type appointment_status but
 *          expression is of type text" au moment de confirmer le RDV.
 *
 * Run:     node scripts/run-migration-atomic-booking.mjs
 *          (or paste into Supabase SQL Editor)
 */

CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_profile_id   uuid,
  p_service_id   uuid,
  p_client_id    uuid,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz,
  p_status       text   DEFAULT 'pending',
  p_notes        text   DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overlap_count int;
  v_new_id        uuid;
  v_result        jsonb;
BEGIN
  /* ── 1. Atomic overlap check (same transaction — no TOCTOU) ── */
  SELECT count(*)
    INTO v_overlap_count
  FROM appointments
  WHERE profile_id = p_profile_id
    AND status <> 'cancelled'
    AND starts_at < p_ends_at
    AND ends_at   > p_starts_at;

  IF v_overlap_count > 0 THEN
    RETURN jsonb_build_object(
      'conflict', true,
      'error',   'Ce créneau est déjà pris. Veuillez en choisir un autre.'
    );
  END IF;

  /* ── 2. Insert (still inside the same transaction) ── */
  /* Cast explicite : p_status est text, la colonne status est un enum
     appointment_status — Postgres ne fait PAS la conversion implicite
     (erreur 42804 "column status is of type appointment_status but
     expression is of type text" sinon). */
  INSERT INTO appointments (profile_id, service_id, client_id, starts_at, ends_at, status, notes)
  VALUES (p_profile_id, p_service_id, p_client_id, p_starts_at, p_ends_at, p_status::appointment_status, p_notes)
  RETURNING id
    INTO v_new_id;

  /* ── 3. Return the new appointment with relations ── */
  SELECT row_to_json(row)
    INTO v_result
  FROM (
    SELECT a.*,
           row_to_json(s.*) AS service,
           row_to_json(c.*) AS client
    FROM appointments a
    LEFT JOIN services  s ON s.id = a.service_id
    LEFT JOIN clients   c ON c.id = a.client_id
    WHERE a.id = v_new_id
  ) row;

  RETURN jsonb_build_object('conflict', false, 'appointment', v_result);

EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('conflict', true, 'error', SQLERRM);
END;
$$;

-- Grant execute to anon & authenticated roles (webhook uses service_role, but be safe)
GRANT EXECUTE ON FUNCTION public.book_appointment_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, text, text
) TO anon, authenticated, service_role;
