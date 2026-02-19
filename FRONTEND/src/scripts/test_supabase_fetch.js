import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFetch() {
    console.log('Testing Supabase connection with ANON key...');

    const { data, error } = await supabase
        .from('strategy_performance')
        .select('*')
        .order('win_rate', { ascending: false });

    if (error) {
        console.error('❌ Error fetching strategies:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));

        if (error.code === 'PGRST301') {
            console.log('\n⚠️  RLS POLICY ISSUE DETECTED!');
            console.log('The table exists but RLS is blocking access.');
            console.log('You need to enable public read access or disable RLS.');
        }
    } else {
        console.log('✅ Successfully fetched strategies:', data.length);
        console.table(data);
    }
}

testFetch();
