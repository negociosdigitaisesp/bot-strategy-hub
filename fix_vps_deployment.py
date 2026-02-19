# -*- coding: utf-8 -*-
"""
Quick fix: Install dependencies and copy .env to VPS
"""
import os
import sys
from deploy_to_vps import VPSDeployer

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

print("🔧 Corrigindo deployment na VPS...")

deployer = VPSDeployer()

try:
    if not deployer.connect():
        print("❌ Falha ao conectar")
        sys.exit(1)
    
    # 1. Copiar .env para VPS
    print("\n📄 Copiando arquivo .env para VPS...")
    local_env = r"c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps\.env"
    remote_env = "/root/million_bots_vps/.env"
    
    if os.path.exists(local_env):
        deployer.sftp.put(local_env, remote_env)
        print("✅ .env copiado com sucesso!")
    else:
        print("⚠️ Arquivo .env local não encontrado!")
    
    # 2. Instalar dependências
    print("\n📦 Instalando dependências...")
    success = deployer.install_dependencies()
    
    if not success:
        print("⚠️ Erro ao instalar dependências, tentando novamente...")
        deployer.execute_command("cd /root/million_bots_vps && pip3 install python-dotenv supabase websockets pandas pandas-ta psycopg2-binary --quiet")
    
    # 3. Reiniciar bot
    print("\n🔄 Reiniciando bot...")
    deployer.restart_bot()
    
    # 4. Verificar
    print("\n🔍 Verificando...")
    deployer.verify_deployment()
    
    print("\n✅ Correção concluída!")
    
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
finally:
    deployer.close()
