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

print("broadcaster.py uploaded")

# Restart the service
commands = [
    'systemctl restart adaptive_engine.service',
    'sleep 3',
    'systemctl status adaptive_engine.service --no-pager'
]

for cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    if out: print(out)

ssh.close()
print("\nService restarted")
