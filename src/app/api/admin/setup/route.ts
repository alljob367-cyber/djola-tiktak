// ============================================================
// POST /api/admin/setup — Création des identifiants administrateur
// GET  /api/admin/setup — Statut du bootstrap (pour adapter l'UI)
// ------------------------------------------------------------
// Autorisation de créer un admin (première des conditions vraies) :
//   1. Le compte est déjà administrateur (session) → ajout d'admin
//   2. L'e-mail créé figure dans ADMIN_EMAILS (env) → preuve par e-mail
//   3. La clé ADMIN_SECRET fournie correspond à l'env → preuve par clé
//   4. PREMIÈRE REVENDICATION : aucun admin n'existe nulle part
//      (ni env, ni base) ET ADMIN_SECRET n'est pas configuré
//      → le tout premier compte devient administrateur.
//      (Modèle « installation » type WordPress ; recommandation :
//      configurer ADMIN_SECRET pour fermer cette fenêtre.)
//
// Le compte créé reçoit profiles.role = 'admin', le plan Business
// et un abonnement actif — l'admin a accès à TOUS les plans.
// ============================================================

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  adminEmailsConfigured,
  adminEmailsFromEnv,
  getAdminStatus,
} from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

// ── Utilitaires ──────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Un admin existe-t-il en base (profiles.role = 'admin') ? */
async function adminExistsInDb(): Promise<boolean> {
  try {
    const db = await createServiceRoleClient();
    const { count, error } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');
    if (error) return false; // colonne absente → pas d'admin en base
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Retrouve un utilisateur auth par e-mail (pour promouvoir un compte existant). */
async function findAuthUserIdByEmail(
  db: Awaited<ReturnType<typeof createServiceRoleClient>>,
  email: string,
): Promise<string | null> {
  try {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = (data?.users ?? []).find(
      (u) => (u.email ?? '').toLowerCase() === email.toLowerCase(),
    );
    return found?.id ?? null;
  } catch {
    return null;
  }
}

// ── GET : statut du bootstrap (adaptation de l'UI) ───────────

export async function GET() {
  const secretConfigured = Boolean(process.env.ADMIN_SECRET);
  const emailsConfigured = adminEmailsConfigured();
  const adminExists = emailsConfigured || (await adminExistsInDb());

  return NextResponse.json({
    secretConfigured,
    emailsConfigured,
    adminExists,
    // Fenêtre « première revendication » ouverte ?
    bootstrapOpen: !adminExists && !secretConfigured,
  });
}

// ── POST : création du compte administrateur ─────────────────

interface SetupBody {
  email?: string;
  password?: string;
  businessName?: string;
  secret?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SetupBody;
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    const businessName = (body.businessName ?? '').trim();
    const secret = (body.secret ?? '').trim();

    // ── Validation des entrées ──
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Adresse e-mail invalide.' },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 },
      );
    }
    if (businessName.length < 2) {
      return NextResponse.json(
        { error: 'Indiquez le nom de votre entreprise (2 caractères minimum).' },
        { status: 400 },
      );
    }

    // ── Autorisation ──
    const status = await getAdminStatus();
    const envEmails = adminEmailsFromEnv();
    const secretConfigured = Boolean(process.env.ADMIN_SECRET);
    const dbAdminExists = await adminExistsInDb();

    const allowedBySession = status.isAdmin;
    const allowedByEmailList = envEmails.includes(email);
    const allowedBySecret =
      secretConfigured && secret.length > 0 && safeCompare(secret, process.env.ADMIN_SECRET as string);
    const allowedByFirstClaim =
      !adminEmailsConfigured() && !secretConfigured && !dbAdminExists;

    if (!allowedBySession && !allowedByEmailList && !allowedBySecret && !allowedByFirstClaim) {
      return NextResponse.json(
        {
          error:
            'Création refusée. Un administrateur existe déjà ou une clé ADMIN_SECRET est requise. ' +
            'Utilisez l\'e-mail déclaré dans ADMIN_EMAILS ou la clé ADMIN_SECRET.',
          reason: 'forbidden',
        },
        { status: 403 },
      );
    }

    if (allowedByFirstClaim && !allowedBySession) {
      console.warn(
        `[admin-setup] Première revendication administrateur SANS ADMIN_SECRET pour ${email}. ` +
        'Configurez ADMIN_SECRET (Vercel) pour fermer cette fenêtre.',
      );
    }

    // ── Service role obligatoire ──
    let db: Awaited<ReturnType<typeof createServiceRoleClient>>;
    try {
      db = await createServiceRoleClient();
    } catch {
      return NextResponse.json(
        {
          error:
            'SUPABASE_SERVICE_ROLE_KEY n\'est pas configuré sur le serveur. ' +
            'Ajoutez-la dans Vercel → Settings → Environment Variables.',
        },
        { status: 500 },
      );
    }

    // ── Création (ou promotion) du compte ──
    const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // connexion immédiate, sans e-mail de vérification
      user_metadata: { business_name: businessName },
    });

    let userId: string | null = created?.user?.id ?? null;

    if (createError) {
      const msg = (createError.message ?? '').toLowerCase();
      const alreadyExists =
        msg.includes('already') && (msg.includes('registered') || msg.includes('exist'));
      if (!alreadyExists) {
        console.error('[admin-setup] createUser:', createError.message);
        return NextResponse.json(
          { error: 'Impossible de créer le compte. ' + createError.message },
          { status: 500 },
        );
      }
      // Compte existant → on le promeut (si autorisé par clé/e-mail/session)
      userId = await findAuthUserIdByEmail(db, email);
      if (!userId) {
        return NextResponse.json(
          {
            error:
              'Cet e-mail possède déjà un compte introuvable. Connectez-vous avec ce compte ' +
              'puis utilisez la page « Utilisateurs & Plans » pour le promouvoir.',
          },
          { status: 409 },
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Impossible d\'identifier le compte créé. Réessayez.' },
        { status: 500 },
      );
    }

    // ── Profil : rôle admin + plan Business + abonnement actif ──
    const profileUpdate: Record<string, unknown> = {
      role: 'admin',
      plan: 'business',
      subscription_status: 'active',
      subscription_start: new Date().toISOString(),
      subscription_end: null,
      business_name: businessName,
      slug: `admin-${userId.slice(0, 8)}`,
    };

    const { error: profileError } = await db
      .from('profiles')
      .upsert({ id: userId, ...profileUpdate }, { onConflict: 'id' });

    if (profileError) {
      const code = (profileError as { code?: string }).code ?? '';
      if (code === 'PGRST204' || code === '42703') {
        // Colonne role absente → migration 10 non exécutée
        return NextResponse.json(
          {
            error:
              'Compte créé. Dernière étape : exécutez la migration « admin-role-migration.sql » dans ' +
              'Supabase (Dashboard → SQL Editor), puis revenez sur cette page avec le MÊME e-mail pour ' +
              'finaliser la promotion administrateur.',
            migrationNeeded: true,
            partialSuccess: true,
          },
          { status: 200 },
        );
      }
      console.error('[admin-setup] profile upsert:', profileError.message);
      return NextResponse.json(
        { error: 'Compte créé mais profil non mis à jour. ' + profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      email,
      message:
        'Compte administrateur créé. Connectez-vous avec cet e-mail et ce mot de passe : ' +
        'vous verrez le menu « Administration » et aurez accès à tous les plans.',
    });
  } catch (err) {
    console.error('[admin-setup] Erreur inattendue:', err);
    return NextResponse.json(
      { error: 'Erreur serveur inattendue.' },
      { status: 500 },
    );
  }
}
