// ============================================================
// i18n côté serveur — lit la langue depuis le cookie `djt-lang`
// (posé par LanguageProvider). Fallback : français.
// Usage : const { t, lang, intl } = await getServerI18n();
// ============================================================

import { cookies } from 'next/headers';
import { DEFAULT_LANG, LANGS, LOCALES, type Lang } from './index';

export async function getServerI18n(): Promise<{
  lang: Lang;
  t: (typeof LOCALES)[Lang]['dict'];
  intl: string;
}> {
  const store = await cookies();
  const raw = store.get('djt-lang')?.value as Lang | undefined;
  const lang = raw && LANGS.includes(raw) ? raw : DEFAULT_LANG;
  return { lang, t: LOCALES[lang].dict, intl: LOCALES[lang].intl };
}

// Noms localisés — définis dans index.ts (client-safe), réexportés ici
export { localizedDayNames, localizedMonthNames } from './index';
