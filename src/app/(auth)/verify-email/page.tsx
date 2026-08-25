'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      setSent(true);
      toast.success('E-mail renvoyé !', {
        description: 'Vérifiez votre boîte de réception.',
      });
    } catch (err) {
      toast.error('Erreur', {
        description: err instanceof Error ? err.message : 'Impossible de renvoyer l\'e-mail.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Try to get email from URL params or session
  const userEmail = email || new URLSearchParams(window.location.search).get('email') || '';
  if (userEmail && !email) setEmail(userEmail);

  return (
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
            Vérifiez votre e-mail
          </h1>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
            Nous avons envoyé un lien de confirmation à votre adresse e-mail.
            Cliquez dessus pour activer votre compte.
          </p>
        </motion.div>

        <Card className="border-0 shadow-xl shadow-black/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-center">
              Un dernier étape !
            </CardTitle>
            <CardDescription className="text-center text-sm">
              {sent
                ? "L'e-mail de confirmation a été renvoyé avec succès."
                : "Vérifiez votre boîte de réception et vos spams."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!sent && email && (
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-sm text-muted-foreground">Envoyé à</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{email}</p>
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
              Renvoyer l'e-mail de confirmation
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la connexion
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}