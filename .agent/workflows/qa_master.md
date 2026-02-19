---
description: QA Master - Suite completa de testes automatizados para Million Bots
---

# QA Master - Suite Completa de Testes

Este workflow executa **TODOS** os testes do Million Bots: regressão, E2E, UI, performance, Supabase e backend.

## Pré-requisitos

Antes de executar, verifique:
- ✅ Frontend rodando (localhost:5173 ou deploy)
- ✅ Backend VPS acessível via SSH
- ✅ Supabase online
- ✅ Variáveis de ambiente configuradas em `.env.qa`

## Execução

### Modo Completo (Recomendado)
```bash
cd c:/Users/bialo/OneDrive/Documentos/beckbug
python scripts/run_qa_master.py
```

### Modo Rápido (Sem testes de 2min)
```bash
python scripts/run_qa_master.py --quick
```

### Apenas Categoria Específica
```bash
python scripts/run_qa_master.py --category regression
python scripts/run_qa_master.py --category e2e
python scripts/run_qa_master.py --category performance
```

## O Que Este Workflow Faz

### 1. PRE-FLIGHT CHECKS (30s)
- Verifica se frontend está acessível
- Testa SSH para VPS
- Pinga Supabase REST API
- Testa conexão Deriv WebSocket

**Se qualquer serviço estiver down, aborta com erro claro**

### 2. REGRESSION TESTS (6 testes históricos)

#### Bug #1: Loop Infinito de Re-renders
- Abre /bug-deriv no browser
- Monitora console por 2 minutos
- Conta quantas vezes aparece "Carregando inteligência da VPS"
- ✅ PASSOU: 2-4 vezes
- ❌ FALHOU: >10 vezes

#### Bug #2: ActiveStrategies Reset
- Ativa estratégias com "ATIVAR MEJORES BOTS"
- Aguarda 90 segundos (1 auto-refresh)
- Verifica se estratégias ainda estão ativas
- ✅ PASSOU: Estratégias persistem
- ❌ FALHOU: Reset detectado

#### Bug #3: Supabase WebSocket Crashes
- Monitora status da conexão real-time por 2 minutos
- ✅ PASSOU: SUBSCRIBED o tempo todo
- ❌ FALHOU: CHANNEL_ERROR ou desconexão

#### Bug #4: Scoring Logic Incorreta
- Query strategy_scores via Supabase
- Valida cálculo de WR: wins/total_trades * 100
- Verifica se WR >60% tem score >50
- Verifica se frequency_1h=0 NÃO zera score
- ✅ PASSOU: Todas validações OK
- ❌ FALHOU: Inconsistências encontradas

#### Bug #5: Estratégias Não Carregadas
- SSH na VPS: conta arquivos em strategies/tier1/
- Verifica logs: "Loaded X strategies"
- Query Supabase: COUNT(DISTINCT strategy_name)
- ✅ PASSOU: Todos os números batem (15)
- ❌ FALHOU: Números diferentes

#### Bug #6: Deriv WebSocket Error 1006
- SSH na VPS
- Busca logs: `journalctl -u million_bot --since '5 minutes ago'`
- Procura por "error 1006" ou "websocket.*fail"
- ✅ PASSOU: 0 ocorrências
- ❌ FALHOU: Erros encontrados

### 3. E2E COMPLETE TRADING CYCLE

Simula ciclo completo de uma operação:

**Passo 1: Backend gera sinal**
- SSH na VPS e aguarda sinal (ou força geração de teste)
- Valida inserção no Supabase: `SELECT * FROM active_signals ORDER BY created_at DESC LIMIT 1`

**Passo 2: Frontend recebe sinal**
- Browser monitora console
- Aguarda log: "📡 SINAL RECEBIDO"
- Timeout: 30 segundos

**Passo 3: Frontend envia ordem**
- Procura log: "🚀 Ordem enviada" ou "Contrato aberto"

**Passo 4: Resultado registrado**
- Aguarda 2 minutos (tempo da operação)
- Query: `SELECT * FROM bot_activity_logs ORDER BY created_at DESC LIMIT 1`
- Verifica result = WIN ou LOSS

### 4. UI TESTS (Visual + Funcional)

