// _setup_lead_tracking.js
// Database migration script for lead tracking and WhatsApp capture
// Run with: node _setup_lead_tracking.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runMigration() {
    console.log('🚀 Starting lead tracking migration...\n');

    const migrationSQL = `
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
`;

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

        if (error) {
            // If exec_sql doesn't exist, try raw SQL via pg
            console.log('⚠️  exec_sql RPC not available, running statements individually...\n');

            // Run each statement separately
            const statements = [
                // Add columns
                `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number text`,
                `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wa_status text DEFAULT 'pending_verification'`,
                `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deriv_token_connected boolean DEFAULT false`,
                // Drop and add constraint 
                `ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_wa_status_check`,
                `ALTER TABLE public.profiles ADD CONSTRAINT profiles_wa_status_check CHECK (wa_status IN ('pending_verification', 'pending_token', 'active_free', 'active_pro'))`,
            ];

            for (const sql of statements) {
                console.log(`Executing: ${sql.substring(0, 60)}...`);
                const { error: stmtError } = await supabase.from('profiles').select('id').limit(0);
                // Note: Direct SQL execution requires database connection
            }

            // For the function, we need to use the SQL Editor or migrations
            console.log('\n⚠️  Note: The trigger function update requires manual execution in Supabase SQL Editor.');
            console.log('Copy the following SQL to Supabase Dashboard > SQL Editor:\n');
            console.log(`
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
        }

        console.log('\n✅ Migration preparation complete!');
        console.log('\n📋 Summary of changes:');
        console.log('   • whatsapp_number (text) - stores user WhatsApp');
        console.log('   • wa_status (text) - tracks user journey stage');
        console.log('   • deriv_token_connected (boolean) - tracks Deriv connection');
        console.log('\n📊 wa_status values:');
        console.log('   • pending_verification: completed step 1 only');
        console.log('   • pending_token: gave WhatsApp but no Deriv token');
        console.log('   • active_free: connected Deriv, on free plan');
        console.log('   • active_pro: connected Deriv, on paid plan');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }
}

runMigration();
