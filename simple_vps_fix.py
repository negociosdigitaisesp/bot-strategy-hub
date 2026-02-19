# -*- coding: utf-8 -*-
"""
Simple VPS fix without complex output
"""
import paramiko
import os

VPS_HOST = "vps64469.publiccloud.com.br"
VPS_USER = "root"
VPS_PASSWORD = "Vom29bd#@"

print("Conectando...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=VPS_HOST, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
sftp = ssh.open_sftp()

# Copy .env
print("Copiando .env...")
local_env = r"c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps\.env"
if os.path.exists(local_env):
    sftp.put(local_env, "/root/million_bots_vps/.env")
    print("OK: .env copiado")
else:
    print("ERRO: .env nao encontrado localmente")

# Install dependencies
print("Instalando dependencias...")
stdin, stdout, stderr = ssh.exec_command("cd /root/million_bots_vps && pip3 install python-dotenv supabase websockets pandas pandas-ta psycopg2-binary -q")
stdout.channel.recv_exit_status()
print("OK: Dependencias instaladas")

# Restart bot
print("Reiniciando bot...")
ssh.exec_command("pkill -f master_bot.py")
stdin, stdout, stderr = ssh.exec_command("cd /root/million_bots_vps && nohup python3 master_bot.py > bot.log 2>&1 &")
print("OK: Bot iniciado")

# Check if running
import time
time.sleep(3)
stdin, stdout, stderr = ssh.exec_command("ps aux | grep master_bot.py | grep -v grep")
output = stdout.read().decode('utf-8')
if output:
    print("OK: Bot esta rodando")
    print(output.strip())
else:
    print("AVISO: Bot pode nao ter iniciado")

sftp.close()
ssh.close()
print("\nConcluido!")
