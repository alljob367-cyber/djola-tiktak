// ============================================================
// Thèmes de la page publique /[slug]
// Chaque business choisit son identité visuelle depuis
// Dashboard → Profil → Apparence de la page.
// ============================================================

export interface PublicTheme {
  key: string;
  label: string;
  /** Dégradé du hero (hex) */
  heroFrom: string;
  heroVia: string;
  heroTo: string;
  /** Couleur d'action principale (boutons, liens) */
  primary: string;
  primaryDark: string;
  /** Surfaces teintées (classes Tailwind, gèrent le mode sombre) */
  softBg: string;
  softText: string;
  softBorder: string;
  /** Pastille prix / badges sur fond clair */
  chipBg: string;
  chipText: string;
}

export const DEFAULT_THEME_KEY = 'emerald';

export const PUBLIC_THEMES: PublicTheme[] = [
  {
    key: 'emerald',
    label: 'Émeraude',
    heroFrom: '#047857',
    heroVia: '#059669',
    heroTo: '#0d9488',
    primary: '#059669',
    primaryDark: '#047857',
    softBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    softText: 'text-emerald-700 dark:text-emerald-400',
    softBorder: 'border-emerald-200 dark:border-emerald-900/40',
    chipBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    chipText: 'text-emerald-700 dark:text-emerald-400',
  },
  {
    key: 'ocean',
    label: 'Océan',
    heroFrom: '#1e40af',
    heroVia: '#0369a1',
    heroTo: '#0891b2',
    primary: '#0369a1',
    primaryDark: '#075985',
    softBg: 'bg-sky-50 dark:bg-sky-950/40',
    softText: 'text-sky-700 dark:text-sky-400',
    softBorder: 'border-sky-200 dark:border-sky-900/40',
    chipBg: 'bg-sky-100 dark:bg-sky-900/40',
    chipText: 'text-sky-700 dark:text-sky-400',
  },
  {
    key: 'sunset',
    label: 'Coucher de soleil',
    heroFrom: '#c2410c',
    heroVia: '#ea580c',
    heroTo: '#e11d48',
    primary: '#ea580c',
    primaryDark: '#c2410c',
    softBg: 'bg-orange-50 dark:bg-orange-950/40',
    softText: 'text-orange-700 dark:text-orange-400',
    softBorder: 'border-orange-200 dark:border-orange-900/40',
    chipBg: 'bg-orange-100 dark:bg-orange-900/40',
    chipText: 'text-orange-700 dark:text-orange-400',
  },
  {
    key: 'royal',
    label: 'Royal',
    heroFrom: '#6d28d9',
    heroVia: '#7c3aed',
    heroTo: '#a21caf',
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    softBg: 'bg-violet-50 dark:bg-violet-950/40',
    softText: 'text-violet-700 dark:text-violet-400',
    softBorder: 'border-violet-200 dark:border-violet-900/40',
    chipBg: 'bg-violet-100 dark:bg-violet-900/40',
    chipText: 'text-violet-700 dark:text-violet-400',
  },
  {
    key: 'gold',
    label: 'Or premium',
    heroFrom: '#a16207',
    heroVia: '#ca8a04',
    heroTo: '#d97706',
    primary: '#ca8a04',
    primaryDark: '#a16207',
    softBg: 'bg-amber-50 dark:bg-amber-950/40',
    softText: 'text-amber-700 dark:text-amber-400',
    softBorder: 'border-amber-200 dark:border-amber-900/40',
    chipBg: 'bg-amber-100 dark:bg-amber-900/40',
    chipText: 'text-amber-700 dark:text-amber-400',
  },
  {
    key: 'rose',
    label: 'Rose',
    heroFrom: '#be123c',
    heroVia: '#e11d48',
    heroTo: '#db2777',
    primary: '#e11d48',
    primaryDark: '#be123c',
    softBg: 'bg-rose-50 dark:bg-rose-950/40',
    softText: 'text-rose-700 dark:text-rose-400',
    softBorder: 'border-rose-200 dark:border-rose-900/40',
    chipBg: 'bg-rose-100 dark:bg-rose-900/40',
    chipText: 'text-rose-700 dark:text-rose-400',
  },
  {
    key: 'forest',
    label: 'Forêt',
    heroFrom: '#14532d',
    heroVia: '#166534',
    heroTo: '#4d7c0f',
    primary: '#166534',
    primaryDark: '#14532d',
    softBg: 'bg-green-50 dark:bg-green-950/40',
    softText: 'text-green-700 dark:text-green-400',
    softBorder: 'border-green-200 dark:border-green-900/40',
    chipBg: 'bg-green-100 dark:bg-green-900/40',
    chipText: 'text-green-700 dark:text-green-400',
  },
  {
    key: 'midnight',
    label: 'Minuit',
    heroFrom: '#0f172a',
    heroVia: '#1e293b',
    heroTo: '#334155',
    primary: '#334155',
    primaryDark: '#1e293b',
    softBg: 'bg-slate-100 dark:bg-slate-900/40',
    softText: 'text-slate-700 dark:text-slate-300',
    softBorder: 'border-slate-200 dark:border-slate-800',
    chipBg: 'bg-slate-100 dark:bg-slate-800',
    chipText: 'text-slate-700 dark:text-slate-300',
  },
];

export function getPublicTheme(key?: string | null): PublicTheme {
  return PUBLIC_THEMES.find((t) => t.key === key) ?? PUBLIC_THEMES[0];
}

/** Variables CSS injectées sur la racine de la page publique. */
export function themeCssVars(t: PublicTheme): React.CSSProperties {
  return {
    ['--pt-primary' as string]: t.primary,
    ['--pt-primary-dark' as string]: t.primaryDark,
    ['--pt-hero-from' as string]: t.heroFrom,
    ['--pt-hero-via' as string]: t.heroVia,
    ['--pt-hero-to' as string]: t.heroTo,
  } as React.CSSProperties;
}

/** Dégradé du hero (utilisé aussi pour l'overlay sur la bannière). */
export function heroGradient(t: PublicTheme): string {
  return `linear-gradient(135deg, ${t.heroFrom}, ${t.heroVia} 55%, ${t.heroTo})`;
}
