#!/bin/bash
# Script de Correcao - Executar na VPS
# Aplica fixes no strategy_scorer.py

echo "======================================"
echo "APLICANDO CORRECOES NO SISTEMA"
echo "======================================"

cd /root/million_bots_vps || exit 1

# Backup
echo "[1] Fazendo backup..."
cp engine/strategy_scorer.py engine/strategy_scorer.py.backup_$(date +%Y%m%d_%H%M%S)

# Correcao 1: Reduzir threshold de 20 para 10 trades (linha 152-155)
echo "[2] Aplicando correcao 1: threshold de trades..."
sed -i 's/if total_trades < 20:/if total_trades < 10:/g' engine/strategy_scorer.py
sed -i 's/({total_trades}\/20 minimum)/({total_trades}\/10 minimum)/g' engine/strategy_scorer.py

# Correcao 2: Reduzir score threshold de 55 para 45 (linha 554)
echo "[3] Aplicando correcao 2: score threshold..."
sed -i 's/and data\[.score.\] >= 55/and data\[.score.\] >= 45/g' engine/strategy_scorer.py

# Verificar mudancas
echo ""
echo "[4] Verificando mudancas aplicadas:"
echo "-------------------------------------"
echo "HARD RULE 2 (deve mostrar: < 10):"
grep -A 2 "HARD RULE 2" engine/strategy_scorer.py | grep "if total_trades"
echo ""
echo "should_dispatch (deve mostrar: >= 45):"
grep "score.*>= 4" engine/strategy_scorer.py | tail -1
echo ""

# Verificar se master_bot esta rodando
echo "[5] Status do master_bot:"
if pgrep -f "python.*master_bot.py" > /dev/null; then
    echo "master_bot.py esta RODANDO (PID: $(pgrep -f 'python.*master_bot.py'))"
    echo "Reiniciando..."
    pkill -f "python.*master_bot.py"
    sleep 2
else
    echo "master_bot.py NAO estava rodando"
fi

# Iniciar master_bot
echo "[6] Iniciando master_bot.py..."
mkdir -p logs
nohup python3 master_bot.py > logs/master_bot.log 2>&1 &
NEW_PID=$!

echo "master_bot.py iniciado (PID: $NEW_PID)"
echo ""
echo "======================================"
echo "CORRECOES APLICADAS COM SUCESSO!"
echo "======================================"
echo ""
echo "Para monitorar logs em tempo real:"
echo "  tail -f logs/master_bot.log"
echo ""
echo "Para verificar sinais sendo enviados:"
echo "  grep 'SIGNAL SENT' logs/master_bot.log"
