"""
Diagnosticar problema de formatacao no frontend
"""
from supabase import create_client, Client

SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U"

print("="*80)
print("DIAGNOSTICO - VALORES INCORRETOS NO FRONTEND")
print("="*80)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Estrategias V3
V3_STRATEGIES = [
    'BB Squeeze V3',
    'Stoch Fast Cross V3',
    'RSI Rapid V3',
    'Keltner Scalp Pro V3',
    'MACD Flash V3',
    'EMA Trend Ride V3',
    'Double Top Sniper V3',
    'Keltner Breakout V3',
    'Stoch Scalp V3',
    'Par SAR V3'
]

print("\n[1] Consultando strategy_scores (filtro V3)...")
response = supabase.table("strategy_scores")\
    .select("*")\
    .in_("strategy_name", V3_STRATEGIES)\
    .execute()

strategies = response.data

print(f"\nTotal estrategias V3 encontradas: {len(strategies)}\n")

for s in strategies:
    name = s.get('strategy_name', 'N/A')
    wr = s.get('expected_wr', 0)
    wins = s.get('wins', 0)
    losses = s.get('losses', 0)
    total = s.get('total_trades', 0)
    score = s.get('score', 0)
    
    # Calcular WR manualmente
    wr_calc = (wins / total * 100) if total > 0 else 0
    
    print(f"Estrategia: {name}")
    print(f"  expected_wr (DB): {wr}")
    print(f"  wins: {wins} | losses: {losses} | total: {total}")
    print(f"  WR calculado: {wr_calc:.2f}%")
    print(f"  Score: {score}")
    
    # Verificar se WR esta com muitas casas decimais
    if wr > 80 and wr < 90 and str(wr).startswith('88.'):
        print(f"  >>> PROBLEMA: WR com valor estranho (88.888...)")
    
    if abs(wr - 57.142857) < 0.01:
        print(f"  >>> PROBLEMA: WR = 57.14285714285 (4/7 * 100)")
    
    print()

print("="*80)
print("ANALISE")
print("="*80)
print("\nPossiveis causas:")
print("1. Dados calculados com divisao incorreta no scorer")
print("2. Frontend mostrando sem formatacao (muitas casas decimais)")
print("3. Valores 'placeholder' ou default sendo usados")
