"""
Script Simplificado de Diagnóstico Supabase
"""
import sys
from supabase import create_client, Client

SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U"

print("Conectando ao Supabase...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("\n" + "="*80)
print("DIAGNOSTICO SUPABASE")
print("="*80 + "\n")

# 1. Strategy Scores
print("[1] Consultando strategy_scores...")
try:
    response = supabase.table("strategy_scores")\
        .select("*")\
        .order("score", desc=True)\
        .execute()
    
    strategies = response.data
    print(f"Total estrategias: {len(strategies)}\n")
    
    # Filtro frontend
    visible = [s for s in strategies if s.get('score', 0) >= 45 and s.get('total_trades', 0) >= 10]
    print(f"Visiveis no frontend (score>=45, trades>=10): {len(visible)}\n")
    
    # Top 10
    print("TOP 10:")
    for i, s in enumerate(strategies[:10], 1):
        print(f"{i}. {s.get('strategy_name')[:40]:40} | Score: {s.get('score'):3} | WR: {s.get('expected_wr', 0):5.1f}% | Trades: {s.get('total_trades'):3}")
    
    # Double Top
    print("\nDOUBLE TOP STRATEGIES:")
    doubles = [s for s in strategies if 'double' in s.get('strategy_name', '').lower()]
    for s in doubles:
        print(f"  Nome: {s.get('strategy_name')}")
        print(f"  Score: {s.get('score')} | WR: {s.get('expected_wr', 0):.1f}%")
        print(f"  Trades: {s.get('total_trades')} (W:{s.get('wins')} L:{s.get('losses')})")
        print(f"  Visible: {s.get('visible')} | Reason: {s.get('reason_hidden', 'N/A')}")
        print()
    
    # Score = 0
    blocked = [s for s in strategies if s.get('score', 0) == 0]
    print(f"\nBLOQUEADAS (score=0): {len(blocked)}")
    for s in blocked[:5]:
        print(f"  - {s.get('strategy_name')[:40]} | Motivo: {s.get('reason_hidden', 'N/A')[:50]}")
    
except Exception as e:
    print(f"ERRO: {e}")

# 2. Active Signals
print("\n" + "="*80)
print("[2] Consultando active_signals...")
try:
    response = supabase.table("active_signals")\
        .select("*")\
        .order("created_at", desc=True)\
        .limit(20)\
        .execute()
    
    signals = response.data
    print(f"Ultimos sinais: {len(signals)}\n")
    
    if signals:
        for i, sig in enumerate(signals[:5], 1):
            print(f"{i}. {sig.get('asset')} {sig.get('direction')} | {sig.get('strategy', 'N/A')[:30]} | {sig.get('created_at')}")
    else:
        print("ALERTA: Nenhum sinal encontrado!")
        
except Exception as e:
    print(f"ERRO: {e}")

# 3. Bot Activity Logs
print("\n" + "="*80)
print("[3] Consultando bot_activity_logs...")
try:
    response = supabase.table("bot_activity_logs")\
        .select("*")\
        .order("created_at", desc=True)\
        .limit(20)\
        .execute()
    
    logs = response.data
    print(f"Ultimos resultados: {len(logs)}\n")
    
    if logs:
        wins = sum(1 for log in logs if log.get('profit', 0) > 0)
        losses = len(logs) - wins
        wr = (wins / len(logs) * 100) if logs else 0
        print(f"WR: {wr:.1f}% (W:{wins} L:{losses})")
        
        for i, log in enumerate(logs[:5], 1):
            result = "WIN" if log.get('profit', 0) > 0 else "LOSS"
            print(f"{i}. {result} | {log.get('strategy_name', 'N/A')[:30]} | ${log.get('profit', 0):.2f}")
    else:
        print("ALERTA: Nenhum resultado encontrado!")
        
except Exception as e:
    print(f"ERRO: {e}")

print("\n" + "="*80)
print("DIAGNOSTICO COMPLETO")
print("="*80)
