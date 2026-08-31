'use client';

// ============================================================
// /admin/setup — Création des identifiants administrateur.
// Page de démarrage (bootstrap) : accessible AVANT connexion.
// Une fois un administrateur créé, la page se verrouille
// (clé ADMIN_SECRET exigée pour en créer d'autres).
// ============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SetupStatus {
  secretConfigured: boolean;
  emailsConfigured: boolean;
  adminExists: boolean;
  bootstrapOpen: boolean;
}

export default function AdminSetupPage() {
  const router = useRouter();

  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [secret, setSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // ── Statut du bootstrap au montage ──
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/setup')
      .then((r) => r.json())
      .then((data: SetupStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const secretRequired = status?.secretConfigured === true;
  const locked =
    status !== null &&
    status.adminExists &&
    !status.bootstrapOpen &&
    !status.secretConfigured &&
    !status.emailsConfigured;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          email: email.trim(),
          password,
          secret: secret.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (res.status === 403) {
        toast.error(json.error ?? 'Création refusée.');
        return;
      }
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Erreur lors de la création.');
        return;
      }

      if (json.migrationNeeded) {
        toast.warning(json.error, { duration: 14000 });
      } else {
        toast.success(json.message ?? 'Compte administrateur créé !');
      }
      setDone(
        json.migrationNeeded
          ? 'Compte créé. Étape finale : exécutez la migration admin-role-migration.sql dans Supabase (SQL Editor), puis revenez sur cette page avec le MÊME e-mail pour finaliser la promotion administrateur.'
          : 'Compte administrateur créé. Vous pouvez maintenant vous connecter.',
      );
    } catch {
      toast.error('Erreur réseau. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Écran de chargement ──
  if (statusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-lime-400" aria-label="Chargement" />
      </div>
    );
  }

  // ── Succès : redirection vers la connexion ──
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <Card className="w-full max-w-md border-gray-800 bg-gray-900 text-gray-100">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-lime-400" />
            <div>
              <h1 className="text-lg font-bold">Identifiants administrateur créés</h1>
              <p className="mt-2 text-sm text-gray-400">{done}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/login')}
                className="bg-lime-400 text-gray-950 hover:bg-lime-300"
              >
                Se connecter
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Créer un autre admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-300"
      >
        <ArrowLeft size={13} />
        Retour à l&apos;accueil
      </Link>

      <Card className="w-full max-w-md border-gray-800 bg-gray-900 text-gray-100">
        <CardHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400/10">
            <Shield className="h-6 w-6 text-lime-400" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Créer les identifiants admin</CardTitle>
            <CardDescription className="mt-1.5 text-sm text-gray-400">
              Le compte administrateur dispose du panneau de contrôle général, de tous les plans
              et du contrôle total de l&apos;application.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Statut verrouillé */}
          {locked && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>
                Un administrateur existe déjà. Pour en créer un autre, définissez la variable
                <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 text-xs">ADMIN_SECRET</code>
                dans Vercel, puis revenez sur cette page avec la clé.
              </p>
            </div>
          )}

          {/* Contexte dynamique */}
          {status?.bootstrapOpen && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-lime-400/30 bg-lime-400/10 px-4 py-3 text-sm text-lime-200">
              <Shield size={18} className="mt-0.5 shrink-0" />
              <p>
                <strong>Premier démarrage :</strong> aucun administrateur n&apos;existe. Le premier
                compte créé ici devient automatiquement administrateur. Configurez ensuite
                ADMIN_SECRET (Vercel) pour verrouiller cette page.
              </p>
            </div>
          )}
          {status?.secretConfigured && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-gray-300">
              <KeyRound size={18} className="mt-0.5 shrink-0 text-gray-400" />
              <p>Cette installation est protégée : saisissez la clé <strong>ADMIN_SECRET</strong> configurée sur le serveur.</p>
            </div>
          )}
          {status?.emailsConfigured && !status?.secretConfigured && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-gray-300">
              <Mail size={18} className="mt-0.5 shrink-0 text-gray-400" />
              <p>
                Utilisez l&apos;e-mail déclaré dans la variable
                <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 text-xs">ADMIN_EMAILS</code>
                pour que le compte soit reconnu comme administrateur.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Nom de l'entreprise */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-sm text-gray-200">
                Nom de votre entreprise
              </Label>
              <div className="relative">
                <Building2
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex. Djola TikTak HQ"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="organization"
                  className="h-11 border-gray-700 bg-gray-950 pl-10 text-gray-100 placeholder:text-gray-600 focus-visible:ring-lime-400/40"
                />
              </div>
            </div>

            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-200">
                Adresse e-mail
              </Label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@votre-entreprise.com"
                  required
                  autoComplete="email"
                  className="h-11 border-gray-700 bg-gray-950 pl-10 text-gray-100 placeholder:text-gray-600 focus-visible:ring-lime-400/40"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-gray-200">
                Mot de passe <span className="font-normal text-gray-500">(8 caractères min.)</span>
              </Label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-11 border-gray-700 bg-gray-950 pl-10 pr-11 text-gray-100 placeholder:text-gray-600 focus-visible:ring-lime-400/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Clé ADMIN_SECRET (si configurée) */}
            {(secretRequired || status === null) && (
              <div className="space-y-2">
                <Label htmlFor="secret" className="text-sm text-gray-200">
                  Clé d&apos;administration <span className="font-normal text-gray-500">(ADMIN_SECRET)</span>
                </Label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <Input
                    id="secret"
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Clé secrète du serveur"
                    autoComplete="off"
                    required={secretRequired}
                    className="h-11 border-gray-700 bg-gray-950 pl-10 text-gray-100 placeholder:text-gray-600 focus-visible:ring-lime-400/40"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || locked}
              className="h-11 w-full bg-lime-400 font-semibold text-gray-950 hover:bg-lime-300 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Création en cours…
                </>
              ) : (
                <>
                  <Shield size={16} className="mr-2" />
                  Créer le compte administrateur
                </>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-500">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-lime-400 hover:underline">
              Connectez-vous
            </Link>{' '}
            puis visitez cette page en tant qu&apos;admin pour en créer d&apos;autres.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
