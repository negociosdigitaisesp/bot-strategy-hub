import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkWinsLosses() {
    console.log('🔍 Checking wins/losses data in strategy_scores...\n');

    const { data, error } = await supabase
        .from('strategy_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log('📊 Sample data from strategy_scores:');
    console.table(data.map(s => ({
        name: s.strategy_name,
        score: s.score,
        total_trades: s.total_trades,
        expected_wr: s.expected_wr,
        recent_wr: s.recent_wr,
        // Check if wins/losses exist
        wins: s.wins,
        losses: s.losses,
    })));

    console.log('\n🔍 Full first row:');
    console.log(JSON.stringify(data[0], null, 2));

    // Calculate wins/losses from total_trades and win_rate
    console.log('\n💡 Calculated wins/losses:');
    const calculated = data.map(s => {
        const totalTrades = s.total_trades || 0;
        const winRate = s.expected_wr || 0;
        const calculatedWins = Math.round((totalTrades * winRate) / 100);
        const calculatedLosses = totalTrades - calculatedWins;

        return {
            name: s.strategy_name,
            total_trades: totalTrades,
            win_rate: winRate,
            calculated_wins: calculatedWins,
            calculated_losses: calculatedLosses,
        };
    });
    console.table(calculated);
}

checkWinsLosses();
