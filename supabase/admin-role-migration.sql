-- ============================================================
-- Migration 10 : Rôle administrateur en base (RBAC)
-- Djola TikTak
--
-- Ajoute la colonne `role` à la table profiles :
--   role = 'user'   → utilisateur standard (panneau de bord marchand)
--   role = 'admin'  → administrateur (panneau de contrôle général,
--                     accès à TOUS les plans, contrôle total de l'app)
--
-- L'app reste fonctionnelle même SANS cette migration :
-- le code détecte l'absence de la colonne et retombe sur la
-- variable d'environnement ADMIN_EMAILS (comportement historique).
--
-- Exécution : Supabase Dashboard → SQL Editor → coller → Run
-- Idempotente : peut être relancée sans risque.
-- ============================================================

-- 1. Colonne role (TEXT avec contrainte de valeurs valides)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Nettoie d'éventuelles valeurs invalides (sécurité)
UPDATE public.profiles
  SET role = 'user'
  WHERE role IS NULL OR role NOT IN ('user', 'admin');

-- Contrainte de cohérence (créée seulement si absente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- 2. Index pour lister/filtrer les admins rapidement
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role) WHERE role = 'admin';

-- 3. Les nouveaux inscrits sont des utilisateurs standard
--    (le trigger handle_new_user insère sans préciser role → défaut 'user')
--    On met à jour la fonction pour être explicite :
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_trial_sub_id UUID;
BEGIN
  -- 1. Create the profile (role standard par défaut)
  INSERT INTO public.profiles (id, business_name, slug, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    'user-' || substr(NEW.id::text, 1, 8),
    'user'
  );

  -- 2. Auto-start a 7-day Starter trial (inchangé)
  BEGIN
    SELECT start_trial(NEW.id) INTO v_trial_sub_id;
    INSERT INTO public.usage_records (
      subscription_id, feature_key, action, metadata
    ) VALUES (
      v_trial_sub_id,
      'trial_started',
      'auto_start',
      jsonb_build_object('triggered_by', 'handle_new_user')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[auto-trial] Could not start trial for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. (OPTIONNEL) Promouvoir manuellement un compte existant en admin :
--    décommentez et remplacez l'e-mail, puis exécutez :
--
-- UPDATE public.profiles
--   SET role = 'admin'
--   WHERE id IN (
--     SELECT id FROM auth.users WHERE lower(email) = 'votre-email@exemple.com'
--   );
--
-- Rétrograder :
-- UPDATE public.profiles SET role = 'user'
--   WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = '...');
