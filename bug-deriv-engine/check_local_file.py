
import os

files = [
    r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\config.py",
    r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\main.py",
    r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\engine\__init__.py"
]

for file_path in files:
    print(f"Checking {file_path}...")
    try:
        with open(file_path, "rb") as f:
            content = f.read()
            if b"\x00" in content:
                print(f"FAIL: Null byte found in {file_path}")
                idx = content.find(b"\x00")
                print(f"First null byte at index {idx}")
            else:
                print("PASS: No null bytes found.")
                
            try:
                content.decode('utf-8')
                print("PASS: Valid UTF-8.")
            except UnicodeDecodeError:
                print("FAIL: Invalid UTF-8.")
                
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
