import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('191.252.182.208', username='root', password='Vom29bd#@', timeout=15)

# Upload the fixed broadcaster.py
sftp = ssh.open_sftp()
sftp.put(
    'c:\\Users\\bialo\\OneDrive\\Documentos\\beckbug\\adaptive_engine\\core\\broadcaster.py',
    '/root/adaptive_engine/core/broadcaster.py'
)
sftp.close()

print("broadcaster.py uploaded with SERVICE_ROLE_KEY")

# Restart the service
stdin, stdout, stderr = ssh.exec_command('systemctl restart adaptive_engine.service')
stdout.read()

print("Service restarted. Waiting 65 seconds for warmup...")
import time
time.sleep(65)

print("\nChecking recent logs...")
stdin, stdout, stderr = ssh.exec_command('journalctl -u adaptive_engine.service -n 30 --no-pager | grep -E "(EXECUCAO|Sinal enviado|Falha no Broadcast)"')
out = stdout.read().decode('utf-8', errors='replace')
if out:
    print(out)
else:
    print("(no logs found)")

ssh.close()
