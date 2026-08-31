-- ============================================================
-- MIGRATION : Types de business & catégories de services
-- Version : 1.0.0 — 29/08/2026
-- Objectif : adapter la plateforme à tous les métiers
--   • profiles.business_type → salon, restaurant, clinic, fitness,
--     education, auto, shop, saas, artisan, other
--   • services.category      → regroupement dans le catalogue public
--   • services.capacity      → capacité par créneau (1 par défaut ;
--     >1 pour les restaurants/tables, cours collectifs, ateliers)
-- Idempotent : peut être exécuté plusieurs fois sans erreur.
-- ============================================================

-- ── 1. Type de business sur le profil ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'business_type'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN business_type TEXT NOT NULL DEFAULT 'other';

    -- Contrainte CHECK sur les valeurs autorisées
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_business_type_check CHECK (
        business_type IN (
          'salon', 'restaurant', 'clinic', 'fitness', 'education',
          'auto', 'shop', 'saas', 'artisan', 'other'
        )
      );
  END IF;
END $$;

-- ── 2. Catégorie sur les services ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.services
      ADD COLUMN category TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- ── 3. Capacité par créneau (restaurant, cours collectifs…) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services'
      AND column_name = 'capacity'
  ) THEN
    ALTER TABLE public.services
      ADD COLUMN capacity INTEGER NOT NULL DEFAULT 1;

    ALTER TABLE public.services
      ADD CONSTRAINT services_capacity_positive CHECK (capacity >= 1);
  END IF;
END $$;

-- ── 4. Index pour le tri du catalogue public ────────────────
CREATE INDEX IF NOT EXISTS idx_services_category
  ON public.services(profile_id, category);

-- ── 5. RLS : aucune nouvelle politique nécessaire ───────────
-- Les colonnes héritent des politiques existantes sur
-- profiles et services (owner-only). Le public lit uniquement
-- via la vue/logique existante (is_active = true).

COMMENT ON COLUMN public.profiles.business_type IS 'Type de business : salon, restaurant, clinic, fitness, education, auto, shop, saas, artisan, other';
COMMENT ON COLUMN public.services.category IS 'Catégorie d''affichage du service dans le catalogue (ex : Plats, Coiffure, Consultation)';
COMMENT ON COLUMN public.services.capacity IS 'Nombre de places par créneau (1 = service individuel, >1 = table/groupe)';
