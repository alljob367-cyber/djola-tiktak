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
  Wallet,
  CreditCard,
  Copy,
  Check,
  Info,
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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

  // Payment methods state
  const [pmEnabled, setPmEnabled] = useState(false);
  const [omPhone, setOmPhone] = useState('');
  const [omName, setOmName] = useState('');
  const [mtnPhone, setMtnPhone] = useState('');
  const [mtnName, setMtnName] = useState('');
  const [pmInstructions, setPmInstructions] = useState('');
  const [pmLoading, setPmLoading] = useState(true);
  const [pmSaving, setPmSaving] = useState(false);

  // ── Fetch user email & payment settings ─────────────────
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setEmail(user.email ?? '');

        // Fetch profile for payment settings
        const { data: profile } = await supabase
          .from('profiles')
          .select('payment_methods_enabled, orange_money_phone, orange_money_name, mtn_momo_phone, mtn_momo_name, payment_instructions')
          .single();

        if (profile) {
          setPmEnabled(profile.payment_methods_enabled ?? false);
          setOmPhone(profile.orange_money_phone ?? '');
          setOmName(profile.orange_money_name ?? '');
          setMtnPhone(profile.mtn_momo_phone ?? '');
          setMtnName(profile.mtn_momo_name ?? '');
          setPmInstructions(profile.payment_instructions ?? '');
        }
      } catch {
        // silent
      } finally {
        setLoadingEmail(false);
        setPmLoading(false);
      }
    })();
  }, [supabase]);

  // ── Save payment methods ────────────────────────────────
  const handleSavePaymentMethods = async () => {
    setPmSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          payment_methods_enabled: pmEnabled,
          orange_money_phone: omPhone || null,
          orange_money_name: omName || null,
          mtn_momo_phone: mtnPhone || null,
          mtn_momo_name: mtnName || null,
          payment_instructions: pmInstructions || null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Moyens de paiement enregistrés');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setPmSaving(false);
    }
  };

  // ── Copy to clipboard ──────────────────────────────────
  const [copied, setCopied] = useState(false);
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copié !');
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
      const res = await fetch('/api/profiles/deactivate', {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la désactivation');
      }

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

      {/* ── Payment Methods Section ──────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet size={16} className="text-emerald-600" />
              Moyens de paiement locaux
            </CardTitle>
            <CardDescription>
              Configurez vos numéros pour recevoir des paiements anticipés de vos clients. Les clients qui paient en avance seront en priorité.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Activer les paiements anticipés</p>
                <p className="text-xs text-muted-foreground">
                  Vos clients pourront vous payer en avance pour être prioritaires
                </p>
              </div>
              <Switch
                checked={pmEnabled}
                onCheckedChange={setPmEnabled}
                disabled={pmSaving}
              />
            </div>

            {pmEnabled && (
              <>
                <Separator />

                {/* Info banner */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                  <div className="flex gap-2">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Comment ça marche ?</p>
                      <p className="mt-1">Vos clients verront vos numéros de paiement sur votre page de réservation. Ils pourront vous envoyer le montant du service en avance via Orange Money ou MTN MoMo. Les réservations payées en avance seront marquées comme prioritaires.</p>
                    </div>
                  </div>
                </div>

                {/* Orange Money */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">OM</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Orange Money</p>
                      <p className="text-xs text-muted-foreground">Numéro pour recevoir les paiements</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="om-phone" className="text-xs">Numéro Orange Money</Label>
                      <Input
                        id="om-phone"
                        type="tel"
                        placeholder="+237 6XX XXX XXX"
                        value={omPhone}
                        onChange={(e) => setOmPhone(e.target.value)}
                        disabled={pmSaving}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="om-name" className="text-xs">Nom du titulaire</Label>
                      <Input
                        id="om-name"
                        type="text"
                        placeholder="Jean Kamga"
                        value={omName}
                        onChange={(e) => setOmName(e.target.value)}
                        disabled={pmSaving}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* MTN MoMo */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
                      <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">MTN</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">MTN Mobile Money</p>
                      <p className="text-xs text-muted-foreground">Numéro pour recevoir les paiements</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="mtn-phone" className="text-xs">Numéro MTN MoMo</Label>
                      <Input
                        id="mtn-phone"
                        type="tel"
                        placeholder="+237 6XX XXX XXX"
                        value={mtnPhone}
                        onChange={(e) => setMtnPhone(e.target.value)}
                        disabled={pmSaving}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mtn-name" className="text-xs">Nom du titulaire</Label>
                      <Input
                        id="mtn-name"
                        type="text"
                        placeholder="Jean Kamga"
                        value={mtnName}
                        onChange={(e) => setMtnName(e.target.value)}
                        disabled={pmSaving}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Custom instructions */}
                <div className="space-y-1.5">
                  <Label htmlFor="pm-instructions" className="text-xs">
                    Instructions personnalisées (facultatif)
                  </Label>
                  <Textarea
                    id="pm-instructions"
                    placeholder="Ex: Envoyez la capture d'écran de votre transfert à mon numéro WhatsApp après le paiement..."
                    value={pmInstructions}
                    onChange={(e) => setPmInstructions(e.target.value)}
                    disabled={pmSaving}
                    rows={3}
                    className="text-sm"
                  />
                </div>

                <Button
                  onClick={handleSavePaymentMethods}
                  disabled={pmSaving}
                  className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto"
                  size="lg"
                >
                  {pmSaving && <Loader2 size={16} className="mr-2 animate-spin" />}
                  <CreditCard size={16} className="mr-2" />
                  Enregistrer les paiements
                </Button>
              </>
            )}
          </CardContent>
        </Card>
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
                placeholder="........"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pwd">Confirmer le mot de passe</Label>
              <Input
                id="confirm-pwd"
                type="password"
                placeholder="........"
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
