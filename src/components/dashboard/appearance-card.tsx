'use client';

// ============================================================
// Apparence de la page publique — bannière + thème de couleurs
// Sauvegarde immédiate (comme la photo de profil)
// ============================================================

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  Loader2,
  Trash2,
  Palette,
  Check,
  Upload,
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
import { PUBLIC_THEMES, heroGradient, getPublicTheme } from '@/lib/themes';

interface AppearanceCardProps {
  bannerUrl: string | null;
  theme: string | null;
  onBannerChange: (url: string | null) => void;
  onThemeChange: (key: string) => void;
}

export default function AppearanceCard({
  bannerUrl,
  theme,
  onBannerChange,
  onThemeChange,
}: AppearanceCardProps) {
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingTheme, setSavingTheme] = useState<string | null>(null);
  const [removingBanner, setRemovingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTheme = getPublicTheme(theme);

  // ── Upload de la bannière ──────────────────────────────
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop volumineuse (max 5 Mo)'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format non supporté (JPG, PNG, WebP)');
      return;
    }

    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'banners');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erreur upload'); }
      const { url } = await res.json();

      const profileRes = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banner_url: url }),
      });
      if (!profileRes.ok) throw new Error('Erreur mise à jour');

      onBannerChange(url);
      toast.success('Bannière mise à jour !');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploadingBanner(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Suppression de la bannière ─────────────────────────
  const handleRemoveBanner = async () => {
    setRemovingBanner(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banner_url: '' }),
      });
      if (!res.ok) throw new Error();
      onBannerChange(null);
      toast.success('Bannière supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setRemovingBanner(false);
    }
  };

  // ── Choix du thème ─────────────────────────────────────
  const handleThemeSelect = async (key: string) => {
    if (key === currentTheme.key) return;
    setSavingTheme(key);
    try {
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: key }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erreur serveur'); }
      onThemeChange(key);
      toast.success('Thème appliqué !');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de thème');
    } finally {
      setSavingTheme(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Palette size={16} className="text-emerald-600" />
          Apparence de la page publique
        </CardTitle>
        <CardDescription>
          Bannière et couleurs de votre page /{bannerUrl ? '' : '...'}— sauvegarde immédiate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bannière */}
        <div className="space-y-2.5">
          <p className="text-sm font-medium">Bannière (image de couverture)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleBannerChange}
          />
          <div className="group relative aspect-[16/6] overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
            {bannerUrl ? (
              <>
                <img
                  src={bannerUrl}
                  alt="Bannière de la page publique"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={uploadingBanner}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingBanner ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Upload size={14} className="mr-1.5" />}
                    Changer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={removingBanner}
                    onClick={handleRemoveBanner}
                  >
                    {removingBanner ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Trash2 size={14} className="mr-1.5" />}
                    Supprimer
                  </Button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingBanner}
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:bg-muted/60"
              >
                {uploadingBanner ? (
                  <Loader2 size={22} className="animate-spin text-emerald-600" />
                ) : (
                  <ImageIcon size={22} className="text-emerald-600" />
                )}
                <span className="text-sm font-medium">
                  {uploadingBanner ? 'Envoi en cours…' : 'Cliquez pour ajouter une bannière'}
                </span>
                <span className="text-xs">JPG, PNG ou WebP — max 5 Mo — format paysage recommandé</span>
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            La bannière s'affiche en haut de votre page, derrière le nom de votre entreprise.
          </p>
        </div>

        {/* Thème de couleurs */}
        <div className="space-y-2.5">
          <p className="text-sm font-medium">Thème de couleurs</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PUBLIC_THEMES.map((t) => {
              const active = t.key === currentTheme.key;
              const busy = savingTheme === t.key;
              return (
                <motion.button
                  key={t.key}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleThemeSelect(t.key)}
                  disabled={busy}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500/30 dark:bg-emerald-950/30'
                      : 'border-border hover:border-emerald-300 hover:bg-muted/40'
                  }`}
                >
                  {active && (
                    <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <span
                    className="size-10 rounded-full shadow-inner"
                    style={{ background: heroGradient(t) }}
                    aria-hidden
                  />
                  <span className={`text-[11px] font-medium leading-tight text-center ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {t.label}
                  </span>
                  {busy && <Loader2 size={14} className="absolute inset-0 m-auto animate-spin text-emerald-600" />}
                </motion.button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Le thème colore l'en-tête, les boutons et les accents de votre page publique.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
