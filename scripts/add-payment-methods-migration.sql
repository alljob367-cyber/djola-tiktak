-- =============================================================
-- Migration: Add local payment methods to profiles table
-- Run this in your Supabase SQL Editor
-- =============================================================

-- Add payment method columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_methods_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS orange_money_phone TEXT,
  ADD COLUMN IF NOT EXISTS orange_money_name TEXT,
  ADD COLUMN IF NOT EXISTS mtn_momo_phone TEXT,
  ADD COLUMN IF NOT EXISTS mtn_momo_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- Add column for advance payment status on appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS prepayment_status TEXT DEFAULT 'none' CHECK (prepayment_status IN ('none', 'pending', 'paid', 'exempt'));

-- Add comment
COMMENT ON COLUMN profiles.payment_methods_enabled IS 'Whether the provider accepts advance payments from clients for priority booking';
COMMENT ON COLUMN profiles.orange_money_phone IS 'Orange Money phone number for receiving client payments';
COMMENT ON COLUMN profiles.orange_money_name IS 'Orange Money account holder name';
COMMENT ON COLUMN profiles.mtn_momo_phone IS 'MTN Mobile Money phone number for receiving client payments';
COMMENT ON COLUMN profiles.mtn_momo_name IS 'MTN Mobile Money account holder name';
COMMENT ON COLUMN profiles.payment_instructions IS 'Custom payment instructions shown to clients';
COMMENT ON COLUMN appointments.prepayment_status IS 'Status of advance payment: none (free), pending, paid, or exempt';
