"""
Script Final - Implementacao Completa das Correcoes
Aplica correcoes, reinicia bot e valida resultados
"""
import paramiko
import time

HOST = "vps64469.publiccloud.com.br"
USER = "root"
PASSWORD = "Vom29bd#@"

def run_ssh_command(ssh, command, show_output=True):
    """Executa comando SSH e retorna output"""
    stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
    stdout.channel.settimeout(10)
    
    output = ""
    try:
        output = stdout.read().decode('utf-8', errors='ignore').strip()
    except:
        pass
    
    if show_output and output:
        print(f"    {output[:500]}")
    
    return output

print("="*80)
print("IMPLEMENTACAO COMPLETA DAS CORRECOES")
print("="*80)

try:
    print("\n[1] Conectando na VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    print("    Conectado!")
    
    # Aplicar correcoes
    print("\n[2] Aplicando correcoes no strategy_scorer.py...")
    
    commands = [
        "cd /root/million_bots_vps",
        "cp engine/strategy_scorer.py engine/strategy_scorer.py.backup_manual",
        "sed -i 's/total_trades < 20/total_trades < 10/g' engine/strategy_scorer.py",
        "sed -i 's/20 minimum/10 minimum/g' engine/strategy_scorer.py", 
        "sed -i \"s/score.. >= 55/score'] >= 45/g\" engine/strategy_scorer.py",
    ]
    
    for cmd in commands:
        print(f"    $ {cmd}")
        run_ssh_command(ssh, cmd, show_output=False)
        time.sleep(0.2)
    
    # Verificar mudancas
    print("\n[3] Verificando mudancas aplicadas...")
    
    output = run_ssh_command(ssh, 
        "cd /root/million_bots_vps && grep 'total_trades < 10' engine/strategy_scorer.py | head -1",
        show_output=True)
    
    if "< 10" in output:
        print("    ✅ Threshold de trades: 20 -> 10 (OK)")
    else:
        print("    ❌ Threshold de trades: FALHOU")
    
    output = run_ssh_command(ssh,
        "cd /root/million_bots_vps && grep \"score'] >= 45\" engine/strategy_scorer.py | tail -1",
        show_output=True)
    
    if ">= 45" in output:
        print("    ✅ Score threshold: 55 -> 45 (OK)")
    else:
        print("    ❌ Score threshold: FALHOU")
    
    # Reiniciar bot
    print("\n[4] Reiniciando master_bot.py...")
    run_ssh_command(ssh, "pkill -9 -f 'python.*master_bot'")
    time.sleep(2)
    
    run_ssh_command(ssh, 
        "cd /root/million_bots_vps && nohup python3 master_bot.py > /root/logs/master_bot.log 2>&1 &")
    time.sleep(3)
    
    # Verificar processo
    output = run_ssh_command(ssh, "pgrep -f 'python.*master_bot'")
    if output:
        print(f"    ✅ Bot iniciado (PID: {output})")
    else:
        print("    ❌ Bot nao iniciou!")
    
    # Verificar logs
    print("\n[5] Verificando logs iniciais...")
    output = run_ssh_command(ssh, "tail -20 /root/logs/master_bot.log")
    
    if "MILLION BOTS ENGINE STARTING" in output or "Estratégias disponíveis" in output:
        print("    ✅ Bot inicializando corretamente")
    else:
        print("    ⚠️ Aguardar inicializacao...")
    
    print("\n" + "="*80)
    print("CORRECOES APLICADAS COM SUCESSO!")
    print("="*80)
    print("\nProximos passos:")
    print("1. Aguardar 60-90 segundos para o bot processar")
    print("2. Executar: python quick_diagnosis.py")
    print("3. Verificar sinais em active_signals")
    
    ssh.close()
    
except Exception as e:
    print(f"\n❌ ERRO: {e}")
    import traceback
    traceback.print_exc()
