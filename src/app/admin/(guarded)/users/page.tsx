'use client';

// ============================================================
// /admin/users — Utilisateurs & Plans (contrôle total admin)
// Seule l'administration peut : attribuer les plans, activer ou
// désactiver un compte, promouvoir ou rétrograder un admin.
// Page protégée par le layout serveur « (guarded) ».
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Loader2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldOff,
  ShieldCheck,
  BadgeCheck,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────

interface AdminUserRow {
  id: string;
  business_name: string;
  slug: string | null;
  email: string | null;
  phone: string | null;
  plan: string | null;
  subscription_status: string | null;
  subscription_end: string | null;
  is_active: boolean;
  role: string | null;
  created_at: string;
}

interface UsersResponse {
  data: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  roleColumnMissing: boolean;
}

type ConfirmDialog = {
  kind: 'promote' | 'demote';
  user: AdminUserRow;
} | null;

const PLANS = [
  { id: 'starter', label: 'Starter' },
  { id: 'pro', label: 'Pro' },
  { id: 'business', label: 'Business' },
];

const PLAN_BADGES: Record<string, string> = {
  starter: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  pro: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  business: 'bg-lime-400/15 text-lime-300 border-lime-400/30',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  trialing: 'Essai',
  expired: 'Expiré',
  cancelled: 'Annulé',
  past_due: 'Impayé',
  incomplete: 'Incomplet',
};

function statusBadgeClass(status: string | null): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'trialing':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'past_due':
    case 'incomplete':
      return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    case 'expired':
    case 'cancelled':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    default:
      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

