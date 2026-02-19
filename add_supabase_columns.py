"""
Add wins and losses columns to strategy_scores table in Supabase
"""
import psycopg2
from psycopg2 import sql

# Supabase connection string
CONNECTION_STRING = "postgresql://postgres:8JRDwROj5lc8jDuDXV8W3AZXP@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres"

def add_columns():
    print("Connecting to Supabase...")
    conn = psycopg2.connect(CONNECTION_STRING)
    cur = conn.cursor()
    
    try:
        # Add columns
        print("Adding wins and losses columns to strategy_scores...")
        cur.execute("""
            ALTER TABLE public.strategy_scores 
            ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
        """)
        conn.commit()
        print("✅ Columns added successfully!")
        
        # Verify columns were added
        print("\nVerifying columns...")
        cur.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'strategy_scores' 
              AND column_name IN ('wins', 'losses');
        """)
        
        results = cur.fetchall()
        print("\nColumns in strategy_scores:")
        for row in results:
            print(f"  - {row[0]}: {row[1]} (default: {row[2]})")
        
        if len(results) == 2:
            print("\n✅ SUCCESS: Both columns exist!")
        else:
            print(f"\n⚠️ WARNING: Expected 2 columns, found {len(results)}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
        print("\nConnection closed.")

if __name__ == "__main__":
    add_columns()
