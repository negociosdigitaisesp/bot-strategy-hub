
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
    console.log('Seeding strategy_performance via Supabase JS (without active)...');

    const strategies = [
        { strategy_name: 'Quantum Shield V10', win_rate: 79, total_trades: 231 },
        { strategy_name: 'V75 Flow Sniper', win_rate: 83, total_trades: 107 },
        { strategy_name: 'Asian Dragon AI', win_rate: 79, total_trades: 57 },
        { strategy_name: 'Digit Weaver Pro', win_rate: 68, total_trades: 47 },
        { strategy_name: 'Micro-Scalper Alpha', win_rate: 52, total_trades: 23 },
        { strategy_name: 'MACD Flash V3', win_rate: 88, total_trades: 150 },
        { strategy_name: 'RSI Rapid V3', win_rate: 45, total_trades: 80 }
    ];

    const { data, error } = await supabase
        .from('strategy_performance')
        .upsert(strategies, { onConflict: 'strategy_name' })
        .select();

    if (error) {
        console.error('Error seeding data:', error.message);
    } else {
        console.log('Successfully seeded strategies:', data.length);
        console.table(data);
    }
}

seed();
