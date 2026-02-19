import requests

headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U"
}

# Get one row to see schema
response = requests.get(
    "https://xwclmxjeombwabfdvyij.supabase.co/rest/v1/active_signals?select=*&limit=1",
    headers=headers
)

if response.status_code == 200:
    data = response.json()
    if data:
        print("SCHEMA COLUMNS:")
        for key in data[0].keys():
            print(f"  - {key}")
    else:
        print("No data in table, checking via OPTIONS...")
        # Try to get schema from table metadata
        print("\nTrying to insert a test record to see what fields are accepted...")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
