"""
Aguardar e testar sinais no Supabase
"""
import time
from supabase import create_client, Client

SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U"

print("="*80)
print("TESTE COMPLETO - VALIDACAO DE CORRECOES")
print("="*80)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("\n[1] Aguardando 60 segundos para o bot processar...")
for i in range(60, 0, -10):
    print(f"    {i} segundos restantes...")
    time.sleep(10)

print("\n[2] Consultando strategy_scores atualizados...")
response = supabase.table("strategy_scores")\
    .select("*")\
    .order("score", desc=True)\
    .execute()

strategies = response.data

visible = [s for s in strategies if s.get('score', 0) >= 45 and s.get('total_trades', 0) >= 10]

print(f"\n    Total estrategias: {len(strategies)}")
print(f"    Visiveis (score>=45, trades>=10): {len(visible)}")
print(f"    Mudanca: 3 -> {len(visible)} ({'+' if len(visible) > 3 else ''}{len(visible) - 3})")

# Top estrategias
print("\n    TOP 10 ESTRATEGIAS:")
for i, s in enumerate(strategies[:10], 1):
    visible_status = "VISIVEL" if s.get('visible') and s.get('score', 0) >= 45 else "OCULTO"
    print(f"    {i}. {s.get('strategy_name')[:35]:35} | Score: {s.get('score'):3} | WR: {s.get('expected_wr', 0):5.1f}% | Trades: {s.get('total_trades'):3} | {visible_status}")

print("\n[3] Consultando active_signals...")
response = supabase.table("active_signals")\
    .select("*")\
    .order("created_at", desc=True)\
    .limit(10)\
    .execute()

signals = response.data
print(f"\n    Sinais encontrados: {len(signals)}")

if signals:
    print("\n    ULTIMOS SINAIS:")
    for i, sig in enumerate(signals[:5], 1):
        print(f"    {i}. {sig.get('asset')} {sig.get('direction')} | {sig.get('strategy', 'N/A')[:30]} | {sig.get('created_at')}")
    print("\n    >>> SUCESSO! Bot esta despachando sinais! <<<")
else:
    print("\n    >>> AINDA SEM SINAIS - Aguardar mais tempo ou verificar logs <<<")

print("\n[4] Double Top Sniper V2 - Status:")
double_tops = [s for s in strategies if 'Double Top Sniper V2' in s.get('strategy_name', '')]
if double_tops:
    s = double_tops[0]
    print(f"    Nome: {s.get('strategy_name')}")
    print(f"    Score: {s.get('score')}")
    print(f"    Trades: {s.get('total_trades')}")
    print(f"    WR: {s.get('expected_wr', 0):.1f}%")
    print(f"    Visivel: {s.get('visible')}")
    print(f"    Pode despachar: {s.get('visible') and s.get('score', 0) >= 45}")
    
    if s.get('visible') and s.get('score', 0) >= 45:
        print("\n    >>> Double Top V2 ATIVADA! <<<")
    else:
        print(f"\n    >>> Ainda bloqueada: {s.get('reason_hidden', 'N/A')} <<<")

print("\n" + "="*80)
print("VALIDACAO COMPLETA")
print("="*80)
print("\nProximo passo: Verificar frontend em http://localhost:8080/bug-deriv")
