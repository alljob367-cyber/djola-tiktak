'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, CalendarCheck, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(true);

  // Extract access_token from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
      setError('Lien invalide ou expiré. Demandez un nouveau lien de réinitialisation.');
      setIsProcessing(false);
    } else {
      setIsProcessing(false);
    }
  }, []);

  const validateForm = () => {
    if (!password) {
      setError('Le mot de passe est requis');
      return false;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
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
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        toast.error('Erreur', { description: updateError.message });
        return;
      }

      setIsSuccess(true);
      toast.success('Mot de passe mis à jour !', {
        description: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
      });
    } catch {
      toast.error('Erreur', {
        description: 'Impossible de mettre à jour le mot de passe. Réessayez.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-stone-50 via-white to-emerald-50/40">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/25 mb-4">
            <CalendarCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Djola TikTak</h1>
        </motion.div>

        <Card className="border-0 shadow-xl shadow-black/5">
          {!isSuccess ? (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-semibold text-center">
                  Nouveau mot de passe
                </CardTitle>
                <CardDescription className="text-center text-sm">
                  Choisissez un mot de passe fort pour sécuriser votre compte.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {isProcessing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : error && !password ? (
                  <div className="text-center py-4">
                    <p className="text-destructive text-sm mb-4">{error}</p>
                    <Button asChild variant="outline" className="text-sm">
                      <Link href="/forgot-password">Demander un nouveau lien</Link>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    {/* New password */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Nouveau mot de passe
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Minimum 8 caractères"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); if (error) setError(undefined); }}
                          className="pl-10 pr-10 h-11"
                          autoComplete="new-password"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirmer le mot de passe
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Retapez le mot de passe"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(undefined); }}
                          className={`pl-10 h-11 ${error ? 'border-destructive' : ''}`}
                          autoComplete="new-password"
                          disabled={isLoading}
                        />
                      </div>
                      {error && (
                        <p className="text-destructive text-xs">{error}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-md shadow-emerald-600/20"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Mise à jour…
                        </span>
                      ) : (
                        'Mettre à jour le mot de passe'
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-4">
                <div className="flex justify-center mb-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </motion.div>
                </div>
                <CardTitle className="text-xl font-semibold text-center">
                  Mot de passe mis à jour
                </CardTitle>
                <CardDescription className="text-center text-sm">
                  Votre mot de passe a été changé avec succès.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href="/login">
                    Se connecter
                  </Link>
                </Button>
              </CardContent>
            </>
          )}

          <CardFooter className="flex justify-center pt-2 pb-6">
            <Button asChild variant="ghost" className="text-sm text-muted-foreground hover:text-foreground gap-2 h-11">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </main>
  );
}
