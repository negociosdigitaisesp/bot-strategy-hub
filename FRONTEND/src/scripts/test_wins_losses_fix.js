import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function simulateFrontendMapping() {
    console.log('🧪 Simulating frontend wins/losses mapping...\n');

    const { data: scoresData, error } = await supabase
        .from('strategy_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log('📊 Mapping strategies (same logic as useBotAstron.ts):\n');

    const mappedStrategies = scoresData.map((s) => {
        // Use actual wins/losses if available, otherwise calculate from total_trades
        let wins = s.wins || 0;
        let losses = s.losses || 0;

        // If both are 0 but we have total_trades, calculate them
        if (wins === 0 && losses === 0 && s.total_trades > 0) {
            const totalTrades = s.total_trades;
            const winRate = parseFloat(s.expected_wr) || 0;
            wins = Math.round((totalTrades * winRate) / 100);
            losses = totalTrades - wins;
            console.log(`📊 Calculated for ${s.strategy_name}: ${wins}W / ${losses}L from ${totalTrades} trades @ ${winRate}%`);
        } else if (wins > 0 || losses > 0) {
            console.log(`✅ Using DB values for ${s.strategy_name}: ${wins}W / ${losses}L`);
        }

        return {
            id: s.id,
            name: s.strategy_name,
            wins: wins,
            losses: losses,
            winRate: parseFloat(s.expected_wr) || 0,
            syncScore: parseFloat(s.score) || 0,
        };
    });

    console.log('\n📋 Final mapped data (what cards will display):');
    console.table(mappedStrategies.map(s => ({
        name: s.name,
        score: s.syncScore,
        win_rate: s.winRate + '%',
        wins: s.wins + ' Ganadas',
        losses: s.losses + ' Perdidas',
    })));

    console.log('\n✅ VERDICT:');
    const allHaveWins = mappedStrategies.every(s => s.wins > 0 || s.losses > 0);
    if (allHaveWins) {
        console.log('✅ All strategies now have wins/losses data!');
        console.log('   Cards will display correctly.');
    } else {
        console.log('⚠️  Some strategies still have 0 wins/losses');
        const zeroCount = mappedStrategies.filter(s => s.wins === 0 && s.losses === 0).length;
        console.log(`   ${zeroCount} strategies with 0/0`);
    }
}

simulateFrontendMapping();
