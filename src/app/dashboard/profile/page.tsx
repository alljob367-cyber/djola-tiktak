'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Loader2,
  Camera,
  Link2,
  Copy,
  Check,
  UserCircle,
  Mail,
  Phone,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Profile } from '@/types/database';

// ── Zod schema (client-side, mirrors server) ───────────────
const profileFormSchema = z.object({
  business_name: z.string().min(1, 'Le nom est requis').max(100),
  slug: z
    .string()
    .min(3, 'Le slug doit faire au moins 3 caractères')
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Format invalide. Utilisez des lettres minuscules et des tirets.'
    ),
  description: z.string().max(500),
  phone: z.string().max(20),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  currency: z.string(),
  timezone: z.string(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ── Constants ────────────────────────────────────────────────
const CURRENCIES = [
  { value: 'XAF', label: 'XAF — Franc CFA (BEAC)' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — Dollar américain' },
  { value: 'GBP', label: 'GBP — Livre sterling' },
  { value: 'GNF', label: 'GNF — Franc guinéen' },
  { value: 'FCFA', label: 'FCFA — Franc CFA (BCEAO)' },
  { value: 'CDF', label: 'CDF — Franc congolais' },
  { value: 'MAD', label: 'MAD — Dirham marocain' },
];

const TIMEZONES = [
  'Africa/Douala',
  'Africa/Libreville',
  'Africa/Malabo',
  'Africa/Bangui',
  'Africa/Brazzaville',
  'Africa/Kinshasa',
  'Africa/Lagos',
  'Africa/Abidjan',
  'Africa/Dakar',
  'Africa/Casablanca',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Europe/Paris',
  'Europe/Brussels',
  'Europe/Zurich',
  'America/New_York',
  'America/Montreal',
  'America/Los_Angeles',
];

// ── Animation ────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

// ── Component ────────────────────────────────────────────────
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [resending, setResending] = useState(false);

  // ── Check email verification ───────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setEmailVerified(user.email_confirmed_at ? true : false);
      } catch {}
    })();
  }, []);

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/verify/resend-email', { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('E-mail de vérification envoyé !');
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setResending(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      business_name: '',
      slug: '',
      description: '',
      phone: '',
      email: '',
      currency: 'XAF',
      timezone: 'Africa/Malabo',
    },
  });

  const slug = watch('slug');

  // ── Fetch profile ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profiles');
        if (!res.ok) throw new Error('Erreur réseau');
        const json = await res.json();
        const p: Profile = json.data;
        setProfile(p);
        setValue('business_name', p.business_name);
        setValue('slug', p.slug || '');
        setValue('description', p.description);
        setValue('phone', p.phone);
        setValue('email', p.email);
        setValue('currency', p.currency);
        setValue('timezone', p.timezone);
      } catch {
        toast.error('Impossible de charger le profil');
      } finally {
        setLoading(false);
      }
    })();
  }, [setValue]);

  // ── Slug availability check ────────────────────────────
  useEffect(() => {
    if (!slug || slug.length < 3 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setSlugAvailable(null);
      return;
    }
    if (profile?.slug === slug) {
      setSlugAvailable(true);
      return;
    }

    const timer = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const res = await fetch(`/api/profiles/${slug}`);
        // 404 means available, 200 means taken
        setSlugAvailable(!res.ok);
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug, profile?.slug]);

  // ── Copy link ──────────────────────────────────────────
  const handleCopy = async () => {
    const link = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  // ── Auto-generate slug from business name ──────────────
  const handleNameBlur = (name: string) => {
    if (!profile?.slug) {
      const generated = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
      setValue('slug', generated);
    }
  };

  // ── Submit ─────────────────────────────────────────────
  const onSubmit = async (data: ProfileFormValues) => {
    if (slugAvailable === false) {
      toast.error('Ce slug est déjà utilisé');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      toast.success('Profil mis à jour');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-lg lg:col-span-1" />
          <Skeleton className="h-72 rounded-lg lg:col-span-2" />
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personnalisez la page publique de votre entreprise
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: Avatar + Public Link */}
          <motion.div variants={itemVariants} className="space-y-6">
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                {/* Avatar upload area */}
                <div className="relative group mb-4">
                  <Avatar className="h-24 w-24">
                    {profile?.avatar_url && (
                      <AvatarImage
                        src={profile.avatar_url}
                        alt={profile?.business_name}
                      />
                    )}
                    <AvatarFallback className="text-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {(profile?.business_name || 'U')
                        .split(' ')
                        .map((w) => w[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Changer la photo"
                  >
                    <Camera size={24} className="text-white" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cliquez pour changer la photo
                </p>
              </CardContent>
            </Card>

            {/* Public link */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Link2 size={14} className="text-emerald-600" />
                  Lien public
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground truncate">
                    {slug ? `${window.location.origin}/${slug}` : '...'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    disabled={!slug}
                    className="shrink-0 h-9 w-9"
                  >
                    {copied ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Partagez ce lien avec vos clients pour recevoir des réservations.
                </p>
              </CardContent>
            </Card>

            {/* Verification Status Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Vérification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Email verification */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">E-mail</span>
                  </div>
                  {emailVerified === true ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                      <Check size={12} /> Vérifié
                    </span>
                  ) : emailVerified === false ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resending}
                      className="h-7 text-xs gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800"
                    >
                      {resending ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                      Non vérifié
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">…</span>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">Téléphone</span>
                  </div>
                  {profile?.phone ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                      <Check size={12} /> Renseigné
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">Non renseigné</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right column: Form fields */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="biz-name">Nom de l'entreprise *</Label>
                  <Input
                    id="biz-name"
                    placeholder="Ex : Salon Beauté Divine"
                    {...register('business_name', {
                      onBlur: (e) => handleNameBlur(e.target.value),
                    })}
                  />
                  {errors.business_name && (
                    <p className="text-xs text-red-500">{errors.business_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug" className="flex items-center gap-2">
                    Slug
                    {slugChecking && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
                    {slugAvailable === true && (
                      <span className="text-xs text-emerald-600 font-normal">Disponible</span>
                    )}
                    {slugAvailable === false && (
                      <span className="text-xs text-red-500 font-normal">Déjà utilisé</span>
                    )}
                  </Label>
                  <div className="flex items-center">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                      {window.location.origin}/
                    </span>
                    <Input
                      id="slug"
                      className="rounded-l-none"
                      placeholder="mon-entreprise"
                      {...register('slug')}
                    />
                  </div>
                  {errors.slug && (
                    <p className="text-xs text-red-500">{errors.slug.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Lettres minuscules et tirets uniquement. Modifiez-le uniquement si nécessaire.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    placeholder="Décrivez votre activité en quelques phrases..."
                    rows={3}
                    {...register('description')}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {(watch('description') || '').length}/500
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      placeholder="+237 6XX XXX XXX"
                      {...register('phone')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pemail">Email professionnel</Label>
                    <Input
                      id="pemail"
                      type="email"
                      placeholder="contact@exemple.com"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Select
                      value={watch('currency')}
                      onValueChange={(v) => setValue('currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fuseau horaire</Label>
                    <Select
                      value={watch('timezone')}
                      onValueChange={(v) => setValue('timezone', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={saving || slugAvailable === false}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
                  >
                    {saving ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Save size={16} className="mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </form>
    </motion.div>
  );
}
