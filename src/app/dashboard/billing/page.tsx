'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Cog,
  CreditCard,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  ArrowRight,
  RefreshCw,
  Loader2,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';
import { UsageMeter } from '@/components/billing/usage-meter';
import { PlanCard } from '@/components/billing/plan-card';
import { SubscriptionBadge } from '@/components/billing/subscription-badge';
import type {
  PlanId,
  Plan,
  PlanLimit,
  Payment,
  UsageSummaryItem,
  SubscriptionInfo,
} from '@/types/database';
import type { ConsumptionAlertLevel } from '@/lib/billing/types';

// ── API response shape ───────────────────────────────────────

interface VoiceCreditAlert {
  level: ConsumptionAlertLevel;
  used: number;
  total: number;
  remaining: number;
}

interface BillingData {
  subscription: SubscriptionInfo;
  plans: Plan[];
  limits: PlanLimit[];
  usage: UsageSummaryItem[];
  payments: Payment[];
  alerts: {
    voice_credits: VoiceCreditAlert;
  };
}

// ── Helpers ──────────────────────────────────────────────────

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  completed: { label: 'Complété', variant: 'default' },
  pending: { label: 'En attente', variant: 'outline' },
  processing: { label: 'En cours', variant: 'outline' },
  failed: { label: 'Échoué', variant: 'destructive' },
  refunded: { label: 'Remboursé', variant: 'secondary' },
  expired: { label: 'Expiré', variant: 'secondary' },
};

const VOICE_ALERT_MESSAGES: Record<
  ConsumptionAlertLevel,
  { message: string; bg: string; border: string; text: string } | null
> = {
  none: null,
  warning: {
    message: 'Vous avez utilisé 70% de vos crédits vocaux.',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-300',
  },
  critical: {
    message: 'Il vous reste seulement 15% de vos crédits.',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-800 dark:text-orange-300',
  },
  exhausted: {
    message: 'Votre quota est épuisé.',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-300',
  },
};

