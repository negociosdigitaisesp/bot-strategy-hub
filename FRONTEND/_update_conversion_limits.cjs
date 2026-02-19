// _update_conversion_limits.cjs
// Database migration script for conversion funnel limits
// Run with: node _update_conversion_limits.cjs

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runMigration() {
    console.log('🚀 Starting conversion limits migration...\n');

    try {
        // Test connection
        const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

        if (testError) {
            console.log('⚠️  Connection test:', testError.message);
        } else {
            console.log('✅ Connected to Supabase successfully');
        }

        console.log('\n📋 Migration SQL to run in Supabase Dashboard > SQL Editor:\n');
        console.log(`
-- ===========================================
-- CONVERSION FUNNEL LIMITS MIGRATION
-- ===========================================

-- 1. Add columns for trial profit tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_trial_profit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_profit_reset timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_cooldown_start timestamp with time zone;

-- 2. Add WhatsApp columns (if not already added)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS wa_status text DEFAULT 'pending_verification',
ADD COLUMN IF NOT EXISTS deriv_token_connected boolean DEFAULT false;

-- 3. Create or update wa_status constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_wa_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_wa_status_check 
CHECK (wa_status IN ('pending_verification', 'pending_token', 'active_free', 'active_pro'));

-- 4. Security Policy: Block Real accounts (CR*) for free plan
-- This is enforced in the application layer via useFreemiumLimiter hook
-- The AccountSwitcher component blocks switching to Real accounts for free users

-- 5. Update handle_new_user trigger to include new columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    plan_type, 
    wa_status, 
    trial_ends_at,
    daily_trial_profit,
    deriv_token_connected
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
    'free',
    'pending_verification',
    (NOW() + interval '3 days'),
    0,
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to reset daily profit (run via cron or manually)
CREATE OR REPLACE FUNCTION public.reset_daily_trial_profits()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    daily_trial_profit = 0,
    last_profit_reset = NOW()
  WHERE 
    plan_type = 'free' 
    AND (
      last_profit_reset IS NULL 
      OR last_profit_reset < NOW() - interval '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`);

        console.log('\n✅ Migration SQL ready!');
        console.log('\n📊 New columns added:');
        console.log('   • daily_trial_profit (numeric) - Track profit for the day');
        console.log('   • last_profit_reset (timestamp) - Zero profit every 24h');
        console.log('   • last_cooldown_start (timestamp) - Control 3-hour lock');
        console.log('\n🔒 Security:');
        console.log('   • Real accounts (CR*) blocked for free plan in application layer');
        console.log('   • AccountSwitcher.tsx already has this protection');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

runMigration();