// ── Page ─────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleColumnMissing, setRoleColumnMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selfId, setSelfId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialog>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Récupération de son propre id (pour verrouiller l'auto-modif) ──
  useEffect(() => {
    fetch('/api/admin/check')
      .then((r) => r.json())
      .then((d) => setSelfId(d.userId ?? null))
      .catch(() => setSelfId(null));
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', String(page));

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? 'Erreur serveur');
      }
      const json = (await res.json()) as UsersResponse;
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
      setRoleColumnMissing(Boolean(json.roleColumnMissing));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [q, planFilter, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── PATCH : modification d'un profil ──
  const patchUser = useCallback(
    async (profileId: string, patch: { plan?: string; isActive?: boolean; role?: string }, successMsg: string) => {
      setActionLoading(profileId);
      try {
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, ...patch }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(json?.error ?? 'Modification refusée.');
          return false;
        }
        if (json?.migrationNeeded) {
          toast.warning(json.error, { duration: 10000 });
        } else {
          toast.success(successMsg);
        }
        await fetchUsers();
        return true;
      } catch {
        toast.error('Erreur réseau. Réessayez.');
        return false;
      } finally {
        setActionLoading(null);
      }
    },
    [fetchUsers],
  );

  const adminsCount = useMemo(() => rows.filter((r) => r.role === 'admin').length, [rows]);

  // ── Rendu d'une action rôle ──
  const renderRoleAction = (user: AdminUserRow) => {
    const isSelf = user.id === selfId;
    const isAdmin = user.role === 'admin';
    const busy = actionLoading === user.id;

    if (isSelf) {
      return (
        <Badge className="border-gray-600 bg-gray-800 text-gray-400" title="Vous ne pouvez pas modifier votre propre rôle">
          <ShieldCheck size={11} className="mr-1" />
          Vous
        </Badge>
      );
    }
    if (isAdmin) {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setConfirm({ kind: 'demote', user })}
          className="h-8 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldOff size={13} />}
          <span className="ml-1.5">Rétrograder</span>
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={busy || roleColumnMissing}
        onClick={() => setConfirm({ kind: 'promote', user })}
        className="h-8 border-lime-400/40 text-lime-300 hover:bg-lime-400/10 hover:text-lime-200"
        title={roleColumnMissing ? 'Exécutez d\'abord admin-role-migration.sql' : undefined}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
        <span className="ml-1.5">Administrateur</span>
      </Button>
    );
  };

  return (
    <div className="min-h-[calc(100vh-2.5rem)] bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── En-tête ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
              <Users size={24} className="text-lime-400" />
              Utilisateurs & Plans
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Seule l&apos;administration attribue les plans, active les comptes et gère les rôles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="border-gray-700 bg-gray-800 px-3 py-1 text-gray-300">
              <Users size={12} className="mr-1.5" />
              {total} comptes
            </Badge>
            <Badge className="border-lime-400/30 bg-lime-400/10 px-3 py-1 text-lime-300">
              <Crown size={12} className="mr-1.5" />
              {adminsCount} admin{adminsCount > 1 ? 's' : ''}
            </Badge>
            <Button
              onClick={fetchUsers}
              variant="outline"
              size="sm"
              disabled={loading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <RefreshCw size={14} className={cn('mr-1.5', loading && 'animate-spin')} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* ── Alerte migration manquante ── */}
        {roleColumnMissing && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>
              La colonne <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 text-xs">profiles.role</code> est
              absente : exécutez la migration <strong>admin-role-migration.sql</strong> dans Supabase
              (Dashboard → SQL Editor) pour activer la gestion des rôles.
            </p>
          </div>
        )}

        {/* ── Filtres ── */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Rechercher (nom, e-mail, slug)…"
              className="h-10 border-gray-700 bg-gray-900 pl-10 text-gray-100 placeholder:text-gray-600"
              aria-label="Rechercher un utilisateur"
            />
          </div>
          <Select value={planFilter} onValueChange={(v) => { setPage(1); setPlanFilter(v); }}>
            <SelectTrigger className="h-10 border-gray-700 bg-gray-900 text-gray-100" aria-label="Filtrer par plan">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900 text-gray-100">
              <SelectItem value="all">Tous les plans</SelectItem>
              {PLANS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(v) => { setPage(1); setRoleFilter(v); }} disabled={roleColumnMissing}>
            <SelectTrigger className="h-10 border-gray-700 bg-gray-900 text-gray-100" aria-label="Filtrer par rôle">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900 text-gray-100">
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="admin">Administrateurs</SelectItem>
              <SelectItem value="user">Utilisateurs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v); }}>
            <SelectTrigger className="h-10 border-gray-700 bg-gray-900 text-gray-100" aria-label="Filtrer par statut">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900 text-gray-100">
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUS_LABELS).map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Contenu ── */}
        <Card className="mt-6 border-gray-800 bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comptes professionnels</CardTitle>
            <CardDescription className="text-gray-500">
              {loading ? 'Chargement…' : `${rows.length} compte(s) affiché(s) sur ${total}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-4 sm:px-6">
            {error && (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <AlertTriangle className="h-8 w-8 text-red-400" />
                <p className="text-sm text-gray-300">{error}</p>
                <Button onClick={fetchUsers} variant="outline" size="sm" className="border-gray-700 text-gray-300">
                  Réessayer
                </Button>
              </div>
            )}

            {!error && loading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-lime-400" aria-label="Chargement" />
              </div>
            )}

            {!error && !loading && rows.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Users className="h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-400">Aucun compte ne correspond à ces filtres.</p>
              </div>
            )}

            {!error && !loading && rows.length > 0 && (
              <>
                {/* Table desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-transparent">
                        <TableHead className="text-gray-400">Commerçant</TableHead>
                        <TableHead className="text-gray-400">Plan</TableHead>
                        <TableHead className="text-gray-400">Abonnement</TableHead>
                        <TableHead className="text-gray-400">Rôle</TableHead>
                        <TableHead className="text-gray-400">Actif</TableHead>
                        <TableHead className="text-gray-400">Inscrit le</TableHead>
                        <TableHead className="text-right text-gray-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((u) => (
                        <TableRow key={u.id} className="border-gray-800">
                          <TableCell className="max-w-[220px]">
                            <p className="truncate font-medium text-gray-100">{u.business_name || 'Sans nom'}</p>
                            <p className="truncate text-xs text-gray-500">{u.email || '—'}</p>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={u.plan ?? 'starter'}
                              onValueChange={(plan) =>
                                patchUser(u.id, { plan }, `Plan ${plan} attribué à ${u.business_name || 'ce compte'}.`)
                              }
                              disabled={actionLoading === u.id}
                            >
                              <SelectTrigger
                                className={cn(
                                  'h-8 w-[130px] border-gray-700 bg-gray-950 text-xs font-medium',
                                  u.plan === 'business' && 'text-lime-300',
                                )}
                                aria-label={`Changer le plan de ${u.business_name}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-gray-700 bg-gray-900 text-gray-100">
                                {PLANS.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusBadgeClass(u.subscription_status)}>
                              {STATUS_LABELS[u.subscription_status ?? ''] ?? 'Aucun'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.role === 'admin' ? (
                              <Badge variant="outline" className="border-lime-400/30 bg-lime-400/10 text-lime-300">
                                <Shield size={11} className="mr-1" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-600 bg-gray-800 text-gray-400">
                                Utilisateur
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={u.is_active}
                              disabled={actionLoading === u.id}
                              onCheckedChange={(checked) =>
                                patchUser(
                                  u.id,
                                  { isActive: checked },
                                  `${u.business_name || 'Compte'} ${checked ? 'activé' : 'désactivé'}.`,
                                )
                              }
                              aria-label={`Activer ou désactiver ${u.business_name}`}
                            />
                          </TableCell>
                          <TableCell className="text-xs text-gray-400">{formatDate(u.created_at)}</TableCell>
                          <TableCell className="text-right">{renderRoleAction(u)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Cartes mobile */}
                <div className="space-y-3 px-4 md:hidden">
                  {rows.map((u) => (
                    <div key={u.id} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-100">{u.business_name || 'Sans nom'}</p>
                          <p className="truncate text-xs text-gray-500">{u.email || '—'}</p>
                        </div>
                        <Badge variant="outline" className={statusBadgeClass(u.subscription_status)}>
                          {STATUS_LABELS[u.subscription_status ?? ''] ?? 'Aucun'}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn('border', PLAN_BADGES[u.plan ?? 'starter'])}>
                          {(u.plan ?? 'starter').toUpperCase()}
                        </Badge>
                        {u.role === 'admin' ? (
                          <Badge variant="outline" className="border-lime-400/30 bg-lime-400/10 text-lime-300">
                            <Shield size={11} className="mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-600 bg-gray-800 text-gray-400">
                            Utilisateur
                          </Badge>
                        )}
                        <span className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                          {u.is_active ? (
                            <BadgeCheck size={14} className="text-emerald-400" aria-label="Compte actif" />
                          ) : (
                            <span className="text-red-400">Désactivé</span>
                          )}
                          {formatDate(u.created_at)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-800 pt-3">
                        <Select
                          value={u.plan ?? 'starter'}
                          onValueChange={(plan) =>
                            patchUser(u.id, { plan }, `Plan ${plan} attribué à ${u.business_name || 'ce compte'}.`)
                          }
                          disabled={actionLoading === u.id}
                        >
                          <SelectTrigger
                            className="h-8 w-[120px] border-gray-700 bg-gray-900 text-xs"
                            aria-label={`Changer le plan de ${u.business_name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-gray-700 bg-gray-900 text-gray-100">
                            {PLANS.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.is_active}
                            disabled={actionLoading === u.id}
                            onCheckedChange={(checked) =>
                              patchUser(
                                u.id,
                                { isActive: checked },
                                `${u.business_name || 'Compte'} ${checked ? 'activé' : 'désactivé'}.`,
                              )
                            }
                            aria-label={`Activer ou désactiver ${u.business_name}`}
                          />
                          {renderRoleAction(u)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between px-4 sm:px-6">
                  <p className="text-xs text-gray-500">
                    Page {page} / {Math.max(1, Math.ceil(total / 50))}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      aria-label="Page précédente"
                    >
                      <ChevronLeft size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= Math.ceil(total / 50)}
                      onClick={() => setPage((p) => p + 1)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      aria-label="Page suivante"
                    >
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Confirmation promotion / rétrogradation ── */}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent className="border-gray-800 bg-gray-900 text-gray-100">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'promote' ? 'Promouvoir administrateur ?' : 'Rétrograder cet administrateur ?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {confirm?.kind === 'promote' ? (
                <>
                  <strong className="text-gray-200">{confirm?.user.business_name || confirm?.user.email}</strong> aura
                  accès au panneau de contrôle général, à tous les plans et au contrôle total de l&apos;application.
                </>
              ) : (
                <>
                  <strong className="text-gray-200">{confirm?.user.business_name || confirm?.user.email}</strong>{' '}
                  perdra l&apos;accès au panneau de contrôle général et redeviendra utilisateur standard.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading === confirm?.user.id}
              onClick={async () => {
                if (!confirm) return;
                await patchUser(
                  confirm.user.id,
                  { role: confirm.kind === 'promote' ? 'admin' : 'user' },
                  confirm.kind === 'promote'
                    ? `${confirm.user.business_name || 'Compte'} promu administrateur.`
                    : `${confirm.user.business_name || 'Compte'} rétrogradé en utilisateur.`,
                );
                setConfirm(null);
              }}
              className={
                confirm?.kind === 'promote'
                  ? 'bg-lime-400 text-gray-950 hover:bg-lime-300'
                  : 'bg-red-500 text-white hover:bg-red-400'
              }
            >
              {actionLoading === confirm?.user.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : confirm?.kind === 'promote' ? (
                'Promouvoir'
              ) : (
                'Rétrograder'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
