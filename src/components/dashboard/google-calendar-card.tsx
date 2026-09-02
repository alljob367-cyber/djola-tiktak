'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CalendarDays,
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Link2,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/i18n/provider';

interface GCalStatus {
  configured: boolean;
  migrationPending: boolean;
  connected: boolean;
  email: string | null;
  syncEnabled: boolean;
  blockBusy: boolean;
}

/**
 * Carte d'intégration Google Calendar (page Paramètres).
 * Connexion OAuth → les RDV Djola sont poussés dans l'agenda
 * Google du pro et les événements Google bloquent des créneaux.
 */
export function GoogleCalendarCard() {
  const { t } = useI18n();
  const S = t.dashboard.settings.google;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<GCalStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Chargement du statut ───────────────────────────────
  const loadStatus = async () => {
    try {
      const res = await fetch('/api/integrations/google');
      if (res.status === 401) return;
      const json = await res.json();
      setStatus(json as GCalStatus);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // ── Retour du callback OAuth (?google=…) ───────────────
  useEffect(() => {
    const result = searchParams.get('google');
    if (!result) return;
    if (result === 'connected') toast.success(S.connectedToast);
    else if (result === 'cancelled') toast.info(S.cancelledToast);
    else if (result === 'migration_pending') toast.warning(S.migrationToast);
    else if (result === 'not_configured') toast.warning(S.notConfiguredToast);
    else if (result === 'auth_required') toast.error(S.authRequiredToast);
    else toast.error(S.errorToast);
    // Nettoyer l'URL
    router.replace('/dashboard/settings');
  }, [searchParams]);

  // ── Toggle sync_enabled / block_busy ───────────────────
  const updateToggle = async (key: 'sync_enabled' | 'block_busy', value: boolean) => {
    if (!status) return;
    // Optimiste
    setStatus({ ...status, [key === 'sync_enabled' ? 'syncEnabled' : 'blockBusy']: value });
    try {
      const res = await fetch('/api/integrations/google', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback
      setStatus((prev) => (prev ? { ...prev, [key === 'sync_enabled' ? 'syncEnabled' : 'blockBusy']: !value } : prev));
      toast.error(S.saveError);
    }
  };

  // ── Déconnexion ────────────────────────────────────────
  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/google/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success(S.disconnectedToast);
      await loadStatus();
    } catch {
      toast.error(S.disconnectError);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays size={16} className="text-blue-600" />
          {S.title}
          {status?.connected && (
            <Badge variant="outline" className="ml-1 border-green-300 text-green-700 dark:text-green-400">
              <CheckCircle2 size={12} className="mr-1" />
              {S.activeBadge}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{S.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !status?.configured ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>{S.notConfigured}</span>
          </div>
        ) : status.migrationPending ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{S.migrationPending}</span>
          </div>
        ) : !status.connected ? (
          <>
            <p className="text-sm text-muted-foreground">{S.connectHint}</p>
            <Button
              onClick={() => {
                setConnecting(true);
                window.location.href = '/api/integrations/google/connect';
              }}
              disabled={connecting}
              className="gap-2"
            >
              {connecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              {S.connectButton}
              <ExternalLink size={12} className="opacity-60" />
            </Button>
          </>
        ) : (
          <>
            {/* Compte connecté */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{S.accountLabel}</p>
                <p className="text-xs text-muted-foreground truncate">{status.email || S.accountUnknown}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700" disabled={disconnecting}>
                    {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                    {S.disconnectButton}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{S.disconnectConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>{S.disconnectConfirmDesc}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{S.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={disconnect} className="bg-red-600 hover:bg-red-700">
                      {S.disconnectButton}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            {/* Toggle : pousser les RDV */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{S.syncToggle}</p>
                <p className="text-xs text-muted-foreground">{S.syncToggleHint}</p>
              </div>
              <Switch
                checked={status.syncEnabled}
                onCheckedChange={(v) => updateToggle('sync_enabled', v)}
              />
            </div>

            {/* Toggle : bloquer créneaux */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{S.blockToggle}</p>
                <p className="text-xs text-muted-foreground">{S.blockToggleHint}</p>
              </div>
              <Switch
                checked={status.blockBusy}
                onCheckedChange={(v) => updateToggle('block_busy', v)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
