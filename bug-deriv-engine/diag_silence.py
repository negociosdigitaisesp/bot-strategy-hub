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

print("\n--- Processo Python ---")
run_py = ssh.exec_command("ps aux | grep python")
print(run_py[1].read().decode('utf-8', errors='replace').strip())

print("\n--- Porta 8000 ---")
run_port = ssh.exec_command("netstat -tuln | grep 8000")
print(run_port[1].read().decode('utf-8', errors='replace').strip())

# Verificando se o loop de ticks está rodando (log debug)
print("\n--- Debug Log (últimas 20 linhas) ---")
run_log = ssh.exec_command("tail -n 20 /tmp/bug_deriv.log")
print(run_log[1].read().decode('utf-8', errors='replace').strip())

ssh.close()
