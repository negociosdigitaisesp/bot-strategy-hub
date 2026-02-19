-- Lead Tracking Migration
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Add WhatsApp and tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS wa_status text DEFAULT 'pending_verification',
ADD COLUMN IF NOT EXISTS deriv_token_connected boolean DEFAULT false;

-- 2. Drop existing constraint if it exists and create new one
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_wa_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_wa_status_check 
CHECK (wa_status IN ('pending_verification', 'pending_token', 'active_free', 'active_pro'));

-- 3. Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, plan_type, wa_status, trial_ends_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
    'free',
    'pending_verification',
    (NOW() + interval '3 days')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
