/**
 * Billing types for Djola TikTak.
 *
 * Re-exports relevant types from the database schema and defines
 * service-level types used across billing, entitlement, and usage services.
 */

// ── Re-exports from database types ───────────────────────────

export type {
  PlanId,
  SubscriptionDbStatus,
  SubscriptionStatus,
  BillingPeriod,
  UsageRecordStatus,
  Plan,
  PlanLimit,
  Subscription,
  SubscriptionInfo,
  UsageRecord,
  UsageSummaryItem,
  Profile,
} from '@/types/database';

import type {
  PlanId,
  SubscriptionDbStatus,
  BillingPeriod,
} from '@/types/database';

// ── BillingServiceError ──────────────────────────────────────

/**
 * Structured error thrown by all billing service methods.
 * Carries a machine-readable `code`, an HTTP `statusCode`,
 * and optional `details` for debugging.
 */
export class BillingServiceError extends Error {
  /** Machine-readable error code (e.g. 'SUBSCRIPTION_EXPIRED'). */
  public readonly code: string;
  /** Suggested HTTP status code for API responses. */
  public readonly statusCode: number;
  /** Optional extra context for debugging. */
  public readonly details: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'BillingServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ── EntitlementCheckResult ───────────────────────────────────

/**
 * Result of a feature-entitlement check.
 *
 * - `allowed` — whether the profile may use the feature.
 * - `limit`   — the plan's cap for this feature (-1 = unlimited).
 * - `current` — how many units have already been consumed.
 * - `remaining` — how many units are left (Infinity when unlimited).
 * - `message` — human-readable explanation when `allowed` is false.
 * - `upgradeUrl` — URL to redirect the user to for plan upgrades.
 */
export interface EntitlementCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  message?: string;
  upgradeUrl?: string;
}

// ── VoiceCreditResult ────────────────────────────────────────

/**
 * Result of a voice-credit consumption attempt.
 *
 * - `allowed` — whether the credit was successfully reserved.
 * - `usageRecordId` — the created usage record (null if not allowed).
 * - `remaining` — credits left after this reservation.
 * - `message` — human-readable status message.
 */
export interface VoiceCreditResult {
  allowed: boolean;
  usageRecordId: string | null;
  remaining: number;
  message: string;
}

// ── ConsumptionAlertLevel ────────────────────────────────────

/**
 * How close a profile is to exhausting a feature limit.
 *
 * | Level      | Threshold |
 * |------------|-----------|
 * | `none`      | < 70%    |
 * | `warning`   | >= 70%   |
 * | `critical`  | >= 85%   |
 * | `exhausted` | >= 100%  |
 */
export type ConsumptionAlertLevel = 'none' | 'warning' | 'critical' | 'exhausted';

// ── ProfileEntitlements (returned by entitlementService) ─────

/** Full snapshot of a profile's billing entitlements. */
export interface ProfileEntitlements {
  /** Current plan information. */
  plan: {
    id: PlanId;
  };
  /** Active subscription details, if any. */
  subscription: {
    id: string;
    status: SubscriptionDbStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    billingPeriod: BillingPeriod;
    cancelAtPeriodEnd: boolean;
  } | null;
  /** Trial details, if applicable. */
  trial: {
    isTrial: boolean;
    trialStart: string | null;
    trialEnd: string | null;
  };
  /** Per-feature usage snapshot from get_usage_summary. */
  limits: EntitlementCheckResult[];
}
