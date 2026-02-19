# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko, time

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
REMOTE = "/root/bug-deriv-engine"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)
print("=== DEBUG COMPLETO DA VPS ===\n")

def run(cmd, timeout=30):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    return o, e

def show(label, cmd, timeout=30):
    print(f"--- {label} ---")
    o, e = run(cmd, timeout)
    if o: print(o)
    if e: print("ERR:", e[:500])
    print()

# 1. Processo rodando?
show("PROCESSO PYTHON", "pgrep -la python3 || echo 'NENHUM PROCESSO PYTHON'")

# 2. Porta 8000 aberta?
show("PORTA 8000", "ss -tlnp | grep 8000 || echo 'PORTA 8000 NAO OUVINDO'")

# 3. Log completo
show("LOG COMPLETO (ultimas 50 linhas)", "tail -50 /tmp/bug_deriv.log 2>/dev/null || echo 'SEM LOG'")

# 4. Testar importacao do main.py
show("TESTE DE IMPORTACAO", f"cd {REMOTE} && python3 -c 'import config; import engine.ws_pool; print(\"imports OK\")' 2>&1")

# 5. Testar websockets instalado
show("WEBSOCKETS VERSION", "python3 -c 'import websockets; print(websockets.__version__)' 2>&1")

# 6. Arquivo main.py existe?
show("ARQUIVOS NA VPS", f"ls -la {REMOTE}/ && ls -la {REMOTE}/engine/")

# 7. Memoria e CPU
show("RECURSOS", "free -m | head -3 && echo '---' && uptime")

# 8. Testar inicio manual capturando stdout/stderr
print("--- TESTE DE INICIO (5 seg) ---")
o, e = run(f"cd {REMOTE} && timeout 5 python3 main.py 2>&1 || true", timeout=15)
print(o if o else "(sem saida)")
if e: print("STDERR:", e)
print()

ssh.close()
print("=== FIM DO DEBUG ===")
