"""
Verificar logs da VPS e forcar atualizacao
"""
import paramiko
import time

HOST = "vps64469.publiccloud.com.br"
USER = "root"
PASSWORD = "Vom29bd#@"

print("="*80)  
print("VERIFICANDO LOGS E FORCANDO ATUALIZACAO")
print("="*80)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    
    # Ver logs completos
    print("\n[1] Logs do bot (ultimas 50 linhas):")
    stdin, stdout, stderr = ssh.exec_command("tail -50 /root/logs/master_bot.log")
    output = stdout.read().decode('utf-8', errors='ignore')
    print(output[-200:] if len(output) > 200 else output)
    
    # Ver linhas 150-160 do scorer (onde esta o threshold)
    print("\n[2] Verificando linhas 150-160 do strategy_scorer.py:")
    stdin, stdout, stderr = ssh.exec_command(
        "cd /root/million_bots_vps && sed -n '150,160p' engine/strategy_scorer.py")
    output = stdout.read().decode('utf-8')
    print(output)
   
    # Verificar se tem strategy_scorer.pyc
    print("\n[3] Procurando .pyc do scorer:")
    stdin, stdout, stderr = ssh.exec_command(
        "find /root/million_bots_vps -name 'strategy_scorer.pyc'")
    output = stdout.read().decode('utf-8').strip()
    if output:
        print(f"ENCONTRADO (PROBLEMA!): {output}")
        print("Deletando...")
        ssh.exec_command(f"rm -f {output}")
    else:
        print("Sem .pyc (OK)")
    
    # Resetar bot completamente
    print("\n[4] Reset total do bot:")
    commands = [
        "pkill -9 -f 'python.*master_bot'",
        "cd /root/million_bots_vps && find . -name '*.pyc' -delete",
        "cd /root/million_bots_vps && find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true", 
        "sleep 3",
        "cd /root/million_bots_vps && python3 -B master_bot.py > /root/logs/master_bot.log 2>&1 &",
        "sleep 4",
        "pgrep -f 'python.*master_bot'"
    ]
    
    for cmd in commands:
        print(f"    $ {cmd[:60]}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        stdout.channel.recv_exit_status()
        time.sleep(0.5)
    
    stdin, stdout, stderr = ssh.exec_command("pgrep -f 'python.*master_bot'")
    pid = stdout.read().decode('utf-8').strip()
    if pid:
        print(f"    Bot iniciado (PID: {pid})")
    else:
        print("    ERRO: Bot nao iniciou!")
        stdin, stdout, stderr = ssh.exec_command("tail -20 /root/logs/master_bot.log")
        print(stdout.read().decode('utf-8', errors='ignore'))
    
    print("\n" + "="*80)
    print("BOT RESETADO - Aguardar 90s para novo ciclo")
    print("="*80)
    
    ssh.close()
    
except Exception as e:
    print(f"ERRO: {e}")
    import traceback
    traceback.print_exc()
