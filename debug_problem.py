"""
Debug - Por que as correcoes nao funcionaram?
"""
import paramiko

HOST = "vps64469.publiccloud.com.br"
USER = "root"
PASSWORD = "Vom29bd#@"

print("="*80)
print("DEBUG - INVESTIGANDO PROBLEMA")
print("="*80)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    
    # Ver arquivo atualizado
    print("\n[1] Verificando arquivo strategy_scorer.py:")
    stdin, stdout, stderr = ssh.exec_command(
        "cd /root/million_bots_vps && grep -n 'total_trades < ' engine/strategy_scorer.py | grep -E '(10|20):'")
    output = stdout.read().decode('utf-8')
    print(output)
    
    # Ver se tem .pyc cache
    print("\n[2] Verificando cache Python:")
    stdin, stdout, stderr = ssh.exec_command(
        "find /root/million_bots_vps -name '*.pyc' -o -name '__pycache__'")
    output = stdout.read().decode('utf-8')
    if output.strip():
        print("Cache encontrado:")
        print(output)
    else:
        print("Sem cache")
    
    # Ver logs do bot
    print("\n[3] Ultimos logs do bot:")
    stdin, stdout, stderr = ssh.exec_command(
        "tail -40 /root/logs/master_bot.log | grep -E '(STARTING|Estratégias|ERROR|trades)'")
    output = stdout.read().decode('utf-8', errors='ignore')
    print(output)
    
    # Limpar cache e reiniciar
    print("\n[4] Limpando cache Python e reiniciando...")
    commands = [
        "cd /root/million_bots_vps",
        "find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true",
        "find . -name '*.pyc' -delete",
        "pkill -9 -f 'python.*master_bot'",
        "sleep 2",
        "nohup python3 -u master_bot.py > /root/logs/master_bot.log 2>&1 &",
        "sleep 3",
        "pgrep -f 'python.*master_bot'"
    ]
    
    for cmd in commands:
        print(f"    $ {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
        output = stdout.read().decode('utf-8', errors='ignore').strip()
        if output and len(output) < 100:
            print(f"      {output}")
    
    print("\n[5] Verificando processo:")
    stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'python.*master_bot' | grep -v grep")
    output = stdout.read().decode('utf-8')
    print(output)
    
    print("\n" + "="*80)
    print("CACHE LIMPO E BOT REINICIADO")
    print("="*80)
    print("\nAguardar 60s e testar novamente com quick_diagnosis.py")
    
    ssh.close()
    
except Exception as e:
    print(f"ERRO: {e}")
