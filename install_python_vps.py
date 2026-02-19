# -*- coding: utf-8 -*-
"""
Install Python and all dependencies on VPS
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

# Check Python version
print("\nVerificando Python...")
stdin, stdout, stderr = ssh.exec_command("python3 --version")
stdout.channel.recv_exit_status()
print(stdout.read().decode('utf-8').strip())

# Install pip if not available
print("\nInstalando pip3...")
stdin, stdout, stderr = ssh.exec_command("apt-get update && apt-get install -y python3-pip")
exit_code = stdout.channel.recv_exit_status()
print(f"Exit code: {exit_code}")

# Verify pip3
print("\nVerificando pip3...")
stdin, stdout, stderr = ssh.exec_command("pip3 --version")
stdout.channel.recv_exit_status()
print(stdout.read().decode('utf-8').strip())

# Install Python dependencies
print("\nInstalando dependencias Python...")
deps = "python-dotenv supabase websockets pandas pandas-ta psycopg2-binary"
stdin, stdout, stderr = ssh.exec_command(f"pip3 install {deps}")
exit_code = stdout.channel.recv_exit_status()
print(f"Exit code: {exit_code}")
output = stdout.read().decode('utf-8')
if "Successfully installed" in output:
    print("OK: Dependencias instaladas com sucesso!")
else:
    print(output[-500:])  # Last 500 chars

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
    
    # Show first lines of log
    print("\nPrimeiras 20 linhas do log:")
    stdin, stdout, stderr = ssh.exec_command("head -20 /root/million_bots_vps/bot.log")
    print(stdout.read().decode('utf-8'))
else:
    print("ERRO: Bot nao iniciou. Log completo:")
    stdin, stdout, stderr = ssh.exec_command("cat /root/million_bots_vps/bot.log")
    print(stdout.read().decode('utf-8'))

ssh.close()
print("\nConcluido!")
