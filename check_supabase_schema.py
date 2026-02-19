"""
Add wins and losses columns to strategy_scores table using Supabase client
"""
from supabase import create_client, Client
import os

# Supabase credentials
SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4"

def add_columns():
    print("Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Execute SQL to add columns using RPC
        print("Adding wins and losses columns to strategy_scores...")
        
        # First, let's check current schema
        print("\nChecking current schema...")
        result = supabase.table("strategy_scores").select("*").limit(1).execute()
        if result.data:
            print(f"Current columns: {list(result.data[0].keys())}")
            if 'wins' in result.data[0] and 'losses' in result.data[0]:
                print("✅ Columns already exist!")
                return
        
        # Use Supabase SQL editor API or direct PostgreSQL connection
        # Since Supabase client doesn't support DDL directly, we'll use postgrest
        print("\n⚠️ Supabase Python client doesn't support DDL (ALTER TABLE).")
        print("Please execute the following SQL in Supabase Dashboard SQL Editor:")
        print("\n" + "="*60)
        print("""
ALTER TABLE public.strategy_scores 
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
        """)
        print("="*60)
        
        print("\nAlternatively, I'll proceed with updating the Python code.")
        print("The columns can be added manually via Supabase Dashboard.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    add_columns()
