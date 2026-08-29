/* ============================================================
 * ⚙️ INFORMATIONS DE LA SOCIÉTÉ — SOURCE UNIQUE
 * ------------------------------------------------------------
 * Ces valeurs alimentent AUTOMATIQUEMENT :
 *   • les 5 pages légales (/legal/mentions-legales, cgu, cgv,
 *     confidentialite, cookies)
 *   • le pied de page (email, téléphone, adresse)
 *
 * 👉 POUR PERSONNALISER, 2 SOLUTIONS (au choix) :
 *
 *   SOLUTION A — Modifier directement les valeurs ci-dessous :
 *     companyDisplay : 'Djola TikTak'
 *     companyLegal   : 'Djola TikTak SARL, société en cours de
 *                      constitution au Cameroun'
 *     companyAddress : 'Douala, Cameroun'
 *     email          : 'contact@djola-tiktak.com'
 *     phoneDisplay   : '+237 6 90 00 00 00'
 *
 *   SOLUTION B — (recommandé) Variables d'environnement Vercel,
 *     sans toucher au code :
 *     NEXT_PUBLIC_COMPANY_NAME        → nom commercial
 *     NEXT_PUBLIC_COMPANY_LEGAL       → forme juridique complète
 *     NEXT_PUBLIC_COMPANY_ADDRESS     → adresse du siège
 *     NEXT_PUBLIC_SUPPORT_EMAIL       → email de contact
 *     NEXT_PUBLIC_SUPPORT_PHONE       → téléphone (+237 6XX XXX XXX)
 * ============================================================ */

function envOr(value: string | undefined, fallback: string): string {
  const v = (value || '').trim();
  return v.length > 0 ? v : fallback;
}

export const COMPANY = {
  /** Nom commercial affiché (footer, documents légaux) */
  name: envOr(process.env.NEXT_PUBLIC_COMPANY_NAME, 'Djola TikTak'),

  /** Dénomination + forme juridique pour les mentions légales */
  legalName: envOr(
    process.env.NEXT_PUBLIC_COMPANY_LEGAL,
    'Djola TikTak, société en cours de constitution au Cameroun'
  ),

  /** Adresse du siège social */
  address: envOr(process.env.NEXT_PUBLIC_COMPANY_ADDRESS, 'Douala, Cameroun'),

  /** Email de contact / support */
  email: envOr(process.env.NEXT_PUBLIC_SUPPORT_EMAIL, 'contact@djola-tiktak.com'),

  /** Téléphone affiché */
  phone: envOr(process.env.NEXT_PUBLIC_SUPPORT_PHONE, '+237 6 90 00 00 00'),

  /** Lien cliquable tel: (numéro nettoyé) */
  get phoneHref(): string {
    return `tel:${this.phone.replace(/[^\d+]/g, '')}`;
  },
} as const;

/**
 * Remplace les balises des textes légaux par les vraies valeurs.
 * Balises supportées : {company} {legalName} {address} {email} {phone}
 */
export function fillLegalPlaceholders(text: string): string {
  return text
    .replaceAll('{company}', COMPANY.name)
    .replaceAll('{legalName}', COMPANY.legalName)
    .replaceAll('{address}', COMPANY.address)
    .replaceAll('{email}', COMPANY.email)
    .replaceAll('{phone}', COMPANY.phone);
}
