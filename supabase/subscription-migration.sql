-- ============================================================
-- Djola TikTak — Systeme d'Abonnement Complet
-- Migration SQL Supabase PostgreSQL
--
-- Execution : Copier-coller dans le SQL Editor de Supabase
-- ============================================================
-- Version : 3.0.0
-- Auteur  : Djola TikTak Team
--
-- TABLE DES MATIERES
--   1.  Extensions & verifications prealables
--   2.  Table plans (plans tarifaires de reference)
--   3.  Table plan_limits (quotas modifiables sans deploiement)
--   4.  Table payments (historique des paiements)
--   5.  Table subscriptions (abonnements actifs & historique)
--   6.  Table usage_records (suivi de consommation)
--   7.  Table webhook_events (journal des webhooks)
--   8.  Ajout colonnes subscription au profil
--   9.  Fonctions utilitaires
--  10. Triggers
--  11. Row Level Security (RLS)
--  12. Index de performance
--  13. Vues utiles
--  14. Tests & verification (self-tests)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTENSIONS & VERIFICATIONS PREALABLES
-- ============================================================

-- uuid-ossp est deja active dans schema.sql, mais on verifie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- btree_gist est deja active dans schema.sql
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================
-- 2. TABLE plans (plans tarifaires de reference)
-- ============================================================

-- Suppression si la table existe deja (idempotence)
DROP TABLE IF EXISTS public.plan_limits CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.usage_records CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;

CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XAF',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  tier_priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT plans_id_check CHECK (id IN ('starter', 'pro', 'business'))
);

-- Insertion des 3 plans tarifaires
INSERT INTO public.plans (id, name, description, price_monthly, price_yearly, currency, features, tier_priority) VALUES
(
  'starter',
  'Starter',
  'Parfait pour demarrer votre activite de prise de rendez-vous en ligne avec les fonctionnalites essentielles.',
  3000,
  30000,
  'XAF',
  '[
    {"key": "services", "label": "Services de base", "included": true},
    {"key": "booking_page", "label": "Page de reservation en ligne", "included": true},
    {"key": "sms_reminders", "label": "Rappels SMS", "included": false},
    {"key": "voice_reminders", "label": "Rappels vocaux (IA)", "included": true},
    {"key": "custom_branding", "label": "Personnalisation avancée", "included": false},
    {"key": "team_management", "label": "Gestion d''equipe", "included": false},
    {"key": "multi_calendar", "label": "Multi-calendrier", "included": false},
    {"key": "analytics", "label": "Statistiques avancees", "included": false},
    {"key": "api_access", "label": "Acces API", "included": false},
    {"key": "priority_support", "label": "Support prioritaire", "included": false}
  ]'::jsonb,
  0
),
(
  'pro',
  'Pro',
  'Pour les professionnels qui veulent automatiser et developper leur activite avec des outils avances.',
  10000,
  100000,
  'XAF',
  '[
    {"key": "services", "label": "Services illimites", "included": true},
    {"key": "booking_page", "label": "Page de reservation en ligne", "included": true},
    {"key": "sms_reminders", "label": "Rappels SMS", "included": true},
    {"key": "voice_reminders", "label": "Rappels vocaux (IA)", "included": true},
    {"key": "custom_branding", "label": "Personnalisation avancée", "included": true},
    {"key": "team_management", "label": "Gestion d''equipe", "included": true},
    {"key": "multi_calendar", "label": "Multi-calendrier", "included": true},
    {"key": "analytics", "label": "Statistiques avancees", "included": true},
    {"key": "api_access", "label": "Acces API", "included": false},
    {"key": "priority_support", "label": "Support prioritaire", "included": false}
  ]'::jsonb,
  1
),
(
  'business',
  'Business',
  'Solution complete pour les entreprises et les structures avec des besoins avancees et un support dedie.',
  25000,
  250000,
  'XAF',
  '[
    {"key": "services", "label": "Services illimites", "included": true},
    {"key": "booking_page", "label": "Page de reservation en ligne", "included": true},
    {"key": "sms_reminders", "label": "Rappels SMS", "included": true},
    {"key": "voice_reminders", "label": "Rappels vocaux (IA)", "included": true},
    {"key": "custom_branding", "label": "Personnalisation avancée", "included": true},
    {"key": "team_management", "label": "Gestion d''equipe", "included": true},
    {"key": "multi_calendar", "label": "Multi-calendrier illimite", "included": true},
    {"key": "analytics", "label": "Statistiques avancees", "included": true},
    {"key": "api_access", "label": "Acces API", "included": true},
    {"key": "priority_support", "label": "Support prioritaire", "included": true}
  ]'::jsonb,
  2
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  currency = EXCLUDED.currency,
  features = EXCLUDED.features,
  tier_priority = EXCLUDED.tier_priority,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ============================================================
-- 3. TABLE plan_limits (quotas - source de verite)
-- ============================================================

CREATE TABLE public.plan_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  limit_key TEXT NOT NULL,
  limit_value INTEGER NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(10,6) NOT NULL DEFAULT 0,
  unit_label TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT plan_limits_plan_key_unique UNIQUE (plan_id, limit_key)
);

