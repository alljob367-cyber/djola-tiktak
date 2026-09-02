-- ============================================================
-- Djola TikTak — Bot de réservation WhatsApp (sessions)
-- ============================================================
-- Version : 1.0.0
-- Date    : 2026-09-03
--
-- OBJET :
--   Stocke l'état de la conversation de réservation pour chaque
--   numéro WhatsApp client (sélection service → créneau → nom →
--   confirmation). Une ligne par numéro : la dernière conversation
--   fait foi, les sessions expirées (> 30 min) sont réinitialisées
--   par l'application.
--
-- EXÉCUTION : SQL Editor Supabase → Run. Idempotent.
-- ============================================================

BEGIN;

create table if not exists public.whatsapp_booking_sessions (
  id          uuid primary key default gen_random_uuid(),
  phone       text        not null unique,   -- numéro client (format international sans "+")
  state       text        not null default 'idle',
              -- idle | await_service | await_slot | await_confirm
  profile_id  uuid        references public.profiles(id) on delete cascade,
  service_id  uuid        references public.services(id) on delete set null,
  client_name text        default '',
  context     jsonb       default '{}'::jsonb, -- créneaux proposés, etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists wabs_profile_idx on public.whatsapp_booking_sessions (profile_id);

-- RLS : aucune politique → service_role uniquement (le webhook
-- utilise le service role côté serveur, jamais le client browser).
alter table public.whatsapp_booking_sessions enable row level security;

-- Mise à jour automatique de updated_at
create or replace function public.wabs_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wabs_touch on public.whatsapp_booking_sessions;
create trigger wabs_touch
  before update on public.whatsapp_booking_sessions
  for each row execute function public.wabs_touch_updated_at();

COMMIT;
