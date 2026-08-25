-- ============================================================
-- Djola TikTak — SaaS Booking System
-- Complete PostgreSQL Schema for Supabase
-- ====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT '',
  slug TEXT UNIQUE,
  description TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'XAF',
  timezone TEXT NOT NULL DEFAULT 'Africa/Malabo',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Slug index for fast public page lookup
CREATE INDEX idx_profiles_slug ON public.profiles(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name, slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    'user-' || substr(NEW.id::text, 1, 8)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. SERVICES TABLE
-- ============================================================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT services_price_nonneg CHECK (price >= 0),
  CONSTRAINT services_duration_positive CHECK (duration_minutes > 0)
);

CREATE INDEX idx_services_profile_id ON public.services(profile_id);
CREATE INDEX idx_services_active ON public.services(profile_id, is_active) WHERE is_active = true;

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 3. CLIENTS TABLE
-- ============================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_profile_id ON public.clients(profile_id);
CREATE INDEX idx_clients_phone ON public.clients(profile_id, phone);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Partial unique to reduce exact-duplicate clients per professional
CREATE UNIQUE INDEX idx_clients_unique_per_pro
  ON public.clients(profile_id, name, phone)
  WHERE name != '' AND phone != '';

-- ============================================================
-- 4. APPOINTMENTS TABLE
-- ============================================================
CREATE TYPE public.appointment_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT appointments_start_before_end CHECK (starts_at < ends_at),
  CONSTRAINT appointments_valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'))
);

-- Critical: prevent overlapping active appointments per professional
-- Uses tstzrange with GiST exclusion
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    profile_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status != 'cancelled');

CREATE INDEX idx_appointments_profile_id ON public.appointments(profile_id);
CREATE INDEX idx_appointments_starts_at ON public.appointments(starts_at);
CREATE INDEX idx_appointments_status ON public.appointments(profile_id, status);
CREATE INDEX idx_appointments_client ON public.appointments(client_id);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 5. AVAILABILITY TABLE
-- ============================================================
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT availability_day_range CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT availability_time_order CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_profile_id ON public.availability(profile_id);
CREATE INDEX idx_availability_active ON public.availability(profile_id, is_active) WHERE is_active = true;

CREATE TRIGGER availability_updated_at
  BEFORE UPDATE ON public.availability
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 6. BLOCKED SLOTS TABLE
-- ============================================================
CREATE TABLE public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT blocked_slots_time_order CHECK (starts_at < ends_at)
);

CREATE INDEX idx_blocked_slots_profile_id ON public.blocked_slots(profile_id);
CREATE INDEX idx_blocked_slots_time_range ON public.blocked_slots(profile_id, starts_at, ends_at);

CREATE TRIGGER blocked_slots_updated_at
  BEFORE UPDATE ON public.blocked_slots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 7. REMINDERS TABLE
-- ============================================================
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_appointment ON public.reminders(appointment_id);
CREATE INDEX idx_reminders_status ON public.reminders(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_public_read ON public.profiles
  FOR SELECT USING (is_active = true);

-- SERVICES
CREATE POLICY services_select ON public.services
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY services_insert ON public.services
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY services_update ON public.services
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY services_delete ON public.services
  FOR DELETE USING (auth.uid() = profile_id);

CREATE POLICY services_public_read ON public.services
  FOR SELECT USING (is_active = true);

-- CLIENTS
CREATE POLICY clients_select ON public.clients
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY clients_insert ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY clients_update ON public.clients
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY clients_delete ON public.clients
  FOR DELETE USING (auth.uid() = profile_id);

-- APPOINTMENTS
CREATE POLICY appointments_select ON public.appointments
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY appointments_insert ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY appointments_update ON public.appointments
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY appointments_delete ON public.appointments
  FOR DELETE USING (auth.uid() = profile_id);

-- AVAILABILITY
CREATE POLICY availability_select ON public.availability
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY availability_insert ON public.availability
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY availability_update ON public.availability
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY availability_delete ON public.availability
  FOR DELETE USING (auth.uid() = profile_id);

-- BLOCKED SLOTS
CREATE POLICY blocked_slots_select ON public.blocked_slots
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY blocked_slots_insert ON public.blocked_slots
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY blocked_slots_update ON public.blocked_slots
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY blocked_slots_delete ON public.blocked_slots
  FOR DELETE USING (auth.uid() = profile_id);

-- REMINDERS
CREATE POLICY reminders_select ON public.reminders
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = reminders.appointment_id AND a.profile_id = auth.uid()
  ));

CREATE POLICY reminders_insert ON public.reminders
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = reminders.appointment_id AND a.profile_id = auth.uid()
  ));

CREATE POLICY reminders_update ON public.reminders
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = reminders.appointment_id AND a.profile_id = auth.uid()
  ));