"""
Relatório de Saúde do Sistema
Gera análise completa e salva em markdown
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone
from collections import defaultdict

load_dotenv()

SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_report():
    report_lines = []
    now = datetime.now()
    
    report_lines.append(f"# Relatório de Saúde do Sistema - Million Bots")
    report_lines.append(f"\n**Gerado em**: {now.strftime('%Y-%m-%d %H:%M:%S')}\n")
    report_lines.append("---\n")
    
    # ============================================
    # 1. ESTRATÉGIAS (strategy_scores)
    # ============================================
    report_lines.append("## 1. Análise de Estratégias\n")
    
    try:
        response = supabase.table("strategy_scores").select("*").execute()
        strategies = response.data
        
        total = len(strategies)
        active = sum(1 for s in strategies if s.get('visible') and s.get('score', 0) >= 55)
        blocked = total - active
        
        report_lines.append(f"### Resumo Geral\n")
        report_lines.append(f"- **Total de Estratégias**: {total}")
        report_lines.append(f"- **Ativas (score ≥55)**: {active}")
        report_lines.append(f"- **Bloqueadas**: {blocked}")
        report_lines.append(f"- **Taxa de Aprovação**: {(active/total*100):.1f}%\n" if total > 0 else "- **Taxa de Aprovação**: N/A\n")
        
        # Distribuição por badge
        badge_count = defaultdict(int)
        for s in strategies:
            badge_count[s.get('badge', 'unknown')] += 1
        
        report_lines.append(f"### Distribuição por Badge\n")
        for badge, count in sorted(badge_count.items(), key=lambda x: x[1], reverse=True):
            report_lines.append(f"- **{badge}**: {count}")
        report_lines.append("")
        
        # Tabela detalhada das top 10
        report_lines.append("### Top 10 Estratégias\n")
        report_lines.append("| Rank | Nome | Score | Badge | WR | Trades | Status | Última Atualização |")
        report_lines.append("|------|------|-------|-------|-------|--------|--------|-------------------|")
        
        sorted_strats = sorted(strategies, key=lambda x: x.get('score', 0), reverse=True)
        for s in sorted_strats[:10]:
            name = s.get('strategy_name', 'N/A')
            score = s.get('score', 0)
            badge = s.get('badge', 'N/A')
            wr = s.get('expected_wr', 0)
            trades = s.get('total_trades', 0)
            status = "✅ Ativo" if s.get('visible') and score >= 55 else "🚫 Bloqueado"
            last_update = s.get('last_updated', 'N/A')
            
            # Calcular tempo desde última atualização
            if last_update != 'N/A':
                try:
                    dt = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
                    delta = datetime.now(timezone.utc) - dt
                    if delta.total_seconds() < 3600:
                        time_str = f"{int(delta.total_seconds()/60)}min"
                    elif delta.total_seconds() < 86400:
                        time_str = f"{int(delta.total_seconds()/3600)}h"
                    else:
                        time_str = f"{int(delta.total_seconds()/86400)}d"
                except:
                    time_str = "N/A"
            else:
                time_str = "N/A"
            
            report_lines.append(f"| {s.get('rank', '?')} | {name[:30]} | {score} | {badge} | {wr:.1f}% | {trades} | {status} | {time_str} |")
        
        report_lines.append("")
        
        # Alertas de problemas
        report_lines.append("### ⚠️ Alertas e Problemas\n")
        
        stale_strategies = []
        for s in strategies:
            last_update = s.get('last_updated')
            if last_update:
                try:
                    dt = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
                    delta = datetime.now(timezone.utc) - dt
                    if delta.total_seconds() > 3600:  # Mais de 1 hora
                        stale_strategies.append((s.get('strategy_name'), int(delta.total_seconds()/3600)))
                except:
                    pass
        
        if stale_strategies:
            report_lines.append("> **Estratégias sem atualização há mais de 1 hora:**\n")
            for name, hours in stale_strategies[:5]:
                report_lines.append(f"- `{name}`: {hours}h sem atualização")
            report_lines.append("")
        
        if active == 0:
            report_lines.append("> **CRÍTICO**: Nenhuma estratégia ativa! Bot não abrirá operações.\n")
        
        if blocked > total * 0.8:
            report_lines.append("> **ATENÇÃO**: Mais de 80% das estratégias estão bloqueadas.\n")
    
    except Exception as e:
        report_lines.append(f"❌ **Erro ao analisar estratégias**: {e}\n")
    
    # ============================================
    # 2. SINAIS (active_signals)
    # ============================================
    report_lines.append("## 2. Análise de Sinais\n")
    
    try:
        response = supabase.table("active_signals")\
            .select("*")\
            .order("created_at", desc=True)\
            .limit(100)\
            .execute()
        
        signals = response.data
        
        report_lines.append(f"- **Total de sinais (últimos 100)**: {len(signals)}\n")
        
        if signals:
            # Sinais por estratégia
            signal_count = defaultdict(int)
            for sig in signals:
                signal_count[sig.get('strategy', 'unknown')] += 1
            
            report_lines.append("### Sinais por Estratégia (Top 10)\n")
            for strat, count in sorted(signal_count.items(), key=lambda x: x[1], reverse=True)[:10]:
                report_lines.append(f"- `{strat}`: {count} sinais")
            report_lines.append("")
            
            # Último sinal
            last_signal = signals[0]
            last_time = last_signal.get('created_at', 'N/A')
            try:
                dt = datetime.fromisoformat(last_time.replace('Z', '+00:00'))
                delta = datetime.now(timezone.utc) - dt
                time_ago = f"{int(delta.total_seconds()/60)}min atrás"
            except:
                time_ago = "N/A"
            
            report_lines.append(f"**Último sinal**: {last_signal.get('strategy')} em {last_signal.get('asset')} ({time_ago})\n")
        else:
            report_lines.append("> **ALERTA**: Nenhum sinal encontrado! VPS pode não estar enviando dados.\n")
    
    except Exception as e:
        report_lines.append(f"❌ **Erro ao analisar sinais**: {e}\n")
    
    # ============================================
    # 3. RESULTADOS (bot_activity_logs)
    # ============================================
    report_lines.append("## 3. Análise de Resultados\n")
    
    try:
        response = supabase.table("bot_activity_logs")\
            .select("*")\
            .order("created_at", desc=True)\
            .limit(100)\
            .execute()
        
        logs = response.data
        
        if logs:
            wins = sum(1 for log in logs if log.get('profit', 0) > 0)
            losses = len(logs) - wins
            total_profit = sum(log.get('profit', 0) for log in logs)
            wr = (wins / len(logs) * 100) if logs else 0
            
            report_lines.append(f"- **Total de trades analisados**: {len(logs)}")
            report_lines.append(f"- **Wins**: {wins}")
            report_lines.append(f"- **Losses**: {losses}")
            report_lines.append(f"- **Win Rate**: {wr:.1f}%")
            report_lines.append(f"- **Lucro Total**: ${total_profit:.2f}\n")
            
            # Performance por estratégia
            strat_perf = defaultdict(lambda: {'wins': 0, 'losses': 0, 'profit': 0})
            for log in logs:
                strat = log.get('strategy_name', 'unknown')
                if log.get('profit', 0) > 0:
                    strat_perf[strat]['wins'] += 1
                else:
                    strat_perf[strat]['losses'] += 1
                strat_perf[strat]['profit'] += log.get('profit', 0)
            
            report_lines.append("### Performance por Estratégia (Top 10)\n")
            report_lines.append("| Estratégia | WR | W/L | Lucro |")
            report_lines.append("|------------|-----|-----|-------|")
            
            sorted_perf = sorted(strat_perf.items(), key=lambda x: x[1]['wins'] + x[1]['losses'], reverse=True)
            for strat, perf in sorted_perf[:10]:
                total = perf['wins'] + perf['losses']
                wr = (perf['wins'] / total * 100) if total > 0 else 0
                report_lines.append(f"| {strat[:30]} | {wr:.1f}% | {perf['wins']}/{perf['losses']} | ${perf['profit']:.2f} |")
            
            report_lines.append("")
        else:
            report_lines.append("> **ALERTA**: Nenhum resultado registrado.\n")
    
    except Exception as e:
        report_lines.append(f"❌ **Erro ao analisar resultados**: {e}\n")
    
    # ============================================
    # 4. RECOMENDAÇÕES
    # ============================================
    report_lines.append("## 4. Recomendações\n")
    
    if active == 0:
        report_lines.append("- [ ] **URGENTE**: Ativar ao menos uma estratégia ou reduzir threshold de score")
    
    if 'signals' in locals() and len(signals) == 0:
        report_lines.append("- [ ] Verificar se `master_bot.py` está rodando na VPS")
        report_lines.append("- [ ] Verificar logs da VPS para identificar erros")
    
    if 'logs' in locals() and len(logs) == 0:
        report_lines.append("- [ ] Sistema sem registrar resultados — verificar integração")
    
    if stale_strategies and len(stale_strategies) > 5:
        report_lines.append(f"- [ ] {len(stale_strategies)} estratégias sem atualização recente — verificar `strategy_scorer.py`")
    
    report_lines.append("\n---\n")
    report_lines.append("*Relatório gerado automaticamente por `system_health_report.py`*")
    
    return "\n".join(report_lines)

def main():
    print("📊 Gerando relatório de saúde do sistema...")
    
    report_content = generate_report()
    
    # Salvar em arquivo
    filename = f"health_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    filepath = os.path.join(os.path.dirname(__file__), filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f"✅ Relatório salvo em: {filepath}\n")
    print("="*80)
    print(report_content)
    print("="*80)

if __name__ == "__main__":
    main()
