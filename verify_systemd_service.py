# -*- coding: utf-8 -*-
"""
Verify systemd service status on VPS
"""
import paramiko

VPS_HOST = "vps64469.publiccloud.com.br"
VPS_USER = "root"
VPS_PASSWORD = "Vom29bd#@"

print("Conectando a VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=VPS_HOST, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

print("\n" + "="*60)
print("STATUS DO SERVICO SYSTEMD")
print("="*60)

# Check service status
stdin, stdout, stderr = ssh.exec_command("systemctl status million_bot --no-pager")
output = stdout.read().decode('utf-8')
print(output)

print("\n" + "="*60)
print("VERIFICACAO DE PERSISTENCIA")
print("="*60)

# Check if enabled
stdin, stdout, stderr = ssh.exec_command("systemctl is-enabled million_bot")
enabled = stdout.read().decode('utf-8').strip()
print(f"Habilitado no boot: {enabled}")

# Check if active
stdin, stdout, stderr = ssh.exec_command("systemctl is-active million_bot")
active = stdout.read().decode('utf-8').strip()
print(f"Status atual: {active}")

print("\n" + "="*60)
print("TESTE DE REINICIO")
print("="*60)
print("Simulando reinicio do servico...")

stdin, stdout, stderr = ssh.exec_command("systemctl restart million_bot")
stdout.channel.recv_exit_status()
print("Servico reiniciado!")

import time
time.sleep(3)

stdin, stdout, stderr = ssh.exec_command("systemctl is-active million_bot")
active_after = stdout.read().decode('utf-8').strip()
print(f"Status apos reinicio: {active_after}")

if active_after == "active":
    print("\nOK: Servico reiniciou automaticamente!")
else:
    print("\nERRO: Servico nao reiniciou")

ssh.close()
print("\nVerificacao concluida!")
