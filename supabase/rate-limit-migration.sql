-- ============================================================
-- Djola TikTak — Rate limiting persistant (anti-spam)
-- ============================================================
-- Version : 1.0.0
-- Date    : 2026-09-03
--
-- OBJET :
--   Remplace le rate limiter en mémoire (Map JS) qui est INEFFICACE
--   sur Vercel (multi-instances serverless) : chaque instance gardait
--   son propre compteur → limite contournable.
--
--   Principe : chaque requête sensible (réservation publique, bot
--   WhatsApp) enregistre un "hit" identifié (IP hachée, téléphone...).
--   Un comptage sur la fenêtre glissante décide d'autoriser ou non.
--
-- EXÉCUTION : SQL Editor Supabase → Run. Idempotent.
-- ============================================================

BEGIN;

-- 1. Table des hits de rate limiting -------------------------
create table if not exists public.rate_limit_hits (
  id          bigint generated always as identity primary key,
  identifier  text        not null,           -- ex : "bk:<sha256(ip)>" ou "wa:<phone>"
  created_at  timestamptz not null default now()
);

-- Index composite pour comptage rapide par fenêtre glissante
create index if not exists rate_limit_ident_created_idx
  on public.rate_limit_hits (identifier, created_at desc);

-- 2. RLS : aucune politique → seul le service_role (côté serveur)
--    peut lire/écrire. Les clés anon/authenticated sont bloquées.
alter table public.rate_limit_hits enable row level security;

-- 3. Nettoyage automatique : purger les hits de plus de 24h.
--    Appelé de manière probabiliste par l'application (5% des requêtes),
--    et ici via une fonction réutilisable.
create or replace function public.purge_old_rate_limit_hits()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.rate_limit_hits
  where created_at < now() - interval '24 hours';
end;
$$;

COMMIT;
