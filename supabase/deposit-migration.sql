-- ============================================================
-- Migration : Acompte à la réservation (anti no-show)
-- ============================================================
-- Fonctionnement :
--   1. Le professionnel active l'acompte par service (dashboard Services)
--      → deposit_enabled + deposit_type ('percent' | 'fixed') + deposit_value
--   2. À la réservation, le serveur calcule le montant à verser
--      (base = prix du service − remise promo, jamais négatif) et stocke
--      appointments.deposit_amount + prepayment_status = 'pending'.
--   3. Le client verse l'acompte via Orange Money / MTN MoMo (instructions
--      affichées sur la page de réservation — payment-methods-migration.sql).
--   4. Le professionnel coche « Acompte reçu » dans le dashboard
--      → prepayment_status = 'paid', amount_paid = deposit_amount.
--
-- ⚠️ appointments.prepayment_status est créé par payment-methods-migration.sql ;
--    cette migration le recrée s'il manque (ordre d'exécution indifférent).
--
-- Run: Supabase Dashboard → SQL Editor → coller et exécuter.
-- ============================================================

-- ── 1. Configuration acompte par service ─────────────────────
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS deposit_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_type TEXT NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS deposit_value INTEGER NOT NULL DEFAULT 0;

-- Contrainte sur deposit_type (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_deposit_type_check'
  ) THEN
    ALTER TABLE services
      ADD CONSTRAINT services_deposit_type_check
      CHECK (deposit_type IN ('percent', 'fixed'));
  END IF;
END $$;

-- deposit_value : pourcentage 0-100 ou montant >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_deposit_value_check'
  ) THEN
    ALTER TABLE services
      ADD CONSTRAINT services_deposit_value_check
      CHECK (deposit_value >= 0 AND deposit_value <= 100000000);
  END IF;
END $$;

-- ── 2. Suivi de l'acompte sur les rendez-vous ────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS deposit_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prepayment_status TEXT NOT NULL DEFAULT 'none';

-- Contrainte prepayment_status (idempotente — déjà présente si la
-- migration payment-methods a été exécutée)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_prepayment_status_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_prepayment_status_check
      CHECK (prepayment_status IN ('none', 'pending', 'paid', 'exempt'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_prepayment
  ON public.appointments(profile_id, prepayment_status)
  WHERE prepayment_status IN ('pending', 'paid');

-- ── 3. Documentation ─────────────────────────────────────────
COMMENT ON COLUMN services.deposit_enabled IS 'Acompte requis pour réserver ce service (anti no-show)';
COMMENT ON COLUMN services.deposit_type   IS 'percent = % du prix, fixed = montant fixe en devise du profil';
COMMENT ON COLUMN services.deposit_value  IS 'Valeur de l''acompte (pourcentage 0-100 ou montant en devise)';
COMMENT ON COLUMN appointments.deposit_amount  IS 'Montant d''acompte demandé (base = prix − remise promo, calculé serveur)';
COMMENT ON COLUMN appointments.amount_paid     IS 'Montant déjà versé par le client (acompte encaissé ou paiement complet)';
COMMENT ON COLUMN appointments.prepayment_status IS 'none = pas de paiement demandé, pending = acompte attendu, paid = acompte reçu, exempt = dispensé';
