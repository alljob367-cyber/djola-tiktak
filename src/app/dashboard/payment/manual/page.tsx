'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Phone,
  Copy,
  CheckCircle,
  ArrowLeft,
  Loader2,
  MessageCircle,
  Shield,
  Clock,
  Banknote,
  CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

// ── Types ─────────────────────────────────────────────────────

type PaymentMethod = 'orange_money' | 'mtn_momo';

type BillingPeriod = 'monthly' | 'yearly';

interface PaymentInfo {
  orange_money: { phone: string; name: string } | null;
  mtn_momo: { phone: string; name: string } | null;
  support_email: string;
  support_phone: string | null;
  payee_name: string;
}

interface ManualPayResponse {
  paymentId: string;
  status: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  billingPeriod: string;
  paymentMethod: PaymentMethod | null;
  instructions: {
    orange_money?: { phone: string; name: string };
    mtn_momo?: { phone: string; name: string };
    amount: number;
    currency: string;
    planName: string;
    billingPeriod: string;
    notes: string[];
  };
  support_email?: string;
  support_phone?: string | null;
  message?: string;
}

// ── Plans ─────────────────────────────────────────────────────

const PLANS = [
  { id: 'starter', name: 'Starter', monthly: 3000, yearly: 30000 },
  { id: 'pro',     name: 'Pro',     monthly: 10000, yearly: 100000 },
  { id: 'business',name: 'Business', monthly: 25000, yearly: 250000 },
] as const;

// ── Steps (labels via i18n) ───────────────────────────────

const STEP_NUMS = [1, 2, 3, 4];

// ── Component ─────────────────────────────────────────────────

