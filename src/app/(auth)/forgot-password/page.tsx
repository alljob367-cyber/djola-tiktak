'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, Mail, CalendarCheck, ArrowLeft, MailCheck } from 'lucide-react';
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

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const validateForm = () => {
    if (!email.trim()) {
      setError(t.auth.login.emailRequired);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.auth.login.emailInvalid);
      return false;
    }
    setError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        toast.error(t.auth.forgot.sendError, {
          description: resetError.message,
        });
        return;
      }

      setIsSuccess(true);
      toast.success(t.auth.forgot.successToast, {
        description: t.auth.forgot.successToastDesc,
      });
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
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl font-semibold text-center">
                    {t.auth.forgot.title}
                  </CardTitle>
                  <CardDescription className="text-center text-sm">
                    {t.auth.forgot.subtitle}
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
                            if (error) setError(undefined);
                          }}
                          className={`pl-10 h-11 ${error ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                          autoComplete="email"
                          disabled={isLoading}
                        />
                      </div>
                      <AnimatePresence>
                        {error && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-destructive text-xs"
                          >
                            {error}
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
                            {t.auth.forgot.submitting}
                          </motion.span>
                        ) : (
                          <motion.span
                            key="idle"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            {t.auth.forgot.submit}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </form>
                </CardContent>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <CardHeader className="space-y-1 pb-4">
                  <div className="flex justify-center mb-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                      className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center"
                    >
                      <MailCheck className="w-8 h-8 text-emerald-600" />
                    </motion.div>
                  </div>
                  <CardTitle className="text-xl font-semibold text-center">
                    {t.auth.forgot.successTitle}
                  </CardTitle>
                  <CardDescription className="text-center text-sm leading-relaxed">
                    {' '}{t.auth.forgot.successDesc}{' '}
                    <span className="font-medium text-foreground">{email}</span>.{' '}
                    {t.auth.forgot.linkExpiry}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200/60 p-4">
                    <p className="text-sm text-emerald-800 leading-relaxed">
                      <strong>{t.auth.forgot.tip}</strong> {t.auth.forgot.tipDesc}
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      setIsSuccess(false);
                      setEmail('');
                    }}
                    variant="outline"
                    className="w-full h-11 text-sm font-medium"
                  >
                    {t.auth.forgot.useOther}
                  </Button>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>

          <CardFooter className="flex justify-center pt-2 pb-6">
            <Button asChild variant="ghost" className="text-sm text-muted-foreground hover:text-foreground gap-2 h-11">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                {t.auth.forgot.backToLogin}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </main>
      </>
  );
}
