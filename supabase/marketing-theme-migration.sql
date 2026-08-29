-- ============================================================
-- MIGRATION : Bannière, thème, marketing & codes promo
-- Version : 1.1.0 — 29/08/2026
-- Objectif : personnalisation + marketing de la page publique
--   • profiles.banner_url      → image de couverture (bannière)
--   • profiles.theme           → thème de couleurs de la page publique
--   • profiles.announcement    → bandeau d'annonce promotionnelle (jsonb)
--   • profiles.google_maps_url → lien de localisation Google Maps
--   • profiles.youtube_url     → lien chaîne YouTube
--   • promo_codes (table)      → réductions, offres de bienvenue, invitations
--   • appointments.promo_code + discount_amount → suivi des remises
--   • bucket Storage "banners" → stockage des images de bannière
-- Idempotent : peut être exécuté plusieurs fois sans erreur.
-- ============================================================

-- ── 1. Bannière de la page publique ────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT NULL;

-- ── 2. Thème de la page publique ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'theme'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN theme TEXT NOT NULL DEFAULT 'emerald';

    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_theme_check CHECK (
        theme IN ('emerald','ocean','sunset','royal','gold','rose','forest','midnight')
      );
  END IF;
END $$;

-- ── 3. Bandeau d'annonce (marketing) ───────────────────────
-- Structure jsonb : {"enabled": true, "text": "Offre -20% ce week-end !"}
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS announcement JSONB DEFAULT NULL;

-- ── 4. Liens de redirection supplémentaires ────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT DEFAULT NULL;

-- ── 5. Table des codes promo ───────────────────────────────
-- Types : promo (réduction classique), welcome (offre de bienvenue),
--         referral (invitation à partager)
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'promo'
    CHECK (type IN ('promo','welcome','referral')),
  discount_type TEXT NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent','fixed')),
  value NUMERIC(10,2) NOT NULL CHECK (value > 0),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 1),
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from DATE,
  valid_until DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  show_on_page BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT promo_codes_code_unique UNIQUE (profile_id, code),
  CONSTRAINT promo_codes_percent_max CHECK (discount_type != 'percent' OR value <= 100)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_profile
  ON public.promo_codes(profile_id, active);

COMMENT ON TABLE public.promo_codes IS 'Codes promo : réductions, offres de bienvenue et invitations parrainage';
COMMENT ON COLUMN public.promo_codes.show_on_page IS 'Afficher le code sur la page publique (section Offres)';

-- Trigger updated_at (même mécanisme que les autres tables)
DROP TRIGGER IF EXISTS promo_codes_updated_at ON public.promo_codes;
CREATE TRIGGER promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 6. RLS : seul le propriétaire gère ses codes promo ─────
-- (la lecture publique passe uniquement par les routes API du
--  serveur avec la service role key — jamais via l'anon key)
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_codes_owner_all" ON public.promo_codes;
CREATE POLICY "promo_codes_owner_all" ON public.promo_codes
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- ── 7. Suivi des remises sur les rendez-vous ───────────────
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.appointments.promo_code IS 'Code promo utilisé lors de la réservation';
COMMENT ON COLUMN public.appointments.discount_amount IS 'Montant de la remise appliquée (devise du profil)';

-- ── 8. Bucket Storage pour les bannières ───────────────────
-- Les uploads passent par /api/upload (service role) — aucune
-- politique storage supplémentaire n'est nécessaire.
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- ── 9. Contrainte de cohérence : used_count <= max_uses ────
-- (souple : vérifiée aussi côté application avant chaque usage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promo_codes_uses_coherent'
  ) THEN
    ALTER TABLE public.promo_codes
      ADD CONSTRAINT promo_codes_uses_coherent
      CHECK (max_uses IS NULL OR used_count <= max_uses);
  END IF;
END $$;