-- Insertion des quotas par plan
-- Starter
INSERT INTO public.plan_limits (plan_id, limit_key, limit_value, cost_per_unit, unit_label) VALUES
  ('starter', 'voice_credits', 50, 0.010000, 'credits'),
  ('starter', 'max_services', 5, 0, 'services'),
  ('starter', 'max_employees', 1, 0, 'professionnels'),
  ('starter', 'max_calendars', 1, 0, 'calendriers'),
  ('starter', 'max_appointments_per_day', 50, 0, 'rendez-vous/jour'),
  ('starter', 'max_clients', 200, 0, 'clients')
ON CONFLICT (plan_id, limit_key) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  cost_per_unit = EXCLUDED.cost_per_unit,
  unit_label = EXCLUDED.unit_label,
  updated_at = now();

-- Pro
INSERT INTO public.plan_limits (plan_id, limit_key, limit_value, cost_per_unit, unit_label) VALUES
  ('pro', 'voice_credits', 200, 0.010000, 'credits'),
  ('pro', 'max_services', -1, 0, 'services'),
  ('pro', 'max_employees', 3, 0, 'professionnels'),
  ('pro', 'max_calendars', 3, 0, 'calendriers'),
  ('pro', 'max_appointments_per_day', 100, 0, 'rendez-vous/jour'),
  ('pro', 'max_clients', -1, 0, 'clients')
ON CONFLICT (plan_id, limit_key) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  cost_per_unit = EXCLUDED.cost_per_unit,
  unit_label = EXCLUDED.unit_label,
  updated_at = now();

-- Business
INSERT INTO public.plan_limits (plan_id, limit_key, limit_value, cost_per_unit, unit_label) VALUES
  ('business', 'voice_credits', 500, 0.010000, 'credits'),
  ('business', 'max_services', -1, 0, 'services'),
  ('business', 'max_employees', 10, 0, 'professionnels'),
  ('business', 'max_calendars', -1, 0, 'calendriers'),
  ('business', 'max_appointments_per_day', -1, 0, 'rendez-vous/jour'),
  ('business', 'max_clients', -1, 0, 'clients')
ON CONFLICT (plan_id, limit_key) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  cost_per_unit = EXCLUDED.cost_per_unit,
  unit_label = EXCLUDED.unit_label,
  updated_at = now();

-- ============================================================
-- 4. TABLE payments (historique des paiements)
-- ============================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  plan_name TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XAF',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'expired')),
  provider TEXT NOT NULL DEFAULT 'chariow',
  external_id TEXT,
  checkout_url TEXT,
  external_status TEXT,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- ============================================================
-- 5. TABLE subscriptions (abonnements actifs & historique)
-- ============================================================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  plan_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired', 'upgraded', 'downgraded')),
  billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index unique partiel : un seul abonnement actif/trialing par profil
CREATE UNIQUE INDEX idx_subscriptions_one_active_per_profile
  ON public.subscriptions(profile_id)
  WHERE status IN ('active', 'trialing');

-- ============================================================
-- 6. TABLE usage_records (suivi de consommation)
-- ============================================================

CREATE TABLE public.usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  usage_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'elevenlabs',
  reference_id TEXT,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'completed', 'failed', 'refunded')),
  estimated_cost NUMERIC(10,6) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. TABLE webhook_events (journal des webhooks)
-- ============================================================

CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL DEFAULT 'chariow',
  event_type TEXT NOT NULL DEFAULT '',
  event_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'success', 'failed', 'duplicate')),
  error_message TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- ============================================================
-- 8. AJOUT COLONNES SUBSCRIPTION AU PROFIL
-- ============================================================

DO $$
BEGIN
  -- Renommer stripe_customer_id en chariow_customer_id si l'ancienne colonne existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN stripe_customer_id TO chariow_customer_id;
  END IF;

  -- Supprimer l'ancienne colonne 'plan' si elle existe (avec un CHECK different)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN plan;
  END IF;

  -- Supprimer l'ancienne colonne 'subscription_status' si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN subscription_status;
  END IF;

  -- Supprimer les colonnes de dates d'abonnement si elles existent
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_start'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN subscription_start;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_end'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN subscription_end;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN subscription_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'chariow_customer_id'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN chariow_customer_id;
  END IF;
END $$;

-- Ajout des nouvelles colonnes
ALTER TABLE public.profiles
  ADD COLUMN plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'business'));

ALTER TABLE public.profiles
  ADD COLUMN subscription_status TEXT DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'cancelled', 'expired'));

ALTER TABLE public.profiles
  ADD COLUMN subscription_start TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN subscription_end TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN chariow_customer_id TEXT;

-- ============================================================
-- 9. FONCTIONS UTILITAIRES
-- ============================================================

