'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share, MoreVertical, Smartphone } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** iOS (iPhone / iPad) — iPadOS 13+ se présente comme « Macintosh ». */
function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIPadOS = /Macintosh/.test(ua) && 'ontouchend' in document;
  return /iPhone|iPad|iPod/.test(ua) || isIPadOS;
}

/** App déjà installée (mode standalone / plein écran) ? */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

export function PWAInstallPrompt() {
  const { t } = useI18n();
  const I = t.install;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1) Service worker : TOUJOURS enregistré (même si la bannière a été ignorée)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Échec silencieux (navigateur non compatible, contexte non sécurisé…)
      });
    }

    // 2) Bannière déjà ignorée ?
    if (localStorage.getItem('pwa-install-dismissed')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture localStorage au montage
      setDismissed(true);
      return;
    }

    // 3) Déjà installée ?
    if (isStandalone()) return;

    setIsIOS(detectIOS());

    // 4) Android / Chrome : événement natif d'installation
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // 5) Filet de sécurité : afficher quand même après un délai.
    //    iOS (Safari/Chrome) ne déclenche JAMAIS beforeinstallprompt —
    //    sans ce filet, la bannière resterait invisible sur iPhone.
    const timer = setTimeout(() => setShowBanner(true), 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      // Installation native (Android / Chrome)
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // Pas d'événement natif (iOS, navigateurs alternatifs) → guide pas-à-pas
      setShowGuide(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  if (!showBanner || dismissed) return null;

  const iosSteps = [I.iosStep1, I.iosStep2, I.iosStep3, I.iosStep4];
  const androidSteps = [I.androidStep1, I.androidStep2, I.androidStep3];

  return (
    <>
      {/* ── Bannière mobile ─────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-16 z-[100] px-4 pb-3 sm:bottom-4 lg:hidden">
        <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg dark:border-emerald-800 dark:bg-emerald-950">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <Download className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{I.bannerTitle}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{I.bannerText}</p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-accent"
              aria-label={I.close}
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent min-h-[44px]"
            >
              {I.later}
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 min-h-[44px]"
            >
              {I.cta}
            </button>
          </div>
        </div>
      </div>

      {/* ── Guide pas-à-pas (iOS / Android sans événement natif) ── */}
      {showGuide && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center lg:hidden"
          onClick={() => setShowGuide(false)}
          role="dialog"
          aria-modal="true"
          aria-label={I.guideTitle}
        >
          <div
            className="max-h-[80dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                <Smartphone className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-foreground">{I.guideTitle}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{I.guideSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-accent"
                aria-label={I.close}
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            {isIOS ? (
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Share className="size-4 text-emerald-600 dark:text-emerald-400" />
                  {I.iosTitle}
                </p>
                <ol className="mt-3 space-y-3">
                  {iosSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {idx + 1}
                      </span>
                      <span className="text-sm leading-snug text-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MoreVertical className="size-4 text-emerald-600 dark:text-emerald-400" />
                  {I.androidTitle}
                </p>
                <ol className="mt-3 space-y-3">
                  {androidSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {idx + 1}
                      </span>
                      <span className="text-sm leading-snug text-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 min-h-[44px]"
            >
              {I.gotIt}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
