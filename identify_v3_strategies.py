"""
Identificar estrategias V3 ativas na VPS
"""
import paramiko

HOST = "vps64469.publiccloud.com.br"
USER = "root"
PASSWORD = "Vom29bd#@"

print("="*80)
print("IDENTIFICANDO ESTRATEGIAS V3 ATIVAS NA VPS")
print("="*80)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    
    # Ver estrategias carregadas nos logs
    print("\n[1] Estrategias carregadas pelo bot:")
    stdin, stdout, stderr = ssh.exec_command(
        "grep 'Estratégias disponíveis' /root/logs/master_bot.log | tail -1")
    output = stdout.read().decode('utf-8', errors='ignore')
    print(output)
    
    # Ver estrategias ativas nos logs recentes
    print("\n[2] Estrategias ativas (ultimas 20 linhas):")
    stdin, stdout, stderr = ssh.exec_command(
        "grep 'Active Bots' /root/logs/master_bot.log | tail -5")
    output = stdout.read().decode('utf-8', errors='ignore')
    print(output)
    
    # Listar arquivos V3 no diretorio
    print("\n[3] Arquivos V3 em strategies/tier1:")
    stdin, stdout, stderr = ssh.exec_command(
        "ls -1 /root/million_bots_vps/strategies/tier1/*V3.py")
    output = stdout.read().decode('utf-8')
    
    v3_files = [line.strip().split('/')[-1].replace('.py', '') for line in output.strip().split('\n') if line.strip()]
    
    print(f"Total de estrategias V3: {len(v3_files)}")
    for f in v3_files:
        print(f"  - {f}")
    
    # Extrair nomes limpos para query
    print("\n[4] Nomes para filtro do frontend:")
    strategy_names = []
    for f in v3_files:
        # Converter strategy_4_double_top_sniper_V3 -> Double Top Sniper V3
        parts = f.replace('strategy_', '').replace('_V3', '').split('_')
        if parts[0].isdigit():
            parts = parts[1:]  # Remove numero inicial
        name = ' '.join(word.capitalize() for word in parts) + ' V3'
        strategy_names.append(name)
        print(f"  - {name}")
    
    # Gerar filtro SQL
    print("\n[5] Query SQL para o frontend:")
    names_quoted = "', '".join(strategy_names)
    query = f"WHERE strategy_name IN ('{names_quoted}')"
    print(query[:200] + "..." if len(query) > 200 else query)
    
    print("\n" + "="*80)
    print(f"TOTAL: {len(strategy_names)} estrategias V3 identificadas")
    print("="*80)
    
    ssh.close()
    
    # Salvar nomes em arquivo
    with open('v3_strategies.txt', 'w') as f:
        for name in strategy_names:
            f.write(name + '\n')
    
    print("\nNomes salvos em: v3_strategies.txt")
    
except Exception as e:
    print(f"ERRO: {e}")
    import traceback
    traceback.print_exc()
