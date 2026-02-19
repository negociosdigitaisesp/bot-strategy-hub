# -*- coding: utf-8 -*-
"""deploy_full.py — Deploy completo do bug-deriv-engine na VPS."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import paramiko
import os
import time

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
BASE_LOCAL  = r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine"
BASE_REMOTE = "/root/bug-deriv-engine"

# Files to upload
FILES = [
    ("main.py", "main.py"),
    ("config.py", "config.py"),
    ("requirements.txt", "requirements.txt"),
    ("install.sh", "install.sh"),
    ("state/cache.py", "state/cache.py"),
    ("engine/__init__.py", "engine/__init__.py"),
    ("engine/ws_pool.py", "engine/ws_pool.py"),
    ("engine/tick_router.py", "engine/tick_router.py"),
    ("engine/payout_monitor.py", "engine/payout_monitor.py"),
    ("engine/qualificador.py", "engine/qualificador.py"),
    ("engine/health_guard.py", "engine/health_guard.py"),
    ("engine/signal_engine.py", "engine/signal_engine.py"),
    ("engine/broadcaster.py", "engine/broadcaster.py"),
]

def run_command(ssh, cmd):
    print(f"Executando: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(f"STDOUT:\n{out}")
    if err: print(f"STDERR:\n{err}")
    return exit_status

def deploy():
    print(f"Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    
    # 1. Stop existing processes
    print("Stopping old processes...")
    # Be aggressive but safe: kill anything listening on port 8000
    run_command(ssh, "fuser -k 8000/tcp || true")
    # Kill python main.py specifically
    run_command(ssh, "pkill -f main.py || true")
    run_command(ssh, "pkill -f server.py || true")
    
    # 2. Upload files
    print("Uploading files...")
    sftp = ssh.open_sftp()
    
    # Ensure directories exist
    run_command(ssh, f"mkdir -p {BASE_REMOTE}/state {BASE_REMOTE}/engine")
    
    for local_rel, remote_rel in FILES:
        local_path = os.path.join(BASE_LOCAL, local_rel.replace("/", os.sep))
        remote_path = f"{BASE_REMOTE}/{remote_rel}"
        try:
            sftp.put(local_path, remote_path)
            print(f"Upload OK: {remote_rel}")
        except Exception as e:
            print(f"Upload ERROR {remote_rel}: {e}")
            
    sftp.close()
    
    # 3. Install dependencies
    print("Installing dependencies...")
    run_command(ssh, f"cd {BASE_REMOTE} && pip3 install -r requirements.txt")
    
    # 4. Configure Firewall
    print("Configuring Firewall...")
    run_command(ssh, "ufw allow 8000/tcp")
    run_command(ssh, "ufw reload")
    
    # 5. Start main.py in background
    print("Starting Main Engine...")
    start_cmd = f"cd {BASE_REMOTE} && nohup python3 main.py > output.log 2>&1 &"
    run_command(ssh, start_cmd)
    
    # 6. Verify Log Output
    time.sleep(3)
    print("Checking logs (tail)...")
    run_command(ssh, f"tail {BASE_REMOTE}/output.log")
    
    ssh.close()
    print("Deployment finished!")

if __name__ == "__main__":
    deploy()
