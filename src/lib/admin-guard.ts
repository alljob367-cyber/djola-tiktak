// ============================================================
// Djola TikTak — Garde d'accès administrateur (RBAC central)
// ------------------------------------------------------------
// SEUL L'ADMIN a accès au panneau de contrôle général, à tous
// les plans et au contrôle total de l'app.
//
// Un compte est administrateur si (OU logique) :
//   1. profiles.role = 'admin'  (migration 10, source de vérité)
//   2. son e-mail figure dans ADMIN_EMAILS (variable d'env)
//
// Tolérance : si la colonne `role` n'existe pas encore en base
// (migration non exécutée), on retombe silencieusement sur la
// variable d'environnement — l'app ne casse jamais.
// ============================================================

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { selectFieldsFor, trackMissingColumn } from '@/lib/supabase/columns';

const PROFILE_FIELDS = [
  'id',
  'business_name',
  'slug',
  'email',
  'is_active',
  'plan',
  'subscription_status',
  'subscription_end',
  'role',
  'created_at',
];

/** E-mails administrateurs déclarés via ADMIN_EMAILS (env). */
export function adminEmailsFromEnv(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** ADMIN_EMAILS est-il configuré ? */
export function adminEmailsConfigured(): boolean {
  return adminEmailsFromEnv().length > 0;
}

/** L'e-mail fait-il partie de la liste ADMIN_EMAILS ? */
export function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = adminEmailsFromEnv();
  return list.length > 0 && list.includes(email.toLowerCase());
}

export interface AdminStatus {
  /** Utilisateur connecté ? */
  authenticated: boolean;
  /** Est administrateur (rôle DB OU e-mail dans ADMIN_EMAILS) */
  isAdmin: boolean;
  /** Rôle en base ('user' | 'admin' | null si colonne absente) */
  role: 'user' | 'admin' | null;
  /** uuid Supabase */
  userId: string | null;
  email: string | null;
}

const ANON_STATUS: AdminStatus = {
  authenticated: false,
  isAdmin: false,
  role: null,
  userId: null,
  email: null,
};

/**
 * Résout le statut d'accès de la requête courante (session cookie).
 * Ne lève jamais d'exception : en cas d'erreur Supabase, retourne
 * un statut non-admin.
 */
export async function getAdminStatus(): Promise<AdminStatus> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ...ANON_STATUS };

    const email = user.email ?? null;

    // Filet de sécurité immédiat : e-mail listé dans ADMIN_EMAILS
    if (isEmailAdmin(email)) {
      return { authenticated: true, isAdmin: true, role: 'admin', userId: user.id, email };
    }

    // Lecture du rôle en base (tolérante si la colonne est absente)
    let role: 'user' | 'admin' | null = null;
    const select = selectFieldsFor('profiles', PROFILE_FIELDS);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(select)
      .eq('id', user.id)
      .maybeSingle();

    if (error && trackMissingColumn('profiles', error)) {
      // Colonne role absente → réessayer SANS role
      const fallback = PROFILE_FIELDS.filter((f) => f !== 'role').join(', ');
      const retry = await supabase.from('profiles').select(fallback).eq('id', user.id).maybeSingle();
      role = (retry.data as { role?: string } | null)?.role === 'admin' ? 'admin' : null;
    } else if (!error && profile) {
      role = (profile as { role?: string }).role === 'admin' ? 'admin' : 'user';
    }

    return {
      authenticated: true,
      isAdmin: role === 'admin' || isEmailAdmin(email),
      role,
      userId: user.id,
      email,
    };
  } catch {
    return { ...ANON_STATUS };
  }
}

/**
 * Garde pour API admin : retourne soit un statut admin valide,
 * soit une NextResponse d'erreur prête à renvoyer (401/403).
 *
 * Usage :
 *   const guard = await requireAdminApi();
 *   if (guard.response) return guard.response;
 *   // → guard.status.userId / .email disponibles
 */
export async function requireAdminApi(): Promise<
  { response: null; status: AdminStatus } | { response: NextResponse; status: AdminStatus }
> {
  const status = await getAdminStatus();
  if (!status.authenticated) {
    return {
      response: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }),
      status,
    };
  }
  if (!status.isAdmin) {
    return {
      response: NextResponse.json({ error: 'Accès refusé. Réservé aux administrateurs.' }, { status: 403 }),
      status,
    };
  }
  return { response: null, status };
}

/**
 * Compte les administrateurs existants (rôle DB + e-mails env).
 * Utilisé pour interdire la rétrogradation du DERNIER admin.
 * Tolérant si la colonne role est absente (compte via env).
 */
export async function countAdmins(): Promise<number> {
  let total = adminEmailsFromEnv().length;
  try {
    // Service role : comptage fiable même si RLS limite la lecture des profils
    const db = await createServiceRoleClient();
    const { count, error } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');
    if (!error && typeof count === 'number') total += count;
  } catch {
    // Colonne absente ou erreur → on garde le compte env
  }
  return total;
}
