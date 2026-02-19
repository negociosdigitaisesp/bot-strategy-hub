#!/usr/bin/env python3
"""
Exemplo de Teste de Integração - Backend Strategy Loading
Demonstra como usar os helpers para testar o backend via SSH
"""

import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tests.config.test_config import VPS_HOST, VPS_USER, VPS_SSH_KEY, EXPECTED_STRATEGIES_COUNT
from tests.integration.test_helpers import SSHHelper

def test_strategy_loading():
    """Testa se todas as estratégias foram carregadas corretamente"""
    
    print("🧪 Teste: Strategy Loading\n")
    
    if not VPS_HOST:
        print("❌ VPS_HOST não configurado em .env.qa")
        return False
    
    # Criar helper SSH
    ssh = SSHHelper(VPS_HOST, VPS_USER, VPS_SSH_KEY)
    
    # Teste 1: Conexão SSH
    print("1. Testando conexão SSH...", end=" ")
    if not ssh.test_connection():
        print("❌ FALHOU")
        return False
    print("✅ OK")
    
    # Teste 2: Contar arquivos de estratégia
    print("2. Contando arquivos de estratégia...", end=" ")
    file_count = ssh.count_strategy_files()
    if file_count < 0:
        print("❌ FALHOU (erro ao contar)")
        return False
    print(f"✅ {file_count} arquivos")
    
    # Teste 3: Verificar quantas o backend carregou
    print("3. Verificando backend logs...", end=" ")
    loaded_count = ssh.get_backend_loaded_strategies()
    if loaded_count < 0:
        print("❌ FALHOU (não encontrou log)")
        return False
    print(f"✅ {loaded_count} carregadas")
    
    # Teste 4: Comparar números
    print("4. Validando consistência...", end=" ")
    if file_count != loaded_count:
        print(f"❌ FALHOU (arquivos: {file_count}, carregadas: {loaded_count})")
        return False
    
    if file_count != EXPECTED_STRATEGIES_COUNT:
        print(f"⚠️  ATENÇÃO (esperado: {EXPECTED_STRATEGIES_COUNT}, encontrado: {file_count})")
    else:
        print(f"✅ OK ({file_count}/{EXPECTED_STRATEGIES_COUNT})")
    
    print("\n✅ Teste passou!")
    return True

if __name__ == "__main__":
    success = test_strategy_loading()
    sys.exit(0 if success else 1)
