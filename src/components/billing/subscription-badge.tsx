'use client';

import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SubscriptionBadgeProps {
  status: string;
  planName: string;
  daysRemaining: number | null;
  isTrial: boolean;
}

export function SubscriptionBadge({
  status,
  daysRemaining,
  isTrial,
}: SubscriptionBadgeProps) {
  const daysText =
    daysRemaining !== null
      ? `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`
      : '';

  if (isTrial && (status === 'trialing' || status === 'active')) {
    return (
      <Badge
        className={cn(
          'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
          'border-amber-200 dark:border-amber-800'
        )}
      >
        <Clock size={12} className="mr-1.5" />
        Essai – {daysText}
      </Badge>
    );
  }

  if (status === 'active') {
    return (
      <Badge
        className={cn(
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
          'border-emerald-200 dark:border-emerald-800'
        )}
      >
        <CheckCircle size={12} className="mr-1.5" />
        Actif – {daysText}
      </Badge>
    );
  }

  if (status === 'cancelled') {
    return (
      <Badge
        className={cn(
          'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
          'border-orange-200 dark:border-orange-800'
        )}
      >
        <XCircle size={12} className="mr-1.5" />
        Annulé – expire bientôt
      </Badge>
    );
  }

  // expired / past_due / none
  return (
    <Badge
      className={cn(
        'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
        'border-red-200 dark:border-red-800'
      )}
    >
      <XCircle size={12} className="mr-1.5" />
      Expiré
    </Badge>
  );
}
