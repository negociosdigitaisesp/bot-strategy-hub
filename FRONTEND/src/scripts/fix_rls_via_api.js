import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupRLS() {
    console.log('🔒 Setting up RLS policies via Supabase API...');

    const sqlCommands = [
        'ALTER TABLE strategy_performance ENABLE ROW LEVEL SECURITY',
        'DROP POLICY IF EXISTS "Enable read access for all users" ON strategy_performance',
        'CREATE POLICY "Enable read access for all users" ON strategy_performance FOR SELECT USING (true)',
    ];

    for (const sql of sqlCommands) {
        console.log(`\n📝 Executing: ${sql.substring(0, 60)}...`);

        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Error:', error.message);
            console.log('\n⚠️  The exec_sql function might not exist.');
            console.log('You need to run these SQL commands manually in Supabase SQL Editor:');
            console.log('\n--- COPY AND PASTE THIS IN SUPABASE SQL EDITOR ---\n');
            sqlCommands.forEach(cmd => console.log(cmd + ';'));
            console.log('\n--- END OF SQL COMMANDS ---\n');
            break;
        } else {
            console.log('✅ Success');
        }
    }

    // Test with ANON key
    console.log('\n🔍 Testing with ANON key...');
    const anonClient = createClient(
        SUPABASE_URL,
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U'
    );

    const { data, error } = await anonClient
        .from('strategy_performance')
        .select('*');

    if (error) {
        console.error('❌ ANON key still cannot read:', error.message);
    } else {
        console.log('✅ ANON key can now read:', data.length, 'rows');
        if (data.length > 0) {
            console.table(data.map(s => ({ name: s.strategy_name, win_rate: s.win_rate })));
        }
    }
}

setupRLS();
