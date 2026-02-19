# -*- coding: utf-8 -*-
"""
Install dependencies with --break-system-packages flag (Python 3.12+)
"""
import paramiko
import time

VPS_HOST = "vps64469.publiccloud.com.br"
VPS_USER = "root"
VPS_PASSWORD = "Vom29bd#@"

print("Conectando a VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=VPS_HOST, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

# Install dependencies with --break-system-packages
print("Instalando dependencias com --break-system-packages...")
deps = "python-dotenv supabase websockets pandas pandas-ta psycopg2-binary"
stdin, stdout, stderr = ssh.exec_command(f"pip3 install {deps} --break-system-packages")
exit_code = stdout.channel.recv_exit_status()

output = stdout.read().decode('utf-8')
error = stderr.read().decode('utf-8')

print(f"Exit code: {exit_code}")
if "Successfully installed" in output or "Requirement already satisfied" in output:
    print("OK: Dependencias instaladas!")
else:
    print("Output:", output[-500:])
    print("Error:", error[-500:])

# Kill existing bot
print("\nParando bot existente...")
ssh.exec_command("pkill -f master_bot.py")
time.sleep(2)

# Start bot
print("Iniciando bot...")
stdin, stdout, stderr = ssh.exec_command("cd /root/million_bots_vps && nohup python3 master_bot.py > bot.log 2>&1 &")
time.sleep(5)

# Check if running
print("\nVerificando status do bot...")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep master_bot.py | grep -v grep")
output = stdout.read().decode('utf-8')

if output:
    print("OK: Bot esta rodando!")
    print(output.strip())
    
    # Show log
    print("\nPrimeiras 30 linhas do log:")
    stdin, stdout, stderr = ssh.exec_command("head -30 /root/million_bots_vps/bot.log")
    print(stdout.read().decode('utf-8'))
else:
    print("ERRO: Bot nao iniciou. Log:")
    stdin, stdout, stderr = ssh.exec_command("tail -50 /root/million_bots_vps/bot.log")
    print(stdout.read().decode('utf-8'))

ssh.close()
print("\nConcluido!")