**Teste: Ranking de Estratégias**
- Navega para /bug-deriv
- Aguarda cards aparecerem (timeout 10s)
- Screenshot: `qa_reports/screenshots/01_ranking_loaded.png`
- Valida: ≥3 cards visíveis
- Valida cada card tem: nome, score, WR, botão

**Teste: Botão "ATIVAR MEJORES BOTS"**
- Clica no botão laranja
- Aguarda 2s
- Verifica badges mudaram para "EN VIVO" (verde)
- Screenshot: `qa_reports/screenshots/02_strategies_active.png`
- Verifica console: "✅ Bot started successfully"

**Teste: Ativação Individual**
- Clica "DETENER ROBOT" em estratégia ativa
- Verifica badge ficou cinza
- Clica "ACTIVAR ESTRATEGIA" em estratégia inativa
- Verifica badge ficou verde
- Screenshot: `qa_reports/screenshots/03_individual_toggle.png`

**Teste: Resultado Global**
- Verifica números não são "NaN" ou "undefined"
- Verifica cores: verde (lucro) / vermelho (prejuízo)
- Aguarda 30s e verifica se números MUDAM (real-time)

### 5. PERFORMANCE TESTS

**Backend API Latency**
```bash
time curl -s http://[VPS_IP]:8000/health
```
- ✅ <200ms
- ⚠️ 200-500ms
- ❌ >500ms

**Frontend Time to Interactive**
- Mede TTI via browser timing API
- ✅ <2s
- ⚠️ 2-4s
- ❌ >4s

**Supabase Query Speed**
```sql
SELECT * FROM strategy_scores
```
- ✅ <100ms
- ❌ >500ms

**Real-time Latency**
- Insere dado no Supabase
- Mede tempo até frontend receber
- ✅ <1s
- ❌ >3s

### 6. SUPABASE DATA VALIDATION

**Tabela: strategy_scores**
```sql
-- Verifica existência de estratégias
SELECT COUNT(*) FROM strategy_scores;
-- Esperado: ≥10

-- Verifica freshness
SELECT strategy_name, last_updated 
FROM strategy_scores 
WHERE last_updated < NOW() - INTERVAL '10 minutes';
-- Esperado: 0 linhas
```

**Tabela: strategy_performance**
```sql
-- Verifica consistência
SELECT strategy_name 
FROM strategy_performance 
WHERE total_trades != wins + losses;
-- Esperado: 0 linhas
```

**Tabela: active_signals**
```sql
-- Verifica limpeza de sinais antigos
SELECT COUNT(*) 
FROM active_signals 
WHERE created_at < NOW() - INTERVAL '5 minutes';
-- Esperado: 0 linhas
```

**Tabela: bot_activity_logs**
```sql
-- Verifica atividade recente
SELECT COUNT(*) 
FROM bot_activity_logs 
WHERE created_at > NOW() - INTERVAL '1 hour';
-- Esperado: >0 (se bot está rodando)
```

### 7. BACKEND LOG ANALYSIS

**SSH na VPS e executar:**

```bash
# Buscar erros críticos
journalctl -u million_bot --since "1 hour ago" | grep -i "ERROR\|EXCEPTION\|CRITICAL\|FATAL"
# ✅ 0 linhas | ⚠️ 1-5 erros | ❌ >5 erros

# Buscar warnings
journalctl -u million_bot --since "1 hour ago" | grep -i "WARNING"
# Listar todos

# Validar geração de sinais
journalctl -u million_bot --since "10 minutes ago" | grep "SHADOW.*Signal"
# Esperado: ≥5 linhas

# Validar Regime Engine
journalctl -u million_bot --since "5 minutes ago" | grep "MOD_VOL\|LOW_VOL\|HIGH_VOL"
# Esperado: Múltiplas linhas
```

### 8. RESILIENCY TESTS

**Teste: Auto-Restart do Bot**
```bash
# SSH na VPS
pkill -9 -f master_bot
sleep 15
systemctl status million_bot
```
- ✅ Status = active (running)
- ❌ Status = failed

**Teste: Supabase Reconnect**
- Frontend: Simula desconexão (desabilita network no browser)
- Aguarda 10s
- Reabilita network
- Aguarda 30s
- Verifica log: "📡 Conectado ao Servidor Cloud VPS"
- ✅ Reconectou
- ❌ Ficou desconectado

