#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cleanup VPS - Remove estratégias antigas e prepara ambiente limpo
"""

import os
import sys
from pathlib import Path
import paramiko
from datetime import datetime

# Fix Windows console encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Carregar .env.qa
env_file = Path(__file__).parent / ".env.qa"
env_vars = {}
if env_file.exists():
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

VPS_HOST = env_vars.get('VPS_HOST', os.getenv('VPS_HOST'))
VPS_USER = env_vars.get('VPS_USER', 'root')
VPS_PASSWORD = "Vom29bd#@"  # Senha fornecida

def run_ssh_command(ssh, command, description=""):
    """Executa comando SSH e mostra resultado"""
    if description:
        print(f"   {description}...", end=" ")
    
    try:
        stdin, stdout, stderr = ssh.exec_command(command)
        exit_status = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        
        if exit_status == 0:
            if description:
                print("✅")
            return output
        else:
            if description:
                print(f"❌ ({error})")
            return None
    except Exception as e:
        if description:
            print(f"❌ ({str(e)})")
        return None

def cleanup_vps(dry_run=False):
    """Limpa VPS via SSH"""
    print(f"🔌 Conectando à VPS {VPS_HOST}...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Conectar usando senha
        ssh.connect(
            VPS_HOST,
            username=VPS_USER,
            password=VPS_PASSWORD,
            timeout=30
        )
        print("✅ Conectado!\n")
        
        # 1. Verificar serviço million_bot
        print("📊 Verificando serviços...")
        status = run_ssh_command(ssh, "systemctl is-active million_bot 2>/dev/null || echo 'inactive'")
        print(f"   Status million_bot: {status}")
        
        if dry_run:
            print("\n🔍 DRY RUN - Nenhuma alteração será feita")
            
            # Mostrar o que seria feito
            print("\n   Comandos que seriam executados:")
            print("   1. systemctl stop million_bot")
            print("   2. rm -rf /root/million_bots/strategies/*")
            print("   3. rm -rf /root/million_bots/logs/*")
            print("   4. find /root -name '*.pyc' -delete")
            print("   5. find /root -name '__pycache__' -type d -exec rm -rf {} +")
            
            # Verificar diretórios
            dirs = run_ssh_command(ssh, "ls -la /root/million_bots/ 2>/dev/null || echo 'Diretório não existe'")
            print(f"\n   Conteúdo de /root/million_bots/:")
            print(f"   {dirs}")
            
            ssh.close()
            return
        
        # 2. Parar serviço
        if status and status != 'inactive':
            print("\n🛑 Parando serviço million_bot...")
            run_ssh_command(ssh, "systemctl stop million_bot", "Parando serviço")
        
        # 3. Fazer backup
        print("\n💾 Criando backup...")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_ssh_command(
            ssh,
            f"mkdir -p /root/backups && tar -czf /root/backups/million_bots_backup_{timestamp}.tar.gz /root/million_bots/ 2>/dev/null || true",
            "Criando backup"
        )
        
        # 4. Limpar estratégias antigas
        print("\n🗑️  Limpando estratégias antigas...")
        run_ssh_command(ssh, "rm -rf /root/million_bots/strategies/*", "Removendo estratégias")
        run_ssh_command(ssh, "rm -rf /root/AGENTE*/strategies/*", "Removendo estratégias do AGENTE")
        
        # 5. Limpar logs
        print("\n📋 Limpando logs...")
        run_ssh_command(ssh, "rm -rf /root/million_bots/logs/*", "Removendo logs")
        run_ssh_command(ssh, "journalctl --vacuum-time=1d", "Limpando journalctl")
        
        # 6. Limpar cache Python
        print("\n🐍 Limpando cache Python...")
        run_ssh_command(ssh, "find /root -name '*.pyc' -delete", "Removendo .pyc")
        run_ssh_command(ssh, "find /root -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true", "Removendo __pycache__")
        
        # 7. Verificar espaço em disco
        print("\n💽 Espaço em disco:")
        disk_usage = run_ssh_command(ssh, "df -h /")
        print(f"   {disk_usage}")
        
        print("\n✅ Limpeza da VPS concluída!")
        
    except paramiko.AuthenticationException:
        print("❌ Erro de autenticação. Verifique usuário e senha.")
        sys.exit(1)
    except paramiko.SSHException as e:
        print(f"❌ Erro SSH: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Limpar VPS via SSH")
    parser.add_argument("--dry-run", action="store_true", help="Apenas mostrar o que seria feito")
    parser.add_argument("--force", action="store_true", help="Executar sem confirmação")
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.force:
        print("⚠️  ATENÇÃO: Isso vai limpar a VPS e parar serviços!")
        print("   Use --dry-run para ver o que seria feito")
        print("   Use --force para executar sem confirmação")
        response = input("\nContinuar? (s/N): ")
        if response.lower() != 's':
            print("Operação cancelada.")
            sys.exit(0)
    
    cleanup_vps(dry_run=args.dry_run)
