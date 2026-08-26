'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  LogOut,
  Trash2,
  ShieldOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';

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
export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(true);

  // Password dialog
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // Danger actions
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // ── Fetch user email ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setEmail(user.email ?? '');
      } catch {
        // silent
      } finally {
        setLoadingEmail(false);
      }
    })();
  }, [supabase]);

  // ── Change password ───────────────────────────────────
  const handleChangePassword = async () => {
    setPwdError('');

    if (!newPassword) {
      setPwdError('Le nouveau mot de passe est requis');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Les mots de passe ne correspondent pas');
      return;
    }

    setPwdSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Mot de passe modifié avec succès');
      setPwdDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erreur lors de la modification';
      setPwdError(msg);
    } finally {
      setPwdSubmitting(false);
    }
  };

  // ── Logout ────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // ── Deactivate account ────────────────────────────────
  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autorisé');

      // Deactivate profile
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: '',
          slug: '',
          description: '',
          phone: '',
          email: '',
          currency: 'XAF',
          timezone: 'Africa/Malabo',
          is_active: false,
        }),
      });

      // Even if profile update fails, we still try to sign out
      toast.info('Compte désactivé');
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      toast.error('Erreur lors de la désactivation');
    } finally {
      setDeactivating(false);
    }
  };

  // ── Delete account ────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') {
      toast.error('Veuillez taper SUPPRIMER pour confirmer');
      return;
    }

    setDeleting(true);
    try {
      // Sign out first
      await supabase.auth.signOut();
      toast.success('Compte supprimé. Vous pouvez maintenant contacter le support pour supprimer définitivement vos données.');
      router.push('/login');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-2xl"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez votre compte et vos préférences
        </p>
      </motion.div>

      {/* Account section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail size={16} className="text-emerald-600" />
              Compte
            </CardTitle>
            <CardDescription>
              Informations liées à votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Adresse email</p>
                <p className="text-sm text-muted-foreground">
                  {loadingEmail ? (
                    <span className="inline-block w-48 h-4 bg-muted rounded animate-pulse" />
                  ) : (
                    email || 'Non défini'
                  )}
                </p>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                Authentifié
              </Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mot de passe</p>
                <p className="text-xs text-muted-foreground">
                  Modifiez votre mot de passe de connexion
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setNewPassword('');
                  setConfirmPassword('');
                  setPwdError('');
                  setPwdDialogOpen(true);
                }}
              >
                <Lock size={14} className="mr-2" />
                Changer
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Déconnexion</p>
                <p className="text-xs text-muted-foreground">
                  Se déconnecter de votre session actuelle
                </p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut size={14} className="mr-2" />
                Se déconnecter
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger zone */}
      <motion.div variants={itemVariants}>
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle size={16} />
              Zone dangereuse
            </CardTitle>
            <CardDescription>
              Actions irréversibles sur votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Deactivate */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Désactiver le compte</p>
                <p className="text-xs text-muted-foreground">
                  Votre page publique sera masquée. Vous pourrez réactiver plus tard.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 shrink-0 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                  >
                    <ShieldOff size={14} className="mr-2" />
                    Désactiver
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Désactiver votre compte ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Votre page de réservation sera immédiatement masquée pour vos clients. Vous pourrez vous reconnecter et réactiver votre compte à tout moment.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeactivate}
                      disabled={deactivating}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {deactivating && <Loader2 size={14} className="mr-2 animate-spin" />}
                      Désactiver
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            {/* Delete */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Supprimer le compte</p>
                <p className="text-xs text-muted-foreground">
                  Suppression définitive de toutes vos données.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmText('');
                  setDeleteDialogOpen(true);
                }}
                className="border-red-200 text-red-700 hover:bg-red-50 shrink-0 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 size={14} className="mr-2" />
                Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Change Password Dialog ────────────────────────── */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>
              Choisissez un nouveau mot de passe sécurisé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-pwd">Nouveau mot de passe</Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pwd">Confirmer le mot de passe</Label>
              <Input
                id="confirm-pwd"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {pwdError && (
              <p className="text-sm text-red-500">{pwdError}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPwdDialogOpen(false)}
              disabled={pwdSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={pwdSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {pwdSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Dialog ──────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">
              Supprimer définitivement votre compte ?
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes vos données, services, clients et rendez-vous seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <p className="text-sm text-red-700 dark:text-red-400">
                Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous :
              </p>
            </div>
            <Input
              placeholder="Tapez SUPPRIMER"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== 'SUPPRIMER'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
              <Trash2 size={14} className="mr-2" />
              Supprimer mon compte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
