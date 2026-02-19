# Guia de Correções Manuais - VPS

## Resumo do Problema
- ✅ **Diagnóstico confirmado**: Apenas 3/31 estratégias visíveis
- ✅ **ZERO sinais** sendo enviados (tabela `active_signals` vazia)
- ✅ **Causa raiz**: Thresholds muito restritivos bloqueando todas estratégias
  - Threshold mínimo: 20 trades (muito alto, apenas Double Top V2 tem 11)
  - Score mínimo para dispatch: 55 pontos (muito restritivo)

## Estratégias Encontradas
```
1. Double Top Sniper V2    | Score: 66  | WR: 90.9% | Trades: 11  ← BLOQUEADA (< 20 trades)
2. MACD Flash V2            | Score: 57  | WR: 68.4% | Trades: 19  ← BLOQUEADA (< 20 trades)
3. Par SAR V2               | Score: 51  | WR: 63.2% | Trades: 19  ← BLOQUEADA (score < 55)
```

## Correções Necessárias

As correções devem ser feitas no arquivo:
`/root/million_bots_vps/engine/strategy_scorer.py`

### Opção 1: Comandos SSH (Recomendado)

Copie e cole estes comandos um por um no terminal SSH:

```bash
# 1. Conectar na VPS
ssh root@vps64469.publiccloud.com.br
# Senha: Vom29bd#@

# 2. Ir para o diretório
cd /root/million_bots_vps

# 3. Fazer backup
cp engine/strategy_scorer.py engine/strategy_scorer.py.backup_$(date +%Y%m%d_%H%M%S)

# 4. Aplicar Correção 1: Reduzir threshold de 20 para 10 trades (linha ~152)
sed -i 's/if total_trades < 20:/if total_trades < 10:/g' engine/strategy_scorer.py
sed -i 's/({total_trades}\/20 minimum)/({total_trades}\/10 minimum)/g' engine/strategy_scorer.py

# 5. Aplicar Correção 2: Reduzir score de 55 para 45 (linha ~554)
sed -i "s/\['score'\] >= 55/['score'] >= 45/g" engine/strategy_scorer.py

# 6. Verificar mudanças
echo "=== Verificando HARD RULE 2 (deve mostrar '< 10') ===" 
grep -A 2 "HARD RULE 2" engine/strategy_scorer.py | grep "if total_trades"

echo "=== Verificando should_dispatch (deve mostrar '>= 45') ==="
grep "score.*>= 4" engine/strategy_scorer.py | tail -1

# 7. Reiniciar bot
echo "=== Parando bot ===" 
pkill -f "python.*master_bot.py"
sleep 3

echo "=== Iniciando bot ==="
mkdir -p /root/logs
nohup python3 master_bot.py > /root/logs/master_bot.log 2>&1 &

# 8. Verificar se está rodando
sleep 2
pgrep -f "python.*master_bot.py"

# 9. Monitorar logs (Ctrl+C para sair)
tail -f /root/logs/master_bot.log
```

### Opção 2: Edição Manual (Alternativa)

Se preferir editar manualmente:

```bash
ssh root@vps64469.publiccloud.com.br
cd /root/million_bots_vps
nano engine/strategy_scorer.py
```

**Editar linha ~152-155:**
```python
# ANTES:
if total_trades < 20:
    visible = False
    reason_hidden = f"Insufficient trades ({total_trades}/20 minimum)"

# DEPOIS:
if total_trades < 10:
    visible = False
    reason_hidden = f"Insufficient trades ({total_trades}/10 minimum)"
```

**Editar linha ~554:**
```python
# ANTES:
return data['visible'] and data['score'] >= 55

# DEPOIS:
return data['visible'] and data['score'] >= 45
```

Salvar (Ctrl+O, Enter, Ctrl+X) e reiniciar:
```bash
pkill -f "python.*master_bot.py"
nohup python3 master_bot.py > /root/logs/master_bot.log 2>&1 &
```

## Validação Pós-Correção

### 1. Verificar Logs do Bot
```bash
tail -f /root/logs/master_bot.log
```

**Buscar por:**
- `📊 Estratégias carregadas` - Deve mostrar estratégias com novos scores
- `🚀 SIGNAL SENT` - Sinais sendo despachados

### 2. Verificar Supabase (localmente)
No seu computador, executar:
```bash
cd c:\Users\bialo\OneDrive\Documentos\beckbug
python quick_diagnosis.py
```

**Resultados esperados após ~60 segundos:**
- ✅ Mais estratégias visíveis (deve subir de 3 para 6-10)
- ✅ Sinais em `active_signals` (antes estava ZERO)
- ✅ Double Top V2 deve ficar visível (score 66, agora com 11 > 10 trades)

## Logs Esperados (Sucesso)

Após reiniciar, você deve ver logs como:

```
[R_100] 📊 RANGING | Price: 9834.52 | Active Bots: [Double Top Sniper V2, MACD Flash V2, Par SAR V2]
[SCORING 🏆] Double Top Sniper V2: 66pts ⭐⭐ | MACD Flash V2: 57pts ⭐⭐ | ...
[R_100] 🚀 SIGNAL SENT (Elite): CALL Double Top Sniper V2 (Score: 66pts, Badge: good)
```

## Troubleshooting

### Bot não inicia?
```bash
# Ver erros
cat /root/logs/master_bot.log

# Verificar dependências
cd /root/million_bots_vps
pip3 install -r requirements.txt
```

### Nenhum sinal sendo enviado?
```bash
# Verificar se as estratégias estão carregando
grep "Estratégias disponíveis" /root/logs/master_bot.log

# Verificar se o Supabase está conectado
grep "Database connection" /root/logs/master_bot.log
```

### Erro de sintaxe no arquivo?
```bash
# Restaurar backup
cd /root/million_bots_vps
ls -la engine/strategy_scorer.py.backup_*
cp engine/strategy_scorer.py.backup_XXXXXX engine/strategy_scorer.py
```

## Próximos Passos

Após executar as correções e validar:
1. Aguardar 2-3 minutos para o sistema coletar dados
2. Executar `python quick_diagnosis.py` novamente
3. Verificar frontend em `http://localhost:8080/bug-deriv`
4. Confirmar que estratégias aparecem e bot abre operações

## Suporte

Se precisar de ajuda, envie:
- Output de `grep "SIGNAL SENT" /root/logs/master_bot.log | tail -10`
- Output de `python quick_diagnosis.py`
- Screenshot do frontend