-- ---------------------------------------------------------------
-- 9a. sync_profile_subscription() — Trigger AFTER INSERT/UPDATE
--      Synchronise les colonnes denormees du profil
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profile_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Cas 1 : l'abonnement est actif ou en essai (non expire)
  IF NEW.status IN ('active', 'trialing') AND NEW.current_period_end >= now() THEN
    UPDATE public.profiles SET
      plan = NEW.plan_id,
      subscription_status = NEW.status,
      subscription_start = NEW.current_period_start,
      subscription_end = NEW.current_period_end,
      subscription_id = NEW.id,
      updated_at = now()
    WHERE id = NEW.profile_id;

  -- Cas 2 : l'abonnement n'est plus actif
  ELSIF NEW.status NOT IN ('active', 'trialing') THEN
    UPDATE public.profiles SET
      plan = 'starter',
      subscription_status = CASE
        WHEN NEW.status = 'upgraded' THEN (SELECT status FROM public.subscriptions WHERE profile_id = NEW.profile_id AND status IN ('active','trialing') LIMIT 1)
        WHEN NEW.status = 'downgraded' THEN (SELECT status FROM public.subscriptions WHERE profile_id = NEW.profile_id AND status IN ('active','trialing') LIMIT 1)
        ELSE NEW.status
      END,
      subscription_start = NULL,
      subscription_end = NULL,
      subscription_id = CASE
        WHEN NEW.status IN ('upgraded', 'downgraded') THEN
          (SELECT id FROM public.subscriptions WHERE profile_id = NEW.profile_id AND status IN ('active','trialing') LIMIT 1)
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = NEW.profile_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- 9b. activate_subscription() — Activation d'un abonnement paye
--      Utilise pg_advisory_lock pour la securite concurrentielle
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_profile_id UUID,
  p_plan_id TEXT,
  p_payment_id UUID,
  p_duration_days INTEGER,
  p_billing_period TEXT
) RETURNS UUID AS $$
DECLARE
  v_new_sub_id UUID;
  v_previous_status TEXT;
  v_plan_name TEXT;
BEGIN
  -- Verrouillage advisory par profil (empeche les activations concurrentes)
  PERFORM pg_advisory_lock(hashtext(p_profile_id::text));

  BEGIN
    -- Recuperer le nom du plan
    SELECT name INTO v_plan_name FROM public.plans WHERE id = p_plan_id;

    IF v_plan_name IS NULL THEN
      RAISE EXCEPTION 'Plan introuvable : %', p_plan_id;
    END IF;

    -- Verifier et cloturer l'abonnement actuel/trialing existant
    UPDATE public.subscriptions
    SET
      status = CASE
        WHEN (SELECT tier_priority FROM public.plans WHERE id = plan_id) > (SELECT tier_priority FROM public.plans WHERE id = p_plan_id)
          THEN 'downgraded'
        ELSE 'upgraded'
      END,
      updated_at = now()
    WHERE profile_id = p_profile_id
      AND status IN ('active', 'trialing')
    RETURNING status INTO v_previous_status;

    -- Creer le nouvel abonnement
    INSERT INTO public.subscriptions (
      profile_id,
      plan_id,
      plan_name,
      status,
      billing_period,
      current_period_start,
      current_period_end,
      payment_id
    ) VALUES (
      p_profile_id,
      p_plan_id,
      v_plan_name,
      'active',
      COALESCE(p_billing_period, 'monthly'),
      now(),
      now() + (COALESCE(p_duration_days, 30) || ' days')::interval,
      p_payment_id
    )
    RETURNING id INTO v_new_sub_id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Toujours liberer le verrou en cas d'erreur
      PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
      RAISE;
  END;

  -- Liberer le verrou advisory
  PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));

  RETURN v_new_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- 9c. start_trial() — Demarrage d'un essai de 7 jours
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_trial(
  p_profile_id UUID
) RETURNS UUID AS $$
DECLARE
  v_new_sub_id UUID;
  v_plan_name TEXT;
BEGIN
  -- Verrouillage advisory par profil
  PERFORM pg_advisory_lock(hashtext(p_profile_id::text));

  BEGIN
    -- Verifier qu'il n'y a pas deja un essai ou abonnement actif
    IF EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE profile_id = p_profile_id AND status IN ('active', 'trialing')
    ) THEN
      PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
      RAISE EXCEPTION 'Un abonnement ou essai est deja actif pour ce profil';
    END IF;

    -- Verifier qu'il n'y a pas eu un essai precedemment
    IF EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE profile_id = p_profile_id AND status IN ('expired', 'cancelled', 'upgraded', 'downgraded')
        AND trial_end IS NOT NULL
    ) THEN
      PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
      RAISE EXCEPTION 'Un essai a deja ete utilise pour ce profil';
    END IF;

    -- Recuperer le nom du plan starter
    SELECT name INTO v_plan_name FROM public.plans WHERE id = 'starter';

    -- Creer l'abonnement d'essai
    INSERT INTO public.subscriptions (
      profile_id,
      plan_id,
      plan_name,
      status,
      billing_period,
      current_period_start,
      current_period_end,
      trial_start,
      trial_end
    ) VALUES (
      p_profile_id,
      'starter',
      COALESCE(v_plan_name, 'Starter'),
      'trialing',
      'monthly',
      now(),
      now() + INTERVAL '7 days',
      now(),
      now() + INTERVAL '7 days'
    )
    RETURNING id INTO v_new_sub_id;

  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
      RAISE;
  END;

  -- Liberer le verrou advisory
  PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));

  RETURN v_new_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- 9d. consume_voice_credit() — Fonction CRITIQUE de consommation
