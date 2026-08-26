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
  Eye,
  CircleDot,
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
import type { AppointmentWithDetails, AppointmentStatus } from '@/types/database';

// ── Status config ─────────────────────────────────────────────
type FilterTab = 'all' | AppointmentStatus;

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  emptyTitle: string;
  emptyDesc: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'En attente',
    icon: CircleDot,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    emptyTitle: 'Aucun rendez-vous en attente',
    emptyDesc: 'Les nouvelles réservations apparaîtront ici.',
  },
  confirmed: {
    label: 'Confirmé',
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    emptyTitle: 'Aucun rendez-vous confirmé',
    emptyDesc: 'Confirmez un rendez-vous en attente pour le voir ici.',
  },
  completed: {
    label: 'Terminé',
    icon: CheckCircle2,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
    emptyTitle: 'Aucun rendez-vous terminé',
    emptyDesc: 'Les rendez-vous marqués comme terminés apparaîtront ici.',
  },
  cancelled: {
    label: 'Annulé',
    icon: CalendarX2,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    emptyTitle: 'Aucun rendez-vous annulé',
    emptyDesc: 'Les rendez-vous annulés apparaîtront ici.',
  },
  no_show: {
    label: 'Absent',
    icon: UserX,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    emptyTitle: 'Aucun absent',
    emptyDesc: 'Les rendez-vous où le client ne s\'est pas présenté apparaîtront ici.',
  },
};

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmés' },
  { value: 'completed', label: 'Terminés' },
  { value: 'cancelled', label: 'Annulés' },
  { value: 'no_show', label: 'Absents' },
];

// ── Helpers ────────────────────────────────────────────────────
function formatFrenchDate(iso: string): string {
  const d = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return d.toLocaleDateString('fr-FR', options);
}

function formatFrenchTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', {
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
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      toast.error('Impossible de charger les rendez-vous');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchAppointments();
  }, [fetchAppointments]);

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
          ? 'Rendez-vous confirmé'
          : status === 'completed'
            ? 'Rendez-vous terminé'
            : status === 'cancelled'
              ? 'Rendez-vous annulé'
              : 'Marqué comme absent'
      );
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
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
            <h3 className="font-semibold text-lg">Aucun rendez-vous</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Vos rendez-vous apparaîtront ici dès que vos clients prennent réservation.
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
                  {formatFrenchTime(apt.starts_at)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFrenchDate(apt.starts_at)}
                </span>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-10 bg-border" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">
                    {apt.client?.name ?? 'Client inconnu'}
                  </p>
                  <Badge variant="secondary" className={cfg.color}>
                    {cfg.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {apt.service?.name ?? 'Service inconnu'}
                </p>
              </div>

              {/* Actions */}
              {canAct && (
                <div className="flex items-center gap-1.5 shrink-0">
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
                      Confirmer
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
                    Terminer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(apt.id, 'cancelled')}
                    disabled={isUpdating}
                    className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <CalendarX2 size={14} className="mr-1" />
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(apt.id, 'no_show')}
                    disabled={isUpdating}
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                  >
                    <UserX size={14} className="mr-1" />
                    <span className="hidden sm:inline">Absent</span>
                  </Button>
                </div>
              )}
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
        <h1 className="text-2xl font-bold tracking-tight">Rendez-vous</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez et suivez vos réservations
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
