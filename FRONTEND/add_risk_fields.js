import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://xwclmxjeombwabfdvyij.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3M1Xw1IMCQ6iWMvgKdXPTA_ad4tGlth' 
);

const sql = `
ALTER TABLE iq_bots
ADD COLUMN IF NOT EXISTS take_profit NUMERIC(10, 2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS stop_loss NUMERIC(10, 2) DEFAULT 20.00,
ADD COLUMN IF NOT EXISTS martingale_steps INTEGER DEFAULT 2;
`;
console.log("Please run this SQL in Supabase dashboard SQL Editor:");
console.log(sql);
