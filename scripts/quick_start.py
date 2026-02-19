#!/usr/bin/env python3
"""
Quick Start - Exemplo rápido de uso do QA Master
Execute este script para testar a configuração básica
"""

import sys
import os
from pathlib import Path

# Adiciona o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

def main():
    print("=" * 60)
    print("MILLION BOTS QA - QUICK START")
    print("=" * 60)
    print()
    
    # 1. Verificar se .env.qa existe
    print("1. Verificando configuração...")
    env_file = Path(__file__).parent.parent / ".env.qa"
    
    if not env_file.exists():
        print("   [!] .env.qa não encontrado")
        print("   [>] Criando a partir do template...")
        
        example_file = Path(__file__).parent.parent / ".env.qa.example"
        if example_file.exists():
            import shutil
            shutil.copy(example_file, env_file)
            print("   [OK] .env.qa criado!")
            print()
            print("   PRÓXIMO PASSO:")
            print("   Edite .env.qa e preencha suas credenciais:")
            print("   - VPS_HOST")
            print("   - SUPABASE_URL")
            print("   - SUPABASE_SERVICE_ROLE_KEY")
            print()
            return 1
    else:
        print("   [OK] .env.qa encontrado")
    
    # 2. Validar configuração
    print()
    print("2. Validando configuração...")
    from tests.config import test_config
    
    print(f"   Frontend: {test_config.FRONTEND_URL}")
    print(f"   Supabase: {test_config.SUPABASE_URL or '[NÃO CONFIGURADO]'}")
    print(f"   VPS: {test_config.VPS_HOST or '[NÃO CONFIGURADO]'}")
    
    # 3. Verificar dependências
    print()
    print("3. Verificando dependências Python...")
    
    try:
        import supabase
        print("   [OK] supabase-py instalado")
    except ImportError:
        print("   [!] supabase-py não instalado")
        print("   [>] Execute: pip install supabase")
        return 1
    
    # 4. Testar helpers
    print()
    print("4. Testando helpers...")
    
    if test_config.VPS_HOST:
        from tests.integration.test_helpers import SSHHelper
        ssh = SSHHelper(test_config.VPS_HOST, test_config.VPS_USER, test_config.VPS_SSH_KEY)
        
        print("   Testando SSH...", end=" ")
        if ssh.test_connection():
            print("[OK]")
        else:
            print("[FALHOU]")
            print("   Verifique VPS_HOST e VPS_SSH_KEY em .env.qa")
    else:
        print("   [SKIP] VPS não configurado")
    
    if test_config.SUPABASE_URL and test_config.SUPABASE_SERVICE_ROLE_KEY:
        from tests.integration.test_helpers import SupabaseHelper
        supabase = SupabaseHelper(test_config.SUPABASE_URL, test_config.SUPABASE_SERVICE_ROLE_KEY)
        
        if supabase.available:
            print("   Testando Supabase...", end=" ")
            count = supabase.count_strategies()
            if count >= 0:
                print(f"[OK] {count} estratégias")
            else:
                print("[FALHOU]")
        else:
            print("   [SKIP] supabase-py não disponível")
    else:
        print("   [SKIP] Supabase não configurado")
    
    # 5. Próximos passos
    print()
    print("=" * 60)
    print("PRÓXIMOS PASSOS:")
    print("=" * 60)
    print()
    print("1. Configurar .env.qa com suas credenciais")
    print("2. Executar testes individuais:")
    print("   python tests/integration/test_strategy_loading.py")
    print("   python tests/integration/test_supabase_validation.py")
    print()
    print("3. Executar suite completa:")
    print("   python scripts/run_qa_master.py")
    print()
    print("4. Executar categoria específica:")
    print("   python scripts/run_qa_master.py --category performance")
    print()
    print("5. Ver documentação completa:")
    print("   README_QA.md")
    print()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
