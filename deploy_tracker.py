import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('191.252.182.208', username='root', password='Vom29bd#@', timeout=15)

sftp = ssh.open_sftp()

print("Uploading performance_tracker.py...")
sftp.put(
    'c:\\Users\\bialo\\OneDrive\\Documentos\\beckbug\\adaptive_engine\\core\\performance_tracker.py',
    '/root/adaptive_engine/core/performance_tracker.py'
)

print("Uploading main.py...")
sftp.put(
    'c:\\Users\\bialo\\OneDrive\\Documentos\\beckbug\\adaptive_engine\\main.py',
    '/root/adaptive_engine/main.py'
)

sftp.close()

print("Files uploaded. Cleaning cache and restarting...")
cmds = [
    'find /root/adaptive_engine -name "__pycache__" -type d -exec rm -rf {} +',
    'systemctl restart adaptive_engine.service',
    'sleep 2',
    'systemctl status adaptive_engine.service --no-pager'
]

for cmd in cmds:
    print(f"Running: {cmd}")
    ssh.exec_command(cmd)

print("\nWaiting 5s for initialization logs...")
time.sleep(5)
stdin, stdout, stderr = ssh.exec_command('journalctl -u adaptive_engine.service -n 20 --no-pager')
out = stdout.read().decode('utf-8', errors='replace')
print(out)

ssh.close()
