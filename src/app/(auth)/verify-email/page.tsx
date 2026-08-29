'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from '@/i18n/language-switcher';

export default function VerifyEmailPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      // Utiliser notre API Resend au lieu de Supabase (qui bloque Gmail)
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi.');
      }

      setSent(true);
      toast.success(t.auth.verify.resendToast, {
        description: data.method === 'resend'
          ? t.auth.verify.resendToastDescA
          : t.auth.verify.resendToastDescB,
      });
    } catch (err) {
      toast.error(t.auth.verify.errorTitle, {
        description: err instanceof Error ? err.message : t.auth.verify.errorDesc,
      });
    } finally {
      setLoading(false);
    }
  };

  // Try to get email from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam && !email) setEmail(emailParam);
  }, []);

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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-col items-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4"
          >
            {sent ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            ) : (
              <Mail className="w-10 h-10 text-emerald-500" />
            )}
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {t.auth.verify.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
            {t.auth.verify.subtitle}
          </p>
        </motion.div>

        <Card className="border-0 shadow-xl shadow-black/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-center">
              {t.auth.verify.cardTitle}
            </CardTitle>
            <CardDescription className="text-center text-sm">
              {sent
                ? t.auth.verify.resentDesc
                : t.auth.verify.checkDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!sent && email && (
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-sm text-muted-foreground">{t.auth.verify.sentTo}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{email}</p>
              </div>
            )}

            {!email && (
              <div className="space-y-2">
                <Label htmlFor="verify-email-input">{t.auth.verify.emailLabel}</Label>
                <Input
                  id="verify-email-input"
                  type="email"
                  placeholder={t.auth.login.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full h-11"
              disabled={loading || !email}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {t.auth.verify.resend}
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.auth.verify.backToLogin}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </main>
      </>
  );
}