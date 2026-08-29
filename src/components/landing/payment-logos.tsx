'use client';

/* ============================================================
 * Badges SVG des moyens de paiement acceptés
 * (Marques simplifiées, usage indicatif d'acceptation)
 * ============================================================ */

function Badge({
  children,
  label,
  className = '',
  bg = '#ffffff',
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  bg?: string;
}) {
  return (
    <div
      title={label}
      className={`flex h-9 w-[60px] items-center justify-center overflow-hidden rounded-md border border-white/15 px-1.5 shadow-sm transition-transform duration-300 hover:scale-105 ${className}`}
      style={{ background: bg }}
    >
      {children}
    </div>
  );
}

/** Orange Money — orange, texte blanc */
export function OrangeMoneyBadge() {
  return (
    <Badge label="Orange Money" bg="#FF7900">
      <svg viewBox="0 0 100 40" className="h-full w-auto" role="img" aria-label="Orange Money">
        <text
          x="50" y="26"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="700"
          fontSize="17"
          fill="#ffffff"
        >
          Orange
        </text>
      </svg>
    </Badge>
  );
}

/** MTN Mobile Money — jaune, texte noir */
export function MtnMomoBadge() {
  return (
    <Badge label="MTN Mobile Money" bg="#FFCC00">
      <svg viewBox="0 0 100 40" className="h-full w-auto" role="img" aria-label="MTN MoMo">
        <text
          x="50" y="27"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="900"
          fontSize="19"
          fill="#000000"
          letterSpacing="0.5"
        >
          MTN
        </text>
      </svg>
    </Badge>
  );
}

/** Visa — blanc, texte bleu italique */
export function VisaBadge() {
  return (
    <Badge label="Visa">
      <svg viewBox="0 0 100 40" className="h-full w-auto" role="img" aria-label="Visa">
        <text
          x="50" y="27"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontStyle="italic"
          fontWeight="800"
          fontSize="18"
          fill="#1A1F71"
          letterSpacing="1"
        >
          VISA
        </text>
      </svg>
    </Badge>
  );
}

/** Mastercard — deux cercles qui se chevauchent */
export function MastercardBadge() {
  return (
    <Badge label="Mastercard">
      <svg viewBox="0 0 100 40" className="h-full w-auto" role="img" aria-label="Mastercard">
        <circle cx="42" cy="20" r="13" fill="#EB001B" />
        <circle cx="58" cy="20" r="13" fill="#F79E1B" fillOpacity="0.9" />
      </svg>
    </Badge>
  );
}

/** PayPal — double P bicolore */
export function PaypalBadge() {
  return (
    <Badge label="PayPal">
      <svg viewBox="0 0 100 40" className="h-full w-auto" role="img" aria-label="PayPal">
        <text
          x="50" y="27"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontStyle="italic"
          fontWeight="800"
          fontSize="16"
          fill="#003087"
        >
          Pay<tspan fill="#009CDE">Pal</tspan>
        </text>
      </svg>
    </Badge>
  );
}

/** Chariow — agrégateur de paiement local Cameroun */
export function ChariowBadge() {
  return (
    <Badge label="Chariow" bg="#0E1B33">
      <svg viewBox="0 0 100 40" className="h-full w-auto" role="img" aria-label="Chariow">
        <circle cx="16" cy="20" r="8" fill="#2E9BF0" />
        <text
          x="58" y="26"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="700"
          fontSize="16"
          fill="#2E9BF0"
        >
          chariow
        </text>
      </svg>
    </Badge>
  );
}

/** Rangée complète des moyens de paiement */
export function PaymentLogosRow({ compact = false }: { compact?: boolean }) {
  const scale = compact ? 'scale-90 sm:scale-100' : '';
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${scale}`}>
      <OrangeMoneyBadge />
      <MtnMomoBadge />
      <ChariowBadge />
      <VisaBadge />
      <MastercardBadge />
      <PaypalBadge />
    </div>
  );
}
