"""
Validar correcoes e reiniciar bot
"""
import paramiko
import time

HOST = "vps64469.publiccloud.com.br"
USER = "root"
PASSWORD = "Vom29bd#@"

print("="*80)
print("VALIDANDO CORRECOES E REINICIANDO BOT")
print("="*80)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    
    # Verificar correcoes
    print("\n[1] Verificando correcoes aplicadas...")
    
    stdin, stdout, stderr = ssh.exec_command(
        "cd /root/million_bots_vps && grep 'total_trades < 10' engine/strategy_scorer.py | head -1")
    output = stdout.read().decode('utf-8').strip()
    print(f"    Threshold trades: {output}")
    
    stdin, stdout, stderr = ssh.exec_command(
        "cd /root/million_bots_vps && grep \"score'] >= 45\" engine/strategy_scorer.py | tail -1")
    output = stdout.read().decode('utf-8').strip()
    print(f"    Score threshold: {output}")
    
    # Reiniciar bot
    print("\n[2] Reiniciando bot...")
    ssh.exec_command("pkill -9 -f 'python.*master_bot'")
    time.sleep(3)
    
    ssh.exec_command("cd /root/million_bots_vps && nohup python3 master_bot.py > /root/logs/master_bot.log 2>&1 &")
    time.sleep(4)
    
    # Verificar PID
    stdin, stdout, stderr = ssh.exec_command("pgrep -f 'python.*master_bot'")
    pid = stdout.read().decode('utf-8').strip()
    if pid:
        print(f"    Bot iniciado (PID: {pid})")
    else:
        print("    ERRO: Bot nao iniciou")
    
    # Ver logs
    print("\n[3] Ultimas linhas do log:")
    stdin, stdout, stderr = ssh.exec_command("tail -30 /root/logs/master_bot.log")
    logs = stdout.read().decode('utf-8', errors='ignore')
    print(logs[-1000:])
    
    print("\n" + "="*80)
    print("VALIDACAO COMPLETA")
    print("="*80)
    
    ssh.close()
    
except Exception as e:
    print(f"ERRO: {e}")
