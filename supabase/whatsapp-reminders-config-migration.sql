-- ============================================================
-- Migration : Configuration des rappels WhatsApp par commerce
-- Version : 1.5.0
-- Description : permet à chaque commerce d'activer/personnaliser
--   ses rappels WhatsApp (délais + message) depuis les paramètres.
-- Le cron /api/cron/reminders respecte ensuite ces réglages.
-- ============================================================

-- 1) Colonnes de configuration sur la table profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_enabled        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_24h   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_2h    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_1h    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_template       text;

COMMENT ON COLUMN public.profiles.whatsapp_enabled      IS 'Rappels WhatsApp activés pour ce commerce';
COMMENT ON COLUMN public.profiles.whatsapp_reminder_24h IS 'Envoyer un rappel la veille (J-1)';
COMMENT ON COLUMN public.profiles.whatsapp_reminder_2h  IS 'Envoyer un rappel 2 h avant le RDV';
COMMENT ON COLUMN public.profiles.whatsapp_reminder_1h  IS 'Envoyer un rappel 1 h avant le RDV';
COMMENT ON COLUMN public.profiles.whatsapp_template     IS 'Message WhatsApp personnalisé ({client}, {service}, {business}, {date}, {heure})';

-- 2) Les politiques RLS existantes sur profiles (propriétaire = auth.uid())
--    couvrent déjà ces colonnes : SELECT/UPDATE par le propriétaire uniquement.
--    Aucune politique supplémentaire nécessaire.

-- 3) Contrainte logique : au moins un délai quand activé (garantie applicative
--    côté API ; un CHECK resterait trop rigide pour une évolution future).
