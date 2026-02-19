import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('191.252.182.208', username='root', password='Vom29bd#@', timeout=15)

# Check if there are any Python errors or warnings in the logs
commands = [
    'echo "=== Checking for Python errors/warnings ==="',
    'journalctl -u adaptive_engine.service --since "2026-02-17 19:37:45" --no-pager | grep -iE "(error|warning|exception|traceback)" | tail -20',
    'echo "=== Checking buffer status ==="',
    'journalctl -u adaptive_engine.service --since "2026-02-17 19:37:45" --no-pager | grep -iE "(buffer|candle|dataframe)" | tail -10',
]

for cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    if out: print(out)
    else: print("(no matching logs)")

ssh.close()
