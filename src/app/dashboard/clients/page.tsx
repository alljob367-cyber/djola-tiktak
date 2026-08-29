'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Phone,
  Mail,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Client } from '@/types/database';
import { useI18n } from '@/i18n/provider';

// ── Types ──────────────────────────────────────────────────────
interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const emptyForm: ClientFormData = {
  name: '',
  phone: '',
  email: '',
  notes: '',
};

// ── Animation variants ─────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// ── Helpers ────────────────────────────────────────────────────
function formatDateLocal(iso: string, intl: string): string {
  return new Date(iso).toLocaleDateString(intl, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Component ──────────────────────────────────────────────────
export default function ClientsPage() {
  const { t, intl } = useI18n();
  const C = t.dashboard.clients;
  const [clients, setClients] = useState<Client[]>([]);
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Debounced search ────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // ── Fetch clients ──────────────────────────────────────
  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const qs = params.toString();
      const res = await fetch(`/api/clients${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Erreur réseau');
      const json = await res.json();
      setClients(json.data ?? []);
    } catch {
      toast.error(C.loadError);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // ── Fetch appointment counts (optimized: server-side aggregation) ───────────────────────────
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/appointments?_count_by=client');
      if (!res.ok) return;
      const json = await res.json();
      if (json.counts) {
        setAppointmentCounts(json.counts);
        return;
      }
      // Fallback: count from full list
      const apts = json.data ?? [];
      const counts: Record<string, number> = {};
      for (const a of apts) {
        counts[a.client_id] = (counts[a.client_id] || 0) + 1;
      }
      setAppointmentCounts(counts);
    } catch {
      // silent — counts are secondary info
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // ── Open dialog helpers ─────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
    });
    setDialogOpen(true);
  };

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error(C.nameRequired);
      return;
    }
    if (!form.phone.trim()) {
      toast.error(C.phoneRequired);
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error(C.emailInvalid);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
      };

      const url = editingId ? `/api/clients/${editingId}` : '/api/clients';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      toast.success(editingId ? C.updated : C.created);
      setDialogOpen(false);
      fetchClients();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : C.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }
      toast.success(C.deleted);
      fetchClients();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : C.deleteError);
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
          <h1 className="text-2xl font-bold tracking-tight">{C.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {C.subtitle(clients.length)}
          </p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus size={16} className="mr-2" />
          {C.add}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={C.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-emerald-50 p-4 mb-4 dark:bg-emerald-950/30">
              <Users size={32} className="text-emerald-500" />
            </div>
            <h3 className="font-semibold text-lg">{C.emptyTitle}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {search
                ? C.emptySearch
                : C.emptyDesc}
            </p>
            {!search && (
              <Button
                onClick={openCreate}
                variant="outline"
                className="mt-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              >
                <Plus size={16} className="mr-2" />
                {C.add}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{C.tableName}</TableHead>
                      <TableHead>{C.tablePhone}</TableHead>
                      <TableHead>{C.tableEmail}</TableHead>
                      <TableHead>{C.tableAppointments}</TableHead>
                      <TableHead>{C.tableRegistered}</TableHead>
                      <TableHead className="text-right">{C.tableActions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {clients.map((c, i) => (
                        <motion.tr
                          key={c.id}
                          custom={i}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone size={13} />
                              {c.phone}
                            </span>
                          </TableCell>
                          <TableCell>
                            {c.email ? (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Mail size={13} />
                                {c.email}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <CalendarDays size={12} className="mr-1" />
                              {appointmentCounts[c.id] ?? 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateLocal(c.created_at, intl)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(c)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil size={15} />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                  >
                                    <Trash2 size={15} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{C.deleteTitle}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {C.deleteDesc.replace('Le client et', `Le client « ${c.name} » et`).replace('The client and', `The client "${c.name}" and`).replace('El cliente y', `El cliente « ${c.name} » y`)}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(c.id)}
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
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            <AnimatePresence>
              {clients.map((c, i) => (
                <motion.div
                  key={c.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{c.name}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone size={13} />
                              {c.phone}
                            </span>
                            {c.email && (
                              <span className="flex items-center gap-1 truncate max-w-[160px]">
                                <Mail size={13} />
                                {c.email}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <CalendarDays size={12} className="mr-1" />
                              {appointmentCounts[c.id] ?? 0} {C.tableAppointments}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {C.registeredOn(formatDateLocal(c.created_at, intl))}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(c)}
                            className="h-8 w-8"
                          >
                            <Pencil size={15} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 size={15} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{C.deleteTitle}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {C.deleteDesc.replace('et toutes ses données seront supprimés', 'sera définitivement supprimé').replace('and all their data will be deleted', 'will be permanently deleted').replace('y todos sus datos se eliminarán', 'se eliminará definitivamente').replace('Le client et', `Le client « ${c.name} » et`).replace('The client and', `The client "${c.name}" and`).replace('El cliente y', `El cliente « ${c.name} » y`)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(c.id)}
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
        </>
      )}

      {/* ── Client Dialog ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? C.editTitle : C.createTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cl-name">{C.nameLabel}</Label>
              <Input
                id="cl-name"
                placeholder={C.namePlaceholder}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-phone">{C.phoneLabel}</Label>
              <Input
                id="cl-phone"
                placeholder={C.phonePlaceholder}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-email">{C.emailLabel}</Label>
              <Input
                id="cl-email"
                type="email"
                placeholder={C.emailPlaceholder}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-notes">{C.notesLabel}</Label>
              <Textarea
                id="cl-notes"
                placeholder={C.notesPlaceholder}
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editingId ? C.save : C.addBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
