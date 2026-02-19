import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')

print("Waiting 70 seconds for warmup + signal generation...")
time.sleep(70)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('191.252.182.208', username='root', password='Vom29bd#@', timeout=15)

commands = [
    'echo "=== RECENT LOGS (Last 30 lines) ==="',
    'journalctl -u adaptive_engine.service -n 30 --no-pager | grep -E "(Sinal enviado|Falha no Broadcast|EXECUCAO)"',
]

for cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    if out: print(out)

ssh.close()
