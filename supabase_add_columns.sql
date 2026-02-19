# SQL to add wins and losses columns to strategy_scores
# Execute this in Supabase Dashboard > SQL Editor if columns don't exist yet

ALTER TABLE public.strategy_scores 
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'strategy_scores' 
  AND column_name IN ('wins', 'losses');

-- Optional: Backfill data from strategy_performance
UPDATE public.strategy_scores AS scores
SET 
  wins = perf.wins,
  losses = perf.losses
FROM public.strategy_performance AS perf
WHERE scores.strategy_name = perf.strategy_name;
