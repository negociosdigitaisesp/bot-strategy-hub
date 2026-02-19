# -*- coding: utf-8 -*-
import paramiko
import sys
import time

VPS_HOST = "vps64469.publiccloud.com.br"
VPS_USER = "root"
VPS_PASSWORD = "Vom29bd#@"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname=VPS_HOST, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

sys.stdout.write("\n=== RESULTADOS FINAIS (Reteste imediato) ===\n\n")

# Get the new PID
stdin, stdout, stderr = ssh.exec_command("ps aux | grep master_bot | grep -v grep | awk '{print $2}'")
pid = stdout.read().decode('utf-8', errors='replace').strip().split('\n')[-1]
sys.stdout.write(f"PID do bot: {pid}\n\n")

checks = {
    "Sinais passaram filtro": f"python3\\[{pid}\\].*sinais passaram",
    "TODOS filtrados": f"python3\\[{pid}\\].*TODOS filtrados",
    "Virtual Trade WIN": f"python3\\[{pid}\\].*Virtual Trade WIN",
    "Virtual Trade LOSS": f"python3\\[{pid}\\].*Virtual Trade LOSS",
    "ENVIANDO PARA SUPABASE": f"python3\\[{pid}\\].*ENVIANDO PARA SUPABASE",
    "ENVIADO COM SUCESSO": f"python3\\[{pid}\\].*ENVIADO COM SUCESSO",
    "ERRO AO ENVIAR": f"python3\\[{pid}\\].*ERRO AO ENVIAR",
    "Sem conexao DB": f"python3\\[{pid}\\].*Sem.*conex",
    "SIGNAL SENT": f"python3\\[{pid}\\].*SIGNAL SENT",
    "Supabase Connected": f"python3\\[{pid}\\].*Supabase Manager",
    "TESTE INSERT": f"python3\\[{pid}\\].*TESTE DE INSER",
}

for label, pattern in checks.items():
    stdin, stdout, stderr = ssh.exec_command(
        f"journalctl -u million_bot --no-pager | grep -P '{pattern}' | wc -l"
    )
    count = stdout.read().decode('utf-8', errors='replace').strip()
    
    stdin, stdout, stderr = ssh.exec_command(
        f"journalctl -u million_bot --no-pager | grep -P '{pattern}' | tail -2"
    )
    sample = stdout.read().decode('utf-8', errors='replace').strip()
    sample_clean = sample.encode('ascii', 'replace').decode('ascii')
    
    sys.stdout.write(f"[{label}] Count: {count}\n")
    if sample_clean and count != "0":
        for line in sample_clean.split('\n')[-2:]:
            sys.stdout.write(f"  {line[:200]}\n")
    sys.stdout.write("\n")

ssh.close()
sys.stdout.write("Done!\n")
