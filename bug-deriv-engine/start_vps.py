# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko
import time

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
REMOTE = "/root/bug-deriv-engine"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)
print("Conectado!")

def run(cmd, timeout=60):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if o: print("  OUT:", o[:2000])
    if e: print("  ERR:", e[:500])
    return o

# 1. Check if already running from previous attempt
print("\n[CHECK] Processo atual:")
status = run("pgrep -la python3 2>/dev/null | grep main || echo 'NOT RUNNING'")

# 2. Install deps with --break-system-packages flag
print("\n[DEPS] Instalando websockets e dependencias...")
run(f"pip3 install --break-system-packages -q websockets", timeout=60)
print("websockets ok")

# 3. Kill old, start fresh
print("\n[RESTART] Reiniciando servidor...")
run("pkill -9 -f 'python3.*main.py' 2>/dev/null; sleep 1")

# Use setsid to properly detach the process
transport = ssh.get_transport()
channel = transport.open_session()
channel.exec_command(f"cd {REMOTE} && setsid nohup python3 main.py > /tmp/bug_deriv.log 2>&1 < /dev/null &")
time.sleep(5)
channel.close()

# 4. Verify
print("\n[STATUS] Verificando:")
run("pgrep -la python3 | grep main || echo 'NOT RUNNING'")
print("\n[LOGS] Ultimas linhas:")
run("tail -25 /tmp/bug_deriv.log")

# 5. Test port
print("\n[PORT] Verificando porta 8000:")
run("ss -tlnp | grep 8000 || echo 'PORTA 8000 NAO ENCONTRADA'")

ssh.close()
print("\nDone.")
