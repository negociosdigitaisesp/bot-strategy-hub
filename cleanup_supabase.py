#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cleanup Supabase - Remove estratégias antigas e dados desatualizados
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

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

SUPABASE_URL = env_vars.get('SUPABASE_URL', os.getenv('SUPABASE_URL'))
SUPABASE_KEY = env_vars.get('SUPABASE_SERVICE_ROLE_KEY', os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

def cleanup_supabase(dry_run=False):
    """Limpa dados antigos do Supabase"""
    try:
        from supabase import create_client
        
        print("🗄️  Conectando ao Supabase...")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 1. Verificar estratégias atuais
        print("\n📊 Analisando estratégias...")
        result = supabase.table("strategy_scores").select("*").execute()
        total_strategies = len(result.data)
        print(f"   Total de estratégias: {total_strategies}")
        
        # 2. Identificar estratégias desatualizadas (>24h)
        cutoff_time = datetime.now() - timedelta(hours=24)
        stale_strategies = []
        
        for row in result.data:
            if row.get('last_updated'):
                last_updated = datetime.fromisoformat(row['last_updated'].replace('Z', '+00:00'))
                if last_updated.replace(tzinfo=None) < cutoff_time:
                    stale_strategies.append(row['strategy_name'])
        
        print(f"   Estratégias desatualizadas (>24h): {len(stale_strategies)}")
        
        if dry_run:
            print("\n🔍 DRY RUN - Nenhuma alteração será feita")
            if stale_strategies:
                print("\n   Estratégias que seriam removidas:")
                for name in stale_strategies[:10]:  # Mostrar apenas 10
                    print(f"   - {name}")
                if len(stale_strategies) > 10:
                    print(f"   ... e mais {len(stale_strategies) - 10}")
            return
        
        # 3. Remover estratégias desatualizadas
        if stale_strategies:
            print(f"\n🗑️  Removendo {len(stale_strategies)} estratégias desatualizadas...")
            for name in stale_strategies:
                supabase.table("strategy_scores").delete().eq("strategy_name", name).execute()
            print("   ✅ Estratégias removidas")
        
        # 4. Limpar sinais antigos (>7 dias)
        print("\n📡 Limpando sinais antigos...")
        old_signals_cutoff = datetime.now() - timedelta(days=7)
        result = supabase.table("trading_signals").delete().lt(
            "created_at", 
            old_signals_cutoff.isoformat()
        ).execute()
        print(f"   ✅ Sinais antigos removidos")
        
        # 5. Limpar logs antigos (>30 dias)
        print("\n📋 Limpando logs antigos...")
        old_logs_cutoff = datetime.now() - timedelta(days=30)
        result = supabase.table("bot_activity_logs").delete().lt(
            "created_at",
            old_logs_cutoff.isoformat()
        ).execute()
        print(f"   ✅ Logs antigos removidos")
        
        # 6. Resumo final
        print("\n✅ Limpeza concluída!")
        result = supabase.table("strategy_scores").select("*", count="exact").execute()
        final_count = result.count if hasattr(result, 'count') else len(result.data)
        print(f"   Estratégias restantes: {final_count}")
        
    except ImportError:
        print("❌ Erro: biblioteca supabase não instalada")
        print("   Instale com: pip install supabase")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Limpar dados antigos do Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Apenas mostrar o que seria removido")
    parser.add_argument("--force", action="store_true", help="Executar sem confirmação")
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.force:
        print("⚠️  ATENÇÃO: Isso vai remover dados do Supabase!")
        print("   Use --dry-run para ver o que seria removido")
        print("   Use --force para executar sem confirmação")
        response = input("\nContinuar? (s/N): ")
        if response.lower() != 's':
            print("Operação cancelada.")
            sys.exit(0)
    
    cleanup_supabase(dry_run=args.dry_run)