// ── Loading skeleton ─────────────────────────────────────────

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      {/* Current plan skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-7 w-32" />
          </div>
        </CardContent>
      </Card>
      {/* Usage skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
      {/* Plans skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-32" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      </div>
      {/* Payments skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function BillingPage() {
  const router = useRouter();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState<PlanId | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/billing');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur de chargement' }));
        throw new Error(err.error || 'Erreur de chargement');
      }
      const json: BillingData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Plan change handler ────────────────────────────────────
  const handleSelectPlan = async (planId: PlanId) => {
    if (!data) return;
    // Si c'est le plan actuel, ne rien faire
    if (planId === data.subscription.plan) return;

    setPlanLoading(planId);
    try {
      // Appeler directement le checkout pour obtenir l'URL de paiement Chariow
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur lors du changement de plan');
      }
      const result = await res.json();
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        toast.error('URL de paiement non reçue. Réessayez.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setPlanLoading(null);
    }
  };

  // ── Cancel subscription handler ────────────────────────────
  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: 'user_request' }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur lors de l\'annulation');
      }
      const result = await res.json();
      toast.success('Abonnement annulé. Il restera actif jusqu\'à la fin de la période.');
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  if (loading) return <BillingSkeleton />;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <XCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300 flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw size={14} className="mr-1.5" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { subscription: sub, plans, usage, payments, alerts } = data;
  const voiceAlert = alerts?.voice_credits;
  const hasActiveSubscription =
    sub.subscription_status !== null &&
    sub.subscription_status !== 'none' &&
    sub.subscription_status !== 'expired' &&
    sub.subscription_status !== 'past_due' &&
    sub.subscription_status !== 'cancelled';

  // Find plan name for current plan
  const currentPlanData = plans.find((p) => p.id === sub.plan);
  const currentPlanName = currentPlanData?.name ?? sub.plan;
  const currentPlanPrice = currentPlanData?.price_monthly ?? 0;

  // Voice credit usage item (for the voice_credits meter)
  const voiceUsage = usage.find((u) => u.limit_key === 'voice_credits');

  // Determine alert level for each usage item
  function getAlertLevel(item: UsageSummaryItem): ConsumptionAlertLevel {
    if (item.limit_value === -1) return 'none';
    const pct = item.current_usage / item.limit_value;
    if (pct >= 1) return 'exhausted';
    if (pct >= 0.85) return 'critical';
    if (pct >= 0.7) return 'warning';
    return 'none';
  }

  // Voice credit alert config
  const voiceAlertConfig = voiceAlert
    ? VOICE_ALERT_MESSAGES[voiceAlert.level]
    : null;

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Cog size={24} className="text-muted-foreground" />
          Abonnement et Facturation
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre abonnement, surveillez votre utilisation et consultez votre historique de paiements.
        </p>
      </div>

      {/* ── 2. Current Plan Section ────────────────────────── */}
      <Card className="border-border">
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col gap-4">
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <Crown size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{currentPlanName}</h2>
                  {hasActiveSubscription && (
                    <p className="text-sm text-muted-foreground">
                      {currentPlanPrice.toLocaleString('fr-FR')} FCFA / mois
                    </p>
                  )}
                </div>
              </div>
              <SubscriptionBadge
                status={sub.subscription_status}
                planName={currentPlanName ?? ''}
                daysRemaining={sub.days_remaining}
                isTrial={sub.is_trial}
              />
            </div>

            {/* Status-specific content */}
            {sub.is_trial && (sub.subscription_status === 'trialing' || sub.subscription_status === 'active') && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      Essai expire le {formatDate(sub.trial_end)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    <ArrowRight size={14} className="mr-1.5" />
                    Passer à un plan payant
                  </Button>
                </div>
              </div>
            )}

            {sub.subscription_status === 'active' && !sub.is_trial && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <p className="text-sm text-muted-foreground">
                  Prochaine facturation : {formatDate(sub.subscription_end)}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Changer de plan
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                        Annuler l&apos;abonnement
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Votre abonnement restera actif jusqu&apos;à la fin de la période en cours. Vous ne serez plus facturé après cette date.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelSubscription}
                          disabled={cancelLoading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {cancelLoading && <Loader2 size={14} className="mr-1.5 animate-spin" />}
                          Confirmer l&apos;annulation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

            {!hasActiveSubscription && (
              <div className="rounded-xl border border-dashed border-2 border-muted-foreground/20 bg-muted/30 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Choisissez un plan pour continuer à utiliser Djola TikTak.
                  </p>
                  <Button size="sm" onClick={() => router.push('/pricing')}>
                    Voir les plans
                    <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Usage Section ───────────────────────────────── */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 size={18} className="text-muted-foreground" />
            Utilisation ce mois
          </CardTitle>
          <CardDescription>
            Suivez votre consommation par rapport aux limites de votre plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-4 lg:p-6 pt-0">
          {/* Voice credits alert */}
          {voiceAlertConfig && (
            <div
              className={cn(
                'rounded-xl border p-4',
                voiceAlertConfig.bg,
                voiceAlertConfig.border
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    size={16}
                    className={cn(
                      voiceAlert?.level === 'exhausted'
                        ? 'text-red-600 dark:text-red-400'
                        : voiceAlert?.level === 'critical'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-amber-600 dark:text-amber-400'
                    )}
                  />
                  <p className={cn('text-sm font-medium', voiceAlertConfig.text)}>
                    {voiceAlertConfig.message}
                  </p>
                </div>
                {voiceAlert?.level === 'exhausted' && (
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <ArrowRight size={14} className="mr-1.5" />
                    Passer au plan supérieur
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Voice credits meter (prominent) */}
          {voiceUsage && (
            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <UsageMeter
                used={voiceAlert?.used ?? voiceUsage.current_usage}
                total={voiceAlert?.total ?? voiceUsage.limit_value}
                remaining={voiceAlert?.remaining ?? voiceUsage.remaining}
                unitLabel="Rappels vocaux IA"
                alertLevel={voiceAlert?.level ?? getAlertLevel(voiceUsage)}
              />
            </div>
          )}

          {/* Other usage meters */}
          <div className="space-y-5 max-h-96 overflow-y-auto custom-scrollbar">
            {usage
              .filter((u) => u.limit_key !== 'voice_credits')
              .map((item) => (
                <UsageMeter
                  key={item.limit_key}
                  used={item.current_usage}
                  total={item.limit_value}
                  remaining={item.remaining}
                  unitLabel={item.unit_label ?? ''}
                  alertLevel={getAlertLevel(item)}
                />
              ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Plan Selection Section ──────────────────────── */}
      <div id="plans-section" className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {hasActiveSubscription ? 'Changer de plan' : 'Choisir un plan'}
        </h2>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">Paiement en ligne via Chariow</span>
          <span className="text-xs text-muted-foreground">|</span>
          <button
            onClick={() => router.push('/dashboard/payment/manual' + (sub.plan ? `?plan=${sub.plan}` : ''))}
            className="text-xs font-medium text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
          >
            <Phone size={12} />
            Ou payer par Mobile Money (Orange / MTN)
          </button>
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucun plan disponible actuellement. Contactez le support.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={plan.id === sub.plan}
                isRecommended={plan.id === 'pro'}
                onSelect={handleSelectPlan}
                loading={planLoading === plan.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Payment History Section ─────────────────────── */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard size={18} className="text-muted-foreground" />
            Historique des paiements
          </CardTitle>
          <CardDescription>Vos transactions récentes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase">Date</TableHead>
                    <TableHead className="text-xs uppercase">Plan</TableHead>
                    <TableHead className="text-xs uppercase">Montant</TableHead>
                    <TableHead className="text-xs uppercase">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.slice(0, 10).map((payment) => {
                    const cfg = PAYMENT_STATUS_CONFIG[payment.status] ?? {
                      label: payment.status,
                      variant: 'outline' as const,
                    };
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(payment.created_at)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {payment.plan_name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.amount.toLocaleString('fr-FR')} FCFA
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                            {payment.status === 'completed' && <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />}
                            {payment.status === 'pending' && <Clock size={12} className="text-amber-600 dark:text-amber-400" />}
                            {payment.status === 'failed' && <XCircle size={12} className="text-red-600 dark:text-red-400" />}
                            {cfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard size={40} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucun paiement pour le moment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
