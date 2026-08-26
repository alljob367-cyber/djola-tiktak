/**
 * Chariow Payment Provider — implements the PaymentProvider interface.
 *
 * Chariow is a Cameroonian/African payment platform.
 * This adapter wraps the Chariow API and exposes a standard
 * interface consumed by billing-service.ts.
 */

import type { PaymentProvider } from '../billing-service';
import type { PlanId, BillingPeriod } from '@/types/database';

// ── Chariow types (internal to this module) ───────────────────

interface ChariowCheckoutRequest {
  product_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: {
    number: string;
    country_code: string;
  };
  redirect_url?: string;
  custom_metadata?: Record<string, string>;
}

interface ChariowCheckoutResponse {
  message: string;
  data?: {
    step: 'payment' | 'completed' | 'already_purchased';
    message: string | null;
    purchase: {
      id: string;
      status: string;
      amount?: {
        value: number;
        formatted: string;
        currency: string;
      };
    } | null;
    payment: {
      checkout_url: string | null;
      transaction_id: string | null;
    } | null;
  };
  errors?: Record<string, string[]>;
}

// ── Chariow webhook payload (exported for webhook route) ──────

export interface ChariowWebhookPayload {
  event: string;
  data: {
    id: string;           // sale ID (sal_xxx)
    status: string;        // completed, refunded, etc.
    amount?: {
      value: number;
      formatted: string;
      currency: string;
    };
    product_id?: string;
    product_name?: string;
    customer?: {
      email: string;
      first_name: string;
      last_name: string;
    };
    custom_metadata?: Record<string, string>;
    created_at?: string;
    updated_at?: string;
  };
}

// ── Constants ────────────────────────────────────────────────

const CHARIOW_BASE_URL = 'https://api.chariow.com/v1';

/** Chariow product ID mapping (configured via env vars) */
const CHARIOW_PRODUCT_IDS: Record<PlanId, string> = {
  starter: process.env.CHARIOW_PRODUCT_STARTER || 'starter_product_id',
  pro: process.env.CHARIOW_PRODUCT_PRO || 'pro_product_id',
  business: process.env.CHARIOW_PRODUCT_BUSINESS || 'business_product_id',
};

// ── Helpers ──────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.CHARIOW_API_KEY;
  if (!key || key === 'placeholder' || key.startsWith('your_')) {
    throw new Error(
      'Chariow n\'est pas configuré. Veuillez définir CHARIOW_API_KEY dans les variables d\'environnement.',
    );
  }
  return key;
}

function getRedirectUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://djola-tiktak-alljob367-1277s-projects.vercel.app'
  ) + '/dashboard/subscription?payment=success';
}

function extractPhoneParts(phone: string): { number: string; country_code: string } {
  const cleaned = phone.replace(/[\s\-()]/g, '');

  if (cleaned.startsWith('+')) {
    const match = cleaned.match(/^\+(\d{1,3})(\d+)$/);
    if (match) {
      const countryCode = match[1];
      const number = match[2];
      const codeMap: Record<string, string> = {
        '237': 'CM', '228': 'TG', '229': 'BJ', '225': 'CI',
        '221': 'SN', '223': 'ML', '226': 'BF', '243': 'CD',
        '241': 'GA', '33': 'FR',
      };
      return { number, country_code: codeMap[countryCode] || 'CM' };
    }
  }

  return { number: cleaned.replace(/^\+/, ''), country_code: 'CM' };
}

function parseName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

// ── Provider implementation ──────────────────────────────────

export const chariowProvider: PaymentProvider = {
  name: 'chariow',

  async createCheckout(params: {
    profileId: string;
    planId: PlanId;
    planName: string;
    amount: number;
    currency: string;
    billingPeriod: BillingPeriod;
    email: string;
    fullName: string;
    phone: string;
  }): Promise<{ checkoutUrl: string; externalId: string }> {
    const apiKey = getApiKey();
    const { first_name, last_name } = parseName(params.fullName);
    const phoneParts = extractPhoneParts(params.phone);
    const productId = CHARIOW_PRODUCT_IDS[params.planId];

    if (
      !productId ||
      productId.startsWith('starter_product_id') ||
      productId.startsWith('pro_product_id') ||
      productId.startsWith('business_product_id')
    ) {
      throw new Error(
        'Le produit Chariow pour ce plan n\'est pas encore configuré. Veuillez contacter le support.',
      );
    }

    const body: ChariowCheckoutRequest = {
      product_id: productId,
      email: params.email,
      first_name,
      last_name,
      phone: phoneParts,
      redirect_url: getRedirectUrl(),
      custom_metadata: {
        profile_id: params.profileId,
        plan_id: params.planId,
        source: 'djola-tiktak',
      },
    };

    const response = await fetch(`${CHARIOW_BASE_URL}/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.message || errorData?.errors
        ? Object.values(errorData.errors as Record<string, string[]>).flat().join(', ')
        : `Erreur Chariow (${response.status})`;
      throw new Error(errorMessage);
    }

    const result: ChariowCheckoutResponse = await response.json();

    if (!result.data) {
      throw new Error('Réponse Chariow invalide : aucune donnée reçue.');
    }

    if (result.data.step === 'already_purchased') {
      throw new Error('Vous avez déjà acheté ce produit. Contactez le support si nécessaire.');
    }

    if (result.data.step === 'completed') {
      throw new Error('Ce produit est gratuit. Les abonnements nécessitent un produit payant.');
    }

    if (result.data.step === 'payment' && result.data.payment?.checkout_url && result.data.purchase?.id) {
      return {
        checkoutUrl: result.data.payment.checkout_url,
        externalId: result.data.purchase.id,
      };
    }

    throw new Error('Réponse Chariow inattendue : aucun URL de paiement reçu.');
  },

  verifyWebhook(_rawBody: string, _signature: string | null): boolean {
    const secret = process.env.CHARIOW_WEBHOOK_SECRET;
    if (!secret || secret === 'placeholder') {
      return true;
    }
    // Future: HMAC-SHA256 verification when Chariow supports it
    return true;
  },
} as const;
