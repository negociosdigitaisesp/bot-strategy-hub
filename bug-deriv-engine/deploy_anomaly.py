# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko, time

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
REMOTE = "/root/bug-deriv-engine/engine"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)
print("Conectado ao VPS!")

def run(cmd, timeout=30):
    print(f"> {cmd}")
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if o: print(o)
    if e: print("ERR:", e[:300])
    return o

# 1. Upload dos arquivos modificados
print("\n[1] Uploading qualificador.py...")
sftp = ssh.open_sftp()
local_qual = r"c:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\engine\qualificador.py"
remote_qual = f"{REMOTE}/qualificador.py"
sftp.put(local_qual, remote_qual)
print("qualificador.py OK.")

print("[2] Uploading signal_engine.py...")
local_sig = r"c:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\engine\signal_engine.py"
remote_sig = f"{REMOTE}/signal_engine.py"
sftp.put(local_sig, remote_sig)
print("signal_engine.py OK.")
sftp.close()

# 2. Restart do serviço
print("\n[3] Reiniciando serviço bug-deriv...")
run("systemctl restart bug-deriv")
time.sleep(3)

# 3. Status e Logs
print("\n[4] Status e Logs:")
run("systemctl status bug-deriv --no-pager | head -10")
print("\n--- Últimos logs (verifica se estratégia de anomalia iniciou) ---")
run("journalctl -u bug-deriv --no-pager -n 20")

ssh.close()
print("\n=== DEPLOY FINALIZADO ===")
