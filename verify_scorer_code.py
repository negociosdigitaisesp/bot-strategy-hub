"""
Simplified test to verify strategy_scorer.py code correctness
Checks if wins/losses are included in the payload
"""
import os
import re

def test_scorer_code():
    print("=" * 70)
    print("CODE VERIFICATION: strategy_scorer.py")
    print("=" * 70)
    
    scorer_path = r"c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps\engine\strategy_scorer.py"
    
    with open(scorer_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("\n1. Checking _score_strategy return dict...")
    # Check if wins and losses are in the return statement
    if '"wins": stats[\'wins\']' in content and '"losses": stats[\'losses\']' in content:
        print("   [OK] Found wins/losses in _score_strategy return dict")
    else:
        print("   [FAIL] MISSING wins/losses in _score_strategy return dict!")
        return False
    
    print("\n2. Checking _persist_scores payload...")
    # Check if wins and losses are in the payload
    if '"wins": data[\'wins\']' in content and '"losses": data[\'losses\']' in content:
        print("   [OK] Found wins/losses in _persist_scores payload")
    else:
        print("   [FAIL] MISSING wins/losses in _persist_scores payload!")
        return False
    
    print("\n3. Extracting _persist_scores method...")
    # Find the _persist_scores method
    persist_match = re.search(r'def _persist_scores\(self.*?\n(.*?)(?=\n    def |\nclass |\Z)', content, re.DOTALL)
    
    if persist_match:
        persist_code = persist_match.group(1)
        
        # Check if payload includes wins and losses
        payload_match = re.search(r'payload = \{(.*?)\}', persist_code, re.DOTALL)
        
        if payload_match:
            payload_content = payload_match.group(1)
            print("\n   Payload fields found:")
            
            # Extract all fields
            fields = re.findall(r'"(\w+)":', payload_content)
            for field in fields:
                marker = "[*]" if field in ['wins', 'losses'] else "   "
                print(f"   {marker} {field}")
            
            if 'wins' in fields and 'losses' in fields:
                print("\n   [OK] Payload includes wins and losses!")
            else:
                print("\n   [FAIL] Payload MISSING wins and/or losses!")
                return False
        else:
            print("   [WARN] Could not extract payload dict")
    else:
        print("   [WARN] Could not find _persist_scores method")
    
    print("\n" + "=" * 70)
    print("[SUCCESS] CODE VERIFICATION PASSED!")
    print("=" * 70)
    print("\nThe code looks correct. If wins/losses are still zero in Supabase,")
    print("the issue might be:")
    print("1. The bot needs to be restarted to load the new code")
    print("2. The columns don't exist in Supabase yet")
    print("3. The PerformanceMonitor is not providing wins/losses data")
    print("\nNext step: Deploy to VPS and restart the bot.")
    print("=" * 70)
    
    return True

if __name__ == "__main__":
    test_scorer_code()
