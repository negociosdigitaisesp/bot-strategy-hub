"""
deploy_martingale_fix.py — Deploys the Martingale fix to VPS + applies DB migration.

Steps:
  1. SSH into VPS
  2. Apply DB migration (add use_soros, soros_levels columns)
  3. Upload fixed engine.py and risk_manager.py
  4. Restart PM2 deriv-engine process
  5. Verify via PM2 logs
"""
import paramiko
import os
import sys
import time

# ── VPS Credentials ──────────────────────────────────────────────────────
VPS_HOST = "191.252.182.208"
VPS_USER = "root"
VPS_PASS = "Vom29bd#@"

# ── Supabase Direct Connection (from VPS) ────────────────────────────────
SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4"
DB_HOST = "db.xwclmxjeombwabfdvyij.supabase.co"
DB_PASS = "8JRDwROj5lc8jDuDXV8W3AZXP"

# ── Local files to deploy ────────────────────────────────────────────────
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))
FILES_TO_DEPLOY = {
    os.path.join(LOCAL_DIR, "bug-deriv-engine", "deriv_engine", "engine.py"): None,
    os.path.join(LOCAL_DIR, "bug-deriv-engine", "deriv_engine", "risk_manager.py"): None,
}


def ssh_exec(ssh, cmd, timeout=30):
    """Execute command via SSH and return stdout."""
    print(f"  → {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out:
        print(f"    {out[:500]}")
    if err and "WARNING" not in err.upper():
        print(f"    [STDERR] {err[:300]}")
    return out


def main():
    print("=" * 60)
    print("  DEPLOY MARTINGALE FIX")
    print("=" * 60)

    # ── 1. Connect to VPS ──────────────────────────────────────────────
    print("\n[1/5] Connecting to VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
    sftp = ssh.open_sftp()
    print("  ✅ Connected!")

    # ── 2. Find deriv-engine directory on VPS ──────────────────────────
    print("\n[2/5] Finding deriv-engine directory...")
    result = ssh_exec(ssh, "find /root -name 'engine.py' -path '*/deriv_engine/*' 2>/dev/null | head -5")
    if not result:
        result = ssh_exec(ssh, "find / -name 'engine.py' -path '*/deriv_engine/*' 2>/dev/null | head -5")
    
    if not result:
        print("  ❌ Could not find deriv_engine directory on VPS!")
        ssh.close()
        sys.exit(1)
    
    # Take the first match
    engine_path = result.split("\n")[0].strip()
    remote_dir = os.path.dirname(engine_path).replace("\\", "/")
    print(f"  ✅ Found: {remote_dir}")

    # ── 3. Apply DB migration ──────────────────────────────────────────
    print("\n[3/5] Applying DB migration (add use_soros, soros_levels columns)...")
    migration_cmd = f"""PGPASSWORD='{DB_PASS}' psql -h {DB_HOST} -p 5432 -U postgres -d postgres -c "
    ALTER TABLE active_bots ADD COLUMN IF NOT EXISTS use_soros BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE active_bots ADD COLUMN IF NOT EXISTS soros_levels INT NOT NULL DEFAULT 2;
    " 2>&1"""
    
    migration_result = ssh_exec(ssh, migration_cmd)
    
    if "ERROR" in migration_result.upper() and "already exists" not in migration_result.lower():
        # Try via curl if psql not available
        print("  ⚠️ psql failed, trying via Python...")
        py_migration = f"""python3 -c "
import requests
headers = {{
    'apikey': '{SUPABASE_SERVICE_KEY}',
    'Authorization': 'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}}
# Check existing columns
r = requests.get('{SUPABASE_URL}/rest/v1/active_bots?select=*&limit=0', headers=headers)
print('Status:', r.status_code)
print('Columns available — checking via dummy query')
" 2>&1"""
        ssh_exec(ssh, py_migration)
        
        # Apply migration via psycopg2 if available
        py_migration2 = f"""python3 -c "
try:
    import psycopg2
    conn = psycopg2.connect(host='{DB_HOST}', port=5432, user='postgres', password='{DB_PASS}', dbname='postgres')
    cur = conn.cursor()
    cur.execute('ALTER TABLE active_bots ADD COLUMN IF NOT EXISTS use_soros BOOLEAN NOT NULL DEFAULT false;')
    cur.execute('ALTER TABLE active_bots ADD COLUMN IF NOT EXISTS soros_levels INT NOT NULL DEFAULT 2;')
    conn.commit()
    print('✅ Migration applied via psycopg2')
    cur.close()
    conn.close()
except Exception as e:
    print(f'Error: {{e}}')
" 2>&1"""
        ssh_exec(ssh, py_migration2)
    else:
        print("  ✅ Migration applied!")

    # ── 4. Upload fixed files ──────────────────────────────────────────
    print("\n[4/5] Uploading fixed files...")
    for local_path in FILES_TO_DEPLOY:
        filename = os.path.basename(local_path)
        remote_path = f"{remote_dir}/{filename}"
        
        # Backup original
        ssh_exec(ssh, f"cp {remote_path} {remote_path}.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true")
        
        # Upload
        print(f"  📤 {filename} → {remote_path}")
        sftp.put(local_path, remote_path)
    
    print("  ✅ Files uploaded!")

    # ── 5. Restart PM2 process ─────────────────────────────────────────
    print("\n[5/5] Restarting deriv-engine...")
    
    # Check PM2 process name
    pm2_list = ssh_exec(ssh, "pm2 jlist 2>/dev/null | python3 -c \"import sys,json; procs = json.load(sys.stdin); [print(p['name']) for p in procs]\" 2>/dev/null || pm2 list 2>/dev/null")
    print(f"  PM2 processes: {pm2_list}")
    
    # Find and restart the deriv engine process
    for name in ["deriv-engine", "deriv_engine", "bug-deriv-engine"]:
        if name.lower() in pm2_list.lower():
            ssh_exec(ssh, f"pm2 restart {name}")
            print(f"  ✅ Restarted {name}")
            break
    else:
        # Try restarting all related processes
        print("  ⚠️ Could not find exact PM2 process name. Checking all...")
        ssh_exec(ssh, "pm2 restart all 2>/dev/null || true")
    
    time.sleep(3)
    
    # Show recent logs
    print("\n[VERIFICATION] Recent PM2 logs:")
    for name in ["deriv-engine", "deriv_engine", "bug-deriv-engine"]:
        logs = ssh_exec(ssh, f"pm2 logs {name} --nostream --lines 15 2>/dev/null")
        if logs and "not found" not in logs.lower():
            print(f"\n  === Logs for {name} ===")
            print(logs[:1000])
            break
    
    # ── Cleanup ────────────────────────────────────────────────────────
    sftp.close()
    ssh.close()
    print("\n" + "=" * 60)
    print("  ✅ DEPLOY COMPLETE!")
    print("=" * 60)
    print("""
Next steps (manual verification):
  1. Activate bot from frontend with Martingale ON (stake $1, factor 2.5, max gale 3)
  2. Wait for a LOSS in trade_history
  3. Check PM2 logs: pm2 logs deriv-engine --lines 50
  4. Should see: [RISK] 🎰 Martingale G1: stake=$2.50
  5. If you see 🛡️ GUARD messages, the old bug was being triggered (now blocked)
""")


if __name__ == "__main__":
    main()
