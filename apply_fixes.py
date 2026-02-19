#!/usr/bin/env python3
"""
Script de Correção - Ajustar Thresholds do Sistema
Executa via Supabase CLI e atualiza arquivos do VPS
"""

print("="*80)
print("CORRECOES DO SISTEMA DE TRADING")
print("="*80)

# Correção 1: Reduzir threshold de visibilidade de 20 para 10 trades
print("\n[1] Ajustando strategy_scorer.py (VPS)")
print("    Mudança: MIN_TRADES de 20 -> 10")

strategy_scorer_fix = """
# ARQUIVO: million_bots_vps/engine/strategy_scorer.py
# LINHA 152-155

# ANTES:
# HARD RULE 2: Menos de 20 trades → OCULTO (threshold mínimo para avaliação)
if total_trades < 20:
    visible = False
    reason_hidden = f"Insufficient trades ({total_trades}/20 minimum)"

# DEPOIS:
# HARD RULE 2: Menos de 10 trades → OCULTO (threshold mínimo para avaliação)  
if total_trades < 10:
    visible = False
    reason_hidden = f"Insufficient trades ({total_trades}/10 minimum)"
"""

print(strategy_scorer_fix)

# Correção 2: Reduzir threshold de dispatch de 55 para 45
print("\n[2] Ajustando should_dispatch threshold")
print("    Mudança: score >= 55 -> score >= 45")

should_dispatch_fix = """
# ARQUIVO: million_bots_vps/engine/strategy_scorer.py  
# LINHA 551-554

# ANTES:
def should_dispatch(self, strategy_name: str) -> bool:
    data = self.scores.get(strategy_name)
    if not data:
        return False
    return data['visible'] and data['score'] >= 55

# DEPOIS:
def should_dispatch(self, strategy_name: str) -> bool:
    data = self.scores.get(strategy_name)
    if not data:
        return False
    return data['visible'] and data['score'] >= 45  # Reduzido de 55
"""

print(should_dispatch_fix)

# Correção 3: Comandos SSH para aplicar na VPS
print("\n[3] Comandos para executar na VPS:")
print("="*80)

commands = """
# Conectar na VPS
ssh root@vps64469.publiccloud.com.br

# Ir para o diretório do bot
cd /root/million_bots_vps

# Backup do arquivo original
cp engine/strategy_scorer.py engine/strategy_scorer.py.backup

# Aplicar correção 1 (linha 152-155)
sed -i 's/if total_trades < 20:/if total_trades < 10:/g' engine/strategy_scorer.py
sed -i 's/(20 minimum)/(10 minimum)/g' engine/strategy_scorer.py

# Aplicar correção 2 (linha 554)
sed -i 's/score >= 55/score >= 45/g' engine/strategy_scorer.py

# Verificar mudanças
grep -A 2 "HARD RULE 2" engine/strategy_scorer.py
grep "score >= 45" engine/strategy_scorer.py

# Reiniciar o bot
pkill -f master_bot.py
nohup python3 master_bot.py > logs/master_bot.log 2>&1 &

# Ver logs em tempo real
tail -f logs/master_bot.log
"""

print(commands)

print("\n" + "="*80)
print("CORRECOES PREPARADAS - Executar comandos SSH acima")
print("="*80)
