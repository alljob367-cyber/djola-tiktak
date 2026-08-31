'use client';

// ============================================================
// LanguageProvider — contexte de langue côté client
// Persiste le choix dans localStorage + <html lang="…">
// ============================================================

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  DEFAULT_LANG, LOCALES, detectLang, readStoredLang,
  type Dictionary, type Lang,
} from './index';

interface I18nContextValue {
  lang: Lang;
  /** Dictionnaire complet de la langue courante (accès direct type-sécurisé) */
  t: Dictionary;
  /** Locale BCP-47 pour Intl (dates, nombres) */
  intl: string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Au premier montage : synchronise le cookie avec la langue résolue
  useEffect(() => {
    const stored = readStoredLang();
    const detected = stored ?? detectLang();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation initiale voulue
    setLangState(detected);
    try {
      document.cookie = `djt-lang=${detected}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* ignore */ }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem('djt-lang', next);
      // Cookie lisible côté serveur (composants serveur + SSR)
      document.cookie = `djt-lang=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* ignore */ }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
  }, []);

  // Synchronise <html lang> dès que la langue change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      t: LOCALES[lang].dict,
      intl: LOCALES[lang].intl,
      setLang,
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hook d'accès à la traduction courante. */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Sécurité : fallback français si hors provider (ne doit pas arriver)
    return { lang: DEFAULT_LANG, t: LOCALES[DEFAULT_LANG].dict, intl: LOCALES[DEFAULT_LANG].intl, setLang: () => {} };
  }
  return ctx;
}
