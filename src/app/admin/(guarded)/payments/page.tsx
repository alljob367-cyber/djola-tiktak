'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Phone,
  Clock,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

interface PaymentRow {
  id: string;
  profile_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  billing_period: string;
  created_at: string;
  paid_at: string | null;
  provider_metadata: Record<string, unknown>;
  profile?: {
    id: string;
    business_name: string;
    phone: string;
    email: string;
  };
}

// ── Helpers ────────────────────────────────────────────────

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:    { label: 'En attente',  variant: 'outline' },
  completed:  { label: 'Complété',   variant: 'default' },
  failed:     { label: 'Échoué',     variant: 'destructive' },
  refunded:   { label: 'Remboursé',   variant: 'secondary' },
  processing: { label: 'En cours',    variant: 'outline' },
};

// ── Page ──────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all' | 'completed' | 'failed'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/payments?status=${filter}&provider=all`);
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setPayments(json.payments || []);
      setPendingCount(json.pendingManualCount || 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleAction = async (paymentId: string, action: 'confirm' | 'reject') => {
    setActionLoading(paymentId);
    try {
      const res = await fetch('/api/admin/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      toast.success(json.message || (action === 'confirm' ? 'Paiement confirmé !' : 'Paiement rejeté.'));
      await fetchPayments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setActionLoading(null);
    }
  };

  const manualPayments = payments.filter((p) => p.provider === 'manual');

  const FILTERS: readonly ('pending' | 'completed' | 'failed' | 'all')[] = ['pending', 'completed', 'failed', 'all'];
  const FILTER_LABELS: Record<string, string> = {
    pending: 'En attente', completed: 'Complétés', failed: 'Échoués', all: 'Tous',
  };

  return (
    <div className="min-h-[calc(100vh-2.5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CreditCard size={24} className="text-muted-foreground" />
            Paiements manuels
          </h1>
          <p className="text-muted-foreground mt-1">
            Validez les paiements Mobile Money (Orange Money, MTN MoMo)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 px-3 py-1">
              <Clock size={12} className="mr-1.5" />
              {pendingCount} en attente
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
            <RefreshCw size={14} className={cn('mr-1.5', loading && 'animate-spin')} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-muted-foreground" />
        {FILTERS.map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="text-xs"
          >
            {FILTER_LABELS[f]}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : manualPayments.length > 0 ? (
            <PaymentTable
              payments={manualPayments}
              actionLoading={actionLoading}
              onConfirm={handleAction}
              onReject={handleAction}
              filter={filter}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CreditCard size={40} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === 'pending' ? 'Aucun paiement en attente.' : 'Aucun paiement trouvé.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

// ── Extracted Table Component ─────────────────────────────

function PaymentTable({
  payments,
  actionLoading,
  onConfirm,
  onReject,
}: {
  payments: PaymentRow[];
  actionLoading: string | null;
  onConfirm: (id: string, action: 'confirm') => Promise<void>;
  onReject: (id: string, action: 'reject') => Promise<void>;
  filter: string;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Entreprise</TableHead>
            <TableHead className="text-xs">Plan</TableHead>
            <TableHead className="text-xs">Montant</TableHead>
            <TableHead className="text-xs">Méthode</TableHead>
            <TableHead className="text-xs">Statut</TableHead>
            <TableHead className="text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <PaymentTableRow
              key={payment.id}
              payment={payment}
              actionLoading={actionLoading}
              onConfirm={onConfirm}
              onReject={onReject}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Extracted Row Component ───────────────────────────────

function PaymentTableRow({
  payment,
  actionLoading,
  onConfirm,
  onReject,
}: {
  payment: PaymentRow;
  actionLoading: string | null;
  onConfirm: (id: string, action: 'confirm') => Promise<void>;
  onReject: (id: string, action: 'reject') => Promise<void>;
}) {
  const meta = payment.provider_metadata || {};
  const method = (meta.payment_method as string) || 'mobile_money';
  const cfg = STATUS_CONFIG[payment.status] || { label: payment.status, variant: 'outline' as const };
  const isProcessing = actionLoading === payment.id;

  const methodLabel = method === 'orange_money' ? 'Orange Money' : method === 'mtn_momo' ? 'MTN MoMo' : method;

  return (
    <TableRow>
      <TableCell className="text-sm">{formatDateTime(payment.created_at)}</TableCell>
      <TableCell>
        <div>
          <p className="text-sm font-medium">{payment.profile?.business_name || '—'}</p>
          <p className="text-xs text-muted-foreground">{payment.profile?.phone || '—'}</p>
        </div>
      </TableCell>
      <TableCell className="text-sm font-medium">{payment.plan_name}</TableCell>
      <TableCell className="text-sm">{payment.amount.toLocaleString('fr-FR')} FCFA</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs gap-1">
          <Phone size={10} />
          {methodLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {payment.status === 'pending' ? (
          <div className="flex items-center justify-end gap-1">
            <ConfirmDialog
              payment={payment}
              isProcessing={isProcessing}
              onConfirm={() => onConfirm(payment.id, 'confirm')}
            />
            <RejectDialog
              payment={payment}
              isProcessing={isProcessing}
              onReject={() => onReject(payment.id, 'reject')}
            />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{formatDateTime(payment.paid_at)}</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Confirm Dialog ────────────────────────────────────────

function ConfirmDialog({ payment, isProcessing, onConfirm }: {
  payment: PaymentRow;
  isProcessing: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isProcessing}>
          {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} className="mr-1" />}
          Valider
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer ce paiement ?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium">{payment.amount.toLocaleString('fr-FR')} FCFA</span> — {payment.plan_name}
            <br />
            Pour <span className="font-medium">{payment.profile?.business_name}</span>
            {payment.profile?.phone && <><br />Tél : {payment.profile.phone}</>}
            <br /><br />
            L&apos;abonnement sera activé immédiatement.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={onConfirm}>
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Reject Dialog ─────────────────────────────────────────

function RejectDialog({ payment, isProcessing, onReject }: {
  payment: PaymentRow;
  isProcessing: boolean;
  onReject: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={isProcessing}>
          <XCircle size={12} className="mr-1" />
          Rejeter
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rejeter ce paiement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le paiement de <span className="font-medium">{payment.amount.toLocaleString('fr-FR')} FCFA</span> sera marqué comme échoué.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={onReject}>
            Rejeter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
