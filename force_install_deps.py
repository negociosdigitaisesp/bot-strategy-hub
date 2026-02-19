# -*- coding: utf-8 -*-
"""
Force install python-dotenv and restart bot
"""
import paramiko
import time

VPS_HOST = "vps64469.publiccloud.com.br"
VPS_USER = "root"
VPS_PASSWORD = "Vom29bd#@"

print("Conectando...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=VPS_HOST, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

# Install python-dotenv specifically
print("Instalando python-dotenv...")
stdin, stdout, stderr = ssh.exec_command("pip3 install python-dotenv")
stdout.channel.recv_exit_status()
output = stdout.read().decode('utf-8')
error = stderr.read().decode('utf-8')
print(output)
if error:
    print("Stderr:", error)

# Install all other dependencies
print("\nInstalando outras dependencias...")
stdin, stdout, stderr = ssh.exec_command("pip3 install supabase websockets pandas pandas-ta psycopg2-binary")
stdout.channel.recv_exit_status()
print("OK")

# Kill any existing bot
print("\nParando bot existente...")
ssh.exec_command("pkill -f master_bot.py")
time.sleep(2)

# Start bot
print("Iniciando bot...")
stdin, stdout, stderr = ssh.exec_command("cd /root/million_bots_vps && nohup python3 master_bot.py > bot.log 2>&1 &")
time.sleep(5)

# Check if running
print("\nVerificando...")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep master_bot.py | grep -v grep")
output = stdout.read().decode('utf-8')

if output:
    print("OK: Bot esta rodando!")
    print(output.strip())
else:
    print("ERRO: Bot nao iniciou. Verificando log...")
    stdin, stdout, stderr = ssh.exec_command("tail -20 /root/million_bots_vps/bot.log")
    print(stdout.read().decode('utf-8'))

ssh.close()
print("\nConcluido!")
