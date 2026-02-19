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

print("--- Aguardando sinais (15s) ---")
time.sleep(15)

print("\n--- Verificando logs por EV=-0.028 ---")
_, out, err = ssh.exec_command("journalctl -u bug-deriv --no-pager -n 50 | grep 'ev=-0.028'", timeout=30)
o = out.read().decode('utf-8', errors='replace').strip()
if o:
    print("SUCESSO: Sinais encontrados!")
    print(o)
else:
    print("ALERTA: Nenhum sinal com EV=-0.028 encontrado ainda.")
    # Debug: show full logs if grep fails
    print("\n--- Full Logs ---")
    _, out, _ = ssh.exec_command("journalctl -u bug-deriv --no-pager -n 20", timeout=30)
    print(out.read().decode('utf-8', errors='replace').strip())

ssh.close()
