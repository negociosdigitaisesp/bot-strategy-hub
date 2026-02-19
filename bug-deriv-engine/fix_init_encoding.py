
import os

files = [
    r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\engine\__init__.py"
]

for fpath in files:
    print(f"Fixing {fpath}...")
    with open(fpath, "w", encoding="utf-8") as f:
        f.write("# engine package\n")
    print("Fixed.")
