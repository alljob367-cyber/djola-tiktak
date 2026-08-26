/**
 * Usage Service — server-side only.
 *
 * Handles voice credit consumption, completion, and usage summarisation
 * via Supabase RPC functions.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { UsageSummaryItem } from '@/types/database';
import { BillingServiceError } from './types';
import type { VoiceCreditResult } from './types';

// ── RPC return types (not in database.ts) ────────────────────

/** Row shape returned by the `consume_voice_credit` RPC. */
interface ConsumeVoiceCreditRow {
  allowed: boolean;
  usage_record_id: string | null;
  remaining: number;
  message: string;
}

// ── Service ──────────────────────────────────────────────────

export const usageService = {
  /**
   * Reserves a voice credit for a profile.
   *
   * Calls the `consume_voice_credit` RPC which atomically checks the
   * limit, creates a usage record, and returns the result.
   *
   * @param profileId   - The UUID of the profile consuming the credit.
   * @param referenceId - An opaque caller-provided ID for idempotency.
   * @param metadata    - Optional metadata to attach to the usage record.
   * @returns A {@link VoiceCreditResult}.
   */
  async consumeVoiceCredit(
    profileId: string,
    referenceId: string,
    metadata?: Record<string, unknown>,
  ): Promise<VoiceCreditResult> {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase.rpc('consume_voice_credit', {
      p_profile_id: profileId,
      p_reference_id: referenceId,
      p_metadata: metadata ?? {},
    });

    if (error) {
      throw new BillingServiceError(
        `Voice credit consumption failed for profile ${profileId}`,
        'VOICE_CREDIT_CONSUME_FAILED',
        500,
        { originalError: error.message, profileId, referenceId },
      );
    }

    // The RPC returns a TABLE, so `data` is the row object (or null)
    const row = data as ConsumeVoiceCreditRow | null;

    if (!row) {
      throw new BillingServiceError(
        'consume_voice_credit returned no data',
        'VOICE_CREDIT_NO_DATA',
        500,
        { profileId, referenceId },
      );
    }

    return {
      allowed: row.allowed,
      usageRecordId: row.usage_record_id,
      remaining: row.remaining,
      message: row.message,
    };
  },

  /**
   * Marks a previously reserved voice credit as completed or failed.
   *
   * @param usageRecordId - The UUID of the usage record to finalise.
   * @param success       - Whether the voice operation succeeded.
   */
  async completeVoiceCredit(
    usageRecordId: string,
    success: boolean,
  ): Promise<void> {
    const supabase = await createServiceRoleClient();

    const { error } = await supabase.rpc('complete_voice_credit', {
      p_usage_record_id: usageRecordId,
      p_success: success,
    });

    if (error) {
      throw new BillingServiceError(
        `Failed to complete voice credit ${usageRecordId}`,
        'VOICE_CREDIT_COMPLETE_FAILED',
        500,
        { originalError: error.message, usageRecordId, success },
      );
    }
  },

  /**
   * Retrieves the full usage summary for a profile.
   *
   * Delegates to the `get_usage_summary` RPC which returns one row
   * per feature with current usage, limit, and cost data.
   *
   * @param profileId - The UUID of the profile.
   * @returns An array of {@link UsageSummaryItem}.
   */
  async getUsageSummary(profileId: string): Promise<UsageSummaryItem[]> {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase.rpc('get_usage_summary', {
      p_profile_id: profileId,
    });

    if (error) {
      throw new BillingServiceError(
        `Failed to fetch usage summary for profile ${profileId}`,
        'USAGE_SUMMARY_FAILED',
        500,
        { originalError: error.message, profileId },
      );
    }

    return (data ?? []) as UsageSummaryItem[];
  },

  /**
   * Counts voice-generation usage records (reserved + completed) for a
   * profile since the given period start.
   *
   * This is useful when you need a direct DB count rather than the
   * RPC-based summary.
   *
   * @param profileId   - The UUID of the profile.
   * @param periodStart - ISO date string marking the start of the billing period.
   * @returns The number of voice-generation usage records in the period.
   */
  async getVoiceUsageForPeriod(
    profileId: string,
    periodStart: string,
  ): Promise<number> {
    const supabase = await createServiceRoleClient();

    const { count, error } = await supabase
      .from('usage_records')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('usage_type', 'voice_generation')
      .in('status', ['reserved', 'completed'])
      .gte('created_at', periodStart);

    if (error) {
      throw new BillingServiceError(
        `Failed to count voice usage for profile ${profileId}`,
        'VOICE_USAGE_COUNT_FAILED',
        500,
        { originalError: error.message, profileId, periodStart },
      );
    }

    return count ?? 0;
  },
} as const;