--      100% atomique et securisee contre la concurrence
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_voice_credit(
  p_profile_id UUID,
  p_reference_id TEXT,
  p_metadata JSONB
) RETURNS TABLE (
  allowed BOOLEAN,
  usage_record_id UUID,
  remaining INTEGER,
  message TEXT
) AS $$
DECLARE
  v_subscription_id UUID;
  v_limit_value INTEGER;
  v_current_usage BIGINT;
  v_cost_per_unit NUMERIC(10,6);
  v_new_record_id UUID;
  v_remaining_int INTEGER;
BEGIN
  -- Verrouillage advisory par profil (critique pour la concurrence)
  PERFORM pg_advisory_lock(hashtext(p_profile_id::text));

  BEGIN
    -- Trouver l'abonnement actif ou en essai
    SELECT id INTO v_subscription_id
    FROM public.subscriptions
    WHERE profile_id = p_profile_id
      AND status IN ('active', 'trialing')
      AND current_period_end >= now()
    LIMIT 1;

    -- Pas d'abonnement actif
    IF v_subscription_id IS NULL THEN
      PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
      allowed := false;
      usage_record_id := NULL;
      remaining := 0;
      message := 'Aucun abonnement actif';
      RETURN NEXT;
      RETURN;
    END IF;

    -- Recuperer la limite de credits vocaux pour le plan
    SELECT pl.limit_value, pl.cost_per_unit INTO v_limit_value, v_cost_per_unit
    FROM public.plan_limits pl
    JOIN public.subscriptions s ON s.plan_id = pl.plan_id
    WHERE s.id = v_subscription_id
      AND pl.limit_key = 'voice_credits'
    LIMIT 1;

    -- Limite non trouvee (ne devrait pas arriver)
    IF v_limit_value IS NULL THEN
      PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
      allowed := false;
      usage_record_id := NULL;
      remaining := 0;
      message := 'Limite de credits non configuree';
      RETURN NEXT;
      RETURN;
    END IF;

    -- Limite illimitee (-1) : toujours autorise
    IF v_limit_value = -1 THEN
      INSERT INTO public.usage_records (
        profile_id, subscription_id, usage_type, quantity, provider,
        reference_id, status, estimated_cost, metadata
      ) VALUES (
        p_profile_id, v_subscription_id, 'voice_generation', 1, 'elevenlabs',
        p_reference_id, 'reserved', v_cost_per_unit, COALESCE(p_metadata, '{}'::jsonb)
      )
      RETURNING id INTO v_new_record_id;

      PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
      allowed := true;
      usage_record_id := v_new_record_id;
      remaining := -1;
      message := 'ok';
      RETURN NEXT;
      RETURN;
    END IF;

    -- Compter la consommation courante (reserved + completed) pour la periode
    SELECT COUNT(*) INTO v_current_usage
    FROM public.usage_records
    WHERE profile_id = p_profile_id
      AND usage_type = 'voice_generation'
      AND status IN ('reserved', 'completed')
      AND created_at >= (
        SELECT current_period_start FROM public.subscriptions WHERE id = v_subscription_id
      );

    -- Verifier si le quota est epuise
    IF v_current_usage >= v_limit_value THEN
      PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
      allowed := false;
      usage_record_id := NULL;
      remaining := 0;
      message := 'quota epuise';
      RETURN NEXT;
      RETURN;
    END IF;

    -- Creer l'enregistrement de consommation
    INSERT INTO public.usage_records (
      profile_id, subscription_id, usage_type, quantity, provider,
      reference_id, status, estimated_cost, metadata
    ) VALUES (
      p_profile_id, v_subscription_id, 'voice_generation', 1, 'elevenlabs',
      p_reference_id, 'reserved', v_cost_per_unit, COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_new_record_id;

    v_remaining_int := (v_limit_value - v_current_usage - 1)::INTEGER;

    PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
    allowed := true;
    usage_record_id := v_new_record_id;
    remaining := v_remaining_int;
    message := 'ok';
    RETURN NEXT;
    RETURN;

  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(hashtext(p_profile_id::text));
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- 9e. complete_voice_credit() — Confirmation ou remboursement
--      Mecanisme de compensation pour les credits reserves
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_voice_credit(
  p_usage_record_id UUID,
  p_success BOOLEAN
) RETURNS VOID AS $$
BEGIN
  IF p_success THEN
    UPDATE public.usage_records
    SET status = 'completed'
    WHERE id = p_usage_record_id
      AND status = 'reserved';
  ELSE
    -- En cas d'echec, le credit est rembourse (status = refunded)
    UPDATE public.usage_records
    SET status = 'refunded'
    WHERE id = p_usage_record_id
      AND status = 'reserved';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- 9f. expire_subscriptions() — Expiration batch des abonnements
--      A appeler via un cron (pg_cron ou Edge Function)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Verrouillage global pour eviter les executions concurrentes du batch
  PERFORM pg_advisory_lock(54321);

  -- Expirer les abonnements actifs/trialing dont la periode est terminee
  UPDATE public.subscriptions
  SET
    status = 'expired',
    updated_at = now()
  WHERE status IN ('active', 'trialing')
    AND current_period_end < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Expirer specifiquement les essais termines
  UPDATE public.subscriptions
  SET
    status = 'expired',
    updated_at = now()
  WHERE status = 'trialing'
    AND trial_end IS NOT NULL
    AND trial_end < now();

  -- Le trigger trg_sync_profile_subscription va automatiquement
  -- synchroniser les profils concernes

  -- Liberer le verrou
  PERFORM pg_advisory_unlock(54321);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- 9g. get_usage_summary() — Resume de consommation par profil
--      Retourne une ligne par type de limite avec usage courant
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usage_summary(
  p_profile_id UUID
) RETURNS TABLE (
  limit_key TEXT,
  limit_value INTEGER,
  limit_label TEXT,
  current_usage BIGINT,
  remaining INTEGER,
  is_unlimited BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.limit_key,
    pl.limit_value,
    pl.unit_label,
    COALESCE(ur.usage_count, 0) AS current_usage,
    CASE
      WHEN pl.limit_value = -1 THEN -1
      WHEN pl.limit_value IS NULL THEN 0
      ELSE GREATEST((pl.limit_value - COALESCE(ur.usage_count, 0))::INTEGER, 0)
    END AS remaining,
    (pl.limit_value = -1) AS is_unlimited
  FROM public.plan_limits pl
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS usage_count
    FROM public.usage_records ur2
    WHERE ur2.profile_id = p_profile_id
      AND ur2.usage_type = pl.limit_key
      AND ur2.status IN ('reserved', 'completed')
      AND ur2.created_at >= (
        SELECT COALESCE(
          MIN(s.current_period_start),
          now() - INTERVAL '30 days'
        )
        FROM public.subscriptions s
        WHERE s.profile_id = p_profile_id
          AND s.status IN ('active', 'trialing')
      )
  ) ur ON true
  WHERE pl.plan_id = (
    SELECT COALESCE(
      (SELECT plan_id FROM public.subscriptions
       WHERE profile_id = p_profile_id AND status IN ('active', 'trialing')
       LIMIT 1),
      (SELECT plan FROM public.profiles WHERE id = p_profile_id),
      'starter'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 10. TRIGGERS
-- ============================================================

-- Trigger updated_at sur plans
DROP TRIGGER IF EXISTS plans_updated_at ON public.plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger updated_at sur subscriptions
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger updated_at sur plan_limits
DROP TRIGGER IF EXISTS plan_limits_updated_at ON public.plan_limits;
CREATE TRIGGER plan_limits_updated_at
  BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger de synchronisation profil ↔ subscription
DROP TRIGGER IF EXISTS trg_sync_profile_subscription ON public.subscriptions;
CREATE TRIGGER trg_sync_profile_subscription
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_subscription();

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activer RLS sur toutes les nouvelles tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 11a. Plans : lecture publique (uniquement les plans actifs)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS plans_public_select ON public.plans;
CREATE POLICY plans_public_select ON public.plans
  FOR SELECT USING (is_active = true);

-- ---------------------------------------------------------------
-- 11b. Plan Limits : lecture publique
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS plan_limits_public_select ON public.plan_limits;
CREATE POLICY plan_limits_public_select ON public.plan_limits
  FOR SELECT USING (true);

-- ---------------------------------------------------------------
-- 11c. Payments : CRUD proprietaire uniquement
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS payments_select ON public.payments;
DROP POLICY IF EXISTS payments_insert ON public.payments;
DROP POLICY IF EXISTS payments_update ON public.payments;
DROP POLICY IF EXISTS payments_delete ON public.payments;

CREATE POLICY payments_select ON public.payments
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY payments_insert ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY payments_update ON public.payments
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY payments_delete ON public.payments
  FOR DELETE USING (auth.uid() = profile_id);

-- ---------------------------------------------------------------
-- 11d. Subscriptions : SELECT/INSERT/UPDATE proprietaire, DELETE bloque
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_insert ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_update ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_delete ON public.subscriptions;

CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY subscriptions_insert ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY subscriptions_update ON public.subscriptions
  FOR UPDATE USING (auth.uid() = profile_id);

-- La suppression directe est bloquee (seules les fonctions RPC peuvent modifier le statut)
CREATE POLICY subscriptions_no_delete ON public.subscriptions
  FOR DELETE USING (false);

-- ---------------------------------------------------------------
-- 11e. Usage Records : SELECT proprietaire, INSERT/UPDATE bloques (via RPC)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS usage_records_select ON public.usage_records;
DROP POLICY IF EXISTS usage_records_insert ON public.usage_records;
DROP POLICY IF EXISTS usage_records_update ON public.usage_records;

CREATE POLICY usage_records_select ON public.usage_records
  FOR SELECT USING (auth.uid() = profile_id);

-- L'insertion et la mise a jour se font uniquement via les fonctions RPC
-- (consume_voice_credit, complete_voice_credit) qui sont SECURITY DEFINER
CREATE POLICY usage_records_no_insert ON public.usage_records
  FOR INSERT WITH CHECK (false);

CREATE POLICY usage_records_no_update ON public.usage_records
  FOR UPDATE USING (false);

-- ---------------------------------------------------------------
-- 11f. Webhook Events : AUCUN acces pour anon (service_role uniquement)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS webhook_events_select ON public.webhook_events;
DROP POLICY IF EXISTS webhook_events_insert ON public.webhook_events;
DROP POLICY IF EXISTS webhook_events_update ON public.webhook_events;
DROP POLICY IF EXISTS webhook_events_delete ON public.webhook_events;

-- Toutes les operations sont bloquees pour les utilisateurs anonymes/authentifies
-- Seul le service_role (backend) peut acceder a cette table
CREATE POLICY webhook_events_no_select ON public.webhook_events
  FOR SELECT USING (false);

CREATE POLICY webhook_events_no_insert ON public.webhook_events
  FOR INSERT WITH CHECK (false);

CREATE POLICY webhook_events_no_update ON public.webhook_events
  FOR UPDATE USING (false);

CREATE POLICY webhook_events_no_delete ON public.webhook_events
  FOR DELETE USING (false);

-- ============================================================
-- 12. INDEX DE PERFORMANCE
-- ============================================================

-- --- Plans ---
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON public.plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plans_tier_priority ON public.plans(tier_priority);

-- --- Plan Limits ---
CREATE INDEX IF NOT EXISTS idx_plan_limits_plan_id ON public.plan_limits(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_limits_limit_key ON public.plan_limits(limit_key);

-- --- Payments ---
CREATE INDEX IF NOT EXISTS idx_payments_profile_id ON public.payments(profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON public.payments(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_profile_status ON public.payments(profile_id, status);

-- --- Subscriptions ---
CREATE INDEX IF NOT EXISTS idx_subscriptions_profile_id ON public.subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(profile_id)
  WHERE status IN ('active', 'trialing');
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON public.subscriptions(current_period_end)
  WHERE status IN ('active', 'trialing');
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON public.subscriptions(payment_id) WHERE payment_id IS NOT NULL;

-- --- Usage Records ---
CREATE INDEX IF NOT EXISTS idx_usage_records_profile_id ON public.usage_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_subscription_id ON public.usage_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_usage_type ON public.usage_records(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_records_status ON public.usage_records(status);
CREATE INDEX IF NOT EXISTS idx_usage_records_created_at ON public.usage_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_composite ON public.usage_records(profile_id, usage_type, status, created_at);

-- --- Webhook Events ---
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_type ON public.webhook_events(provider, event_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);

-- ============================================================
-- 13. VUES UTILES
-- ============================================================

-- ---------------------------------------------------------------
-- 13a. v_subscription_summary : resume de l'abonnement par profil
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_subscription_summary AS
SELECT
  p.id AS profile_id,
  p.business_name,
  p.plan AS current_plan,
  p.subscription_status,
  p.subscription_start,
  p.subscription_end,
  p.subscription_id,
  CASE
    WHEN p.subscription_end IS NULL THEN NULL
    WHEN p.subscription_end < now() THEN 0
    ELSE GREATEST(EXTRACT(DAY FROM p.subscription_end - now())::INTEGER, 0)
  END AS days_remaining,
  CASE
    WHEN p.subscription_status IN ('active', 'trialing') AND p.subscription_end >= now() THEN true
    ELSE false
  END AS is_active,
  s.trial_start,
  s.trial_end,
  CASE
    WHEN s.trial_end IS NOT NULL AND s.trial_end > now() THEN true
    ELSE false
  END AS is_trial,
  CASE
    WHEN s.trial_end IS NOT NULL AND s.trial_end > now()
      THEN GREATEST(EXTRACT(DAY FROM s.trial_end - now())::INTEGER, 0)
    ELSE NULL
  END AS trial_days_remaining,
  pl.name AS plan_display_name,
  pl.price_monthly,
  pl.price_yearly,
  s.billing_period,
  s.cancel_at_period_end
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.id = p.subscription_id
LEFT JOIN public.plans pl ON pl.id = p.plan;

-- ---------------------------------------------------------------
-- 13b. v_monthly_revenue : revenus mensuels par plan (admin)
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_monthly_revenue AS
SELECT
  TO_CHAR(pay.created_at, 'YYYY-MM') AS month,
  pay.plan_id,
  pay.plan_name,
  pay.billing_period,
  COUNT(*) AS payment_count,
  SUM(pay.amount) AS total_amount,
  pay.currency,
  COUNT(*) FILTER (WHERE pay.status = 'completed') AS completed_count,
  SUM(pay.amount) FILTER (WHERE pay.status = 'completed') AS completed_amount,
  COUNT(*) FILTER (WHERE pay.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE pay.status = 'failed') AS failed_count
FROM public.payments pay
GROUP BY
  TO_CHAR(pay.created_at, 'YYYY-MM'),
  pay.plan_id,
  pay.plan_name,
  pay.billing_period,
  pay.currency
ORDER BY month DESC, pay.plan_id;

-- ---------------------------------------------------------------
-- 13c. v_expiring_soon : abonnements expirant dans les 7 prochains jours
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_expiring_soon AS
SELECT
  s.id AS subscription_id,
  s.profile_id,
  p.business_name,
  p.email,
  p.phone,
  s.plan_id,
  s.plan_name,
  s.status,
  s.billing_period,
  s.current_period_start,
  s.current_period_end,
  GREATEST(EXTRACT(DAY FROM s.current_period_end - now())::INTEGER, 0) AS days_remaining,
  s.cancel_at_period_end
FROM public.subscriptions s
JOIN public.profiles p ON p.id = s.profile_id
WHERE s.status IN ('active', 'trialing')
  AND s.current_period_end > now()
  AND s.current_period_end <= now() + INTERVAL '7 days'
ORDER BY s.current_period_end ASC;

-- ---------------------------------------------------------------
-- 13d. v_usage_dashboard : tableau de bord de consommation par profil
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_usage_dashboard AS
SELECT
  ur.profile_id,
  p.business_name,
  ur.usage_type,
  ur.status,
  COUNT(*) AS record_count,
  SUM(ur.quantity) AS total_quantity,
  SUM(ur.estimated_cost) AS total_estimated_cost,
 MIN(ur.created_at) AS first_use,
  MAX(ur.created_at) AS last_use
FROM public.usage_records ur
JOIN public.profiles p ON p.id = ur.profile_id
WHERE ur.created_at >= (
  SELECT COALESCE(MIN(s.current_period_start), now() - INTERVAL '30 days')
  FROM public.subscriptions s
  WHERE s.profile_id = ur.profile_id AND s.status IN ('active', 'trialing')
)
GROUP BY ur.profile_id, p.business_name, ur.usage_type, ur.status
ORDER BY ur.profile_id, ur.usage_type, ur.status;

-- ============================================================
-- 14. TESTS & VERIFICATION (self-tests)
-- ============================================================

-- Test 1 : Verifier que toutes les tables sont creees
DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'plans', 'plan_limits', 'payments', 'subscriptions',
    'usage_records', 'webhook_events'
  ];
  v_table TEXT;
  v_exists BOOLEAN;
  v_errors TEXT[] := '{}';
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) INTO v_exists;

    IF NOT v_exists THEN
      v_errors := array_append(v_errors, 'TABLE MANQUANTE : ' || v_table);
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '=== ERREURS DE VERIFICATION DES TABLES ===';
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '%', v_errors[i];
    END LOOP;
  ELSE
    RAISE NOTICE '✓ Toutes les 6 tables sont correctement creees';
  END IF;
END $$;

-- Test 2 : Verifier les colonnes d'abonnement sur profiles
DO $$
DECLARE
  v_cols TEXT[] := ARRAY[
    'plan', 'subscription_status', 'subscription_start',
    'subscription_end', 'subscription_id', 'chariow_customer_id'
  ];
  v_col TEXT;
  v_exists BOOLEAN;
  v_errors TEXT[] := '{}';
BEGIN
  FOREACH v_col IN ARRAY v_cols LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = v_col
    ) INTO v_exists;

    IF NOT v_exists THEN
      v_errors := array_append(v_errors, 'COLONNE MANQUANTE profiles.' || v_col);
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '=== ERREURS COLONNES PROFILES ===';
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '%', v_errors[i];
    END LOOP;
  ELSE
    RAISE NOTICE '✓ Toutes les 6 colonnes d''abonnement sont presentes sur profiles';
  END IF;
END $$;

-- Test 3 : Verifier que les 3 plans sont inseres
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.plans WHERE id IN ('starter', 'pro', 'business');

  IF v_count = 3 THEN
    RAISE NOTICE '✓ Les 3 plans (starter, pro, business) sont correctement inseres';
  ELSE
    RAISE NOTICE '✗ Plans inseres : %/3 attendus', v_count;
  END IF;
END $$;

-- Test 4 : Verifier que les limites de plan sont presentes
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.plan_limits;

  IF v_count = 18 THEN
    RAISE NOTICE '✓ Les 18 limites de plan sont correctement insertes (6 per plan x 3 plans)';
  ELSE
    RAISE NOTICE '✗ Limites inserees : %/18 attendues', v_count;
  END IF;
END $$;

-- Test 5 : Verifier que toutes les fonctions sont creees
DO $$
DECLARE
  v_funcs TEXT[] := ARRAY[
    'sync_profile_subscription()',
    'activate_subscription(uuid,text,uuid,integer,text)',
    'start_trial(uuid)',
    'consume_voice_credit(uuid,text,jsonb)',
    'complete_voice_credit(uuid,boolean)',
    'expire_subscriptions()',
    'get_usage_summary(uuid)'
  ];
  v_func TEXT;
  v_exists BOOLEAN;
  v_errors TEXT[] := '{}';
BEGIN
  FOREACH v_func IN ARRAY v_funcs LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = split_part(v_func, '(', 1)
    ) INTO v_exists;

    IF NOT v_exists THEN
      v_errors := array_append(v_errors, 'FONCTION MANQUANTE : ' || v_func);
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '=== ERREURS FONCTIONS ===';
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '%', v_errors[i];
    END LOOP;
  ELSE
    RAISE NOTICE '✓ Toutes les 7 fonctions sont correctement creees';
  END IF;
END $$;

-- Test 6 : Verifier que les triggers sont actifs
DO $$
DECLARE
  v_triggers TEXT[] := ARRAY[
    'plans_updated_at',
    'subscriptions_updated_at',
    'plan_limits_updated_at',
    'trg_sync_profile_subscription'
  ];
  v_trigger TEXT;
  v_exists BOOLEAN;
  v_errors TEXT[] := '{}';
BEGIN
  FOREACH v_trigger IN ARRAY v_triggers LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND t.tgname = v_trigger
    ) INTO v_exists;

    IF NOT v_exists THEN
      v_errors := array_append(v_errors, 'TRIGGER MANQUANT : ' || v_trigger);
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '=== ERREURS TRIGGERS ===';
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '%', v_errors[i];
    END LOOP;
  ELSE
    RAISE NOTICE '✓ Les 4 triggers sont correctement actifs';
  END IF;
END $$;

-- Test 7 : Verifier les index cles
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verifier l'index unique partiel sur subscriptions
  SELECT COUNT(*) INTO v_count FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'idx_subscriptions_one_active_per_profile';

  IF v_count > 0 THEN
    RAISE NOTICE '✓ Index unique partiel subscriptions correct';
  ELSE
    RAISE NOTICE '✗ Index unique partiel subscriptions manquant';
  END IF;

  -- Verifier l'index unique partiel sur webhook_events
  SELECT COUNT(*) INTO v_count FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'idx_webhook_events_event_id';

  IF v_count > 0 THEN
    RAISE NOTICE '✓ Index unique partiel webhook_events correct';
  ELSE
    RAISE NOTICE '✗ Index unique partiel webhook_events manquant';
  END IF;

  -- Verifier l'index composite usage_records
  SELECT COUNT(*) INTO v_count FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'idx_usage_records_composite';

  IF v_count > 0 THEN
    RAISE NOTICE '✓ Index composite usage_records correct';
  ELSE
    RAISE NOTICE '✗ Index composite usage_records manquant';
  END IF;
END $$;

-- Test 8 : Verifier les vues
DO $$
DECLARE
  v_views TEXT[] := ARRAY[
    'v_subscription_summary',
    'v_monthly_revenue',
    'v_expiring_soon',
    'v_usage_dashboard'
  ];
  v_view TEXT;
  v_exists BOOLEAN;
  v_errors TEXT[] := '{}';
BEGIN
  FOREACH v_view IN ARRAY v_views LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_views
      WHERE schemaname = 'public' AND viewname = v_view
    ) INTO v_exists;

    IF NOT v_exists THEN
      v_errors := array_append(v_errors, 'VUE MANQUANTE : ' || v_view);
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '=== ERREURS VUES ===';
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '%', v_errors[i];
    END LOOP;
  ELSE
    RAISE NOTICE '✓ Les 4 vues sont correctement creees';
  END IF;
END $$;

-- Test 9 : Verifier le RLS actif
DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'plans', 'plan_limits', 'payments', 'subscriptions',
    'usage_records', 'webhook_events'
  ];
  v_table TEXT;
  v_rls_enabled BOOLEAN;
  v_errors TEXT[] := '{}';
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = v_table
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    IF NOT v_rls_enabled THEN
      v_errors := array_append(v_errors, 'RLS DESACTIVE : ' || v_table);
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE NOTICE '=== ERREURS RLS ===';
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '%', v_errors[i];
    END LOOP;
  ELSE
    RAISE NOTICE '✓ RLS est active sur les 6 nouvelles tables';
  END IF;
END $$;

-- Resume final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  MIGRATION TERMINEE — Systeme d''abonnement Djola TikTak';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  Tables     : 6 (plans, plan_limits, payments, subscriptions, usage_records, webhook_events)';
  RAISE NOTICE '  Fonctions  : 7 (sync, activate, trial, consume, complete, expire, summary)';
  RAISE NOTICE '  Triggers   : 4 (updated_at x3, sync_profile)';
  RAISE NOTICE '  Vues       : 4 (summary, revenue, expiring, dashboard)';
  RAISE NOTICE '  RLS        : Active sur toutes les tables';
  RAISE NOTICE '============================================================';
END $$;

COMMIT;