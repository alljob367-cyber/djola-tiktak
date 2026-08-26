'use client';

import { cn } from '@/lib/utils';
import type { ConsumptionAlertLevel } from '@/lib/billing/types';

interface UsageMeterProps {
  used: number;
  total: number;
  remaining: number;
  unitLabel: string;
  alertLevel: ConsumptionAlertLevel;
}

const ALERT_COLORS: Record<ConsumptionAlertLevel, string> = {
  none: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-orange-500',
  exhausted: 'bg-red-500',
};

export function UsageMeter({
  used,
  total,
  remaining,
  unitLabel,
  alertLevel,
}: UsageMeterProps) {
  const isUnlimited = total === -1;
  const isExhausted = alertLevel === 'exhausted';
  const percentage = isUnlimited ? 10 : Math.min((used / total) * 100, 100);

  return (
    <div className="space-y-2">
      {/* Top row: label + count */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {unitLabel}
        </span>
        <span className="text-sm text-muted-foreground">
          {isUnlimited
            ? 'Illimité'
            : `${used.toLocaleString('fr-FR')} / ${total.toLocaleString('fr-FR')} utilisés`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-in-out',
            isUnlimited ? 'bg-emerald-500' : ALERT_COLORS[alertLevel]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Below bar */}
      <div className="text-xs">
        {isExhausted ? (
          <span className="text-red-600 dark:text-red-400 font-medium">
            Quota épuisé
          </span>
        ) : isUnlimited ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Illimité
          </span>
        ) : (
          <span className="text-muted-foreground">
            {remaining.toLocaleString('fr-FR')} restants
          </span>
        )}
      </div>
    </div>
  );
}
