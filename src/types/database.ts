// ============================================================
// Djola TikTak — TypeScript types matching the PostgreSQL schema
// ============================================================

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ReminderChannel = 'email' | 'whatsapp' | 'sms' | 'voice';
export type ReminderStatus = 'pending' | 'sent' | 'failed';

export interface Profile {
  id: string;
  business_name: string;
  slug: string | null;
  description: string;
  phone: string;
  email: string;
  avatar_url: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Subscription columns (added by subscription migration)
  plan?: PlanId | null;
  subscription_status?: SubscriptionDbStatus | null;
  subscription_start?: string | null;
  subscription_end?: string | null;
  subscription_id?: string | null;
  chariow_customer_id?: string | null;
  // Social media links
  whatsapp_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  website_url?: string | null;
  // Local payment methods for client advance payment
  payment_methods_enabled?: boolean | null;
  orange_money_phone?: string | null;
  orange_money_name?: string | null;
  mtn_momo_phone?: string | null;
  mtn_momo_name?: string | null;
  payment_instructions?: string | null;
}

export interface Service {
  id: string;
  profile_id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  profile_id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  profile_id: string;
  service_id: string;
  client_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlockedSlot {
  id: string;
  profile_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  appointment_id: string;
  channel: string;
  status: string;
  sent_at: string | null;
  error_message: string;
  created_at: string;
}

// Joined types for API responses
export interface AppointmentWithDetails extends Appointment {
  service: Service;
  client: Client;
}

export interface ProfileWithServices extends Profile {
  services: Service[];
}

// Available slot computed type
export interface AvailableSlot {
  starts_at: Date;
  ends_at: Date;
}

// Booking form input
export interface BookingInput {
  service_id: string;
  starts_at: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  notes?: string;
}

// ============================================================
// Billing & Subscription types (matching subscription-migration.sql)
// ============================================================

export type PlanId = 'starter' | 'pro' | 'business';

export type BillingPeriod = 'monthly' | 'yearly';

export type SubscriptionDbStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'none';

/** Application-level status derived from DB status + date checks. */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';

export type UsageRecordStatus =
  | 'reserved'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  tier_priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Computed feature list for UI display (not a DB column). */
  features?: Array<{ key: string; label: string; included: boolean }>;
}

export interface PlanLimit {
  id: string;
  plan_id: PlanId;
  limit_key: string;
  limit_value: number;
  cost_per_unit?: number;
  unit_label?: string;
  created_at: string;
  updated_at?: string;
}

export interface Subscription {
  id: string;
  profile_id: string;
  plan_id: PlanId;
  status: SubscriptionDbStatus;
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight subscription info derived from the profile row. */
export interface SubscriptionInfo {
  plan: PlanId;
  subscription_status: SubscriptionDbStatus;
  subscription_start: string | null;
  subscription_end: string | null;
  is_active: boolean;
  is_trial: boolean;
  days_remaining: number | null;
  trial_end: string | null;
}

export interface Payment {
  id: string;
  profile_id: string;
  plan_id: PlanId;
  plan_name: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  billing_period: BillingPeriod;
  external_id: string | null;
  external_status: string | null;
  checkout_url: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  provider_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  profile_id: string;
  usage_type: string;
  status: UsageRecordStatus;
  credits_used: number;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

/** Row returned by the `get_usage_summary` RPC. */
export interface UsageSummaryItem {
  feature_key: string;
  feature_label: string;
  limit_key: string;
  limit_value: number;
  current_usage: number;
  remaining: number;
  unit_label?: string;
}
