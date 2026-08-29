-- ============================================================
-- Djola TikTak — Migration de durcissement sécurité (RLS)
-- ============================================================
-- Version : 1.0.0
-- Date    : 2026-08-29
--
-- OBJET :
--   1. Supprimer les politiques "public_read" sur profiles et services
--      qui exposaient TOUTES les colonnes (email, téléphone, statut
--      d'abonnement, chariow_customer_id...) à n'importe quel visiteur
--      via l'anon key de Supabase. Les pages publiques utilisent
--      désormais le service role côté serveur avec une sélection
--      explicite des champs.
--
--   2. Interdire les écritures client (anon/authenticated) sur les
--      tables sensibles payments et subscriptions. Un utilisateur
--      authentifié pouvait auparavant modifier directement sa propre
--      ligne d'abonnement (ex: plan business, fin en 2099) via l'API
--      REST Supabase. Toutes les écritures légitimes passent par :
--      - les RPC SECURITY DEFINER (start_trial, activate_subscription,
--        expire_subscriptions, ...)
--      - le client service role côté serveur (webhook Chariow,
--        confirmation admin, paiements manuels)
--
-- EXÉCUTION : Copier-coller dans le SQL Editor de Supabase → Run.
-- Idempotent : peut être exécuté plusieurs fois sans erreur.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PROFILS — supprimer la lecture publique totale
-- ============================================================
-- La page publique /{slug} et l'API /api/profiles/[slug] passent par
-- le service role : cette politique n'est plus nécessaire et fuirait
-- des données personnelles (email, téléphone, infos d'abonnement).
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

-- ============================================================
-- 2. SERVICES — supprimer la lecture publique totale
-- ============================================================
-- Idem : exposé via l'API service role avec champs filtrés.
DROP POLICY IF EXISTS services_public_read ON public.services;

-- ============================================================
-- 3. PAIEMENTS — lecture propriétaire uniquement, ÉCRITURES INTERDITES
-- ============================================================
-- Un utilisateur authentifié pouvait insérer un faux paiement
-- "completed" ou modifier un paiement existant.
DROP POLICY IF EXISTS payments_insert ON public.payments;
DROP POLICY IF EXISTS payments_update ON public.payments;
DROP POLICY IF EXISTS payments_delete ON public.payments;

CREATE POLICY payments_no_insert ON public.payments
  FOR INSERT WITH CHECK (false);

CREATE POLICY payments_no_update ON public.payments
  FOR UPDATE USING (false);

CREATE POLICY payments_no_delete ON public.payments
  FOR DELETE USING (false);

-- ============================================================
-- 4. ABONNEMENTS — lecture propriétaire uniquement, ÉCRITURES INTERDITES
-- ============================================================
-- Un utilisateur authentifié pouvait s'auto-attribuer le plan
-- business avec une date de fin en 2099.
DROP POLICY IF EXISTS subscriptions_insert ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_update ON public.subscriptions;

CREATE POLICY subscriptions_no_insert ON public.subscriptions
  FOR INSERT WITH CHECK (false);

CREATE POLICY subscriptions_no_update ON public.subscriptions
  FOR UPDATE USING (false);

-- ============================================================
-- 5. PROFILS — verrouiller les colonnes de facturation côté client
-- ============================================================
-- profiles_update (auth.uid() = id) reste nécessaire pour que
-- l'utilisateur édite son profil métier. Mais les colonnes de
-- facturation ne doivent jamais être modifiables directement.
-- Un trigger bloque toute écriture client sur ces colonnes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Blocker uniquement les mises à jour DIRECTES depuis un client
  -- authentifié :
  --   - auth.uid() IS NOT NULL  → la requête provient d'un utilisateur
  --     (le service role et les webhooks n'ont pas d'utilisateur).
  --   - pg_trigger_depth() <= 1 → modification directe de la table,
  --     pas une cascade d'un autre trigger (ex: sync_profile_subscription
  --     qui propage légitimement les changements d'abonnement).
  IF auth.uid() IS NOT NULL AND pg_trigger_depth() <= 1 THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_start IS DISTINCT FROM OLD.subscription_start
       OR NEW.subscription_end IS DISTINCT FROM OLD.subscription_end
       OR NEW.subscription_id IS DISTINCT FROM OLD.subscription_id
       OR NEW.chariow_customer_id IS DISTINCT FROM OLD.chariow_customer_id
    THEN
      RAISE EXCEPTION 'Modification directe des colonnes de facturation interdite (plan, subscription_*, chariow_customer_id).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_protect_billing ON public.profiles;
CREATE TRIGGER profiles_protect_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_columns();

-- ============================================================
-- 6. VÉRIFICATION FINALE
-- ============================================================
COMMIT;

-- Contrôles rapides (exécuter pour vérifier) :
--
-- Politiques actives sur profiles (ne doit plus lister profiles_public_read) :
--   SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
--
-- Politiques actives sur payments :
--   SELECT policyname FROM pg_policies WHERE tablename = 'payments';
--
-- Politiques actives sur subscriptions :
--   SELECT policyname FROM pg_policies WHERE tablename = 'subscriptions';
--
-- Test d'intrusion (doit échouer avec "row-level security" ou policy violation) :
--   UPDATE subscriptions SET plan = 'business' WHERE profile_id = '<votre-id>';
--   INSERT INTO payments (profile_id, plan_id, amount, status) VALUES (...);
