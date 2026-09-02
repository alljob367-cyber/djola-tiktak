// ============================================================
// Djola TikTak — Calcul de l'acompte à la réservation
// (migration deposit v2.0.0 — anti no-show)
// ------------------------------------------------------------
// Le montant est TOUJOURS calculé côté serveur : le client ne
// peut pas choisir ni falsifier le montant de l'acompte.
// Base de calcul = prix du service − remise code promo (jamais
// négatif). Arrondi au franc supérieur pour éviter les pertes.
// ============================================================

export interface DepositConfigLike {
  deposit_enabled?: boolean | null;
  deposit_type?: 'percent' | 'fixed' | null;
  deposit_value?: number | null;
}

/**
 * Calcule le montant d'acompte demandé pour un service.
 * Retourne 0 si l'acompte n'est pas activé ou mal configuré.
 */
export function computeDepositAmount(
  service: DepositConfigLike & { price?: number | null },
  discountAmount = 0,
): number {
  if (!service?.deposit_enabled) return 0;
  const value = Math.max(0, Number(service.deposit_value ?? 0));
  if (value <= 0) return 0;

  const base = Math.max(0, Math.floor(Number(service.price ?? 0)) - Math.max(0, Math.floor(discountAmount)));

  if (service.deposit_type === 'fixed') {
    // Montant fixe, plafonné au prix (après remise)
    return Math.min(value, base);
  }

  // Pourcentage (0-100) du prix après remise, arrondi au franc supérieur
  const pct = Math.min(100, Math.max(0, value));
  return Math.ceil((base * pct) / 100);
}

/**
 * Règle d'acompte normalisée (pour l'UI dashboard).
 * Retourne null si l'acompte est désactivé ou mal configuré.
 */
export function describeDepositRule(service: DepositConfigLike): { type: 'percent' | 'fixed'; value: number } | null {
  if (!service?.deposit_enabled) return null;
  const value = Math.max(0, Number(service.deposit_value ?? 0));
  if (value <= 0) return null;
  return { type: service.deposit_type === 'fixed' ? 'fixed' : 'percent', value };
}
