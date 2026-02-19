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

print("\n--- Aguardando mais 30s ---")
time.sleep(30)

print("\n--- Verificando logs com digito_anomalo ---")
# Filtra logs que contenham "digito_anomalo"
_, out, err = ssh.exec_command("journalctl -u bug-deriv --no-pager -n 50 | grep 'estabilidade_p'", timeout=30)
o = out.read().decode('utf-8', errors='replace').strip()
if o:
    print(o)
else:
    print("Nenhum sinal de anomalia encontrado ainda.")
    # Fallback: ver todos os logs recentes do engine
    print("\n--- Logs Gerais SIGNAL_ENGINE ---")
    _, out, _ = ssh.exec_command("journalctl -u bug-deriv --no-pager -n 20 | grep 'SIGNAL_ENGINE'", timeout=30)
    print(out.read().decode('utf-8', errors='replace').strip())

ssh.close()
