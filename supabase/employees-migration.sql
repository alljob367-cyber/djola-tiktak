-- ============================================================
-- Migration : Gestion d'employés (équipe)
-- ============================================================
-- Fonctionnement :
--   1. Le professionnel crée son équipe (dashboard → Équipe).
--      Limite par plan : max_employees (starter 1, pro 3, business 10).
--   2. Chaque rendez-vous peut être assigné à un employé
--      (appointments.employee_id).
--   3. La contrainte anti-chevauchement devient « par ressource » :
--      - RDV avec employé  → chevauchement bloqué pour CET employé
--      - RDV sans employé  → chevauchement bloqué au niveau du commerce
--      Résultat : 3 employés = 3 rendez-vous simultanés possibles.
--   4. La fonction book_appointment_atomic (v2) accepte p_employee_id
--      (optionnel) et applique la même règle côté transaction atomique.
--
-- Les horaires d'ouverture restent partagés au niveau du commerce (v1) :
-- l'employé est une « ressource » assignée aux rendez-vous.
--
-- Run: Supabase Dashboard → SQL Editor → coller et exécuter.
-- ============================================================

-- ── 1. Table employees ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT employees_color_hex CHECK (color ~* '^#[0-9a-f]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_employees_profile_id ON public.employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_active
  ON public.employees(profile_id, is_active, display_order)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS employees_updated_at ON public.employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 2. Row Level Security (même modèle que services/clients) ─
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_select ON public.employees
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY employees_insert ON public.employees
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY employees_update ON public.employees
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY employees_delete ON public.employees
  FOR DELETE USING (auth.uid() = profile_id);

-- ── 3. Lien rendez-vous ↔ employé ────────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_employee ON public.appointments(employee_id);

-- ── 4. Anti-chevauchement PAR RESSOURCE ──────────────────────
-- Ancien : un seul créneau actif à la fois pour tout le commerce.
-- Nouveau : clé de ressource = employé si assigné, sinon le commerce.
-- (l'expression CAST + || est IMMUTABLE → compatible EXCLUDE USING gist)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    (COALESCE(employee_id::text, 'pro:' || profile_id::text)) WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status != 'cancelled');

-- ── 5. RPC book_appointment_atomic v2 ────────────────────────
-- Nouveaux paramètres optionnels (rétrocompatible avec l'appel v1) :
--   p_employee_id       → assignation ressource
--   p_deposit_amount    → acompte demandé (XAF)
--   p_prepayment_status → 'none' | 'pending' | 'paid' | 'exempt'
CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_profile_id   uuid,
  p_service_id   uuid,
  p_client_id    uuid,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz,
  p_status       text   DEFAULT 'pending',
  p_notes        text   DEFAULT '',
  p_employee_id  uuid   DEFAULT NULL,
  p_deposit_amount integer DEFAULT 0,
  p_prepayment_status text DEFAULT 'none'
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
  v_resource      text;
BEGIN
  /* Clé de ressource : employé assigné sinon le commerce lui-même */
  v_resource := COALESCE(p_employee_id::text, 'pro:' || p_profile_id::text);

  /* ── 1. Vérification atomique de chevauchement (même transaction) ── */
  SELECT count(*)
    INTO v_overlap_count
  FROM appointments
  WHERE profile_id = p_profile_id
    AND status <> 'cancelled'
    AND COALESCE(employee_id::text, 'pro:' || profile_id::text) = v_resource
    AND starts_at < p_ends_at
    AND ends_at   > p_starts_at;

  IF v_overlap_count > 0 THEN
    RETURN jsonb_build_object(
      'conflict', true,
      'error',   'Ce créneau est déjà pris. Veuillez en choisir un autre.'
    );
  END IF;

  /* ── 2. Insertion (toujours dans la même transaction) ── */
  /* Casts explicites : les paramètres text doivent correspondre aux
     types enum/colonnes Postgres (erreur 42804 sinon). */
  INSERT INTO appointments (profile_id, service_id, client_id, starts_at, ends_at, status, notes, employee_id, deposit_amount, prepayment_status)
  VALUES (
    p_profile_id, p_service_id, p_client_id, p_starts_at, p_ends_at,
    p_status::appointment_status, p_notes,
    p_employee_id,
    COALESCE(p_deposit_amount, 0),
    COALESCE(p_prepayment_status, 'none')
  )
  RETURNING id
    INTO v_new_id;

  /* ── 3. Retourner le rendez-vous créé avec ses relations ── */
  SELECT row_to_json(row)
    INTO v_result
  FROM (
    SELECT a.*,
           row_to_json(s.*) AS service,
           row_to_json(c.*) AS client,
           CASE WHEN e.id IS NOT NULL THEN row_to_json(e.*) END AS employee
    FROM appointments a
    LEFT JOIN services  s ON s.id = a.service_id
    LEFT JOIN clients   c ON c.id = a.client_id
    LEFT JOIN employees e ON e.id = a.employee_id
    WHERE a.id = v_new_id
  ) row;

  RETURN jsonb_build_object('conflict', false, 'appointment', v_result);

EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('conflict', true, 'error', SQLERRM);
END;
$$;

-- Grant execute (webhook service_role + sécurité)
GRANT EXECUTE ON FUNCTION public.book_appointment_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, text, text, uuid, integer, text
) TO anon, authenticated, service_role;
