"""
Corrigir formatação no StrategyCard.tsx
"""
import os

FILE_PATH = r"c:\Users\bialo\OneDrive\Documentos\beckbug\FRONTEND\src\components\bots\StrategyCard.tsx"

# Read file
with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace {winRate} with {winRate.toFixed(1)}
old_line = "                                {winRate}<span className=\"text-sm text-gray-500 ml-0.5\">%</span>"
new_line = "                                {winRate.toFixed(1)}<span className=\"text-sm text-gray-500 ml-0.5\">%</span>"

if old_line in content:
    content = content.replace(old_line, new_line)
    print("✓ Found and replaced {winRate} with {winRate.toFixed(1)}")
    
    # Write back
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ File updated: {FILE_PATH}")
else:
    print("X Pattern not found in file")
    print(f"Looking for: '{old_line[:50]}...'")
