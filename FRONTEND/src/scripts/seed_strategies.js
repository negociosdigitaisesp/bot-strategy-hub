import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
// Using SERVICE_ROLE key for seeding (has full access)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
    console.log('🌱 Seeding strategy_performance table...');

    const strategies = [
        { strategy_name: 'MACD Flash V3', win_rate: 88, total_trades: 150 },
        { strategy_name: 'V75 Flow Sniper', win_rate: 83, total_trades: 107 },
        { strategy_name: 'Quantum Shield V10', win_rate: 79, total_trades: 231 },
        { strategy_name: 'Asian Dragon AI', win_rate: 79, total_trades: 57 },
        { strategy_name: 'Digit Weaver Pro', win_rate: 68, total_trades: 47 },
        { strategy_name: 'Micro-Scalper Alpha', win_rate: 52, total_trades: 23 },
        { strategy_name: 'RSI Rapid V3', win_rate: 45, total_trades: 80 }
    ];

    // First, delete all existing data
    console.log('🗑️  Clearing existing data...');
    const { error: deleteError } = await supabase
        .from('strategy_performance')
        .delete()
        .neq('id', 0); // Delete all rows

    if (deleteError) {
        console.error('Error clearing data:', deleteError);
    } else {
        console.log('✅ Cleared existing data');
    }

    // Insert new data
    console.log('📝 Inserting new strategies...');
    const { data, error } = await supabase
        .from('strategy_performance')
        .insert(strategies)
        .select();

    if (error) {
        console.error('❌ Error seeding data:', error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Successfully seeded strategies:', data.length);
        console.table(data);
    }

    // Verify with ANON key
    console.log('\n🔍 Verifying data with ANON key...');
    const anonClient = createClient(
        SUPABASE_URL,
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U'
    );

    const { data: anonData, error: anonError } = await anonClient
        .from('strategy_performance')
        .select('*');

    if (anonError) {
        console.error('❌ ANON key cannot read data:', anonError.message);
        console.log('\n⚠️  RLS POLICY ISSUE!');
        console.log('You need to enable public read access on strategy_performance table.');
        console.log('Run this SQL in Supabase SQL Editor:');
        console.log('\nALTER TABLE strategy_performance ENABLE ROW LEVEL SECURITY;');
        console.log('CREATE POLICY "Enable read access for all users" ON strategy_performance FOR SELECT USING (true);');
    } else {
        console.log('✅ ANON key can read data:', anonData.length, 'rows');
    }
}

seed();
