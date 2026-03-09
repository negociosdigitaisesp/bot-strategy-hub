import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('trade_history')
    .select('id, executed_at, broker, stake, profit, status')
    .eq('broker', 'deriv')
    .order('executed_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error("Error fetching trades:", error);
  } else {
    console.log("Last 10 trades:");
    console.table(data);
  }
}

check();
