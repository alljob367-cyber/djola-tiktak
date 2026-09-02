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
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { WhatsAppRemindersCard } from '@/components/dashboard/whatsapp-reminders-card';

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
  const { t } = useI18n();
  const S = t.dashboard.settings;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(S.notAuthed);
        setPmSaving(false);
        return;
      }
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
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(S.paymentsSaved);
    } catch {
      toast.error(S.paymentsSaveError);
    } finally {
      setPmSaving(false);
    }
  };

  // ── Copy to clipboard ──────────────────────────────────
  const [copied, setCopied] = useState(false);
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(S.copied);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Change password ───────────────────────────────────
  const handleChangePassword = async () => {
    setPwdError('');

    if (!newPassword) {
      setPwdError(S.pwdRequired);
      return;
    }
    if (newPassword.length < 8) {
      setPwdError(S.pwdMin);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError(S.pwdMismatch);
      return;
    }

    setPwdSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success(S.pwdChanged);
      setPwdDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : S.pwdChangeError;
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
      toast.error(S.logoutError);
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
        throw new Error(err.error || S.deactivateError);
      }

      toast.info(S.deactivatedToast);
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      toast.error(S.deactivateError);
    } finally {
      setDeactivating(false);
    }
  };

  // ── Delete account ────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') {
      toast.error(S.typeDeleteError);
      return;
    }

    setDeleting(true);
    try {
      // Request account deletion via API
      const res = await fetch('/api/profiles/deactivate', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Erreur lors de la desactivation');
      }
      await supabase.auth.signOut();
      toast.success(S.deleteToast);
      router.push('/login');
    } catch {
      toast.error(S.deleteError);
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
        <h1 className="text-2xl font-bold tracking-tight">{S.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {S.subtitle}
        </p>
      </motion.div>

      {/* ── WhatsApp Reminders Section ─────────────────────────── */}
      <motion.div variants={itemVariants}>
        <WhatsAppRemindersCard />
      </motion.div>

      {/* ── Payment Methods Section ──────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet size={16} className="text-emerald-600" />
              {S.paymentTitle}
            </CardTitle>
            <CardDescription>
              {S.paymentDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{S.enablePayments}</p>
                <p className="text-xs text-muted-foreground">
                  {S.enablePaymentsHint}
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
                      <p className="font-medium">{S.howItWorks}</p>
                      <p className="mt-1">{S.howItWorksDesc}</p>
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
                      <p className="text-sm font-medium">{S.omTitle}</p>
                      <p className="text-xs text-muted-foreground">{S.phoneForPayments}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="om-phone" className="text-xs">{S.omPhoneLabel}</Label>
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
                      <Label htmlFor="om-name" className="text-xs">{S.holderName}</Label>
                      <Input
                        id="om-name"
                        type="text"
                        placeholder={S.holderPlaceholder}
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
                      <p className="text-sm font-medium">{S.mtnTitle}</p>
                      <p className="text-xs text-muted-foreground">{S.phoneForPayments}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="mtn-phone" className="text-xs">{S.mtnPhoneLabel}</Label>
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
                      <Label htmlFor="mtn-name" className="text-xs">{S.holderName}</Label>
                      <Input
                        id="mtn-name"
                        type="text"
                        placeholder={S.holderPlaceholder}
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
                    {S.instructionsLabel}
                  </Label>
                  <Textarea
                    id="pm-instructions"
                    placeholder={S.instructionsPlaceholder}
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
                  {S.savePayments}
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
              {S.accountTitle}
            </CardTitle>
            <CardDescription>
              {S.accountDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{S.emailLabel}</p>
                <p className="text-sm text-muted-foreground">
                  {loadingEmail ? (
                    <span className="inline-block w-48 h-4 bg-muted rounded animate-pulse" />
                  ) : (
                    email || S.emailNotSet
                  )}
                </p>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {S.authed}
              </Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{S.passwordLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {S.passwordDesc}
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
                {S.change}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{S.logoutTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {S.logoutDesc}
                </p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut size={14} className="mr-2" />
                {S.logout}
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
              {S.dangerTitle}
            </CardTitle>
            <CardDescription>
              {S.dangerDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Deactivate */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{S.deactivateTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {S.deactivateDesc}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 shrink-0 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                  >
                    <ShieldOff size={14} className="mr-2" />
                    {S.deactivate}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{S.deactivateConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {S.deactivateConfirmDesc}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeactivate}
                      disabled={deactivating}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {deactivating && <Loader2 size={14} className="mr-2 animate-spin" />}
                      {S.deactivate}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            {/* Delete */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{S.deleteTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {S.deleteDesc}
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
                {S.delete}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Change Password Dialog ────────────────────────── */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{S.pwdTitle}</DialogTitle>
            <DialogDescription>
              {S.pwdDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-pwd">{S.newPwd}</Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="........"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pwd">{S.confirmPwd}</Label>
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
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={pwdSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {pwdSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              {S.modify}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Dialog ──────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">
              {S.deleteConfirmTitle}
            </DialogTitle>
            <DialogDescription>
              {S.deleteConfirmDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <p className="text-sm text-red-700 dark:text-red-400">
                {S.typeDelete} <strong>{S.deleteWord}</strong> :
              </p>
            </div>
            <Input
              placeholder={S.typeDeletePlaceholder}
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
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== 'SUPPRIMER'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
              <Trash2 size={14} className="mr-2" />
              {S.deleteMyAccount}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
