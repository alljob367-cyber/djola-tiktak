'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  ChevronLeft,
  Check,
  Share2,
  ArrowLeft,
  CalendarDays,
  User,
  CreditCard,
  Sparkles,
  AlertCircle,
  Wallet,
  Star,
  Zap,
  Copy,
  CheckCheck,
  Ticket,
  X,
} from 'lucide-react';
import {
  formatCurrency,
  DAY_NAMES_SHORT_FR,
  MONTH_NAMES_FR,
} from '@/lib/availability/engine';
import { computeDiscount } from '@/lib/promo';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
}

interface Profile {
  id: string;
  business_name: string;
  slug: string;
  phone: string;
  avatar_url: string;
  currency: string;
  timezone?: string;
  payment_methods_enabled?: boolean;
  orange_money_phone?: string;
  orange_money_name?: string;
  mtn_momo_phone?: string;
  mtn_momo_name?: string;
  payment_instructions?: string;
}

interface Slot {
  starts_at: string;
  ends_at: string;
}

interface BookingPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; promo?: string }>;
}

interface AppliedPromo {
  code: string;
  type: 'promo' | 'welcome' | 'referral';
  discount_type: 'percent' | 'fixed';
  value: number;
}

// ------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------

const clientInfoSchema = z.object({
  client_name: z.string().min(1, 'Le nom est requis'),
  client_phone: z.string().min(1, 'Le téléphone est requis'),
  client_email: z.string().email('Email invalide').optional().or(z.literal('')),
});

type ClientInfo = z.infer<typeof clientInfoSchema>;

// ------------------------------------------------------------------
// Steps definition — payment step is conditional
// ------------------------------------------------------------------

const BASE_STEPS = [
  { id: 'service', label: 'Service', icon: Sparkles },
  { id: 'date', label: 'Date', icon: CalendarDays },
  { id: 'time', label: 'Horaire', icon: Clock },
  { id: 'info', label: 'Coordonnées', icon: User },
  { id: 'payment', label: 'Paiement', icon: Wallet },
  { id: 'confirm', label: 'Confirmer', icon: Check },
] as const;

const STEPS_NO_PAYMENT = [
  { id: 'service', label: 'Service', icon: Sparkles },
  { id: 'date', label: 'Date', icon: CalendarDays },
  { id: 'time', label: 'Horaire', icon: Clock },
  { id: 'info', label: 'Coordonnées', icon: User },
  { id: 'confirm', label: 'Confirmer', icon: Check },
] as const;

type StepId = 'service' | 'date' | 'time' | 'info' | 'payment' | 'confirm';

