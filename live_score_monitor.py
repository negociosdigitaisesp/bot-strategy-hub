"""
Monitor de Scores em Tempo Real
Atualiza a cada 10 segundos mostrando top estratégias e mudanças
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import time
from datetime import datetime
from tabulate import tabulate
import sys

load_dotenv()

SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

previous_scores = {}

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def fetch_scores():
    try:
        response = supabase.table("strategy_scores")\
            .select("*")\
            .order("score", desc=True)\
            .execute()
        return response.data
    except Exception as e:
        print(f"❌ Erro: {e}")
        return []

def display_scores(strategies):
    global previous_scores
    
    clear_screen()
    
    print("="*100)
    print(f"🔴 MONITOR DE SCORES EM TEMPO REAL - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*100 + "\n")
    
    # Top 15 estratégias
    print("📊 TOP 15 ESTRATÉGIAS:\n")
    
    table_data = []
    changes = []
    
    for s in strategies[:15]:
        name = s.get('strategy_name', 'N/A')
        score = s.get('score', 0)
        
        # Detectar mudanças
        change_indicator = ""
        if name in previous_scores:
            old_score = previous_scores[name]
            if score > old_score:
                change_indicator = f"↑ +{score - old_score}"
                changes.append(f"📈 {name}: {old_score} → {score}")
            elif score < old_score:
                change_indicator = f"↓ {score - old_score}"
                changes.append(f"📉 {name}: {old_score} → {score}")
        
        # Status de dispatch
        can_dispatch = s.get('visible', False) and score >= 55
        dispatch_status = "✅ ATIVO" if can_dispatch else "🚫 BLOQUEADO"
        
        table_data.append([
            s.get('rank', '?'),
            name[:35],
            score,
            change_indicator,
            s.get('badge', 'N/A'),
            f"{s.get('expected_wr', 0):.1f}%",
            s.get('total_trades', 0),
            dispatch_status,
            s.get('reason_hidden', '')[:25] if not can_dispatch else ''
        ])
        
        # Atualizar histórico
        previous_scores[name] = score
    
    print(tabulate(
        table_data,
        headers=['#', 'Estratégia', 'Score', 'Mudança', 'Badge', 'WR', 'Trades', 'Status', 'Motivo'],
        tablefmt='grid'
    ))
    
    # Alertas de mudanças
    if changes:
        print("\n🔔 MUDANÇAS DETECTADAS:")
        for change in changes:
            print(f"   {change}")
    
    # Estatísticas gerais
    print("\n" + "="*100)
    total = len(strategies)
    active = sum(1 for s in strategies if s.get('visible', False) and s.get('score', 0) >= 55)
    blocked = total - active
    
    print(f"📊 ESTATÍSTICAS:")
    print(f"   Total: {total} | Ativos: {active} (podem despachar) | Bloqueados: {blocked}")
    print(f"   Última atualização: {datetime.now().strftime('%H:%M:%S')}")
    print("="*100)
    
    print("\n💡 Pressione Ctrl+C para sair")

def main():
    print("🚀 Iniciando monitor de scores...")
    print("📡 Conectando ao Supabase...\n")
    
    try:
        while True:
            strategies = fetch_scores()
            if strategies:
                display_scores(strategies)
            else:
                print("⚠️ Nenhuma estratégia encontrada. Aguardando...")
            
            time.sleep(10)  # Atualizar a cada 10 segundos
    
    except KeyboardInterrupt:
        print("\n\n👋 Monitor encerrado pelo usuário")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Erro fatal: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
