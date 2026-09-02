'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  UsersRound,
  Phone,
  Loader2,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { Employee } from '@/types/database';
import { useI18n } from '@/i18n/provider';

// ── Types ──────────────────────────────────────────────────────
interface EmployeeFormData {
  name: string;
  position: string;
  phone: string;
  email: string;
  color: string;
  is_active: boolean;
}

const makeEmptyForm = (): EmployeeFormData => ({
  name: '',
  position: '',
  phone: '',
  email: '',
  color: '#6366f1',
  is_active: true,
});

// Palette de couleurs proposées pour distinguer les employés
const COLOR_CHOICES = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#64748b',
];

// ── Animation variants ─────────────────────────────────────────
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// ── Component ──────────────────────────────────────────────────
export default function TeamPage() {
  const { t } = useI18n();
  const T = t.dashboard.team;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(makeEmptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch employees ─────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Erreur réseau');
      const json = await res.json();
      setEmployees(json.data ?? []);
      setMigrationPending(Boolean(json.migrationPending));
    } catch {
      toast.error(T.loadError);
    } finally {
      setLoading(false);
    }
  }, [T.loadError]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ── Dialog helpers ──────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(makeEmptyForm());
    setDialogOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditingId(e.id);
    setForm({
      name: e.name,
      position: e.position || '',
      phone: e.phone || '',
      email: e.email || '',
      color: e.color || '#6366f1',
      is_active: e.is_active,
    });
    setDialogOpen(true);
  };

  // ── Submit (create / update) ────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error(T.nameRequired);
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        position: form.position.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        color: form.color,
        is_active: form.is_active,
      };
      const url = editingId ? `/api/employees/${editingId}` : '/api/employees';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (json.code === 'PLAN_LIMIT') {
          toast.error(json.error || T.limitReached, {
            duration: 8000,
            action: {
              label: T.seePlans,
              onClick: () => (window.location.href = '/dashboard/billing'),
            },
          });
          setDialogOpen(false);
          return;
        }
        if (json.code === 'MIGRATION_PENDING') {
          toast.error(json.error || T.migrationPending, { duration: 10000 });
          setDialogOpen(false);
          return;
        }
        throw new Error(json.error || T.saveError);
      }

      toast.success(editingId ? T.updated : T.created);
      setDialogOpen(false);
      fetchEmployees();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : T.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle actif (switch sur la carte) ──────────────────
  const handleToggleActive = async (e: Employee) => {
    try {
      const res = await fetch(`/api/employees/${e.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !e.is_active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.code === 'PLAN_LIMIT') {
          toast.error(json.error || T.limitReached, {
            duration: 8000,
            action: {
              label: T.seePlans,
              onClick: () => (window.location.href = '/dashboard/billing'),
            },
          });
          return;
        }
        throw new Error(json.error || T.updateError);
      }
      toast.success(!e.is_active ? T.activated : T.deactivated);
      fetchEmployees();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : T.updateError);
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || T.deleteError);
      }
      toast.success(T.deleted);
      fetchEmployees();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : T.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{T.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{T.subtitle}</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus size={16} className="mr-2" />
          {T.addEmployee}
        </Button>
      </div>

      {/* Aide : à quoi sert l'équipe */}
      <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <p className="text-sm font-medium text-foreground">{T.helpTitle}</p>
        <p className="text-xs text-muted-foreground mt-1">{T.helpDesc}</p>
      </div>

      {/* Migration en attente */}
      {migrationPending && !loading && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{T.migrationPending}</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
            supabase/employees-migration.sql → Supabase SQL Editor
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-4">
              <UsersRound size={26} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold">{T.emptyTitle}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">{T.emptyDesc}</p>
            <Button onClick={openCreate} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus size={16} className="mr-2" />
              {T.addFirst}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {employees.map((e, i) => (
              <motion.div
                key={e.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Card className={`h-full transition-opacity ${!e.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-semibold"
                          style={{ backgroundColor: e.color || '#6366f1' }}
                        >
                          {e.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{e.name}</p>
                          {e.position && (
                            <p className="text-xs text-muted-foreground truncate">{e.position}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={e.is_active ? 'default' : 'secondary'}
                        className={
                          e.is_active
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0'
                            : 'shrink-0'
                        }
                      >
                        {e.is_active ? T.active : T.inactive}
                      </Badge>
                    </div>
                    {e.phone && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone size={12} />
                        {e.phone}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={e.is_active}
                          onCheckedChange={() => handleToggleActive(e)}
                          aria-label={e.is_active ? T.deactivate : T.activate}
                        />
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          {e.is_active ? <UserRoundCheck size={12} /> : <UserRoundX size={12} />}
                          {e.is_active ? T.activeHint : T.inactiveHint}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                          <Pencil size={14} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{T.deleteTitle}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {T.deleteDesc(e.name)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(e.id)}
                                disabled={deleting}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
                                {t.common.delete}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Employee Dialog ────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? T.editTitle : T.createTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="emp-name">{T.nameLabel}</Label>
              <Input
                id="emp-name"
                placeholder={T.namePlaceholder}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-position">
                {T.positionLabel}
                <span className="ml-1 text-muted-foreground font-normal">({T.optional})</span>
              </Label>
              <Input
                id="emp-position"
                placeholder={T.positionPlaceholder}
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-phone">
                  {T.phoneLabel}
                  <span className="ml-1 text-muted-foreground font-normal">({T.optional})</span>
                </Label>
                <Input
                  id="emp-phone"
                  type="tel"
                  placeholder="+237 6XX XX XX XX"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-email">
                  {T.emailLabel}
                  <span className="ml-1 text-muted-foreground font-normal">({T.optional})</span>
                </Label>
                <Input
                  id="emp-email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{T.colorLabel}</Label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      form.color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{T.activeLabel}</p>
                <p className="text-xs text-muted-foreground">{T.activeToggleHint}</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editingId ? t.common.save : T.addEmployee}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note limites de plan */}
      <p className="text-center text-xs text-muted-foreground">{T.planLimits}</p>
    </div>
  );
}
