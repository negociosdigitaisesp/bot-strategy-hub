import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFrontendAccess() {
    console.log('🧪 Testing frontend data access (ANON key)...\n');

    // Test strategy_scores (primary source)
    console.log('1️⃣ Testing strategy_scores:');
    const { data: scoresData, error: scoresError } = await supabase
        .from('strategy_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

    if (scoresError) {
        console.error('❌ Error:', scoresError.message);
        console.log('   Code:', scoresError.code);
        if (scoresError.code === 'PGRST301') {
            console.log('   ⚠️  RLS is blocking access!');
        }
    } else {
        console.log(`✅ Success! Found ${scoresData.length} strategies`);
        if (scoresData.length > 0) {
            console.log('\n📊 Top 5 strategies:');
            console.table(scoresData.slice(0, 5).map(s => ({
                name: s.strategy_name,
                score: s.score,
                badge: s.badge,
                win_rate: s.expected_wr
            })));
        }
    }

    // Test strategy_performance (fallback)
    console.log('\n2️⃣ Testing strategy_performance (fallback):');
    const { data: perfData, error: perfError } = await supabase
        .from('strategy_performance')
        .select('*')
        .order('win_rate', { ascending: false })
        .limit(5);

    if (perfError) {
        console.error('❌ Error:', perfError.message);
    } else {
        console.log(`✅ Success! Found ${perfData.length} strategies`);
    }

    // Final verdict
    console.log('\n🎯 VERDICT:');
    if (!scoresError && scoresData && scoresData.length > 0) {
        console.log('✅ Frontend WILL display cards from strategy_scores');
        console.log(`   ${scoresData.length} cards will be shown`);
    } else if (!perfError && perfData && perfData.length > 0) {
        console.log('⚠️  Frontend will use FALLBACK (strategy_performance)');
        console.log(`   ${perfData.length} cards will be shown`);
    } else {
        console.log('❌ Frontend will show "Carregando..." (no data accessible)');
    }
}

testFrontendAccess();
