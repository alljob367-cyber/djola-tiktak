'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Save,
  Send,
  Clock3,
  Sparkles,
  Check,
  Info,
  BellRing,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { WhatsAppIcon } from '@/components/ui/brand-icons';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/i18n/provider';

const DEFAULT_TEMPLATE =
  'Bonjour {client} 👋\n\nRappel de votre rendez-vous « {service} » chez {business} : {date} à {heure}.\n\nMerci de confirmer ou de prévenir en cas d\u2019empêchement. À bientôt !';

const VARIABLES = [
  { key: '{client}', label: 'Nom du client' },
  { key: '{service}', label: 'Service' },
  { key: '{business}', label: 'Mon commerce' },
  { key: '{date}', label: 'Date du RDV' },
  { key: '{heure}', label: 'Heure du RDV' },
];

/**
 * Carte de configuration des rappels WhatsApp (page Paramètres).
 * Enregistre les réglages dans `profiles` ; le cron
 * /api/cron/reminders respecte ensuite ces choix.
 */
export function WhatsAppRemindersCard() {
  const { t } = useI18n();
  const S = t.dashboard.settings.whatsapp;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [reminder24h, setReminder24h] = useState(true);
  const [reminder2h, setReminder2h] = useState(true);
  const [reminder1h, setReminder1h] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Chargement de la configuration existante
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select(
            'whatsapp_enabled, whatsapp_reminder_24h, whatsapp_reminder_2h, whatsapp_reminder_1h, whatsapp_template, phone'
          )
          .eq('id', user.id)
          .single();

        if (profile) {
          setEnabled(profile.whatsapp_enabled ?? false);
          setReminder24h(profile.whatsapp_reminder_24h ?? true);
          setReminder2h(profile.whatsapp_reminder_2h ?? true);
          setReminder1h(profile.whatsapp_reminder_1h ?? false);
          if (profile.whatsapp_template) setTemplate(profile.whatsapp_template);
          if (profile.phone) setTestPhone(profile.phone);
        }
      } catch {
        // silencieux
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Aperçu du message
  const preview = useMemo(() => {
    const tomorrow = new Date(Date.now() + 26 * 3600 * 1000);
    const date = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(tomorrow);
    const heure = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(tomorrow);
    return template
      .replaceAll('{client}', 'Aïcha Ngo')
      .replaceAll('{service}', 'Tresses collées')
      .replaceAll('{business}', t.dashboard.overview.welcomeTitle)
      .replaceAll('{date}', date)
      .replaceAll('{heure}', heure);
  }, [template, t]);

  const activeDelays = [enabled && reminder24h, enabled && reminder2h, enabled && reminder1h].filter(Boolean).length;

  const insertVariable = (v: string) => {
    setTemplate((cur) => `${cur}${cur.endsWith(' ') || cur === '' ? '' : ' '}${v}`);
  };

  const handleSave = async () => {
    if (enabled && activeDelays === 0) {
      toast.error(S.needOneDelay);
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(S.notAuthed);
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          whatsapp_enabled: enabled,
          whatsapp_reminder_24h: enabled && reminder24h,
          whatsapp_reminder_2h: enabled && reminder2h,
          whatsapp_reminder_1h: enabled && reminder1h,
          whatsapp_template: template,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(enabled ? S.savedEnabled : S.savedDisabled);
    } catch {
      toast.error(S.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, template }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? S.testError);
      setTestResult({ ok: true, message: json.message ?? json.note ?? '' });
      toast.success(S.testSent);
    } catch (e) {
      const msg = e instanceof Error ? e.message : S.testError;
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-[#25D366]/30 dark:border-[#25D366]/25">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#25D366]/15">
            <WhatsAppIcon className="text-[#25D366]" size={15} />
          </span>
          {S.title}
        </CardTitle>
        <CardDescription>{S.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-muted-foreground" size={20} />
          </div>
        ) : (
          <>
            {/* Activation */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{S.enable}</p>
                <p className="text-xs text-muted-foreground">{S.enableHint}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={saving}
                aria-label={S.enable}
              />
            </div>

            <AnimatePresence initial={false}>
              {enabled && (
                <motion.div
                  key="wa-config"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-5 pt-1">
                    {/* Statut */}
                    <div className="flex items-center gap-2 rounded-lg bg-[#25D366]/10 dark:bg-[#25D366]/10 px-3 py-2 text-xs font-medium text-[#15803d] dark:text-[#25D366]">
                      <span className="size-1.5 animate-pulse rounded-full bg-[#25D366]" />
                      {S.activeBanner}
                    </div>

                    <Separator />

                    {/* Délais */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock3 size={15} className="text-emerald-600 dark:text-[#25D366]" />
                        <p className="text-sm font-semibold">{S.delaysTitle}</p>
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {[
                          { on: reminder24h, set: setReminder24h, icon: '🌙', title: S.delay24h, sub: S.delay24hSub },
                          { on: reminder2h, set: setReminder2h, icon: '⏰', title: S.delay2h, sub: S.delay2hSub },
                          { on: reminder1h, set: setReminder1h, icon: '⚡', title: S.delay1h, sub: S.delay1hSub },
                        ].map((d) => (
                          <motion.button
                            key={d.title}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() => d.set(!d.on)}
                            aria-pressed={d.on}
                            className={`rounded-xl border p-3 text-left transition-colors ${
                              d.on
                                ? 'border-emerald-400/60 bg-emerald-50 dark:border-[#25D366]/50 dark:bg-[#25D366]/10'
                                : 'border-border hover:bg-accent'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-lg leading-none">{d.icon}</span>
                              {d.on && (
                                <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 dark:bg-[#25D366] text-white dark:text-[#0a0f0d]">
                                  <Check size={10} strokeWidth={3.5} />
                                </span>
                              )}
                            </div>
                            <p className={`mt-1.5 text-sm font-bold ${d.on ? 'text-emerald-700 dark:text-[#25D366]' : ''}`}>
                              {d.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{d.sub}</p>
                          </motion.button>
                        ))}
                      </div>
                      {activeDelays === 0 && (
                        <p className="text-xs text-red-500">{S.needOneDelay}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Message */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={15} className="text-emerald-600 dark:text-[#25D366]" />
                        <p className="text-sm font-semibold">{S.templateTitle}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {VARIABLES.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            title={v.label}
                            onClick={() => insertVariable(v.key)}
                            className="rounded-full border border-emerald-300/50 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-[#25D366]/30 dark:bg-[#25D366]/10 dark:text-[#25D366] dark:hover:bg-[#25D366]/20"
                          >
                            {v.key}
                          </button>
                        ))}
                      </div>
                      <Textarea
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        rows={6}
                        disabled={saving}
                        aria-label={S.templateTitle}
                        className="text-sm"
                        placeholder={S.templatePlaceholder}
                      />
                      {/* Aperçu */}
                      <div className="rounded-xl bg-muted/60 dark:bg-[#0d1411] p-3">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {S.preview}
                        </p>
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                          {preview}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Test */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Send size={15} className="text-emerald-600 dark:text-[#25D366]" />
                        <p className="text-sm font-semibold">{S.testTitle}</p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="tel"
                          inputMode="tel"
                          placeholder="+237 6XX XXX XXX"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          disabled={testing}
                          className="min-h-[44px] flex-1"
                          aria-label={S.testPhone}
                        />
                        <Button
                          type="button"
                          onClick={handleTest}
                          disabled={testing || !testPhone.trim()}
                          className="min-h-[44px] gap-2 bg-[#25D366] text-[#0a0f0d] hover:bg-[#2ee578]"
                        >
                          {testing ? <Loader2 size={15} className="animate-spin" /> : <WhatsAppIcon size={15} />}
                          {S.testButton}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{S.testHint}</p>
                      <AnimatePresence>
                        {testResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`rounded-xl p-3 text-xs ${
                              testResult.ok
                                ? 'bg-[#25D366]/10 text-[#15803d] dark:text-[#25D366]'
                                : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                            }`}
                          >
                            {testResult.message}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <Separator />

                    {/* Fonctionnement */}
                    <div className="flex gap-2 rounded-lg bg-muted/50 p-3">
                      <Info size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {S.howItWorks}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!enabled && !loading && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                <BellRing size={14} className="shrink-0" />
                {S.disabledHint}
              </div>
            )}

            {/* Enregistrer */}
            <Button
              onClick={handleSave}
              disabled={saving || loading || (enabled && activeDelays === 0)}
              className="w-full min-h-[48px] gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#25D366] dark:text-[#0a0f0d] dark:hover:bg-[#2ee578] sm:w-auto"
              size="lg"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {S.save}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
