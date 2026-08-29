'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Save,
  Clock,
  Ban,
  Loader2,
  ShieldOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n/provider';
import type { Availability, BlockedSlot } from '@/types/database';

// ── Types ──────────────────────────────────────────────────────
interface TimeSlot {
  id?: string;
  start_time: string;
  end_time: string;
}

interface DayRow {
  day_of_week: number;
  label: string;
  is_active: boolean;
  slots: TimeSlot[];
}

interface BlockedFormData {
  starts_at: string;
  ends_at: string;
  reason: string;
}

// ── Constants ──────────────────────────────────────────────────
const WORK_DAYS = [1, 2, 3, 4, 5, 6]; // Lun-Sam

function toDatetimeLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatLocalDateTime(iso: string, intl: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(intl, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLocalDateShort(iso: string, intl: string): string {
  return new Date(iso).toLocaleDateString(intl, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Animation ──────────────────────────────────────────────────
const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3 },
  }),
};

const blockedVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// ── Component ──────────────────────────────────────────────────
export default function AvailabilityPage() {
  const { t, intl } = useI18n();
  const V = t.dashboard.availability;
  const [days, setDays] = useState<DayRow[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockForm, setBlockForm] = useState<BlockedFormData>({
    starts_at: '',
    ends_at: '',
    reason: '',
  });
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockDeleting, setBlockDeleting] = useState<string | null>(null);

  // ── Build initial days ─────────────────────────────────
  const buildInitialDays = (): DayRow[] =>
    WORK_DAYS.map((d) => ({
      day_of_week: d,
      label: V.dayNames[d],
      is_active: false,
      slots: [{ start_time: '09:00', end_time: '17:00' }],
    }));

  // ── Fetch availability ─────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [availRes, blockRes] = await Promise.all([
        fetch('/api/availability'),
        fetch('/api/availability/blocked'),
      ]);

      if (!availRes.ok || !blockRes.ok) throw new Error('Erreur réseau');

      const availJson = await availRes.json();
      const blockJson = await blockRes.json();

      const rawAvail: Availability[] = availJson.data ?? [];
      const rawBlocked: BlockedSlot[] = blockJson.data ?? [];

      // Group availability by day
      const dayMap: Record<number, { slots: TimeSlot[]; is_active: boolean }> = {};
      for (const a of rawAvail) {
        if (!dayMap[a.day_of_week]) {
          dayMap[a.day_of_week] = { slots: [], is_active: a.is_active };
        }
        // Postgres TIME renvoie "HH:mm:ss" — tronquer vers "HH:mm" pour
        // que les champs <input type="time"> et la validation restent propres
        dayMap[a.day_of_week].slots.push({
          id: a.id,
          start_time: a.start_time?.slice(0, 5),
          end_time: a.end_time?.slice(0, 5),
        });
      }

      const initial = buildInitialDays();
      const merged = initial.map((day) => {
        const mapped = dayMap[day.day_of_week];
        if (mapped) {
          return {
            ...day,
            is_active: mapped.is_active,
            slots: mapped.slots.length > 0 ? mapped.slots : [{ start_time: '09:00', end_time: '17:00' }],
          };
        }
        return day;
      });

      setDays(merged);
      setBlockedSlots(rawBlocked);
    } catch {
      toast.error(V.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Day helpers ─────────────────────────────────────────
  const toggleDay = (dow: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === dow ? { ...d, is_active: !d.is_active } : d
      )
    );
  };

  const addSlot = (dow: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === dow
          ? { ...d, slots: [...d.slots, { start_time: '09:00', end_time: '12:00' }] }
          : d
      )
    );
  };

  const removeSlot = (dow: number, slotIdx: number) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dow) return d;
        const newSlots = d.slots.filter((_, i) => i !== slotIdx);
        return { ...d, slots: newSlots.length > 0 ? newSlots : [{ start_time: '09:00', end_time: '17:00' }] };
      })
    );
  };

  const updateSlot = (
    dow: number,
    slotIdx: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dow) return d;
        const newSlots = d.slots.map((s, i) =>
          i === slotIdx ? { ...s, [field]: value } : s
        );
        return { ...d, slots: newSlots };
      })
    );
  };

  // ── Save all availability ───────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const items = days
        .filter((d) => d.is_active)
        .flatMap((d) =>
          d.slots.map((s) => ({
            day_of_week: d.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_active: true,
          }))
        );

      const res = await fetch('/api/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      toast.success(V.saved);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : V.saveError);
    } finally {
      setSaving(false);
    }
  };

  // ── Blocked slot: create ────────────────────────────────
  const handleBlockSubmit = async () => {
    if (!blockForm.starts_at || !blockForm.ends_at) {
      toast.error(V.datesRequired);
      return;
    }
    if (new Date(blockForm.ends_at) <= new Date(blockForm.starts_at)) {
      toast.error(V.endAfterStart);
      return;
    }

    setBlockSubmitting(true);
    try {
      const res = await fetch('/api/availability/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      toast.success(V.blockAdded);
      setBlockDialogOpen(false);
      setBlockForm({ starts_at: '', ends_at: '', reason: '' });
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : V.blockAddError);
    } finally {
      setBlockSubmitting(false);
    }
  };

  // ── Blocked slot: delete ────────────────────────────────
  const handleBlockDelete = async (id: string) => {
    setBlockDeleting(id);
    try {
      const res = await fetch(`/api/availability/blocked?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }
      toast.success(V.blockDeleted);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : V.deleteError);
    } finally {
      setBlockDeleting(null);
    }
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{V.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {V.subtitle}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
          {V.save}
        </Button>
      </div>

      {/* Weekly Schedule Grid */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{V.weeklyTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {days.map((day, i) => (
              <motion.div
                key={day.day_of_week}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
              >
                <div
                  className={`rounded-lg border p-4 transition-colors ${
                    day.is_active
                      ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-800/50 dark:bg-emerald-950/10'
                      : 'border-border bg-muted/30 opacity-60'
                  }`}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm w-12">{day.label}</span>
                      <Badge
                        variant={day.is_active ? 'default' : 'secondary'}
                        className={
                          day.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : ''
                        }
                      >
                        {day.is_active ? V.activeDay : V.restDay}
                      </Badge>
                    </div>
                    <Switch
                      checked={day.is_active}
                      onCheckedChange={() => toggleDay(day.day_of_week)}
                    />
                  </div>

                  {/* Time slots */}
                  {day.is_active && (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {day.slots.map((slot, si) => (
                          <motion.div
                            key={si}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="time"
                                value={slot.start_time}
                                onChange={(e) => updateSlot(day.day_of_week, si, 'start_time', e.target.value)}
                                className="w-32 sm:w-36"
                              />
                              <span className="text-sm text-muted-foreground shrink-0">→</span>
                              <Input
                                type="time"
                                value={slot.end_time}
                                onChange={(e) => updateSlot(day.day_of_week, si, 'end_time', e.target.value)}
                                className="w-32 sm:w-36"
                              />
                            </div>
                            {day.slots.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSlot(day.day_of_week, si)}
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addSlot(day.day_of_week)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                      >
                        <Plus size={14} className="mr-1" />
                        {V.addSlot}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Blocked Slots Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Ban size={18} className="text-red-500" />
              {V.blockedTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {V.blockedSubtitle}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setBlockForm({ starts_at: '', ends_at: '', reason: '' });
              setBlockDialogOpen(true);
            }}
            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Plus size={16} className="mr-2" />
            {V.addBlock}
          </Button>
        </div>

        {blockedSlots.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <ShieldOff size={28} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{V.noBlocked}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence>
              {blockedSlots.map((bs) => (
                <motion.div
                  key={bs.id}
                  variants={blockedVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Card className="border-red-100 dark:border-red-900/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Ban size={14} className="text-red-500 shrink-0" />
                            <span className="truncate">{bs.reason || V.noReason}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatLocalDateTime(bs.starts_at, intl)} — {formatLocalDateShort(bs.ends_at, intl)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleBlockDelete(bs.id)}
                          disabled={blockDeleting === bs.id}
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
                        >
                          {blockDeleting === bs.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Blocked Slot Dialog ────────────────────────────── */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{V.blockTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bl-start">{V.startLabel}</Label>
              <Input
                id="bl-start"
                type="datetime-local"
                value={blockForm.starts_at}
                onChange={(e) => setBlockForm((f) => ({ ...f, starts_at: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bl-end">{V.endLabel}</Label>
              <Input
                id="bl-end"
                type="datetime-local"
                value={blockForm.ends_at}
                onChange={(e) => setBlockForm((f) => ({ ...f, ends_at: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bl-reason">{V.reasonLabel}</Label>
              <Textarea
                id="bl-reason"
                placeholder={V.reasonPlaceholder}
                rows={2}
                value={blockForm.reason}
                onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBlockDialogOpen(false)}
              disabled={blockSubmitting}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleBlockSubmit}
              disabled={blockSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {blockSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              {V.block}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
