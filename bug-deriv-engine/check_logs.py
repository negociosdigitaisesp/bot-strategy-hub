# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko, time

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

print("--- Aguardando mais 10s ---")
time.sleep(10)

print("\n--- Verificando logs SIGNAL_ENGINE ---")
_, out, err = ssh.exec_command("journalctl -u bug-deriv --no-pager -n 50 | grep 'SIGNAL_ENGINE'", timeout=30)
o = out.read().decode('utf-8', errors='replace').strip()
if o:
    print(o)
else:
    print("Nenhum sinal encontrado ainda.")

ssh.close()
