#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deploy QA Master to VPS - Upload e configuração completa
"""

import os
import sys
from pathlib import Path
import paramiko
from scp import SCPClient

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
VPS_PASSWORD = "Vom29bd#@"

PROJECT_ROOT = Path(__file__).parent

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
            if output:
                return output
            return True
        else:
            if description:
                print(f"❌")
                if error:
                    print(f"      Erro: {error}")
            return False
    except Exception as e:
        if description:
            print(f"❌ ({str(e)})")
        return False

def deploy_qa_system():
    """Deploy completo do QA Master na VPS"""
    print(f"🚀 Iniciando deploy do QA Master para VPS {VPS_HOST}...\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # 1. Conectar
        print("🔌 Conectando à VPS...")
        ssh.connect(
            VPS_HOST,
            username=VPS_USER,
            password=VPS_PASSWORD,
            timeout=30
        )
        print("✅ Conectado!\n")
        
        # 2. Criar diretório QA
        print("📁 Criando estrutura de diretórios...")
        run_ssh_command(ssh, "mkdir -p /root/qa_system", "Criando /root/qa_system")
        run_ssh_command(ssh, "mkdir -p /root/qa_system/reports", "Criando /root/qa_system/reports")
        
        # 3. Upload de arquivos
        print("\n📤 Fazendo upload de arquivos...")
        
        with SCPClient(ssh.get_transport()) as scp:
            # Upload run_qa_master.py
            local_qa_script = PROJECT_ROOT / "scripts" / "run_qa_master.py"
            if local_qa_script.exists():
                print("   Uploading run_qa_master.py...", end=" ")
                scp.put(str(local_qa_script), "/root/qa_system/run_qa_master.py")
                print("✅")
            
            # Upload .env.qa
            local_env = PROJECT_ROOT / ".env.qa"
            if local_env.exists():
                print("   Uploading .env.qa...", end=" ")
                scp.put(str(local_env), "/root/qa_system/.env.qa")
                print("✅")
        
        # 4. Instalar dependências
        print("\n📦 Instalando dependências Python...")
        run_ssh_command(ssh, "pip3 install supabase paramiko 2>&1 | tail -5", "Instalando supabase e paramiko")
        
        # 5. Configurar permissões
        print("\n🔐 Configurando permissões...")
        run_ssh_command(ssh, "chmod +x /root/qa_system/run_qa_master.py", "Tornando script executável")
        
        # 6. Testar instalação
        print("\n🧪 Testando instalação...")
        test_result = run_ssh_command(
            ssh,
            "cd /root/qa_system && python3 run_qa_master.py --help | head -5"
        )
        if test_result:
            print("   ✅ Script funcional")
        
        # 7. Criar script de execução
        print("\n📝 Criando script de execução...")
        run_qa_script = """#!/bin/bash
cd /root/qa_system
python3 run_qa_master.py --quick
"""
        run_ssh_command(
            ssh,
            f"echo '{run_qa_script}' > /root/qa_system/run_qa.sh && chmod +x /root/qa_system/run_qa.sh",
            "Criando run_qa.sh"
        )
        
        # 8. Resumo
        print("\n" + "="*60)
        print("✅ DEPLOY CONCLUÍDO COM SUCESSO!")
        print("="*60)
        print("\n📍 Localização: /root/qa_system/")
        print("📄 Arquivos instalados:")
        print("   - run_qa_master.py")
        print("   - .env.qa")
        print("   - run_qa.sh")
        print("\n🎯 Para executar na VPS:")
        print(f"   ssh {VPS_USER}@{VPS_HOST}")
        print("   cd /root/qa_system")
        print("   ./run_qa.sh")
        print("\n💡 Ou remotamente:")
        print(f"   ssh {VPS_USER}@{VPS_HOST} '/root/qa_system/run_qa.sh'")
        
    except paramiko.AuthenticationException:
        print("❌ Erro de autenticação. Verifique usuário e senha.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        ssh.close()

def test_connection():
    """Testa conexão SSH"""
    print(f"🔌 Testando conexão com {VPS_HOST}...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(
            VPS_HOST,
            username=VPS_USER,
            password=VPS_PASSWORD,
            timeout=30
        )
        print("✅ Conexão bem-sucedida!")
        
        # Testar comando simples
        stdin, stdout, stderr = ssh.exec_command("uname -a")
        output = stdout.read().decode('utf-8').strip()
        print(f"   Sistema: {output}")
        
        ssh.close()
        return True
    except Exception as e:
        print(f"❌ Falha na conexão: {str(e)}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Deploy QA Master para VPS")
    parser.add_argument("--test-connection", action="store_true", help="Apenas testar conexão SSH")
    
    args = parser.parse_args()
    
    if args.test_connection:
        test_connection()
    else:
        # Verificar se scp está disponível
        try:
            from scp import SCPClient
        except ImportError:
            print("❌ Biblioteca 'scp' não instalada")
            print("   Instale com: pip install scp")
            sys.exit(1)
        
        deploy_qa_system()
