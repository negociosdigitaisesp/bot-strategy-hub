import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
    console.log('🔍 Checking Supabase tables...\n');

    // Check strategy_scores
    console.log('1️⃣ Checking strategy_scores table:');
    const { data: scoresData, error: scoresError } = await supabase
        .from('strategy_scores')
        .select('*')
        .order('score', { ascending: false });

    if (scoresError) {
        console.error('❌ Error:', scoresError.message);
        if (scoresError.code === '42P01') {
            console.log('   Table does not exist');
        }
    } else {
        console.log(`✅ Found ${scoresData.length} rows`);
        if (scoresData.length > 0) {
            console.table(scoresData.slice(0, 3));
        }
    }

    // Check strategy_performance
    console.log('\n2️⃣ Checking strategy_performance table:');
    const { data: perfData, error: perfError } = await supabase
        .from('strategy_performance')
        .select('*')
        .order('win_rate', { ascending: false });

    if (perfError) {
        console.error('❌ Error:', perfError.message);
        if (perfError.code === '42P01') {
            console.log('   Table does not exist');
        }
    } else {
        console.log(`✅ Found ${perfData.length} rows`);
        if (perfData.length > 0) {
            console.table(perfData.slice(0, 3));
        }
    }

    // Recommendation
    console.log('\n📋 Recommendation:');
    if (scoresData && scoresData.length > 0) {
        console.log('✅ Use strategy_scores as primary source');
    } else if (perfData && perfData.length > 0) {
        console.log('⚠️  Use strategy_performance with calculated scores');
    } else {
        console.log('❌ No data found in either table - need to seed data');
    }
}

checkTables();
