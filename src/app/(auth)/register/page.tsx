'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff, Building2, CalendarCheck, Check, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  business_name?: string;
  phone?: string;
}

function PasswordStrength({ password }: { password: string }) {
  const { t } = useI18n();
  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getStrength(password);
  if (!password) return null;

  const labels = [t.auth.register.strength[0], t.auth.register.strength[1], t.auth.register.strength[2], t.auth.register.strength[3], t.auth.register.strength[4]];
  const colors = [
    'bg-red-400',
    'bg-orange-400',
    'bg-amber-400',
    'bg-emerald-400',
    'bg-emerald-600',
  ];
  const textColor = [
    'text-red-500',
    'text-orange-500',
    'text-amber-600',
    'text-emerald-600',
    'text-emerald-700',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < strength ? colors[Math.min(strength - 1, 4)] : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColor[Math.min(strength - 1, 4)] || 'text-muted-foreground'}`}>
        {labels[Math.min(strength - 1, 4)] || 'Très faible'}
      </p>
    </motion.div>
  );
}

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!businessName.trim()) {
      newErrors.business_name = t.auth.register.businessNameRequired;
    } else if (businessName.trim().length < 2) {
      newErrors.business_name = t.auth.register.businessNameShort;
    }

    if (phone.trim() && !/^[+]?[0-9]{8,15}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = t.auth.register.phoneInvalid;
    }

    if (!email.trim()) {
      newErrors.email = t.auth.login.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t.auth.login.emailInvalid;
    }

    if (!password) {
      newErrors.password = t.auth.login.passwordRequired;
    } else if (password.length < 8) {
      newErrors.password = t.auth.register.passwordMin;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t.auth.register.confirmRequired;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t.auth.register.confirmMismatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          business_name: businessName.trim(),
          phone: phone.trim(),
        },
      },
    });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error(t.auth.register.emailUsed, {
            description: t.auth.register.emailUsedDesc,
          });
        } else {
          toast.error(t.common.error, {
            description: error.message,
          });
        }
        return;
      }

      // Envoyer l'e-mail de verification via notre API Resend
      try {
        const verifyRes = await fetch('/api/auth/send-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (!verifyRes.ok) {
          const verifyData = await verifyRes.json();
          console.warn('[register] Custom email send failed:', verifyData.error);
        }
      } catch (emailErr) {
        console.warn('[register] Custom email send error:', emailErr);
      }

      toast.success(t.auth.register.successToast, {
        description: t.auth.register.successToastDesc,
        duration: 5000,
      });

      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (message.includes('n\'est pas configuré')) {
        toast.error(t.auth.common.serviceNotConfigured, {
          description: t.auth.common.serviceNotConfiguredDesc,
          duration: 8000,
        });
      } else {
        toast.error(t.auth.common.connectionError, {
          description: t.auth.common.connectionErrorDesc,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="fixed right-4 top-4 z-50"><LanguageSwitcher compact /></div>
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-stone-50 via-white to-emerald-50/40">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo / Branding */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/25 mb-4">
            <CalendarCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Djola TikTak
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.auth.register.tagline}
          </p>
        </motion.div>

        <Card className="border-0 shadow-xl shadow-black/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-center">
              {t.auth.register.title}
            </CardTitle>
            <CardDescription className="text-center text-sm">
              {t.auth.register.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="business_name" className="text-sm font-medium">
                  {t.auth.register.businessName}
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="business_name"
                    type="text"
                    placeholder={t.auth.register.businessNamePlaceholder}
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      if (errors.business_name)
                        setErrors((prev) => ({ ...prev, business_name: undefined }));
                    }}
                    className={`pl-10 h-11 ${errors.business_name ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                    autoComplete="organization"
                    disabled={isLoading}
                  />
                </div>
                <AnimatePresence>
                  {errors.business_name && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-destructive text-xs"
                    >
                      {errors.business_name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  {t.auth.register.phone} <span className="text-muted-foreground font-normal">({t.common.optional})</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t.auth.register.phonePlaceholder}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    className={`pl-10 h-11 ${errors.phone ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                    autoComplete="tel"
                    disabled={isLoading}
                  />
                </div>
                <AnimatePresence>
                  {errors.phone && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-destructive text-xs"
                    >
                      {errors.phone}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t.auth.login.email}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={`pl-10 h-11 ${errors.email ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-destructive text-xs"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t.auth.login.password}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className={`pl-10 pr-11 h-11 ${errors.password ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? t.auth.login.hidePassword : t.auth.login.showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-destructive text-xs"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
                <PasswordStrength password={password} />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  {t.auth.register.confirmPassword}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword)
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={`pl-10 pr-11 h-11 ${
                      errors.confirmPassword
                        ? 'border-destructive focus-visible:ring-destructive/30'
                        : confirmPassword && password === confirmPassword
                          ? 'border-emerald-400 focus-visible:ring-emerald-400/30'
                          : ''
                    }`}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  {confirmPassword && password === confirmPassword && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-10 top-1/2 -translate-y-1/2"
                    >
                      <Check className="h-4 w-4 text-emerald-500" />
                    </motion.div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={
                      showConfirmPassword ? t.auth.login.hidePassword : t.auth.login.showPassword
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-destructive text-xs"
                    >
                      {errors.confirmPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all duration-200 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30"
                disabled={isLoading}
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.auth.register.submitting}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {t.auth.register.submit}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t.auth.register.alreadyRegistered}</span>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full h-11 text-sm font-medium">
              <Link href="/login">{t.auth.register.login}</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Footer text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          {' '}{t.auth.register.termsPre}{' '}
          <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">
            {t.auth.common.terms}
          </span>{' '}
          {t.auth.common.and}{' '}
          <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">
            {t.auth.common.privacy}
          </span>
          .
        </motion.p>
      </motion.div>
    </main>
      </>
  );
}
