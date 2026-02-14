
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkStrategies() {
    console.log('Fetching last 20 signals...');
    const { data, error } = await supabase
        .from('active_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Found signals:');
        data.forEach(s => {
            console.log(`- ID: ${s.id}, Strategy: ${s.strategy}, Asset: ${s.asset}`);
        });

        // Unique strategies
        const strategies = [...new Set(data.map(s => s.strategy))];
        console.log('\nUnique Strategies found:', strategies);
    } else {
        console.log('No signals found in active_signals table.');
    }
}

checkStrategies();
