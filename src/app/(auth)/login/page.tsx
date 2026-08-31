'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, CalendarCheck, Eye, EyeOff } from 'lucide-react';
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

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Show toast if user was just verified
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') {
      toast.success(t.auth.login.verifiedToast, {
        description: t.auth.login.verifiedToastDesc,
        duration: 6000,
      });
    }
    const errorParam = params.get('error');
    if (errorParam === 'token_expired') {
      toast.error(t.auth.login.expiredLink, {
        description: t.auth.login.expiredLinkDesc,
        duration: 6000,
      });
    } else if (errorParam === 'invalid_token') {
      toast.error(t.auth.login.invalidLink, {
        description: t.auth.login.invalidLinkDesc,
        duration: 6000,
      });
    }
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = t.auth.login.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t.auth.login.emailInvalid;
    }
    if (!password) {
      newErrors.password = t.auth.login.passwordRequired;
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
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error(t.auth.login.badCredentials, {
            description: t.auth.login.badCredentialsDesc,
          });
        } else {
          toast.error(t.auth.common.connectionError, {
            description: error.message,
          });
        }
        return;
      }

      toast.success(t.auth.login.successToast, {
        description: t.auth.login.successToastDesc,
      });

      // Redirection après connexion : vers /admin si demandé (et si le
      // paramètre pointe bien vers une page interne de l'app), sinon /dashboard
      const params = new URLSearchParams(window.location.search);
      const target = params.get('redirect_to');
      const safeTarget =
        target && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
      router.push(safeTarget);
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
            {t.auth.common.tagline}
          </p>
        </motion.div>

        <Card className="border-0 shadow-xl shadow-black/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-center">
              {t.auth.login.title}
            </CardTitle>
            <CardDescription className="text-center text-sm">
              {t.auth.login.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                    placeholder={t.auth.login.emailPlaceholder}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {t.auth.login.password}
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    {t.auth.login.forgot}
                  </Link>
                </div>
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
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? t.auth.login.hidePassword : t.auth.login.showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
                      {t.auth.login.submitting}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {t.auth.login.submit}
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
                <span className="bg-card px-2 text-muted-foreground">
                  {t.auth.login.noAccount}
                </span>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full h-11 text-sm font-medium">
              <Link href="/register">{t.auth.login.createAccount}</Link>
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
          {' '}{t.auth.common.termsPre}{' '}
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
