import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('191.252.182.208', username='root', password='Vom29bd#@', timeout=15)

print("Waiting 70 seconds for warmup...")
time.sleep(70)

print("\nChecking recent logs...")
stdin, stdout, stderr = ssh.exec_command('journalctl -u adaptive_engine.service -n 50 --no-pager | grep -E "(EXECUCAO|Sinal enviado|Falha no Broadcast)"')
out = stdout.read().decode('utf-8', errors='replace')
if out:
    print(out)
else:
    print("(no expected logs found)")

ssh.close()
