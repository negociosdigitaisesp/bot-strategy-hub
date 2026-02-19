import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('191.252.182.208', username='root', password='Vom29bd#@', timeout=15)

commands = [
    'systemctl status adaptive_engine.service --no-pager',
    'echo "=== RECENT LOGS (Last 100 lines) ==="',
    'journalctl -u adaptive_engine.service -n 100 --no-pager',
    'echo "=== PROCESS INFO ==="',
    'ps aux | grep python3 | grep adaptive',
]

for cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    if out: print(out)

ssh.close()
