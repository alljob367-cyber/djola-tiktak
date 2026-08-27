/*
 * Migration: Auto-trial on signup
 * 
 * Modifies the handle_new_user() trigger to automatically start
 * a 7-day Starter trial when a new user registers.
 * 
 * The start_trial() RPC (from subscription-migration.sql) creates the
 * subscription row, and the sync_profile_subscription trigger
 * automatically sets profile.subscription_status = 'trialing'.
 * 
 * Run: Paste into Supabase SQL Editor
 */

-- Replace the trigger function to also start a trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_trial_sub_id UUID;
BEGIN
  -- 1. Create the profile (original logic)
  INSERT INTO public.profiles (id, business_name, slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    'user-' || substr(NEW.id::text, 1, 8)
  );

  -- 2. Auto-start a 7-day Starter trial
  --    start_trial() is idempotent — it checks for existing active/trial subs.
  --    If it fails (e.g. subscriptions table doesn't exist yet), log but don't block signup.
  BEGIN
    SELECT start_trial(NEW.id) INTO v_trial_sub_id;
    INSERT INTO public.usage_records (
      subscription_id,
      feature_key,
      action,
      metadata
    ) VALUES (
      v_trial_sub_id,
      'trial_started',
      'auto_start',
      jsonb_build_object('triggered_by', 'handle_new_user')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't block user creation if trial fails
    RAISE NOTICE '[auto-trial] Could not start trial for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
