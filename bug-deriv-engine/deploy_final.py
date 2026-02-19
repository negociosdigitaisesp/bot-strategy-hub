# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko, time

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
REMOTE = "/root/bug-deriv-engine"

SYSTEMD_SERVICE = """[Unit]
Description=Bug Deriv Signal Engine
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/bug-deriv-engine
ExecStart=/usr/bin/python3 /root/bug-deriv-engine/main.py
Restart=always
RestartSec=5
StandardOutput=append:/tmp/bug_deriv.log
StandardError=append:/tmp/bug_deriv.log

[Install]
WantedBy=multi-user.target
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)
print("Conectado!")

def run(cmd, timeout=30):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if o: print("  OUT:", o[:800])
    if e: print("  ERR:", e[:400])
    return o

# 1. Upload arquivos corrigidos
print("\n[1] Upload arquivos corrigidos...")
sftp = ssh.open_sftp()
sftp.put(r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\config.py",
         f"{REMOTE}/config.py")
sftp.put(r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\engine\payout_monitor.py",
         f"{REMOTE}/engine/payout_monitor.py")
sftp.put(r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\main.py",
         f"{REMOTE}/main.py")
print("  arquivos OK")

# 2. Escrever systemd service
print("\n[2] Criando systemd service...")
sftp.open('/etc/systemd/system/bug-deriv.service', 'w').write(SYSTEMD_SERVICE)
sftp.close()
print("  service file escrito")

# 3. Habilitar e iniciar via systemd
print("\n[3] Configurando systemd...")
run("systemctl daemon-reload")
run("systemctl enable bug-deriv")
run("pkill -9 -f 'python3.*main.py' 2>/dev/null; sleep 2")
run("systemctl start bug-deriv")
time.sleep(4)

# 4. Status
print("\n[4] Status do servico:")
run("systemctl status bug-deriv --no-pager -l | head -20")

# 5. Verificar porta
print("\n[5] Porta 8000:")
run("ss -tlnp | grep 8000 || echo 'NAO OUVINDO'")

# 6. Logs
print("\n[6] Logs iniciais:")
run("journalctl -u bug-deriv --no-pager -n 20 2>/dev/null || tail -20 /tmp/bug_deriv.log")

# 7. Rodar diagnóstico final
print("\n[7] Diagnostico final (gates):")
_, out, err = ssh.exec_command(f"cd {REMOTE} && python3 _diag.py 2>&1", timeout=30)
print(out.read().decode('utf-8', errors='replace'))

ssh.close()
print("\n=== DEPLOY COMPLETO ===")
