"""
Script de Diagnóstico - Análise de Dados do Supabase
Compara dados em strategy_scores vs frontend
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone
from tabulate import tabulate

load_dotenv()

# Supabase credentials
SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U"

print("🔍 Conectando ao Supabase...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("\n" + "="*80)
print("DIAGNÓSTICO COMPLETO DO SISTEMA DE TRADING")
print("="*80 + "\n")

# ============================================
# 1. CONSULTAR STRATEGY_SCORES (Fonte do Frontend)
# ============================================
print("📊 [1/4] Consultando strategy_scores (fonte do frontend)...\n")

try:
    response = supabase.table("strategy_scores")\
        .select("*")\
        .order("score", desc=True)\
        .execute()
    
    strategies = response.data
    print(f"✅ Encontradas {len(strategies)} estratégias\n")
    
    # Filtrar conforme o frontend
    frontend_filter = [
        s for s in strategies 
        if s.get('score', 0) >= 45 and s.get('total_trades', 0) >= 10
    ]
    
    print(f"🎯 Estratégias que passam no filtro do frontend (score≥45, trades≥10): {len(frontend_filter)}\n")
    
    # Tabela das top estratégias
    if frontend_filter:
        table_data = []
        for s in frontend_filter[:15]:
            last_update = s.get('last_updated', 'N/A')
            if last_update != 'N/A':
                try:
                    dt = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
                    now = datetime.now(timezone.utc)
                    delta = now - dt
                    minutes_ago = int(delta.total_seconds() / 60)
                    last_update = f"{minutes_ago}min atrás"
                except:
                    pass
            
            table_data.append([
                s.get('rank', '?'),
                s.get('strategy_name', 'N/A')[:35],
                s.get('score', 0),
                s.get('badge', 'N/A'),
                f"{s.get('expected_wr', 0):.1f}%",
                f"{s.get('recent_wr', 0):.1f}%",
                s.get('total_trades', 0),
                f"{s.get('wins', 0)}/{s.get('losses', 0)}",
                last_update
            ])
        
        print(tabulate(
            table_data,
            headers=['Rank', 'Estratégia', 'Score', 'Badge', 'WR Total', 'WR Recente', 'Trades', 'W/L', 'Última Atualização'],
            tablefmt='grid'
        ))
    
    # Foco especial: Double Top Sniper
    print("\n" + "="*80)
    print("🔎 ANÁLISE ESPECÍFICA: DOUBLE TOP SNIPER")
    print("="*80 + "\n")
    
    double_top_strategies = [s for s in strategies if 'double' in s.get('strategy_name', '').lower()]
    
    if double_top_strategies:
        for s in double_top_strategies:
            print(f"📌 Nome: {s.get('strategy_name')}")
            print(f"   Score: {s.get('score')} pts")
            print(f"   Badge: {s.get('badge')} ({s.get('badge_stars')} ⭐)")
            print(f"   WR Total: {s.get('expected_wr', 0):.1f}%")
            print(f"   WR Recente: {s.get('recent_wr', 0):.1f}%")
            print(f"   Trades: {s.get('total_trades')} (W:{s.get('wins')} L:{s.get('losses')})")
            print(f"   Visível: {s.get('visible')}")
            print(f"   Motivo Oculto: {s.get('reason_hidden', 'N/A')}")
            print(f"   Última Atualização: {s.get('last_updated')}")
            print(f"   Expectation: {s.get('expectation_per_trade', 0):.3f}")
            print()
    else:
        print("⚠️ NENHUMA estratégia contendo 'double' encontrada!\n")
    
    # Estratégias com score = 0
    print("="*80)
    print("🚨 ESTRATÉGIAS COM SCORE = 0 (BLOQUEADAS)")
    print("="*80 + "\n")
    
    blocked = [s for s in strategies if s.get('score', 0) == 0]
    print(f"Total bloqueadas: {len(blocked)}\n")
    
    if blocked:
        blocked_data = []
        for s in blocked[:10]:
            blocked_data.append([
                s.get('strategy_name', 'N/A')[:35],
                s.get('total_trades', 0),
                s.get('reason_hidden', 'N/A')[:50],
                f"{s.get('expected_wr', 0):.1f}%"
            ])
        
        print(tabulate(
            blocked_data,
            headers=['Estratégia', 'Trades', 'Motivo', 'WR'],
            tablefmt='grid'
        ))

except Exception as e:
    print(f"❌ Erro ao consultar strategy_scores: {e}")

# ============================================
# 2. VERIFICAR SINAIS ATIVOS (active_signals)
# ============================================
print("\n" + "="*80)
print("📡 [2/4] Verificando sinais enviados (active_signals)...")
print("="*80 + "\n")

try:
    # Buscar sinais das últimas 24h
    response = supabase.table("active_signals")\
        .select("*")\
        .order("created_at", desc=True)\
        .limit(50)\
        .execute()
    
    signals = response.data
    print(f"✅ Últimos {len(signals)} sinais encontrados\n")
    
    if signals:
        signal_data = []
        for sig in signals[:10]:
            signal_data.append([
                sig.get('id'),
                sig.get('asset', 'N/A'),
                sig.get('direction', 'N/A'),
                sig.get('strategy', 'N/A')[:30],
                sig.get('created_at', 'N/A')
            ])
        
        print(tabulate(
            signal_data,
            headers=['ID', 'Ativo', 'Direção', 'Estratégia', 'Criado Em'],
            tablefmt='grid'
        ))
    else:
        print("⚠️ NENHUM sinal encontrado nas últimas horas!")
        print("   → Isso indica que o bot VPS não está enviando sinais\n")

except Exception as e:
    print(f"❌ Erro ao consultar active_signals: {e}")

# ============================================
# 3. VERIFICAR RESULTADOS (bot_activity_logs)
# ============================================
print("\n" + "="*80)
print("📈 [3/4] Verificando resultados de trades (bot_activity_logs)...")
print("="*80 + "\n")

try:
    response = supabase.table("bot_activity_logs")\
        .select("*")\
        .order("created_at", desc=True)\
        .limit(20)\
        .execute()
    
    logs = response.data
    print(f"✅ Últimos {len(logs)} resultados encontrados\n")
    
    if logs:
        log_data = []
        for log in logs[:10]:
            result = "WIN" if log.get('profit', 0) > 0 else "LOSS"
            log_data.append([
                log.get('strategy_name', 'N/A')[:30],
                log.get('asset', 'N/A'),
                result,
                f"${log.get('profit', 0):.2f}",
                log.get('created_at', 'N/A')
            ])
        
        print(tabulate(
            log_data,
            headers=['Estratégia', 'Ativo', 'Resultado', 'Lucro', 'Data'],
            tablefmt='grid'
        ))
    else:
        print("⚠️ NENHUM resultado registrado!")

except Exception as e:
    print(f"❌ Erro ao consultar bot_activity_logs: {e}")

# ============================================
# 4. DIAGNÓSTICO FINAL
# ============================================
print("\n" + "="*80)
print("🎯 [4/4] DIAGNÓSTICO E RECOMENDAÇÕES")
print("="*80 + "\n")

print("🔍 RESUMO:\n")

has_strategies = len(strategies) > 0
has_visible = len(frontend_filter) > 0
has_signals = len(signals) > 0 if 'signals' in locals() else False
has_results = len(logs) > 0 if 'logs' in locals() else False

print(f"✓ Estratégias no Supabase: {'SIM' if has_strategies else 'NÃO'}")
print(f"✓ Estratégias visíveis (score≥45): {'SIM' if has_visible else 'NÃO'}")
print(f"✓ Sinais sendo enviados: {'SIM' if has_signals else 'NÃO'}")
print(f"✓ Resultados registrados: {'SIM' if has_results else 'NÃO'}")

print("\n📋 RECOMENDAÇÕES:\n")

if not has_visible:
    print("⚠️ 1. NENHUMA estratégia com score≥45")
    print("   → O bot não abrirá operações até que as estratégias acumulem trades")
    print("   → Opções:")
    print("      a) Aguardar 10+ trades para cada estratégia (modo Shadow)")
    print("      b) Reduzir threshold de 55 para 30 temporariamente")
    print()

if not has_signals:
    print("⚠️ 2. NENHUM sinal enviado recentemente")
    print("   → Verificar se master_bot.py está rodando na VPS")
    print("   → Comando: ssh user@vps 'ps aux | grep master_bot'")
    print()

if has_strategies and not has_visible:
    print("⚠️ 3. Estratégias existem mas estão bloqueadas")
    print("   → Verificar 'reason_hidden' na tabela acima")
    print("   → Comum: 'Insufficient trades' ou 'Negative expectation'")
    print()

print("\n" + "="*80)
print("✅ DIAGNÓSTICO COMPLETO!")
print("="*80)
