'use client';

// ============================================================
// AdminPaymentsPanel — validation des paiements Mobile Money
// Visible uniquement des administrateurs (ADMIN_EMAILS) :
// l'API /api/admin/payments renvoie 403 sinon → panneau caché.
// Approuver → payment.completed + activation abonnement (30/365 j)
// Rejeter   → payment.failed
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck, Ban, Clock, Loader2, RefreshCw, ShieldCheck, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n/provider';

interface AdminPayment {
  id: string;
  plan_name: string | null;
  plan_id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  billing_period: string | null;
  created_at: string;
  profile?: { business_name: string | null; phone: string | null; email: string | null } | null;
}

export function AdminPaymentsPanel() {
  const { t, intl } = useI18n();
  const B = t.dashboard.billing;
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments?status=pending&limit=20');
      if (res.status === 403 || res.status === 401) {
        setIsAdmin(false);
        return;
      }
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setIsAdmin(true);
      setPayments(json.payments || []);
    } catch {
      // silencieux : panneau optionnel
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Non-admin (ou état inconnu sans données) → rien à afficher
  if (isAdmin === false || isAdmin === null) return null;

  const handleAction = async (paymentId: string, action: 'approve' | 'reject') => {
    setActionLoading(paymentId + action);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur');
      if (action === 'approve') {
        toast.success(B.approvedToast);
      } else {
        toast.info(B.rejectedToast);
      }
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setActionLoading(null);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(intl, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <Card className="border-emerald-200/70 dark:border-emerald-900/50">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-base">{B.adminPanelTitle}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchPending} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
        </div>
        <CardDescription>
          {B.adminPanelDesc}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading && payments.length === 0 ? (
          <div className="space-y-2 p-6">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <BadgeCheck className="size-4 text-emerald-500" />
            {B.adminNone}
          </div>
        ) : (
          <ul className="divide-y">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{p.profile?.business_name || 'Client'}</span>
                    <Badge variant="outline" className="text-[11px]">
                      {p.plan_name || p.plan_id}
                    </Badge>
                    {p.billing_period === 'yearly' && (
                      <Badge variant="secondary" className="text-[11px]">{B.yearly}</Badge>
                    )}
                    {p.provider === 'manual' && (
                      <Badge variant="outline" className="text-[11px] gap-1">
                        <Wallet className="size-3" />
                        {p.provider === 'manual' ? 'Mobile Money' : p.provider}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                    <Clock className="size-3" />
                    {fmtDate(p.created_at)}
                    {p.profile?.phone && <> · {p.profile.phone}</>}
                    {p.profile?.email && <> · {p.profile.email}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {p.amount.toLocaleString(intl)} {p.currency}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(p.id, 'approve')}
                      disabled={actionLoading !== null}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {actionLoading === p.id + 'approve' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="size-4" />
                      )}
                      {B.approve}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(p.id, 'reject')}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === p.id + 'reject' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Ban className="size-4" />
                      )}
                      {B.reject}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
