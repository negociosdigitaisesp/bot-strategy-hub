#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix VPS QA configuration and execute
"""

import sys
import paramiko

# Fix Windows console encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

VPS_HOST = "191.252.182.208"
VPS_USER = "root"
VPS_PASSWORD = "Vom29bd#@"

def fix_and_run():
    """Corrige configuração e executa QA"""
    print(f"🔧 Corrigindo configuração na VPS {VPS_HOST}...\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
        print("✅ Conectado!\n")
        
        # 1. Verificar se .env.qa existe
        print("📋 Verificando .env.qa...")
        stdin, stdout, stderr = ssh.exec_command("ls -la /root/qa_system/.env.qa")
        result = stdout.read().decode('utf-8').strip()
        print(f"   {result}")
        
        # 2. Verificar conteúdo do .env.qa
        print("\n📄 Conteúdo do .env.qa:")
        stdin, stdout, stderr = ssh.exec_command("head -20 /root/qa_system/.env.qa")
        content = stdout.read().decode('utf-8').strip()
        print(f"   {content[:500]}...")
        
        # 3. Executar QA Master com variáveis de ambiente explícitas
        print("\n🚀 Executando QA Master com variáveis de ambiente...\n")
        print("="*60)
        
        command = """
export SUPABASE_URL=https://xwclmxjeombwabfdvyij.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U
export VPS_HOST=191.252.182.208
export FRONTEND_URL=http://localhost:5173
cd /root/qa_system && python3 run_qa_master.py --quick 2>&1
"""
        
        stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
        
        # Ler output em tempo real
        for line in iter(stdout.readline, ""):
            print(line, end="")
        
        exit_status = stdout.channel.recv_exit_status()
        
        print("="*60)
        print(f"\n✅ Comando concluído com exit code: {exit_status}\n")
        
        # 4. Verificar relatórios gerados
        print("📊 Verificando relatórios gerados...")
        stdin, stdout, stderr = ssh.exec_command("ls -lh /root/qa_reports/*.md 2>/dev/null | tail -3")
        reports = stdout.read().decode('utf-8').strip()
        if reports:
            print(f"   {reports}")
        else:
            print("   Nenhum relatório encontrado")
        
        # 5. Mostrar último relatório
        print("\n📄 Último relatório gerado:")
        stdin, stdout, stderr = ssh.exec_command("cat /root/qa_reports/MASTER_REPORT_*.md 2>/dev/null | tail -30")
        report = stdout.read().decode('utf-8').strip()
        if report:
            print(report)
        
        ssh.close()
        return exit_status
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(fix_and_run())
