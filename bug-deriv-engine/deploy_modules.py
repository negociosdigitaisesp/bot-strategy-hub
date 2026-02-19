# -*- coding: utf-8 -*-
"""deploy_modules.py — Faz upload dos 3 novos modulos na VPS e verifica sintaxe."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import paramiko

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
BASE_LOCAL  = r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine"
BASE_REMOTE = "/root/bug-deriv-engine"

FILES = [
    ("engine/tick_router.py",    "engine/tick_router.py"),
    ("engine/payout_monitor.py", "engine/payout_monitor.py"),
    ("engine/qualificador.py",   "engine/qualificador.py"),
]

import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)
sftp = ssh.open_sftp()

for local_rel, remote_rel in FILES:
    local  = os.path.join(BASE_LOCAL, local_rel.replace("/", os.sep))
    remote = f"{BASE_REMOTE}/{remote_rel}"
    sftp.put(local, remote)
    print(f"Upload OK: {local_rel}")

sftp.close()

# Verifica sintaxe na VPS
check_cmd = (
    "python3 -c \""
    "import ast; "
    "files = ["
    "'/root/bug-deriv-engine/engine/tick_router.py',"
    "'/root/bug-deriv-engine/engine/payout_monitor.py',"
    "'/root/bug-deriv-engine/engine/qualificador.py',"
    "];"
    "[ast.parse(open(f).read()) or print('OK:', f.split('/')[-1]) for f in files]"
    "\""
)
stdin, stdout, stderr = ssh.exec_command(check_cmd)
print(stdout.read().decode().strip())
err = stderr.read().decode().strip()
if err:
    print("ERR:", err)

ssh.close()
print("\nDeploy concluido!")
