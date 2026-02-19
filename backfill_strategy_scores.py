"""
Backfill wins and losses from strategy_performance to strategy_scores
"""
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4"

def backfill_scores():
    print("Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Read all records from strategy_performance
        print("\nFetching data from strategy_performance...")
        perf_result = supabase.table("strategy_performance").select("*").execute()
        
        if not perf_result.data:
            print("No data found in strategy_performance table.")
            return
        
        print(f"Found {len(perf_result.data)} strategies in strategy_performance")
        
        # Update strategy_scores with wins and losses
        updated_count = 0
        for record in perf_result.data:
            strategy_name = record.get('strategy_name')
            wins = record.get('wins', 0)
            losses = record.get('losses', 0)
            
            if not strategy_name:
                continue
            
            print(f"\nUpdating {strategy_name}: wins={wins}, losses={losses}")
            
            try:
                # Update strategy_scores
                update_result = supabase.table("strategy_scores").update({
                    "wins": wins,
                    "losses": losses
                }).eq("strategy_name", strategy_name).execute()
                
                if update_result.data:
                    updated_count += 1
                    print(f"  [OK] Updated successfully")
                else:
                    print(f"  [SKIP] No matching record in strategy_scores (will be created on next score calculation)")
                    
            except Exception as e:
                print(f"  [ERROR] Failed to update: {e}")
        
        print(f"\n[DONE] Updated {updated_count} records in strategy_scores")
        
        # Verify results
        print("\nVerifying updates...")
        scores_result = supabase.table("strategy_scores").select("strategy_name, wins, losses, total_trades").execute()
        
        print("\nCurrent strategy_scores data:")
        for record in scores_result.data[:10]:  # Show first 10
            name = record.get('strategy_name', 'Unknown')
            wins = record.get('wins', 0)
            losses = record.get('losses', 0)
            total = record.get('total_trades', 0)
            print(f"  {name}: {wins}W / {losses}L (Total: {total})")
        
        if len(scores_result.data) > 10:
            print(f"  ... and {len(scores_result.data) - 10} more")
            
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    backfill_scores()