**Teste: State Persistence**
- Com bot ativo, faz hard refresh (Ctrl+Shift+R)
- Verifica se estratégias ativas CONTINUAM ativas
- ✅ Estado persistiu
- ❌ Perdeu estado

### 9. REPORT GENERATION

Gera arquivo: `qa_reports/MASTER_REPORT_[timestamp].md`

**Seções do Relatório:**

1. **Executive Summary**
   - Data/hora do teste
   - Duração total
   - Nota: X/12 testes passaram
   - Status: 🟢 SAUDÁVEL | 🟡 ATENÇÃO | 🔴 CRÍTICO

2. **Tabela de Resultados**
   ```
   | Categoria | Teste | Status | Detalhes |
   |-----------|-------|--------|----------|
   | Regressão | Loop Infinito | ✅ | 3 loads em 2min |
   | ... | ... | ... | ... |
   ```

3. **Bugs Encontrados**
   - 🔴 Crítico / 🟡 Médio / 🟢 Baixo
   - Descrição
   - Como reproduzir
   - Sugestão de fix

4. **Warnings & Observações**

5. **Métricas de Performance**

6. **Screenshots**
   - Links para todas as capturas

7. **Logs Relevantes**
   - Trechos importantes (máx 50 linhas)

8. **Recomendações**
   - Ações sugeridas

### 10. ALERTAS AUTOMÁTICOS

**Se score <7/10:**
- Cria `qa_reports/ALERT_CRITICAL.txt`
- Mensagem formatada com falhas críticas

**Se score ≥9/10:**
- Cria `qa_reports/SUCCESS.txt`
- Log silencioso

## Outputs Esperados

**Console durante execução:**
```
🚀 MILLION BOTS QA SUITE v2.0
=============================

[1/12] ✅ Pre-flight check: All services online
[2/12] ✅ Regression: Loop infinito (3 loads)
[3/12] ✅ Regression: ActiveStrategies persists
[4/12] ✅ Regression: Supabase WS stable
[5/12] ⚠️ Regression: Scoring logic (2 warnings)
[6/12] ✅ Regression: All 15 strategies loaded
[7/12] ✅ Regression: Deriv WS (0 errors)
[8/12] ✅ E2E: Complete signal cycle worked
[9/12] ✅ UI: All tests passed
[10/12] ✅ Performance: All metrics green
[11/12] ✅ Supabase: Data integrity OK
[12/12] ✅ Backend: Logs clean

=============================
📊 FINAL SCORE: 11/12 (91.6%)
🟢 STATUS: HEALTHY

⚠️ 1 warning requires attention
📋 Full report: qa_reports/MASTER_REPORT_20260216_183042.md
```

## Troubleshooting

**Erro: "Cannot connect to VPS"**
- Verifique `.env.qa`: VPS_HOST, VPS_SSH_KEY
- Teste manualmente: `ssh -i ~/.ssh/id_rsa root@[VPS_IP]`

**Erro: "Frontend not accessible"**
- Verifique se dev server está rodando: `cd FRONTEND && npm run dev`
- Ou configure FRONTEND_URL para deploy em produção

**Erro: "Supabase query failed"**
- Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
- Teste: `curl [SUPABASE_URL]/rest/v1/strategy_scores -H "apikey: [KEY]"`

**Testes falhando intermitentemente**
- Aumente timeouts em `tests/config/test_config.py`
- Verifique latência de rede para VPS

## Agendamento Automático

Para rodar diariamente às 2am:

**Windows Task Scheduler:**
```powershell
$action = New-ScheduledTaskAction -Execute "python" -Argument "c:\Users\bialo\OneDrive\Documentos\beckbug\scripts\run_qa_master.py" -WorkingDirectory "c:\Users\bialo\OneDrive\Documentos\beckbug"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "MillionBotsQA" -Description "QA diário do Million Bots"
```

**Linux Cron (se migrar para Linux):**
```bash
0 2 * * * cd /path/to/beckbug && python scripts/run_qa_master.py >> qa_reports/cron.log 2>&1
```
