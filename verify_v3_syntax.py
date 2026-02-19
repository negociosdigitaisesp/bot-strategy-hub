
import sys
import os
import importlib.util
import traceback

def check_strategies():
    strategies_dir = r"c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps\strategies\tier1"
    files = [f for f in os.listdir(strategies_dir) if f.endswith("_V3.py")]
    
    print(f"[SEARCH] Found {len(files)} V3 strategies to check...")
    
    errors = 0
    for f in files:
        path = os.path.join(strategies_dir, f)
        print(f"[CHECK] Checking {f}...", end=" ")
        try:
            # Dynamic import
            spec = importlib.util.spec_from_file_location("module.name", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find class
            class_name = None
            for name in dir(module):
                if name.startswith("Strategy_") and name.endswith("_V3"):
                    class_name = name
                    break
            
            if class_name:
                # Instantiate
                cls = getattr(module, class_name)
                instance = cls()
                print(f"[OK] (ID: {instance.id}, Name: {instance.name})")
            else:
                print("[MISSING] Class not found!")
                errors += 1
                
        except Exception as e:
            print(f"[ERROR] {e}")
            traceback.print_exc()
            errors += 1
            
    if errors == 0:
        print("\n[SUCCESS] ALL V3 STRATEGIES PASSED SYNTAX CHECK!")
        sys.exit(0)
    else:
        print(f"\n[FAIL] {errors} ERRORS FOUND!")

        sys.exit(1)

if __name__ == "__main__":
    check_strategies()
