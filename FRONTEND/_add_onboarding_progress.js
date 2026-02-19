// Migration script to add onboarding_progress column to profiles table
const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

async function runMigration() {
    const sql = `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS onboarding_progress INTEGER[] DEFAULT '{}';
    `;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: sql }),
        });

        if (!response.ok) {
            // Try alternative approach using pg_query
            console.log('exec_sql not available, trying direct query approach...');

            // We'll use a workaround - update a profile with the new column
            // This will auto-fail gracefully if column doesn't exist
            const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.00000000-0000-0000-0000-000000000000`, {
                method: 'PATCH',
                headers: {
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ onboarding_progress: [] }),
            });

            if (testResponse.status === 400 || testResponse.status === 404) {
                console.log('Column may not exist. Please run this SQL in Supabase dashboard:');
                console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_progress INTEGER[] DEFAULT \'{}\';');
            } else {
                console.log('Migration check complete - column should exist or will be handled gracefully.');
            }
        } else {
            const result = await response.json();
            console.log('Migration result:', result);
        }
    } catch (error) {
        console.error('Migration error:', error);
        console.log('\n===== MANUAL MIGRATION REQUIRED =====');
        console.log('Please run this SQL in your Supabase SQL Editor:');
        console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_progress INTEGER[] DEFAULT \'{}\';');
        console.log('=====================================\n');
    }
}

runMigration();