// ------------------------------------------------------------------
// Animation helpers
// ------------------------------------------------------------------

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
  }),
};

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export default function BookingPage({ params, searchParams }: BookingPageProps) {
  const { slug } = use(params);
  const sp = use(searchParams);
  const router = useRouter();

  // ---- data state ----
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- step state ----
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // ---- selections ----
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    client_name: '',
    client_phone: '',
    client_email: '',
  });
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<keyof ClientInfo, string>>
  >({});

  // ---- payment state ----
  const [wantsAdvancePayment, setWantsAdvancePayment] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState('');

  // ---- async states ----
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);

  // ---- promo state ----
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState('');

  // ---- Dynamic steps based on payment methods availability ----
  const hasPaymentMethods = profile?.payment_methods_enabled && (profile.orange_money_phone || profile.mtn_momo_phone);
  const STEPS = hasPaymentMethods ? BASE_STEPS : STEPS_NO_PAYMENT;

  // ---- Promo : remise appliquée sur le prix du service ----
  const discountAmount = useMemo(
    () => (appliedPromo && selectedService ? computeDiscount(selectedService.price, appliedPromo) : 0),
    [appliedPromo, selectedService],
  );
  const finalPrice = selectedService ? Math.max(0, selectedService.price - discountAmount) : 0;

  const applyPromo = useCallback(
    async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        setAppliedPromo(null);
        setPromoError('');
        return;
      }
      setPromoChecking(true);
      setPromoError('');
      try {
        const res = await fetch('/api/promo/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, code: trimmed }),
        });
        const json = await res.json().catch(() => ({}));
        if (json?.valid && json.promo) {
          setAppliedPromo(json.promo as AppliedPromo);
        } else {
          setAppliedPromo(null);
          setPromoError(json?.message || 'Code invalide, expiré ou épuisé');
        }
      } catch {
        setPromoError('Erreur réseau, réessayez');
      } finally {
        setPromoChecking(false);
      }
    },
    [slug],
  );

  // Pré-remplissage depuis un lien de partage ?promo=CODE
  useEffect(() => {
    if (sp.promo) {
      setPromoInput(sp.promo.toUpperCase());
      applyPromo(sp.promo);
    }
  }, [sp.promo, applyPromo]);

  // ---- Fetch profile & services ----
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/profiles/${slug}?slug=${slug}`);
        if (!res.ok) {
          router.push(`/${slug}`);
          return;
        }
        const json = await res.json();
        const data = json.data;
        setProfile({
          id: data.id,
          business_name: data.business_name,
          slug: data.slug,
          phone: data.phone,
          avatar_url: data.avatar_url,
          currency: data.currency,
          timezone: data.timezone,
          payment_methods_enabled: data.payment_methods_enabled,
          orange_money_phone: data.orange_money_phone,
          orange_money_name: data.orange_money_name,
          mtn_momo_phone: data.mtn_momo_phone,
          mtn_momo_name: data.mtn_momo_name,
          payment_instructions: data.payment_instructions,
        });
        const svc: Service[] = (data.services || []).map(
          (s: Record<string, unknown>) => ({
            id: s.id as string,
            name: s.name as string,
            description: (s.description as string) || '',
            price: s.price as number,
            duration_minutes: s.duration_minutes as number,
          })
        );
        setServices(svc);

        // Pre-select service if in URL
        if (sp.service) {
          const found = svc.find((s) => s.id === sp.service);
          if (found) {
            setSelectedService(found);
            setCurrentStep(1);
          }
        }
      } catch {
        toast.error('Impossible de charger les informations');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
    }, [slug]);

  // ---- Next 14 days ----
  const next14Days = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  // ---- Fetch slots when date is selected ----
  const fetchSlots = useCallback(
    async (date: Date) => {
      if (!selectedService) return;
      setSlotsLoading(true);
      setSlots([]);
      setSelectedSlot(null);
      try {
        // Date locale du visiteur (YYYY-MM-DD) — pas toISOString()
        // qui décale le jour pour les fuseaux positifs (UTC+1...)
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const res = await fetch(
          `/api/bookings/availability?slug=${slug}&service_id=${selectedService.id}&date=${dateStr}`
        );
        if (!res.ok) {
          toast.error('Erreur lors du chargement des créneaux');
          return;
        }
        const json = await res.json();
        const data = json.data;
        setSlots(Array.isArray(data) ? data : data?.slots || []);
      } catch {
        toast.error('Erreur réseau');
      } finally {
        setSlotsLoading(false);
      }
    },
    [slug, selectedService]
  );

  // ---- Navigation helpers ----
  const goNext = () => {
    setDirection(1);
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const canGoNext = (): boolean => {
    const stepId = STEPS[currentStep]?.id;
    switch (stepId) {
      case 'service':
        return selectedService !== null;
      case 'date':
        return selectedDate !== null;
      case 'time':
        return selectedSlot !== null;
      case 'info': {
        const result = clientInfoSchema.safeParse(clientInfo);
        return result.success;
      }
      case 'payment':
        return true; // Payment is optional
      case 'confirm':
        return false;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canGoNext()) return;

    // Validate info step
    if (STEPS[currentStep]?.id === 'info') {
      const result = clientInfoSchema.safeParse(clientInfo);
      if (!result.success) {
        const errors: Partial<Record<keyof ClientInfo, string>> = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof ClientInfo;
          errors[key] = issue.message;
        }
        setClientErrors(errors);
        return;
      }
      setClientErrors({});
    }

    // Fetch slots when moving from date to time
    if (STEPS[currentStep]?.id === 'date' && selectedDate) {
      fetchSlots(selectedDate);
    }

    goNext();
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          client_name: clientInfo.client_name,
          client_phone: clientInfo.client_phone,
          client_email: clientInfo.client_email || '',
          starts_at: selectedSlot.starts_at,
          prepayment: wantsAdvancePayment ? 'pending' : 'none',
          promo_code: appliedPromo?.code || '',
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Erreur lors de la réservation');
        return;
      }

      setBooked(true);
      goNext();
    } catch {
      toast.error('Erreur réseau, veuillez réessayer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rendez-vous confirmé',
          text: `Rendez-vous pour ${selectedService?.name} le ${formatDateFR(selectedDate!)} à ${formatTimeFR(selectedSlot!.starts_at)}`,
        });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(
        `Rendez-vous pour ${selectedService?.name} le ${formatDateFR(selectedDate!)} à ${formatTimeFR(selectedSlot!.starts_at)}`
      );
      toast.success('Détails copiés dans le presse-papier');
    }
  };

  const handleCopyPhone = (phone: string, label: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      setCopiedPhone(label);
      toast.success('Numéro copié !');
      setTimeout(() => setCopiedPhone(''), 2000);
    });
  };

  // ---- Formatting helpers ----
  function formatDateFR(date: Date): string {
    return `${date.getDate()} ${MONTH_NAMES_FR[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatTimeFR(iso: string): string {
    const d = new Date(iso);
    // Affichage dans le fuseau du PROFESSIONNEL — le créneau est
    // défini par son calendrier local, pas celui du visiteur.
    try {
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: profile?.timezone || 'Africa/Malabo',
      });
    } catch {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  }

  // ---- Render helpers ----

  const renderStepper = () => {
    if (booked) return null;
    return (
      <div className="mb-6 flex items-center justify-center gap-0 px-1">
        {STEPS.map((step, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          const StepIcon = step.icon;
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex size-9 items-center justify-center rounded-full border-2 transition-colors sm:size-10 ${
                    isActive
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : isDone
                        ? 'border-emerald-600 bg-emerald-100 text-emerald-700'
                        : 'border-muted-foreground/25 bg-background text-muted-foreground'
                  }`}
                >
                  {isDone ? (
                    <Check className="size-4 sm:size-5" strokeWidth={3} />
                  ) : (
                    <StepIcon className="size-3.5 sm:size-4" />
                  )}
                </div>
                <span
                  className={`mt-1 text-[9px] font-medium sm:text-[10px] ${
                    isActive ? 'text-emerald-700' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 w-4 sm:mx-1.5 sm:w-8 ${
                    i < currentStep ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Step 1: Select Service ----
  const renderServiceStep = () => (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">
        Choisissez un service
      </h2>
      {services.map((svc) => {
        const isSelected = selectedService?.id === svc.id;
        return (
          <button
            key={svc.id}
            type="button"
            onClick={() => setSelectedService(svc)}
            className={`w-full min-h-[44px] rounded-xl border-2 p-4 text-left transition-all ${
              isSelected
                ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                : 'border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/50'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  {svc.name}
                </p>
                {svc.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                    {svc.description}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5" />
                    {svc.duration_minutes} min
                  </span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(svc.price, profile?.currency)}
                  </span>
                </div>
              </div>
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-muted-foreground/30'
                }`}
              >
                {isSelected && <Check className="size-3.5" strokeWidth={3} />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  // ---- Step 2: Select Date ----
  const renderDateStep = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Choisissez une date
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        {next14Days.map((day) => {
          const dayName = DAY_NAMES_SHORT_FR[day.getDay()];
          const monthName = MONTH_NAMES_FR[day.getMonth()];
          const dayNum = day.getDate();
          const isSelected =
            selectedDate &&
            selectedDate.getDate() === day.getDate() &&
            selectedDate.getMonth() === day.getMonth();
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDateSelect(day)}
              className={`flex min-h-[68px] flex-col items-center justify-center rounded-xl border-2 px-2 py-3 transition-all ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                  : 'border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              <span
                className={`text-xs font-medium ${isSelected ? 'text-emerald-100' : 'text-muted-foreground'}`}
              >
                {dayName}
              </span>
              <span className="text-xl font-bold leading-tight">{dayNum}</span>
              <span
                className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-muted-foreground'}`}
              >
                {monthName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ---- Step 3: Select Time ----
  const renderTimeStep = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Choisissez un créneau
      </h2>
      <p className="text-sm text-muted-foreground">
        {selectedDate && formatDateFR(selectedDate)}
      </p>
      {slotsLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 py-12 text-center">
          <AlertCircle className="size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            Aucun créneau disponible
          </p>
          <p className="text-xs text-muted-foreground/70">
            Essayez une autre date
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot, i) => {
            const isSelected = selectedSlot?.starts_at === slot.starts_at;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`min-h-[48px] rounded-xl border-2 px-3 py-2.5 text-center text-sm font-semibold transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                    : 'border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                {formatTimeFR(slot.starts_at)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ---- Step 4: Client Info ----
  const renderInfoStep = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">
        Vos coordonnées
      </h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client_name" className="text-sm">
            Nom complet <span className="text-destructive">*</span>
          </Label>
          <Input
            id="client_name"
            type="text"
            placeholder="Jean Dupont"
            value={clientInfo.client_name}
            onChange={(e) => {
              setClientInfo((prev) => ({ ...prev, client_name: e.target.value }));
              if (clientErrors.client_name) {
                setClientErrors((prev) => ({ ...prev, client_name: undefined }));
              }
            }}
            className={`min-h-[44px] ${clientErrors.client_name ? 'border-destructive' : ''}`}
            autoComplete="name"
          />
          {clientErrors.client_name && (
            <p className="text-xs text-destructive">{clientErrors.client_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_phone" className="text-sm">
            Téléphone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="client_phone"
            type="tel"
            placeholder="+237 6XX XXX XXX"
            value={clientInfo.client_phone}
            onChange={(e) => {
              setClientInfo((prev) => ({ ...prev, client_phone: e.target.value }));
              if (clientErrors.client_phone) {
                setClientErrors((prev) => ({ ...prev, client_phone: undefined }));
              }
            }}
            className={`min-h-[44px] ${clientErrors.client_phone ? 'border-destructive' : ''}`}
            autoComplete="tel"
          />
          {clientErrors.client_phone && (
            <p className="text-xs text-destructive">{clientErrors.client_phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_email" className="text-sm">
            Email <span className="text-muted-foreground">(facultatif)</span>
          </Label>
          <Input
            id="client_email"
            type="email"
            placeholder="jean@exemple.com"
            value={clientInfo.client_email}
            onChange={(e) => {
              setClientInfo((prev) => ({ ...prev, client_email: e.target.value }));
              if (clientErrors.client_email) {
                setClientErrors((prev) => ({ ...prev, client_email: undefined }));
              }
            }}
            className={`min-h-[44px] ${clientErrors.client_email ? 'border-destructive' : ''}`}
            autoComplete="email"
          />
          {clientErrors.client_email && (
            <p className="text-xs text-destructive">{clientErrors.client_email}</p>
          )}
        </div>

        {/* Code promo (facultatif) */}
        <div className="space-y-2 rounded-xl border border-dashed border-emerald-300/70 bg-emerald-50/40 p-3.5 dark:border-emerald-700/50 dark:bg-emerald-950/20">
          <Label htmlFor="promo_code" className="flex items-center gap-1.5 text-sm">
            <Ticket className="size-4 text-emerald-600" />
            Code promo{' '}
            <span className="text-muted-foreground">(facultatif)</span>
          </Label>

          {appliedPromo ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2.5 dark:border-emerald-700 dark:bg-white/5">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold tracking-wide text-emerald-700 dark:text-emerald-400">
                  {appliedPromo.code}
                </p>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {appliedPromo.discount_type === 'percent'
                    ? `Réduction de ${appliedPromo.value} % appliquée`
                    : `Réduction de ${Math.round(appliedPromo.value).toLocaleString('fr-FR')} ${profile?.currency ?? 'XAF'} appliquée`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAppliedPromo(null);
                  setPromoInput('');
                  setPromoError('');
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted"
                aria-label="Retirer le code promo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="promo_code"
                type="text"
                placeholder="Ex : BIENVENUE"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase());
                  if (promoError) setPromoError('');
                }}
                className="min-h-[44px] font-mono uppercase"
                maxLength={24}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => applyPromo(promoInput)}
                disabled={promoChecking || !promoInput.trim()}
                className="min-h-[44px] shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
              >
                {promoChecking ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-emerald-600/30 border-t-emerald-600" />
                ) : (
                  'Appliquer'
                )}
              </Button>
            </div>
          )}

          {promoError && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="size-3.5" />
              {promoError}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // ---- Step 5: Payment (conditional) ----
  const renderPaymentStep = () => {
    if (!profile || !selectedService) return null;

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Paiement anticipé
        </h2>
        <p className="text-sm text-muted-foreground">
          Payez en avance pour confirmer votre réservation en priorité
        </p>

        {/* Priority banner */}
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/20">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <Zap className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Réservation prioritaire
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                En payant en avance, votre créneau sera garanti et prioritaire.
                Envoyez le montant et confirmez votre réservation.
              </p>
            </div>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Wallet className="size-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Je paie en avance</p>
              <p className="text-xs text-muted-foreground">
                {discountAmount > 0 ? (
                  <>
                    <span className="mr-1 line-through opacity-60">
                      {formatCurrency(selectedService.price, profile.currency)}
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(finalPrice, profile.currency)}
                    </span>
                  </>
                ) : (
                  formatCurrency(selectedService.price, profile.currency)
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWantsAdvancePayment(!wantsAdvancePayment)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              wantsAdvancePayment ? 'bg-emerald-600' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform ${
                wantsAdvancePayment ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Payment details when enabled */}
        {wantsAdvancePayment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <p className="text-sm font-medium text-foreground">
              Envoyez {formatCurrency(finalPrice, profile.currency)} à :
            </p>

            {profile.orange_money_phone && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">OM</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Orange Money</p>
                      <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{profile.orange_money_phone}</p>
                      {profile.orange_money_name && (
                        <p className="text-xs text-muted-foreground">{profile.orange_money_name}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(profile.orange_money_phone!, 'om')}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-orange-200 bg-white transition-colors hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/40"
                  >
                    {copiedPhone === 'om' ? (
                      <CheckCheck className="size-4 text-emerald-600" />
                    ) : (
                      <Copy className="size-4 text-orange-600" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {profile.mtn_momo_phone && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/40 dark:bg-yellow-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
                      <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">MTN</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">MTN Mobile Money</p>
                      <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{profile.mtn_momo_phone}</p>
                      {profile.mtn_momo_name && (
                        <p className="text-xs text-muted-foreground">{profile.mtn_momo_name}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(profile.mtn_momo_phone!, 'mtn')}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-yellow-200 bg-white transition-colors hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/40"
                  >
                    {copiedPhone === 'mtn' ? (
                      <CheckCheck className="size-4 text-emerald-600" />
                    ) : (
                      <Copy className="size-4 text-yellow-600" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {profile.payment_instructions && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    {profile.payment_instructions}
                  </p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
              <Star className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Après le transfert, confirmez votre réservation ci-dessous. Votre paiement sera vérifié par le professionnel.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // ---- Step: Confirmation ----
  const renderConfirmStep = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">
        Confirmez votre rendez-vous
      </h2>
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Service</p>
              <p className="font-semibold text-foreground">{selectedService?.name}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Date</p>
              <p className="font-semibold text-foreground">
                {selectedDate && formatDateFR(selectedDate)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Horaire</p>
              <p className="font-semibold text-foreground">
                {selectedSlot && formatTimeFR(selectedSlot.starts_at)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Tarif</p>
              {discountAmount > 0 && selectedService ? (
                <>
                  <p className="text-sm text-muted-foreground line-through">
                    {formatCurrency(selectedService.price, profile?.currency)}
                  </p>
                  <p className="font-bold text-emerald-700">
                    {formatCurrency(finalPrice, profile?.currency)}
                  </p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Code {appliedPromo?.code} : −{formatCurrency(discountAmount, profile?.currency)}
                  </p>
                </>
              ) : (
                <p className="font-bold text-emerald-700">
                  {selectedService &&
                    formatCurrency(selectedService.price, profile?.currency)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Client</p>
              <p className="font-semibold text-foreground">{clientInfo.client_name}</p>
              <p className="text-sm text-muted-foreground">{clientInfo.client_phone}</p>
            </div>
          </div>
          {wantsAdvancePayment && (
            <div className="flex items-start gap-3">
              <Star className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Paiement</p>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Paiement anticipé — Prioritaire
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  N'oubliez pas d'envoyer le montant via {profile?.orange_money_phone ? 'Orange Money' : ''}{profile?.orange_money_phone && profile?.mtn_momo_phone ? ' ou ' : ''}{profile?.mtn_momo_phone ? 'MTN MoMo' : ''}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Button
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full min-h-[48px] bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
        size="lg"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Réservation en cours…
          </span>
        ) : (
          'Confirmer le rendez-vous'
        )}
      </Button>
    </div>
  );

  // ---- Success Screen ----
  const renderSuccess = () => (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.2,
        }}
        className="flex size-20 items-center justify-center rounded-full bg-emerald-100"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15,
            delay: 0.4,
          }}
        >
          <Check className="size-10 text-emerald-600" strokeWidth={3} />
        </motion.div>
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Rendez-vous confirmé !
        </h2>
        <p className="text-sm text-muted-foreground">
          Vous recevrez un rappel avant votre rendez-vous.
        </p>
        {wantsAdvancePayment && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            <Star className="size-3" />
            Réservation prioritaire — Pensez à envoyer le paiement
          </div>
        )}
      </div>

      <Card className="w-full border-emerald-200 bg-emerald-50/50">
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Service</p>
            <p className="font-semibold text-foreground">{selectedService?.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Date & heure</p>
            <p className="font-semibold text-foreground">
              {selectedDate && formatDateFR(selectedDate)} à{' '}
              {selectedSlot && formatTimeFR(selectedSlot.starts_at)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Professionnel</p>
            <p className="font-semibold text-foreground">{profile?.business_name}</p>
          </div>
          {appliedPromo && discountAmount > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Réduction appliquée</p>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                −{formatCurrency(discountAmount, profile?.currency)} (code {appliedPromo.code})
              </p>
              {selectedService && (
                <p className="text-xs text-muted-foreground">
                  Prix final : {formatCurrency(finalPrice, profile?.currency)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex w-full gap-3">
        <Button
          onClick={handleShare}
          variant="outline"
          className="min-h-[48px] flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          size="lg"
        >
          <Share2 className="size-4" />
          Partager
        </Button>
        <Button
          onClick={() => router.push(`/${slug}`)}
          className="min-h-[48px] flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          size="lg"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Button>
      </div>
    </motion.div>
  );

  // ---- Service summary bar ----
  const renderServiceSummary = () => {
    if (!selectedService || booked) return null;
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-emerald-800">
              {selectedService.name}
            </p>
            <p className="text-xs text-emerald-600">
              <Clock className="mr-1 inline-block size-3" />
              {selectedService.duration_minutes} min ·{' '}
              {discountAmount > 0 ? (
                <>
                  <span className="line-through opacity-60">
                    {formatCurrency(selectedService.price, profile?.currency)}
                  </span>{' '}
                  <span className="font-semibold">
                    {formatCurrency(finalPrice, profile?.currency)}
                  </span>
                </>
              ) : (
                formatCurrency(selectedService.price, profile?.currency)
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ---- Step content dispatcher ----
  const renderStepContent = () => {
    const stepId = STEPS[currentStep]?.id;
    switch (stepId) {
      case 'service':
        return renderServiceStep();
      case 'date':
        return renderDateStep();
      case 'time':
        return renderTimeStep();
      case 'info':
        return renderInfoStep();
      case 'payment':
        return renderPaymentStep();
      case 'confirm':
        return renderConfirmStep();
      default:
        return null;
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
          <Skeleton className="h-8 w-24" />
          <div className="mt-6 flex justify-center gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-10 rounded-full" />
            ))}
          </div>
          <div className="mt-8 space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
        {/* Back link / header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${slug}`)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-accent"
            aria-label="Retour"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">
            Réserver un rendez-vous
          </h1>
        </div>

        {/* Stepper */}
        {renderStepper()}

        {/* Service summary bar */}
        {renderServiceSummary()}

        {/* Step content with animation */}
        {booked ? (
          renderSuccess()
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Navigation buttons */}
        {!booked && (
          <div className="mt-8 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 0}
              className="min-h-[48px] min-w-[48px]"
              size="lg"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext()}
              className="min-h-[48px] flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              size="lg"
            >
              {currentStep === STEPS.length - 1
                ? 'Confirmer'
                : 'Continuer'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
