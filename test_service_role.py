import requests
import json

# Supabase credentials
SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.OlNxYFJOPVqwBPJyOvdGJnOBxbWTkJJCTIiGAWbQEgc"

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

# Test insert with service role key (bypasses RLS)
test_payload = {
    "asset": "TEST",
    "direction": "CALL",
    "expiry_seconds": 60,
    "strategy": "Test Strategy"
}

print("Testing insert with SERVICE_ROLE_KEY...")
response = requests.post(
    f"{SUPABASE_URL}/rest/v1/active_signals",
    headers=headers,
    json=test_payload
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 201:
    print("\n✓ Insert successful with service role key!")
    print("Solution: Update broadcaster.py to use SERVICE_ROLE_KEY instead of ANON_KEY")
else:
    print(f"\n✗ Insert failed even with service role key")
    print("Need to check RLS policies in Supabase dashboard")
