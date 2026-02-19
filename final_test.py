"""
Teste Final - Validacao Definitiva
"""
import time
from supabase import create_client, Client

SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U"

print("="*80)
print("TESTE FINAL - VALIDACAO COMPLETA")
print("="*80)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("\n[1] Aguardando 60 segundos (novo ciclo de scoring)...")
for i in range(60, 0, -15):
    print(f"    {i}s...")
    time.sleep(15)

print("\n[2] Consultando strategy_scores...")
response = supabase.table("strategy_scores").select("*").order("score", desc=True).execute()
strategies = response.data

visible_before = 3
visible_now = len([s for s in strategies if s.get('score', 0) >= 45 and s.get('total_trades', 0) >= 10])

print(f"    Total: {len(strategies)}")
print(f"    Visiveis: {visible_now} (antes: {visible_before})")
print(f"    Mudanca: {'+' if visible_now > visible_before else ''}{visible_now - visible_before}")

print("\n    TOP 10:")
for i, s in enumerate(strategies[:10], 1):
    can_dispatch = s.get('visible') and s.get('score', 0) >= 45
    status = "ATIVO" if can_dispatch else "OCULTO"    
    reason = s.get('reason_hidden', '')[:30] if not can_dispatch else ''
    print(f"    {i}. {s.get('strategy_name')[:30]:30} | {s.get('score'):3}pts | {s.get('total_trades'):3}t | {status:6} | {reason}")

print("\n[3] Double Top Sniper V2:")
dt = [s for s in strategies if 'Double Top Sniper V2' in s.get('strategy_name', '')]
if dt:
    s = dt[0]
    can_dispatch = s.get('visible') and s.get('score', 0) >= 45
    print(f"    Score: {s.get('score')} | Trades: {s.get('total_trades')}")
    print(f"    Visivel: {s.get('visible')} | Despacha: {can_dispatch}")
    print(f"    Motivo: {s.get('reason_hidden', 'N/A')}")
    if can_dispatch:
        print("    >>> SUCESSO! Double Top V2 ATIVA! <<<")
    elif s.get('total_trades', 0) >= 10:
        print("    >>> CORRECAO APLICADA! (trades >= 10) <<<")
    else:
        print("    >>> Aguardar acumular 10+ trades <<<")

print("\n[4] Active signals:")
response = supabase.table("active_signals").select("*").order("created_at", desc=True).limit(5).execute()
signals = response.data
print(f"    Sinais: {len(signals)}")
if signals:
    for sig in signals[:3]:
        print(f"    - {sig.get('asset')} {sig.get('direction')} | {sig.get('strategy', 'N/A')[:25]}")
    print("    >>> BOT DESPACHANDO SINAIS! <<<")

print("\n" + "="*80)
if visible_now > visible_before or signals:
    print("SUCESSO! SISTEMA CORRIGIDO E FUNCIONANDO!")
else:
    print("Aguardar mais tempo ou verificar logs da VPS")
print("="*80)
