#!/usr/bin/env python3
"""
Exemplo de Teste Supabase - Data Validation
Demonstra como usar o SupabaseHelper para validar dados
"""

import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tests.config.test_config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MIN_STRATEGIES_COUNT
from tests.integration.test_helpers import SupabaseHelper

def test_supabase_data():
    """Testa integridade dos dados no Supabase"""
    
    print("🧪 Teste: Supabase Data Validation\n")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Credenciais Supabase não configuradas em .env.qa")
        return False
    
    # Criar helper Supabase
    supabase = SupabaseHelper(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    if not supabase.available:
        print("❌ Biblioteca supabase-py não disponível")
        print("   Instale com: pip install supabase")
        return False
    
    # Teste 1: Contar estratégias
    print("1. Contando estratégias...", end=" ")
    count = supabase.count_strategies()
    if count < 0:
        print("❌ FALHOU")
        return False
    print(f"✅ {count} estratégias")
    
    if count < MIN_STRATEGIES_COUNT:
        print(f"   ⚠️  Menos que o mínimo esperado ({MIN_STRATEGIES_COUNT})")
    
    # Teste 2: Verificar freshness
    print("2. Verificando freshness...", end=" ")
    stale_count = supabase.count_stale_strategies(minutes=10)
    if stale_count < 0:
        print("❌ FALHOU")
        return False
    
    if stale_count == 0:
        print("✅ Todas atualizadas")
    else:
        print(f"⚠️  {stale_count} desatualizadas")
    
    # Teste 3: Validar cálculos de WR
    print("3. Validando cálculos de WR...", end=" ")
    inconsistencies = supabase.validate_wr_calculations(tolerance=2.0)
    
    if len(inconsistencies) == 0:
        print("✅ Todos consistentes")
    else:
        print(f"⚠️  {len(inconsistencies)} inconsistências")
        for inc in inconsistencies[:3]:  # Mostrar primeiras 3
            print(f"   - {inc['strategy']}: calculado={inc['calculated_wr']}%, "
                  f"armazenado={inc['stored_wr']}%, diff={inc['difference']}%")
    
    # Teste 4: Verificar bug de frequency
    print("4. Verificando bug frequency_1h=0...", end=" ")
    bugs = supabase.check_frequency_zero_bug()
    
    if len(bugs) == 0:
        print("✅ Nenhum bug detectado")
    else:
        print(f"❌ {len(bugs)} estratégias com bug")
        for bug in bugs[:3]:
            print(f"   - {bug['strategy_name']}: score={bug['score']} (deveria ser ~45-50)")
    
    # Teste 5: Verificar sinais antigos
    print("5. Verificando sinais antigos...", end=" ")
    stale_signals = supabase.count_stale_signals(minutes=5)
    
    if stale_signals == 0:
        print("✅ Nenhum sinal antigo")
    else:
        print(f"⚠️  {stale_signals} sinais >5min (devem ser limpos)")
    
    # Teste 6: Verificar atividade recente
    print("6. Verificando atividade recente...", end=" ")
    recent_activity = supabase.count_recent_activity(hours=1)
    
    if recent_activity > 0:
        print(f"✅ {recent_activity} logs na última hora")
    else:
        print("⚠️  Nenhuma atividade (bot pode estar parado)")
    
    print("\n✅ Testes Supabase concluídos!")
    return True

if __name__ == "__main__":
    success = test_supabase_data()
    sys.exit(0 if success else 1)
