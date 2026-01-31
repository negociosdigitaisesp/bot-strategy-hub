// _setup_lead_tracking.cjs
// Database migration script for lead tracking and WhatsApp capture
// Run with: node _setup_lead_tracking.cjs

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runMigration() {
    console.log('🚀 Starting lead tracking migration...\n');

    try {
        // Test connection by reading a profile
        const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

        if (testError) {
            console.log('⚠️  Connection test returned:', testError.message);
        } else {
            console.log('✅ Connected to Supabase successfully');
        }

        console.log('\n📋 Migration SQL to run in Supabase Dashboard > SQL Editor:\n');
        console.log(`
-- Lead Tracking Migration for Million Bots
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
`);

        console.log('\n✅ Migration preparation complete!');
        console.log('\n📊 wa_status values:');
        console.log('   • pending_verification: completed step 1 only');
        console.log('   • pending_token: gave WhatsApp but no Deriv token');
        console.log('   • active_free: connected Deriv, on free plan');
        console.log('   • active_pro: connected Deriv, on paid plan');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

runMigration();
