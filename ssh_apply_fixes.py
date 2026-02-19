"""
Aplicar correcoes na VPS via SSH usando Python
"""
import paramiko
import time

# Credenciais VPS
HOST = "vps64469.publiccloud.com.br"
USER = "root"
PASSWORD = "Vom29bd#@"

print("="*80)
print("CONECTANDO NA VPS E APLICANDO CORRECOES")
print("="*80)

try:
    # Conectar via SSH
    print(f"\n[1] Conectando em {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=10)
    print("    Conectado!")
    
    # Comandos a executar
    commands = [
        "cd /root/million_bots_vps && pwd",
        "ls -la engine/strategy_scorer.py",
        "cp engine/strategy_scorer.py engine/strategy_scorer.py.backup_$(date +%Y%m%d_%H%M%S)",
        "sed -i 's/if total_trades < 20:/if total_trades < 10:/g' engine/strategy_scorer.py",
        "sed -i 's/({total_trades}\\/20 minimum)/({total_trades}\\/10 minimum)/g' engine/strategy_scorer.py",
        "sed -i \"s/and data\\['score'\\] >= 55/and data['score'] >= 45/g\" engine/strategy_scorer.py",
        "grep -A 2 'HARD RULE 2' engine/strategy_scorer.py | grep 'if total_trades'",
        "grep \"score.*>= 4\" engine/strategy_scorer.py | tail -1",
        "pgrep -f 'python.*master_bot.py'",
        "pkill -f 'python.*master_bot.py'",
        "sleep 2",
        "mkdir -p logs",
        "nohup python3 master_bot.py > logs/master_bot.log 2>&1 &",
        "pgrep -f 'python.*master_bot.py'",
        "tail -20 logs/master_bot.log"
    ]
    
    for i, cmd in enumerate(commands, 1):
        print(f"\n[{i}] Executando: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        # Aguardar conclusao
        exit_status = stdout.channel.recv_exit_status()
        
        # Ler output
        output = stdout.read().decode('utf-8', errors='ignore').strip()
        error = stderr.read().decode('utf-8', errors='ignore').strip()
        
        if output:
            print(f"    Output: {output}")
        if error and exit_status != 0:
            print(f"    Error: {error}")
        
        # Pequeno delay
        time.sleep(0.5)
    
    print("\n" + "="*80)
    print("CORRECOES APLICADAS COM SUCESSO!")
    print("="*80)
    
    # Fechar conexao
    ssh.close()
    
except Exception as e:
    print(f"\nERRO: {e}")
    print("\nTentando abordagem alternativa...")
