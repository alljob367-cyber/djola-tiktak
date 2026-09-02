'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  CalendarX2,
  UserX,
  CircleDot,
  Trash2,
  Wallet,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import type { AppointmentWithDetails, AppointmentStatus } from '@/types/database';
import { formatCurrency } from '@/lib/availability/engine';
import { useI18n } from '@/i18n/provider';

// ── Status config ─────────────────────────────────────────────
type FilterTab = 'all' | AppointmentStatus;

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  emptyTitle: string;
  emptyDesc: string;
}

const STATUS_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
  pending: { icon: CircleDot, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  confirmed: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  completed: { icon: CheckCircle2, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400' },
  cancelled: { icon: CalendarX2, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  no_show: { icon: UserX, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
};

// ── Helpers ────────────────────────────────────────────────────
function formatLocalDate(iso: string, intl: string): string {
  const d = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return d.toLocaleDateString(intl, options);
}

function formatLocalTime(iso: string, intl: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(intl, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Animation variants ─────────────────────────────────────────
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.25, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, x: -12, transition: { duration: 0.15 } },
};

// ── Component ──────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { t, intl } = useI18n();
  const A = t.dashboard.appointments;
  const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; emptyTitle: string; emptyDesc: string }> = {
    pending: { label: t.dashboard.status.pending, icon: STATUS_STYLE.pending.icon, color: STATUS_STYLE.pending.color, emptyTitle: A.emptyPending, emptyDesc: A.emptyPendingDesc },
    confirmed: { label: t.dashboard.status.confirmed, icon: STATUS_STYLE.confirmed.icon, color: STATUS_STYLE.confirmed.color, emptyTitle: A.emptyConfirmed, emptyDesc: A.emptyConfirmedDesc },
    completed: { label: t.dashboard.status.completed, icon: STATUS_STYLE.completed.icon, color: STATUS_STYLE.completed.color, emptyTitle: A.emptyCompleted, emptyDesc: A.emptyCompletedDesc },
    cancelled: { label: t.dashboard.status.cancelled, icon: STATUS_STYLE.cancelled.icon, color: STATUS_STYLE.cancelled.color, emptyTitle: A.emptyCancelled, emptyDesc: A.emptyCancelledDesc },
    no_show: { label: t.dashboard.status.no_show, icon: STATUS_STYLE.no_show.icon, color: STATUS_STYLE.no_show.color, emptyTitle: A.emptyNoShow, emptyDesc: A.emptyNoShowDesc },
  };
  const TABS: { value: FilterTab; label: string }[] = [
    { value: 'all', label: A.tabs.all },
    { value: 'pending', label: A.tabs.pending },
    { value: 'confirmed', label: A.tabs.confirmed },
    { value: 'completed', label: A.tabs.completed },
    { value: 'cancelled', label: A.tabs.cancelled },
    { value: 'no_show', label: A.tabs.no_show },
  ];
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      const qs = params.toString();
      const res = await fetch(`/api/appointments${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Erreur réseau');
      const json = await res.json();
      setAppointments(json.data ?? []);
    } catch {
      toast.error(A.loadError);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Delete appointment ──────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }
      toast.success(A.deleted);
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : A.deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Status update ───────────────────────────────────────
  const updateStatus = async (id: string, status: AppointmentStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }
      toast.success(
        status === 'confirmed'
          ? A.confirmed
          : status === 'completed'
            ? A.completed
            : status === 'cancelled'
              ? A.cancelled
              : A.markedNoShow
      );
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : A.updateError);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Acompte reçu (prepayment_status → paid) ─────────────
  const markDepositPaid = async (id: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prepayment_status: 'paid' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }
      toast.success(A.depositReceived);
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : A.updateError);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Filtered list ───────────────────────────────────────
  const filtered =
    activeTab === 'all'
      ? appointments
      : appointments.filter((a) => a.status === activeTab);

  // ── Empty state helper ──────────────────────────────────
  const renderEmpty = () => {
    const cfg = STATUS_CONFIG[activeTab];
    if (activeTab === 'all') {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-emerald-50 p-4 mb-4 dark:bg-emerald-950/30">
              <CalendarDays size={32} className="text-emerald-500" />
            </div>
            <h3 className="font-semibold text-lg">{A.emptyTitle}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {A.emptyDesc}
            </p>
          </CardContent>
        </Card>
      );
    }
    const Icon = cfg.icon;
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Icon size={32} className="text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">{cfg.emptyTitle}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{cfg.emptyDesc}</p>
        </CardContent>
      </Card>
    );
  };

  // ── Render appointment card ─────────────────────────────
  const renderCard = (apt: AppointmentWithDetails, index: number) => {
    const cfg = STATUS_CONFIG[apt.status];
    const isUpdating = updatingId === apt.id;
    const canAct = apt.status === 'pending' || apt.status === 'confirmed';

    return (
      <motion.div
        key={apt.id}
        custom={index}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Time column */}
              <div className="flex sm:flex-col items-center sm:items-center gap-1 sm:gap-0 sm:min-w-[72px] shrink-0">
                <Clock size={14} className="text-muted-foreground" />
                <span className="text-sm font-semibold">
                  {formatLocalTime(apt.starts_at, intl)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatLocalDate(apt.starts_at, intl)}
                </span>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-10 bg-border" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">
                    {apt.client?.name ?? A.unknownClient}
                  </p>
                  <Badge variant="secondary" className={cfg.color}>
                    {cfg.label}
                  </Badge>
                  {/* Employé assigné (gestion d'équipe) */}
                  {apt.employee?.name && (
                    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: apt.employee.color || '#6366f1' }}
                      />
                      {apt.employee.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {apt.service?.name ?? A.unknownService}
                </p>
                {/* Acompte (anti no-show) */}
                {apt.prepayment_status === 'pending' && (apt.deposit_amount ?? 0) > 0 && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                      <Wallet size={10} />
                      {A.depositDue(formatCurrency(apt.deposit_amount ?? 0))}
                    </span>
                    {canAct && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markDepositPaid(apt.id)}
                        disabled={isUpdating}
                        className="h-6 rounded-full border-violet-200 px-2 text-[10px] text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/40"
                      >
                        <Banknote size={11} className="mr-1" />
                        {A.markDepositPaid}
                      </Button>
                    )}
                  </div>
                )}
                {apt.prepayment_status === 'paid' && (apt.amount_paid ?? 0) > 0 && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 size={10} />
                      {A.depositPaid(formatCurrency(apt.amount_paid ?? 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {canAct && (
                  <>
                    {apt.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(apt.id, 'confirmed')}
                        disabled={isUpdating}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                      >
                        {isUpdating && <Loader2 size={13} className="mr-1.5 animate-spin" />}
                        <CheckCircle2 size={14} className="mr-1" />
                        {A.confirm}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(apt.id, 'completed')}
                      disabled={isUpdating}
                      className="border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-950/40"
                    >
                      <CheckCircle2 size={14} className="mr-1" />
                      {A.complete}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(apt.id, 'cancelled')}
                      disabled={isUpdating}
                      className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <CalendarX2 size={14} className="mr-1" />
                      {A.cancel}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(apt.id, 'no_show')}
                      disabled={isUpdating}
                      className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                    >
                      <UserX size={14} className="mr-1" />
                      <span className="hidden sm:inline">{A.noShow}</span>
                    </Button>
                  </>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isUpdating || deletingId === apt.id}
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      {deletingId === apt.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{A.deleteTitle}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le rendez-vous de {apt.client?.name ?? A.unknownClient} du {formatLocalDate(apt.starts_at, intl)} à {formatLocalTime(apt.starts_at, intl)} sera définitivement supprimé.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(apt.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {A.deleteConfirm}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ── Main render ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{A.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {A.subtitle}
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FilterTab)}
      >
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex w-auto gap-1 bg-muted/60">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            renderEmpty()
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {filtered.map((apt, i) => renderCard(apt, i))}
              </div>
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
