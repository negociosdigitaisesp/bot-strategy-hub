
import os
import shutil

def clean_local():
    base_strategies_dir = r"c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps\strategies"
    
    # Ensure archive dir exists in tier1
    archive_dir = os.path.join(base_strategies_dir, "tier1", "archive_v2")
    if not os.path.exists(archive_dir):
        os.makedirs(archive_dir)
        
    dirs_to_clean = ["tier1", "tier3"]
    
    for dir_name in dirs_to_clean:
        current_dir = os.path.join(base_strategies_dir, dir_name)
        if not os.path.exists(current_dir):
            continue
            
        print(f"[CLEAN] Cleaning {current_dir}...")
        
        for filename in os.listdir(current_dir):
            file_path = os.path.join(current_dir, filename)
            
            # Skip directories
            if os.path.isdir(file_path):
                continue
                
            # Skip __init__.py
            if filename == "__init__.py":
                continue
                
            # Identify non-V3 python files
            if filename.endswith(".py") and not filename.endswith("_V3.py"):
                print(f"  -> Moving {filename} to archive_v2...")
                # Move to central archive in tier1
                dest = os.path.join(base_strategies_dir, "tier1", "archive_v2", filename)
                try:
                    shutil.move(file_path, dest)
                except Exception as e:
                    print(f"  [WARN] Failed ot move {filename}: {e} (Maybe duplicate)")
                    os.remove(file_path) # Force delete if move fails

if __name__ == "__main__":
    clean_local()
