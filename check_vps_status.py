# -*- coding: utf-8 -*-
"""
Check VPS bot status and logs
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

# Wait a bit for bot to start
print("Aguardando bot iniciar...")
time.sleep(5)

# Check if bot is running
print("\n" + "="*60)
print("VERIFICANDO STATUS DO BOT")
print("="*60)

stdin, stdout, stderr = ssh.exec_command("ps aux | grep master_bot.py | grep -v grep")
output = stdout.read().decode('utf-8')

if output:
    print("OK: Bot esta rodando")
    print(output.strip())
else:
    print("ERRO: Bot NAO esta rodando")

# Check logs
print("\n" + "="*60)
print("ULTIMAS 50 LINHAS DO LOG")
print("="*60)

stdin, stdout, stderr = ssh.exec_command("tail -50 /root/million_bots_vps/bot.log")
log_output = stdout.read().decode('utf-8')
print(log_output)

# Count strategies
print("\n" + "="*60)
print("ESTRATEGIAS CARREGADAS")
print("="*60)

stdin, stdout, stderr = ssh.exec_command("find /root/million_bots_vps/strategies/tier1 -name '*.py' -not -name '__init__.py' | wc -l")
count = stdout.read().decode('utf-8').strip()
print(f"Total de estrategias: {count}")

ssh.close()
print("\nVerificacao concluida!")
