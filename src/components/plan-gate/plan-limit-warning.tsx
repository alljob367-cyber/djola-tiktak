'use client';

import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlanFeature {
  key: string;
  label: string;
  limit: number;
  current: number;
  unlimited: boolean;
  reached: boolean;
}

interface PlanLimitsData {
  isAdmin: boolean;
  plan: string;
  subscriptionStatus: string | null;
  features: PlanFeature[];
}

interface PlanLimitWarningProps {
  featureKey: string;
  /** Show warning when usage >= this % (0-1). Default: 0.8 */
  warningThreshold?: number;
  className?: string;
}

/**
 * Fetches plan limits and shows a warning when a feature is near or at its limit.
 * Returns null for admins or if the feature is unlimited.
 */
export function PlanLimitWarning({
  featureKey,
  warningThreshold = 0.8,
  className,
}: PlanLimitWarningProps) {
  const [data, setData] = useState<PlanLimitsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plan-limits')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data || data.isAdmin) return null;

  const feature = data.features.find((f) => f.key === featureKey);
  if (!feature || feature.unlimited) return null;

  const ratio = feature.limit > 0 ? feature.current / feature.limit : 0;
  const isWarning = ratio >= warningThreshold && ratio < 1;
  const isReached = feature.reached;

  if (!isWarning && !isReached) return null;

  // Subscription expired/cancelled/past_due
  if (!data.subscriptionStatus ||
      ['expired', 'cancelled', 'past_due'].includes(data.subscriptionStatus)) {
    return (
      <div
        className={cn(
          'rounded-xl border p-4',
          'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
          className,
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Aucun abonnement actif. Choisissez un plan pour créer des {feature.label.toLowerCase()}.
            </p>
          </div>
          <Link href="/dashboard/billing" className="shrink-0">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Voir les plans
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Limit reached
  if (isReached) {
    return (
      <div
        className={cn(
          'rounded-xl border p-4',
          'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
          className,
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Limite atteinte : {feature.current}/{feature.limit} {feature.label.toLowerCase()}.
              Passez au plan supérieur pour en ajouter plus.
            </p>
          </div>
          <Link href="/dashboard/billing" className="shrink-0">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Changer de plan
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Warning (approaching limit)
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {feature.current}/{feature.limit} {feature.label.toLowerCase()} utilisés.
            Pensez à mettre à niveau votre plan.
          </p>
        </div>
        <Link href="/dashboard/billing" className="shrink-0">
          <Button size="sm" variant="outline">
            Changer de plan
            <ArrowRight size={14} className="ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/**
 * Hook to get plan limits data for custom logic.
 */
export function usePlanLimits() {
  const [data, setData] = useState<PlanLimitsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plan-limits')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}
