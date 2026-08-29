'use client';

// ============================================================
// Marketing — bandeau d'annonce + codes promo
// (réductions, offres de bienvenue, invitations)
// ============================================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Loader2,
  Plus,
  Ticket,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Gift,
  Users,
  Percent,
  Share2,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { PromoCode } from '@/types/database';
import {
  PROMO_TYPE_LABELS,
  promoDiscountLabel,
  generatePromoCode,
  type PromoType,
} from '@/lib/promo';

interface PromoManagerProps {
  slug: string | null;
  currency: string;
  initialAnnouncement: { enabled: boolean; text: string } | null;
}

type DiscountType = 'percent' | 'fixed';

const TYPE_ICONS: Record<PromoType, React.ReactNode> = {
  promo: <Percent size={13} />,
  welcome: <Gift size={13} />,
  referral: <Users size={13} />,
};

export default function PromoManager({ slug, currency, initialAnnouncement }: PromoManagerProps) {
  // ── Annonce ──────────────────────────────────────────
  const [annEnabled, setAnnEnabled] = useState(initialAnnouncement?.enabled ?? false);
  const [annText, setAnnText] = useState(initialAnnouncement?.text ?? '');
  const [annSaving, setAnnSaving] = useState(false);

  // ── Codes promo ──────────────────────────────────────
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Formulaire de création
  const [form, setForm] = useState({
    code: '',
    type: 'promo' as PromoType,
    discount_type: 'percent' as DiscountType,
    value: '10',
    max_uses: '',
    valid_until: '',
    show_on_page: false,
  });

  // ── Chargement des codes ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/promo-codes');
        if (!res.ok) throw new Error();
        const json = await res.json();
        setCodes(json.data || []);
      } catch {
        toast.error('Impossible de charger les codes promo');
      } finally {
        setLoadingCodes(false);
      }
    })();
  }, []);

  // ── Sauvegarde de l'annonce ──────────────────────────
  const saveAnnouncement = async () => {
    if (annEnabled && !annText.trim()) {
      toast.error('Écrivez le texte de votre annonce');
      return;
    }
    setAnnSaving(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement: annEnabled ? { enabled: true, text: annText.trim() } : { enabled: false, text: annText.trim() },
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erreur'); }
      toast.success('Annonce enregistrée !');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setAnnSaving(false);
    }
  };

  // ── Création d'un code ───────────────────────────────
  const handleCreate = async () => {
    if (!form.code.trim()) { toast.error('Choisissez un code'); return; }
    const numValue = Number(form.value);
    if (!numValue || numValue <= 0) { toast.error('La valeur de la réduction doit être supérieure à 0'); return; }
    if (form.discount_type === 'percent' && numValue > 100) { toast.error('Maximum 100 %'); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim(),
          type: form.type,
          discount_type: form.discount_type,
          value: numValue,
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          valid_until: form.valid_until || null,
          show_on_page: form.show_on_page,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setCodes((prev) => [json.data, ...prev]);
      setShowForm(false);
      setForm({ code: '', type: 'promo', discount_type: 'percent', value: '10', max_uses: '', valid_until: '', show_on_page: false });
      toast.success(`Code ${json.data.code} créé !`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  // ── Mise à jour d'un code ────────────────────────────
  const patchCode = async (id: string, payload: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/promo-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setCodes((prev) => prev.map((c) => (c.id === id ? json.data : c)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setBusyId(null);
    }
  };

  const deleteCode = async (id: string, code: string) => {
    if (!window.confirm(`Supprimer le code ${code} ?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/promo-codes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCodes((prev) => prev.filter((c) => c.id !== id));
      toast.success('Code supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setBusyId(null);
    }
  };

  // ── Copie du lien de partage ─────────────────────────
  const copyShareLink = async (code: string) => {
    if (!slug) { toast.error('Définissez d\'abord votre lien public'); return; }
    const link = `${window.location.origin}/${slug}?promo=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(code);
      toast.success('Lien de partage copié !');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const isExpired = (c: PromoCode) => !!c.valid_until && c.valid_until < today;
  const isExhausted = (c: PromoCode) => c.max_uses !== null && c.used_count >= c.max_uses;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone size={16} className="text-emerald-600" />
          Marketing & promotions
        </CardTitle>
        <CardDescription>
          Attirez vos visiteurs : annonces, réductions, offres de bienvenue et invitations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ══ Bandeau d'annonce ══ */}
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Megaphone size={15} className="text-emerald-600 shrink-0" />
              <p className="text-sm font-medium">Bandeau d'annonce sur la page</p>
            </div>
            <Switch
              checked={annEnabled}
              onCheckedChange={setAnnEnabled}
              aria-label="Activer le bandeau d'annonce"
            />
          </div>
          <Input
            placeholder="Ex : 🎉 -20% sur toutes les coupes ce week-end !"
            value={annText}
            maxLength={200}
            onChange={(e) => setAnnText(e.target.value)}
            disabled={!annEnabled}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {annEnabled ? 'S\'affiche en haut de votre page publique' : 'Activez pour afficher une annonce'}
            </p>
            <Button size="sm" onClick={saveAnnouncement} disabled={annSaving} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
              {annSaving ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Check size={13} className="mr-1.5" />}
              Enregistrer
            </Button>
          </div>
        </div>

        <Separator />

        {/* ══ Codes promo ══ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Ticket size={15} className="text-emerald-600" />
              <p className="text-sm font-medium">Codes promo</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm((v) => !v)}
              className="h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
            >
              {showForm ? <RefreshCw size={13} /> : <Plus size={13} />}
              {showForm ? 'Fermer' : 'Nouveau code'}
            </Button>
          </div>

          {/* Formulaire de création */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3.5 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Code *</Label>
                      <div className="flex gap-1.5">
                        <Input
                          value={form.code}
                          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                          placeholder="BIENVENUE"
                          maxLength={24}
                          className="font-mono uppercase"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 shrink-0 px-2.5"
                          title="Générer un code"
                          onClick={() => setForm((f) => ({ ...f, code: generatePromoCode() }))}
                        >
                          <RefreshCw size={13} />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type</Label>
                      <div className="grid grid-cols-3 gap-1">
                        {(['promo', 'welcome', 'referral'] as PromoType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, type: t }))}
                            className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] font-medium transition-all ${
                              form.type === t
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'border-border text-muted-foreground hover:bg-muted/50'
                            }`}
                          >
                            {TYPE_ICONS[t]}
                            {PROMO_TYPE_LABELS[t]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Réduction *</Label>
                      <div className="flex gap-1.5">
                        <div className="grid grid-cols-2 rounded-lg border border-input overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, discount_type: 'percent' }))}
                            className={`px-3 py-2 text-xs font-medium transition-colors ${form.discount_type === 'percent' ? 'bg-emerald-600 text-white' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, discount_type: 'fixed' }))}
                            className={`px-3 py-2 text-xs font-medium transition-colors ${form.discount_type === 'fixed' ? 'bg-emerald-600 text-white' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                          >
                            {currency}
                          </button>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          value={form.value}
                          onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Limite d'utilisations</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.max_uses}
                        onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                        placeholder="Illimité"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valable jusqu'au</Label>
                      <Input
                        type="date"
                        value={form.valid_until}
                        onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Eye size={14} className="text-muted-foreground shrink-0" />
                        <p className="text-xs leading-tight">Afficher sur ma page<br /><span className="text-muted-foreground">(section Offres)</span></p>
                      </div>
                      <Switch
                        checked={form.show_on_page}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_page: v }))}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {creating ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Plus size={14} className="mr-1.5" />}
                    Créer le code promo
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Liste des codes */}
          {loadingCodes ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-emerald-600" />
            </div>
          ) : codes.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border py-7 text-center">
              <Ticket size={20} className="text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Aucun code promo pour le moment</p>
              <p className="text-xs text-muted-foreground/70">
                Créez une réduction, une offre de bienvenue ou un code d'invitation
              </p>
            </div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {codes.map((c) => {
                const dead = isExpired(c) || isExhausted(c);
                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-3 transition-opacity ${c.active && !dead ? 'border-border bg-card' : 'border-border/60 bg-muted/30 opacity-70'}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold tracking-wide text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        {c.code}
                      </code>
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        {TYPE_ICONS[c.type]}
                        {PROMO_TYPE_LABELS[c.type]}
                      </Badge>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        {promoDiscountLabel(c, currency)}
                      </span>
                      {c.show_on_page && (
                        <Badge variant="outline" className="gap-1 border-emerald-300 text-[10px] text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
                          <Eye size={10} /> Sur la page
                        </Badge>
                      )}
                      {dead && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {isExpired(c) ? 'Expiré' : 'Épuisé'}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {c.used_count} utilisation{c.used_count > 1 ? 's' : ''}
                        {c.max_uses ? ` / ${c.max_uses}` : ''}
                        {c.valid_until ? ` • jusqu'au ${new Date(c.valid_until).toLocaleDateString('fr-FR')}` : ' • sans date limite'}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyShareLink(c.code)}
                          title="Copier le lien de partage"
                          className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted"
                        >
                          {copied === c.code ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => patchCode(c.id, { active: !c.active })}
                          disabled={busyId === c.id}
                          title={c.active ? 'Désactiver' : 'Réactiver'}
                          className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          {busyId === c.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCode(c.id, c.code)}
                          disabled={busyId === c.id}
                          title="Supprimer"
                          className="flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            💡 Astuce : « Bienvenue » s'affiche comme offre d'accueil, « Invitation » sert au parrainage —
            partagez le lien avec le bouton <Share2 size={11} className="inline" /> pour pré-remplir le code chez vos clients.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
