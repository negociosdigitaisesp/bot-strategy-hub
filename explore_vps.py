"""
Explorar estrutura da VPS e localizar arquivos do bot
"""
import paramiko

HOST = "vps64469.publiccloud.com.br"
USER = "root"
PASSWORD = "Vom29bd#@"

print("="*80)
print("EXPLORANDO ESTRUTURA DA VPS")
print("="*80)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=10)
    print("\nConectado!\n")
    
    commands = [
        ("Diretorio atual", "pwd"),
        ("Listar home", "ls -la /root/"),
        ("Procurar master_bot.py", "find /root -name 'master_bot.py' 2>/dev/null"),
        ("Procurar strategy_scorer.py", "find /root -name 'strategy_scorer.py' 2>/dev/null"),
        ("Processos Python rodando", "ps aux | grep python | grep -v grep"),
    ]
    
    for label, cmd in commands:
        print(f"[{label}]")
        print(f"  Comando: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode('utf-8', errors='ignore').strip()
        if output:
            print(f"  Resultado:\n{output}\n")
        else:
            print("  (vazio)\n")
    
    ssh.close()
    
except Exception as e:
    print(f"ERRO: {e}")
