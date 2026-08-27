'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  CalendarCheck,
  Loader2,
  PackageOpen,
  Camera,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PlanLimitWarning, usePlanLimits } from '@/components/plan-gate/plan-limit-warning';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/availability/engine';
import type { Service } from '@/types/database';

// ── Types ──────────────────────────────────────────────────────
interface ServiceFormData {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
  image_url: string;
}

const emptyForm: ServiceFormData = {
  name: '',
  description: '',
  price: '',
  duration_minutes: '30',
  is_active: true,
  image_url: '',
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

// ── Component ──────────────────────────────────────────────────
export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { data: planData } = usePlanLimits();
  const servicesLimit = planData?.features.find((f) => f.key === 'max_services');
  const servicesLimitReached = servicesLimit?.reached ?? false;

  // ── Fetch services ──────────────────────────────────────
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services');
      if (!res.ok) throw new Error('Erreur réseau');
      const json = await res.json();
      setServices(json.data ?? []);
    } catch {
      toast.error('Impossible de charger les services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // ── Open dialog helpers ─────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description,
      price: String(s.price),
      duration_minutes: String(s.duration_minutes),
      is_active: s.is_active,
      image_url: s.image_url || '',
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop volumineuse (max 5 Mo)'); return; }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'service-images');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Erreur upload');
      const { url } = await res.json();
      setForm((f) => ({ ...f, image_url: url }));
      toast.success('Image ajoutée');
    } catch {
      toast.error('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // ── Submit (create / update) ────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom du service est requis');
      return;
    }
    const price = Number(form.price);
    if (isNaN(price) || price < 0) {
      toast.error('Le prix doit être un nombre positif');
      return;
    }
    const duration = Number(form.duration_minutes);
    if (isNaN(duration) || duration < 5) {
      toast.error('La durée minimale est de 5 minutes');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        duration_minutes: duration,
        is_active: form.is_active,
        image_url: form.image_url || null,
      };

      const url = editingId ? `/api/services/${editingId}` : '/api/services';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.code === 'PLAN_LIMIT_REACHED' || err.code === 'SUBSCRIPTION_REQUIRED') {
          toast.error(err.error, { action: { label: 'Voir les plans', onClick: () => window.location.href = err.upgradeUrl || '/dashboard/billing' } });
          setDialogOpen(false);
          return;
        }
        throw new Error(err.error || 'Erreur serveur');
      }

      toast.success(editingId ? 'Service mis à jour' : 'Service créé');
      setDialogOpen(false);
      fetchServices();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        if (err.code === 'HAS_ACTIVE_APPOINTMENTS') {
          toast.error(err.error, { duration: 5000 });
          return;
        }
        throw new Error(err.error || 'Erreur serveur');
      }
      toast.success('Service supprimé');
      fetchServices();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
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
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos services et tarifs
            {servicesLimit && !servicesLimit.unlimited && (
              <span className="ml-2">
                ({servicesLimit.current}/{servicesLimit.limit === -1 ? '∞' : servicesLimit.limit})
              </span>
            )}
          </p>
        </div>
        <Button onClick={openCreate} disabled={servicesLimitReached} className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
          <Plus size={16} className="mr-2" />
          Ajouter un service
        </Button>
      </div>

      {/* Plan limit warning */}
      <PlanLimitWarning featureKey="max_services" />

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-emerald-50 p-4 mb-4 dark:bg-emerald-950/30">
              <PackageOpen size={32} className="text-emerald-500" />
            </div>
            <h3 className="font-semibold text-lg">Aucun service</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Commencez par ajouter votre premier service pour permettre à vos clients de prendre rendez-vous.
            </p>
            <Button
              onClick={openCreate}
              variant="outline"
              className="mt-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
              <Plus size={16} className="mr-2" />
              Ajouter un service
            </Button>
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
                      <TableHead>Service</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {services.map((s, i) => (
                        <motion.tr
                          key={s.id}
                          custom={i}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-emerald-50 dark:bg-emerald-950/30">
                                {s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <CalendarCheck size={16} className="text-emerald-600 dark:text-emerald-400" />}
                              </div>
                              <div>
                                <p className="font-medium">{s.name}</p>
                                {s.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                    {s.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(s.price)}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock size={14} />
                              {s.duration_minutes} min
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={s.is_active ? 'default' : 'secondary'}
                              className={
                                s.is_active
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400'
                                  : ''
                              }
                            >
                              {s.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(s)}
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
                                    <AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. Le service «&nbsp;{s.name}&nbsp;» sera définitivement supprimé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(s.id)}
                                      disabled={deleting}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
                                      Supprimer
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
              {services.map((s, i) => (
                <motion.div
                  key={s.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                            <CalendarCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{s.name}</p>
                              <Badge
                                variant={s.is_active ? 'default' : 'secondary'}
                                className={
                                  s.is_active
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0'
                                    : 'shrink-0'
                                }
                              >
                                {s.is_active ? 'Actif' : 'Inactif'}
                              </Badge>
                            </div>
                            {s.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {s.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-sm">
                              <span className="font-medium text-foreground">
                                {formatCurrency(s.price)}
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock size={13} />
                                {s.duration_minutes} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(s)}
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
                                <AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Le service «&nbsp;{s.name}&nbsp;» sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(s.id)}
                                  disabled={deleting}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
                                  Supprimer
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

      {/* ── Service Dialog ────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier le service' : 'Nouveau service'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Nom du service *</Label>
              <Input
                id="svc-name"
                placeholder="Ex : Consultation de 30 min"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Image du service</Label>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
              {form.image_url ? (
                <div className="relative h-32 w-full rounded-lg overflow-hidden border bg-muted">
                  <img src={form.image_url} alt="Service" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, image_url: '' }))} className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
                  className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                  {uploadingImage ? <Loader2 size={20} className="animate-spin text-muted-foreground" /> : <Camera size={20} className="text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground">{uploadingImage ? 'Envoi en cours...' : 'Ajouter une photo'}</span>
                </button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-desc">Description</Label>
              <Textarea
                id="svc-desc"
                placeholder="Description courte du service..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="svc-price">Prix *</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-dur">Durée (min) *</Label>
                <Input
                  id="svc-dur"
                  type="number"
                  min="5"
                  max="480"
                  placeholder="30"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Service actif</p>
                <p className="text-xs text-muted-foreground">
                  Visible pour les clients
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editingId ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
