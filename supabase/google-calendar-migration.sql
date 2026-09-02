-- ============================================================
-- Djola TikTak — Sync Google Calendar (migration idempotente)
-- v1.0.0 — 2026
-- ------------------------------------------------------------
-- Chaque professionnel peut connecter son agenda Google :
--   • ses réservations Djola sont poussées dans son agenda
--   • ses événements Google (personnels/pro) bloquent des créneaux
-- Les tokens OAuth sont chiffrés AES-256-GCM côté application
-- avant stockage (colonnes *_enc). RLS : seul le propriétaire
-- (ou le service-role côté serveur) accède aux lignes.
-- ============================================================

-- 1) Table d'intégration (1 ligne max par profil)
create table if not exists public.google_calendar_integrations (
  profile_id     uuid primary key references public.profiles(id) on delete cascade,
  google_email   text,
  calendar_id    text not null default 'primary',
  -- Tokens chiffrés AES-256-GCM (src/lib/google/crypto.ts)
  access_token_enc  text,
  refresh_token_enc text,
  token_expires_at  timestamptz,
  sync_enabled   boolean not null default true,  -- pousser les RDV Djola vers Google
  block_busy     boolean not null default true,  -- les événements Google bloquent des créneaux
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 2) RLS : propriétaire uniquement (le service-role bypass la RLS)
alter table public.google_calendar_integrations enable row level security;

drop policy if exists "gc_integrations_owner_select" on public.google_calendar_integrations;
create policy "gc_integrations_owner_select" on public.google_calendar_integrations
  for select using (auth.uid() = profile_id);

drop policy if exists "gc_integrations_owner_insert" on public.google_calendar_integrations;
create policy "gc_integrations_owner_insert" on public.google_calendar_integrations
  for insert with check (auth.uid() = profile_id);

drop policy if exists "gc_integrations_owner_update" on public.google_calendar_integrations;
create policy "gc_integrations_owner_update" on public.google_calendar_integrations
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "gc_integrations_owner_delete" on public.google_calendar_integrations;
create policy "gc_integrations_owner_delete" on public.google_calendar_integrations
  for delete using (auth.uid() = profile_id);

-- 3) Lien rendez-vous ↔ événement Google (pour suppression à l'annulation)
alter table public.appointments
  add column if not exists google_event_id text;

-- 4) updated_at automatique
drop trigger if exists gc_integrations_updated_at on public.google_calendar_integrations;
create or replace function public.gc_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger gc_integrations_updated_at
  before update on public.google_calendar_integrations
  for each row execute function public.gc_touch_updated_at();
