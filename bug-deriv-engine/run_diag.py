# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
REMOTE = "/root/bug-deriv-engine"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

# Upload diagnotico
sftp = ssh.open_sftp()
sftp.put(r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\_diag.py",
         f"{REMOTE}/_diag.py")
sftp.close()

_, out, err = ssh.exec_command(f"cd {REMOTE} && python3 _diag.py 2>&1", timeout=30)
o = out.read().decode('utf-8', errors='replace')
e = err.read().decode('utf-8', errors='replace')
print(o)
if e.strip():
    print("STDERR:", e[:1000])
ssh.close()
