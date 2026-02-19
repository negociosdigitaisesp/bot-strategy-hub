import sys
import os

# Add project to path
project_path = os.path.join(os.path.dirname(__file__), 'million_bots_vps')
sys.path.insert(0, project_path)

# Change to project directory for .env loading
os.chdir(project_path)

from engine.strategy_scorer import StrategyScorer
from engine.database.supabase_manager import SupabaseManager
from dotenv import load_dotenv

# Load environment
load_dotenv('.env')

def test_scoring_persistence():
    print("=" * 70)
    print("TEST: Strategy Scorer Wins/Losses Persistence")
    print("=" * 70)
    
    # Initialize components
    print("\n1. Initializing Supabase connection...")
    db = SupabaseManager()
    
    print("2. Initializing StrategyScorer...")
    scorer = StrategyScorer(db_manager=db)
    
    # Create mock performance data
    print("\n3. Creating mock performance data...")
    mock_monitor = type('obj', (object,), {
        'strategy_stats': {
            'Test Strategy V3': {
                'wins': 100,
                'losses': 50,
                'history': [1] * 100 + [0] * 50,  # 100 wins, 50 losses
            }
        },
        'get_win_rate': lambda self, name, window: 66.7
    })()
    
    mock_regime = {
        'micro': 'TRENDING_UP',
        'macro': 'MOD_VOL',
        'regime_key': 'TREND_MOD',
        'adx': 35,
        'atr_percentile': 50
    }
    
    # Calculate scores
    print("\n4. Calculating scores...")
    scores = scorer.calculate_scores(mock_monitor, mock_regime)
    
    # Verify data structure
    print("\n5. Verifying data structure...")
    if 'Test Strategy V3' in scores:
        data = scores['Test Strategy V3']
        print(f"\n   Strategy: Test Strategy V3")
        print(f"   Score: {data['score']}")
        print(f"   Total Trades: {data['total_trades']}")
        print(f"   Wins: {data.get('wins', 'MISSING!')}")
        print(f"   Losses: {data.get('losses', 'MISSING!')}")
        
        if 'wins' in data and 'losses' in data:
            print("\n   ✅ Wins and Losses are in the data dict!")
            
            # Check if they were persisted to Supabase
            print("\n6. Checking Supabase strategy_scores table...")
            try:
                result = db.client.table("strategy_scores").select("*").eq("strategy_name", "Test Strategy V3").execute()
                
                if result.data:
                    record = result.data[0]
                    print(f"\n   Supabase Record:")
                    print(f"   - strategy_name: {record.get('strategy_name')}")
                    print(f"   - score: {record.get('score')}")
                    print(f"   - total_trades: {record.get('total_trades')}")
                    print(f"   - wins: {record.get('wins', 'MISSING!')}")
                    print(f"   - losses: {record.get('losses', 'MISSING!')}")
                    
                    if record.get('wins') == 100 and record.get('losses') == 50:
                        print("\n   ✅✅ SUCCESS! Wins and Losses persisted correctly to Supabase!")
                    else:
                        print(f"\n   ❌ FAILED! Expected wins=100, losses=50")
                        print(f"      Got wins={record.get('wins')}, losses={record.get('losses')}")
                else:
                    print("\n   ⚠️ No record found in Supabase (might be first run)")
                    
            except Exception as e:
                print(f"\n   ❌ Error querying Supabase: {e}")
        else:
            print("\n   ❌ FAILED! Wins and/or Losses missing from data dict!")
    else:
        print("\n   ❌ Test strategy not found in scores!")
    
    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    test_scoring_persistence()