function ManualPaymentContent() {
  const { t, intl } = useI18n();
  const M = t.dashboard.manualPay;
  const STEPS = STEP_NUMS.map((n) => ({ num: n, label: M.steps[n - 1] }));
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedPlan = searchParams.get('plan') as 'starter' | 'pro' | 'business' | null;

  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string>(preselectedPlan || 'pro');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ManualPayResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Fetch payment instructions from API (server-side env vars)
  const fetchPaymentInfo = useCallback(async () => {
    setLoadingInfo(true);
    try {
      const res = await fetch('/api/billing/manual-pay');
      if (!res.ok) throw new Error('Erreur de chargement');
      const data: PaymentInfo = await res.json();
      setPaymentInfo(data);
    } catch {
      toast.error(M.loadError);
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  // Step 1 → 2
  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setStep(2);
  };

  // Step 2 → 3
  const handleMethodSelect = async (method: PaymentMethod) => {
    setPaymentMethod(method);
    setStep(3);
    // Fetch payment info from API if not already loaded
    if (!paymentInfo) {
      await fetchPaymentInfo();
    }
  };

  // Step 3 → Submit
  const handleSubmit = async () => {
    if (!paymentMethod) return;

    setLoading(true);
    try {
      const res = await fetch('/api/billing/manual-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          billingPeriod,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || M.requestError);

      setResult(data);
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(M.copied);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(M.copyFail);
    }
  };

  const plan = PLANS.find((p) => p.id === selectedPlan);
  const amount = plan ? (billingPeriod === 'yearly' ? plan.yearly : plan.monthly) : 0;
  const formattedAmount = amount.toLocaleString(intl);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          onClick={() => router.push('/dashboard/billing')}
        >
          <ArrowLeft size={16} className="mr-1.5" />
          {M.back}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {M.title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {M.subtitle}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                step > s.num
                  ? 'bg-emerald-500 text-white'
                  : step === s.num
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {step > s.num ? <CheckCircle size={16} /> : s.num}
            </div>
            <span
              className={cn(
                'text-sm hidden sm:inline',
                step === s.num ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-px w-6 sm:w-12',
                step > s.num ? 'bg-emerald-500' : 'bg-muted',
              )} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Choose plan ──────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{M.step1Title}</CardTitle>
            <CardDescription>{M.step1Desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePlanSelect(p.id)}
                className={cn(
                  'w-full rounded-xl border-2 p-4 text-left transition-all hover:shadow-md',
                  selectedPlan === p.id
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-border hover:border-emerald-300',
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {M.perMonth(p.monthly.toLocaleString(intl))}
                    </p>
                  </div>
                  {selectedPlan === p.id && (
                    <CheckCircle size={20} className="text-emerald-500" />
                  )}
                </div>
              </button>
            ))}

            {/* Billing period toggle */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  billingPeriod === 'monthly'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {M.monthly}
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  billingPeriod === 'yearly'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {M.yearly}
                <Badge className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-xs">
                  -17%
                </Badge>
              </button>
            </div>

            <Button
              className="w-full mt-2"
              onClick={() => setStep(2)}
            >
              {M.continue}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Choose payment method ────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{M.step2Title}</CardTitle>
            <CardDescription>{M.amountLine(formattedAmount, plan?.name ?? '', billingPeriod === 'yearly' ? M.yearly : M.monthly)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Orange Money */}
            <button
              onClick={() => handleMethodSelect('orange_money')}
              className={cn(
                'w-full rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                'border-border hover:border-orange-400',
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/50">
                  <Phone size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Orange Money</h3>
                  <p className="text-sm text-muted-foreground">
                    {M.omTransfer}
                  </p>
                </div>
              </div>
            </button>

            {/* MTN Mobile Money */}
            <button
              onClick={() => handleMethodSelect('mtn_momo')}
              className={cn(
                'w-full rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                'border-border hover:border-yellow-400',
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-950/50">
                  <Phone size={24} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">MTN Mobile Money</h3>
                  <p className="text-sm text-muted-foreground">
                    {M.mtnTransfer}
                  </p>
                </div>
              </div>
            </button>

            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setStep(1)}
            >
              <ArrowLeft size={14} className="mr-1.5" />
              {M.back}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Transfer instructions ────────────────────── */}
      {step === 3 && paymentMethod && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote size={20} className="text-emerald-600" />
              {M.step3Title}
            </CardTitle>
            <CardDescription>
              {M.step3Desc.replace('le montant', `${formattedAmount} FCFA`)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingInfo ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : paymentInfo ? (
              <>
                {/* Recipient info */}
                <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-5 dark:bg-emerald-950/20 dark:border-emerald-700">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase font-medium">
                          {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN Mobile Money'}
                        </p>
                        {(() => {
                          const methodInfo = paymentMethod === 'orange_money'
                            ? paymentInfo.orange_money
                            : paymentInfo.mtn_momo;
                          return methodInfo ? (
                            <p className="text-2xl font-extrabold tracking-wider text-foreground mt-1 font-mono">
                              {methodInfo.phone}
                            </p>
                          ) : (
                            <p className="text-lg font-bold text-red-500 mt-1">
                              {M.notConfigured}
                            </p>
                          );
                        })()}
                        <p className="text-sm text-muted-foreground mt-1">
                          {M.payeeName} <span className="font-medium text-foreground">{paymentInfo.payee_name}</span>
                        </p>
                      </div>
                      {(() => {
                        const methodInfo = paymentMethod === 'orange_money'
                          ? paymentInfo.orange_money
                          : paymentInfo.mtn_momo;
                        return methodInfo ? (
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={() => copyToClipboard(methodInfo.phone, 'phone')}
                          >
                            {copiedField === 'phone' ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </Button>
                        ) : null;
                      })()}
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <CircleDot size={14} className="text-emerald-500" />
                      <span className="font-medium text-foreground">{M.exactAmount(formattedAmount)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => copyToClipboard(String(amount), 'amount')}
                      >
                        {copiedField === 'amount' ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} className="mr-1" />}
                        {M.copy}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Steps to follow */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground text-sm">{M.howTo}</h4>
                  <ol className="space-y-2">
                    {M.howToSteps(paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN MoMo', formattedAmount).map((text, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{text}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Contact info */}
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 dark:bg-blue-950/30 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <MessageCircle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-300">
                        {M.sendScreenshot}
                      </p>
                      <p className="text-blue-700/80 dark:text-blue-400 mt-1">
                        {paymentInfo.support_phone ? (
                          <>
                            {M.whatsapp} : <span className="font-mono font-bold">{paymentInfo.support_phone}</span>
                            {' — '}
                          </>
                        ) : null}
                        {M.email} : <span className="font-mono font-bold">{paymentInfo.support_email}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/30">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {M.loadError}
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={fetchPaymentInfo}
                >
                  {M.retry}
                </Button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft size={14} className="mr-1.5" />
                {M.back}
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSubmit}
                disabled={loading || !paymentInfo?.[paymentMethod]}
              >
                {loading && <Loader2 size={16} className="mr-1.5 animate-spin" />}
                {M.transferDone}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Confirmation ─────────────────────────────── */}
      {step === 4 && result && (
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
              <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground">
                {M.successTitle}
              </h2>
              <p className="text-muted-foreground mt-2">
                {M.successDesc}
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-xl border bg-muted/30 p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{M.plan}</span>
                <span className="font-medium">{result.planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{M.amount}</span>
                <span className="font-bold">{result.amount.toLocaleString(intl)} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{M.period}</span>
                <span className="font-medium">{result.billingPeriod === 'yearly' ? M.yearly : M.monthly}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{M.reference}</span>
                <span className="font-mono text-xs">{result.paymentId.slice(0, 8)}...</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {M.nextSteps}
                </p>
              </div>
              <ol className="space-y-2 text-sm text-amber-700 dark:text-amber-400">
                <li className="flex items-start gap-2">
                  <Shield size={14} className="shrink-0 mt-0.5" />
                  <span>{M.nextStep1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={14} className="shrink-0 mt-0.5" />
                  <span>{M.nextStep2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={14} className="shrink-0 mt-0.5" />
                  <span>{M.nextStep3}</span>
                </li>
              </ol>
              {/* Support contact in confirmation */}
              <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-700">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {M.contact}{' '}
                  {result.support_phone && <span className="font-mono font-bold">WhatsApp {result.support_phone}</span>}
                  {result.support_phone && ' — '}
                  <span className="font-mono font-bold">{result.support_email || 'support@djola-tiktak.com'}</span>
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => router.push('/dashboard/billing')}
            >
              {M.backToDashboard}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ManualPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ManualPaymentContent />
    </Suspense>
  );
}