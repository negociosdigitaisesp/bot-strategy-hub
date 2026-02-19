"""
Aplicar correcoes no strategy_scorer.py da VPS
Caminho correto: /root/million_bots_vps/engine/strategy_scorer.py
"""
import paramiko
import time
from datetime import datetime

HOST = "vps64469.publiccloud.com.br"
USER = "root"
PASSWORD = "Vom29bd#@"

print("="*80)
print("APLICANDO CORRECOES NO STRATEGY_SCORER.PY")
print("="*80)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=10)
    print("\nConectado!\n")
    
    # Caminho correto
    base_dir = "/root/million_bots_vps"
    scorer_file = f"{base_dir}/engine/strategy_scorer.py"
    
    commands = [
        # 1. Backup
        (f"Fazendo backup", 
         f"cp {scorer_file} {scorer_file}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
        
        # 2. Aplicar correcao 1: threshold de trades (20 -> 10)
        ("Correcao 1: threshold de trades", 
         f"sed -i 's/if total_trades < 20:/if total_trades < 10:/g' {scorer_file}"),
         
        ("Correcao 1b: mensagem de erro",
         f"sed -i 's/({{total_trades}}\\/20 minimum)/({{total_trades}}\\/10 minimum)/g' {scorer_file}"),
        
        # 3. Aplicar correcao 2: score threshold (55 -> 45) 
        ("Correcao 2: score threshold",
         f"sed -i \"s/\\['score'\\] >= 55/['score'] >= 45/g\" {scorer_file}"),
        
        # 4. Verificar mudancas
        ("Verificando HARD RULE 2",
         f"grep -A 2 'HARD RULE 2' {scorer_file} | grep 'if total_trades'"),
         
        ("Verificando should_dispatch",
         f"grep 'score.*>= 4' {scorer_file} | tail -1"),
        
        # 5. Reiniciar bot
        ("Parando master_bot.py",
         "pkill -f 'python.*master_bot.py'"),
         
        ("Aguardando...", "sleep 3"),
        
        ("Iniciando master_bot.py",
         f"cd {base_dir} && nohup python3 master_bot.py > /root/logs/master_bot.log 2>&1 &"),
         
        ("Aguardando inicializacao...", "sleep 2"),
        
        ("Verificando processo",
         "pgrep -f 'python.*master_bot.py'"),
         
        ("Ultimas linhas do log",
         "tail -30 /root/logs/master_bot.log"),
    ]
    
    for label, cmd in commands:
        print(f"\n[{label}]")
        print(f"  $ {cmd}")
        
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        
        output = stdout.read().decode('utf-8', errors='ignore').strip()
        error = stderr.read().decode('utf-8', errors='ignore').strip()
        
        if output:
            # Limitar output muito grande
            if len(output) > 1000:
                output = output[:1000] + "\n  ... (truncado)"
            print(f"  Resultado:\n    {output.replace(chr(10), chr(10) + '    ')}")
        
        if error and exit_status != 0:
            print(f"  Erro: {error}")
        
        # Pequeno delay
        time.sleep(0.3)
    
    print("\n" + "="*80)
    print("CORRECOES APLICADAS E BOT REINICIADO!")
    print("="*80)
    print("\nProximo passo: Aguardar 60 segundos e verificar sinais no Supabase")
    
    ssh.close()
    
except Exception as e:
    print(f"\nERRO: {e}")
    import traceback
    traceback.print_exc()
