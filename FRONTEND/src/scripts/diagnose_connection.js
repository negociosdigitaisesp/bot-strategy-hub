import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log('Testing Supabase Connection via HTTP...');

    // Try to select from a known table or just check health
    // We'll try to list tables if possible, or just select from 'strategy_performance' to see if it exists
    const { data, error } = await supabase
        .from('strategy_performance')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error querying strategy_performance:', error.message);
        if (error.code === '42P01') {
            console.log('Table likely does not exist (42P01).');
        }
    } else {
        console.log('Successfully queried strategy_performance. Row count:', data.length);
    }

    console.log('Diagnosis complete.');
}

check();
