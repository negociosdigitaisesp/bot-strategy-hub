-- Add wins and losses columns to strategy_scores table
ALTER TABLE public.strategy_scores 
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'strategy_scores' 
  AND column_name IN ('wins', 'losses');
