import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('191.252.182.208', username='root', password='Vom29bd#@', timeout=15)

print("=== CHECKING REMOTE FILE CONTENT ===")
stdin, stdout, stderr = ssh.exec_command('cat /root/adaptive_engine/core/broadcaster.py')
out = stdout.read().decode('utf-8', errors='replace')
print(out)

print("\n=== CLEANING PYCACHE AND RESTARTING ===")
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
