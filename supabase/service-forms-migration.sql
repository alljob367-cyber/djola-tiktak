-- ============================================================
-- Djola TikTak — Formulaires de services par métier + réseaux sociaux
-- Version : 1.3.0 — 31/08/2026
-- Objectif :
--   • services.metadata        → paramètres spécifiques à chaque métier
--     (format d'appel SaaS, service à domicile salon, couverts restaurant,
--     niveau fitness, zone artisan…) stockés en JSONB
--   • profiles.linkedin_url    → page LinkedIn
--   • profiles.twitter_url     → compte X (Twitter)
--   • profiles.telegram_url    → canal / numéro Telegram
-- Idempotent : peut être exécuté plusieurs fois sans erreur.
-- NB : si cette migration n'est pas encore exécutée, l'application
-- reste fonctionnelle (champs ignorés automatiquement, aucune erreur).
-- ============================================================

-- ── 1. Paramètres spécifiques des services (par métier) ────
-- Exemples de contenu :
--   SaaS          : {"format":"Visio","meeting_link":"https://meet..."}
--   Salon         : {"home_service":true,"products":"Huile de karité"}
--   Restaurant    : {"seating":"Terrasse","menu":"Poulet braisé"}
--   Fitness       : {"level":"Débutant","equipment":true}
--   Artisan       : {"quote":true,"zone":"Akanda, Glass"}
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN public.services.metadata IS
  'Paramètres spécifiques au métier (défs dans src/lib/business-types.ts serviceForm.extraFields)';

-- ── 2. Réseaux sociaux supplémentaires sur le profil ───────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS telegram_url TEXT DEFAULT NULL;

-- ── 3. Index léger pour le carrousel de visuels ────────────
-- Accélère la sélection des services avec photo sur la page publique
CREATE INDEX IF NOT EXISTS idx_services_profile_active
  ON public.services(profile_id, is_active);
