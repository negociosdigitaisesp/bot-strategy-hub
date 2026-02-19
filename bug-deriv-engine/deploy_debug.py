# -*- coding: utf-8 -*-
"""deploy_debug.py — Deploy com verificação de tamanho de arquivo."""
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

def run_command(ssh, cmd):
    print(f"CMD: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(f"STDOUT: {out}")
    if err: print(f"STDERR: {err}")
    return exit_status

def deploy():
    print(f"Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    
    # Check ws_pool.py specifically
    local_pool = os.path.join(BASE_LOCAL, "engine", "ws_pool.py")
    local_size = os.path.getsize(local_pool)
    print(f"Local engine/ws_pool.py size: {local_size} bytes")
    
    # Upload clean
    print("Uploading engine/ws_pool.py...")
    sftp = ssh.open_sftp()
    remote_pool = f"{BASE_REMOTE}/engine/ws_pool.py"
    
    # Ensure dir exists
    run_command(ssh, f"mkdir -p {BASE_REMOTE}/engine")
    
    sftp.put(local_pool, remote_pool)
    sftp.close()
    
    # Check remote size
    print("Checking remote size...")
    run_command(ssh, f"ls -l {remote_pool}")
    run_command(ssh, f"stat -c%s {remote_pool}")
    
    # Try importing just that file
    print("Testing import...")
    run_command(ssh, f"python3 -c \"import sys; sys.path.append('{BASE_REMOTE}'); import engine.ws_pool; print('Import OK')\"")
    
    ssh.close()

if __name__ == "__main__":
    deploy()
