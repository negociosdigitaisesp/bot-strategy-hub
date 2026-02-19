# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
REMOTE_FILE = "/root/bug-deriv-engine/engine/ws_pool.py"

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    
    cmd = f"python3 -c \"print(open('{REMOTE_FILE}', 'rb').read(20))\""
    print(f"CMD: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    check()
