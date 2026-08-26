'use client';

import { Check, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlanId, Plan } from '@/types/database';

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan: boolean;
  isRecommended?: boolean;
  onSelect: (planId: PlanId) => void;
  loading?: boolean;
}

export function PlanCard({
  plan,
  isCurrentPlan,
  isRecommended,
  onSelect,
  loading,
}: PlanCardProps) {
  const includedFeatures = plan.features
    .filter((f) => f.included)
    .slice(0, 6);

  return (
    <Card
      className={cn(
        'relative flex flex-col p-6 transition-shadow duration-200',
        isRecommended && 'shadow-lg ring-2 ring-amber-400/40',
        isCurrentPlan && 'ring-2 ring-emerald-500/30'
      )}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 px-3 py-0.5 text-xs font-semibold shadow-sm">
            ⭐ Recommandé
          </Badge>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && !isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge
            variant="outline"
            className="bg-background px-3 py-0.5 text-xs font-medium"
          >
            Plan actuel
          </Badge>
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>

      {/* Price */}
      <div className="mb-5">
        <span className="text-3xl font-extrabold tracking-tight text-foreground">
          {plan.price_monthly.toLocaleString('fr-FR')}
        </span>
        <span className="text-sm text-muted-foreground ml-1">
          FCFA / mois
        </span>
      </div>

      {/* Features list */}
      <ul className="flex-1 space-y-2.5 mb-6">
        {includedFeatures.map((feature) => (
          <li key={feature.key} className="flex items-start gap-2.5 text-sm">
            <Check
              size={16}
              className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400"
            />
            <span className="text-foreground/80">{feature.label}</span>
          </li>
        ))}
      </ul>

      {/* CTA button */}
      <Button
        className={cn(
          'w-full font-semibold',
          isCurrentPlan
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400'
            : isRecommended
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-foreground hover:bg-foreground/90 text-background'
        )}
        disabled={isCurrentPlan || loading}
        onClick={() => onSelect(plan.id)}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isCurrentPlan ? (
          'Plan actuel'
        ) : (
          <>
            Passer à {plan.name}
            <ArrowRight size={16} className="ml-1" />
          </>
        )}
      </Button>
    </Card>
  );
}
