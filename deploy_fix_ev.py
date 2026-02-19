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

print("broadcaster.py uploaded (removed 'ev')")

# Clear pycache and restart
cmds = [
    'find /root/adaptive_engine -name "__pycache__" -type d -exec rm -rf {} +',
    'systemctl restart adaptive_engine.service',
    'sleep 2',
    'systemctl status adaptive_engine.service --no-pager'
]

for cmd in cmds:
    print(f"Running: {cmd}")
    ssh.exec_command(cmd)

ssh.close()
