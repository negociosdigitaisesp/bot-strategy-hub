# -*- coding: utf-8 -*-
"""deploy_ws_pool.py — Faz upload apenas do ws_pool.py na VPS."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import paramiko

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
LOCAL  = r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\engine\ws_pool.py"
REMOTE = "/root/bug-deriv-engine/engine/ws_pool.py"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)
sftp = ssh.open_sftp()
sftp.put(LOCAL, REMOTE)
sftp.close()

# Verifica sintaxe na VPS
stdin, stdout, stderr = ssh.exec_command("python3 -c \"import ast; ast.parse(open('/root/bug-deriv-engine/engine/ws_pool.py').read()); print('VPS: Sintaxe OK')\"")
print(stdout.read().decode().strip())
err = stderr.read().decode().strip()
if err:
    print("ERR:", err)

# Lista arquivos
stdin, stdout, stderr = ssh.exec_command("find /root/bug-deriv-engine -type f | sort")
print("\nEstrutura na VPS:")
print(stdout.read().decode().strip())

ssh.close()
print("\nDeploy ws_pool.py concluido!")
