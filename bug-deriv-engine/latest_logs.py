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

print("\n--- Logs recentes (1 min) ---")
_, out, err = ssh.exec_command("journalctl -u bug-deriv --since '1 minute ago' --no-pager", timeout=30)
o = out.read().decode('utf-8', errors='replace').strip()
if o:
    print(o)
else:
    print("Nenhum log no último minuto.")

ssh.close()
