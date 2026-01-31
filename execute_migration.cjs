// execute_migration.cjs
// Direct SQL execution via Supabase REST API
// Run with: node execute_migration.cjs

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

async function executeMigration() {
    console.log('🚀 Executing SQL migration via REST API...\n');

    const migrationSQL = `
-- 1. Add WhatsApp and tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number text;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wa_status text DEFAULT 'pending_verification';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deriv_token_connected boolean DEFAULT false;

-- 2. Drop existing constraint if it exists
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_wa_status_check;

-- 3. Add new constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_wa_status_check 
CHECK (wa_status IN ('pending_verification', 'pending_token', 'active_free', 'active_pro'));
`;

    // Split into individual statements
    const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const sql of statements) {
        console.log(`Executing: ${sql.substring(0, 60)}...`);

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({ query: sql })
            });

            if (!response.ok) {
                const text = await response.text();
                console.log(`   ⚠️ RPC not available: ${response.status}`);
            } else {
                console.log('   ✅ Done');
            }
        } catch (err) {
            console.log(`   ⚠️ Error: ${err.message}`);
        }
    }

    // Update the trigger function
    const triggerSQL = `
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

    console.log('\n📝 Trigger function SQL (run manually in SQL Editor):');
    console.log(triggerSQL);

    console.log('\n✅ Migration attempt complete!');
    console.log('\n⚠️  Note: If RPC calls failed, run the SQL manually in Supabase Dashboard > SQL Editor');
    console.log('    The SQL file is at: supabase/migrations/add_lead_tracking.sql');
}

executeMigration();
