// ============================================================
// i18n — Types et registre des langues
// ------------------------------------------------------------
// AJOUTER UNE NOUVELLE LANGUE (ex: Deutsch "de") :
//   1. Créer src/i18n/locales/de.ts en copiant fr.ts
//      (TypeScript signalera TOUTES les clés manquantes)
//   2. L'importer dans LOCALES ci-dessous avec son nom + drapeau
// C'est tout. Le switcher, la détection et la persistance
// fonctionnent automatiquement.
// ============================================================

import { fr } from './locales/fr';
import { en } from './locales/en';
import { es } from './locales/es';

/** Le dictionnaire français est la source de vérité du type. */
export type Dictionary = typeof fr;

export type Lang = 'fr' | 'en' | 'es';

export interface LocaleMeta {
  code: Lang;
  /** Nom natif de la langue */
  nativeName: string;
  /** Émoji drapeau */
  flag: string;
  /** Locale BCP-47 pour Date/Number formatting */
  intl: string;
  dict: Dictionary;
}

/** Registre des langues disponibles — extensible. */
export const LOCALES: Record<Lang, LocaleMeta> = {
  fr: { code: 'fr', nativeName: 'Français', flag: '🇫🇷', intl: 'fr-FR', dict: fr },
  en: { code: 'en', nativeName: 'English', flag: '🇬🇧', intl: 'en-GB', dict: en },
  es: { code: 'es', nativeName: 'Español', flag: '🇪🇸', intl: 'es-ES', dict: es },
};

export const LANGS: Lang[] = Object.keys(LOCALES) as Lang[];
export const DEFAULT_LANG: Lang = 'fr';
export const LANG_STORAGE_KEY = 'djt-lang';

/** Détecte la langue du navigateur parmi celles disponibles. */
export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  const nav = (navigator.language || '').toLowerCase();
  const prefix = nav.split('-')[0];
  if (LANGS.includes(prefix as Lang)) return prefix as Lang;
  return DEFAULT_LANG;
}

/** Noms des jours localisés (client-safe). */
export function localizedDayNames(lang: Lang): string[] {
  const map: Record<Lang, string[]> = {
    fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  };
  return map[lang] ?? map.fr;
}

/** Noms des mois localisés (client-safe). */
export function localizedMonthNames(lang: Lang): string[] {
  const map: Record<Lang, string[]> = {
    fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  };
  return map[lang] ?? map.fr;
}

/** Lit la langue persistée (localStorage). */
export function readStoredLang(): Lang | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (v && LANGS.includes(v as Lang)) return v as Lang;
  } catch { /* localStorage indisponible */ }
  return null;
}
