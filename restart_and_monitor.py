import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('191.252.182.208', username='root', password='Vom29bd#@', timeout=15)

print("=== RESTARTING SERVICE ===")
stdin, stdout, stderr = ssh.exec_command('systemctl restart adaptive_engine.service')
stdout.read()

print("Waiting 3 seconds...")
time.sleep(3)

print("\n=== SERVICE STATUS ===")
stdin, stdout, stderr = ssh.exec_command('systemctl status adaptive_engine.service --no-pager')
out = stdout.read().decode('utf-8', errors='replace')
print(out)

print("\n=== Waiting 70 seconds for warmup + signal generation ===")
time.sleep(70)

print("\n=== CHECKING LOGS FOR SIGNALS ===")
stdin, stdout, stderr = ssh.exec_command('journalctl -u adaptive_engine.service -n 50 --no-pager | grep -E "(EXECUCAO|Sinal enviado|Falha no Broadcast|ERROR)"')
out = stdout.read().decode('utf-8', errors='replace')
if out:
    print(out)
else:
    print("(no signal logs found)")

ssh.close()
print("\n=== DONE ===")
