"""
Execute SQL on Supabase using HTTP API
"""
import requests

# Supabase credentials
SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4"

def execute_sql():
    """
    Note: Supabase PostgREST API doesn't support DDL (ALTER TABLE) directly.
    You need to execute this SQL manually in Supabase Dashboard > SQL Editor:
    
    ALTER TABLE public.strategy_scores 
    ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
    """
    
    print("=" * 70)
    print("MANUAL SQL EXECUTION REQUIRED")
    print("=" * 70)
    print("\n1. Go to: https://supabase.com/dashboard/project/xwclmxjeombwabfdvyij/sql")
    print("\n2. Execute the following SQL:\n")
    print("-" * 70)
    print("""
ALTER TABLE public.strategy_scores 
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'strategy_scores' 
  AND column_name IN ('wins', 'losses');
    """)
    print("-" * 70)
    print("\n3. After executing, run: python backfill_strategy_scores.py")
    print("\n4. Then deploy to VPS: python deploy_to_vps.py")
    print("=" * 70)

if __name__ == "__main__":
    execute_sql()
