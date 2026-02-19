---
description: Orquestrador Completo - Gera estratégias, limpa fracas, integra e faz deploy na VPS
---

# Orquestrador de Pipeline Completo

## Descrição
Este workflow executa o pipeline completo end-to-end:
1. **Limpeza**: Remove estratégias fracas da VPS
2. **Geração**: Cria novas estratégias usando o gerador
3. **Integração**: Move estratégias para million_bots_vps
4. **Deploy VPS**: Envia para produção na Contabo
5. **Validação**: Verifica que tudo está funcionando

## Trigger
Use `/orchestrate-pipeline` ou `/pipeline-completo` para executar.

---

## Steps

### 🔹 FASE 1: LIMPEZA DE ESTRATÉGIAS FRACAS
// turbo

```
🗑️ FASE 1: REMOVER ESTRATÉGIAS FRACAS

Você é o **Strategy Manager** responsável por manter apenas as melhores estratégias.

## PASSO 1.1: IDENTIFICAR ESTRATÉGIAS FRACAS

Execute o script de gerenciamento:

```bash
cd c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps
python manage_strategies.py
```

**Output esperado:**
```
📊 RELATÓRIO DE GERENCIAMENTO DE ESTRATÉGIAS
============================================================
Total antes: 23
Total depois: 18
Limite máximo: 15

❌ Estratégias para remoção (5):
  - strategy_12_rsi_reversal.py
    Motivo: Win rate baixo: 52.3%
  - strategy_8_ema_cross.py
    Motivo: Win rate baixo: 54.1%
  ...
```

## PASSO 1.2: EXECUTAR DELEÇÃO

Se houver estratégias para remover, execute:

```bash
python manage_strategies.py --delete
```

**IMPORTANTE:** Isso deleta permanentemente os arquivos!

## PASSO 1.3: VERIFICAR RESULTADO

Conte quantas estratégias restaram:

```bash
cd strategies/tier1
ls *.py | wc -l
```

**Objetivo:** Ter entre 10-15 estratégias (abrindo espaço para novas).

**Output esperado:**
```
12
```

Se tiver menos de 10: OK, vamos gerar novas.
Se tiver 15 ou mais: Não há espaço, considere aumentar o limite ou melhorar critérios.
```

---

### 🔹 FASE 2: GERAR NOVAS ESTRATÉGIAS
// turbo

```
🤖 FASE 2: GERAÇÃO DE ESTRATÉGIAS

Você é o **Strategy Generator** responsável por criar novas estratégias de alta qualidade.

## PASSO 2.1: CALCULAR QUANTAS ESTRATÉGIAS GERAR

Objetivo: Ter exatamente 15 estratégias no total.

```python
import os

STRATEGIES_PATH = r"c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps\strategies\tier1"
current_count = len([f for f in os.listdir(STRATEGIES_PATH) if f.endswith('.py') and f != '__init__.py'])

target = 15
to_generate = max(0, target - current_count)

print(f"Estratégias atuais: {current_count}")
print(f"Estratégias a gerar: {to_generate}")
```

**Output esperado:**
```
Estratégias atuais: 12
Estratégias a gerar: 3
```

## PASSO 2.2: GERAR ESTRATÉGIAS

Para cada estratégia a gerar, execute o workflow de geração:

**IMPORTANTE:** Mude para o diretório do gerador:

```bash
cd "c:\Users\bialo\OneDrive\Documentos\beckbug\AGENTE GERADOR DE ESTRATEGIA"
```

**Opção A: Gerar uma por vez (recomendado para controle)**

```
Use o workflow existente: /gerar-estrategia

Para cada estratégia:
1. Escolha um ID único (ex: próximo número disponível)
2. Escolha TIER 1 (conservador, alta qualidade)
3. Execute: /gerar-estrategia [ID] 1
4. Aguarde conclusão (5 fases)
5. Repita até atingir o número necessário
```

**Opção B: Gerar em lote (mais rápido)**

Se o workflow `/gerar-multiplas` existir, use:

```
/gerar-multiplas [quantidade] tier1
```

## PASSO 2.3: VERIFICAR ESTRATÉGIAS GERADAS

Liste as novas estratégias criadas:

```bash
cd strategies
ls -lt | head -n 5
```

**Output esperado:**
```
strategy_47_bollinger_squeeze.py
strategy_48_rsi_divergence.py
strategy_49_macd_momentum.py
```

**Validação:**
- Cada arquivo deve ter > 2KB
- Deve conter classe `Strategy_[ID]_[Nome]`
- Deve ter método `check_entry()`
```

---

### 🔹 FASE 3: INTEGRAÇÃO (Mover para Million Bots VPS)
// turbo

```
📦 FASE 3: INTEGRAÇÃO DE ESTRATÉGIAS

Você é o **Integration Engineer** responsável por mover estratégias para produção.

## PASSO 3.1: COPIAR ESTRATÉGIAS GERADAS

Origem: `AGENTE GERADOR DE ESTRATEGIA\strategies`
Destino: `million_bots_vps\strategies\tier1`

```python
import os
import shutil
from datetime import datetime

SOURCE_DIR = r"c:\Users\bialo\OneDrive\Documentos\beckbug\AGENTE GERADOR DE ESTRATEGIA\strategies"
DEST_DIR = r"c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps\strategies\tier1"

# Listar arquivos recentes (últimas 24h)
now = datetime.now().timestamp()
recent_files = []

for file in os.listdir(SOURCE_DIR):
    if not file.endswith('.py'):
        continue
    
    filepath = os.path.join(SOURCE_DIR, file)
    mtime = os.path.getmtime(filepath)
    
    # Arquivo modificado nas últimas 24 horas
    if now - mtime < 86400:
        recent_files.append(file)

print(f"📁 Arquivos recentes encontrados: {len(recent_files)}")
for f in recent_files:
    print(f"  - {f}")

# Copiar para destino
copied = 0
for file in recent_files:
    src = os.path.join(SOURCE_DIR, file)
    dst = os.path.join(DEST_DIR, file)
    
    # Verificar se já existe
    if os.path.exists(dst):
        print(f"⚠️ {file} já existe, pulando...")
        continue
    
    shutil.copy2(src, dst)
    copied += 1
    print(f"✅ Copiado: {file}")

print(f"\n📊 Total copiado: {copied} arquivos")
```

## PASSO 3.2: VALIDAR TOTAL DE ESTRATÉGIAS

```python
import os

DEST_DIR = r"c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps\strategies\tier1"
total = len([f for f in os.listdir(DEST_DIR) if f.endswith('.py') and f != '__init__.py'])

print(f"📊 Total de estratégias em tier1: {total}")

if total > 15:
    print(f"⚠️ ATENÇÃO: Temos {total} estratégias, mas o limite é 15!")
    print("Execute novamente a Fase 1 para remover as piores.")
elif total < 10:
    print(f"⚠️ ATENÇÃO: Apenas {total} estratégias. Considere gerar mais.")
else:
    print(f"✅ Quantidade adequada: {total} estratégias")
```

**Decisão:**
- Se total > 15: Voltar para Fase 1 e remover mais
- Se total < 10: Voltar para Fase 2 e gerar mais
- Se 10-15: Continuar para Fase 4

## PASSO 3.3: TESTE RÁPIDO DE IMPORTAÇÃO

Verificar se as estratégias podem ser importadas:

```bash
cd c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps
python -c "from engine.strategy_loader import StrategyLoader; loader = StrategyLoader('strategies'); strats = loader.load_all(); print(f'✅ {len(strats)} estratégias carregadas')"
```

**Output esperado:**
```
✅ 14 estratégias carregadas
```

Se houver erros: Corrija antes de continuar.
```

---

### 🔹 FASE 4: DEPLOY NA VPS
// turbo

```
🚀 FASE 4: DEPLOYMENT PARA VPS CONTABO

Você é o **DevOps Engineer** responsável pelo deploy em produção.

## PASSO 4.1: VERIFICAR CREDENCIAIS VPS

```bash
cd c:\Users\bialo\OneDrive\Documentos\beckbug
cat .env.vps
```

**Output esperado:**
```
VPS_HOST=vps64469.publiccloud.com.br
VPS_USER=root
VPS_PASSWORD=***
VPS_PROJECT_PATH=/root/million_bots_vps
```

Se o arquivo não existir ou estiver incorreto, PARE e corrija.

## PASSO 4.2: EXECUTAR SCRIPT DE DEPLOY

```bash
cd c:\Users\bialo\OneDrive\Documentos\beckbug
python deploy_to_vps.py
```

**O script irá:**
1. Conectar via SSH à VPS
2. Sincronizar arquivos (excluindo __pycache__, .git, etc)
3. Instalar dependências (pip install -r requirements.txt)
4. Reiniciar o bot (pkill + nohup python3 master_bot.py)
5. Verificar se o bot está rodando
6. Mostrar logs recentes

**Output esperado:**
```
🚀 INICIANDO DEPLOYMENT PARA VPS
============================================================
🔌 Conectando ao VPS: vps64469.publiccloud.com.br...
✅ Conexão SSH estabelecida com sucesso!
📦 Sincronizando million_bots_vps -> /root/million_bots_vps...
  📄 10 arquivos sincronizados...
  📄 20 arquivos sincronizados...
✅ 47 arquivos sincronizados com sucesso!
📦 Instalando dependências no VPS...
✅ Dependências instaladas com sucesso!
🔄 Reiniciando bot na VPS...
✅ Bot reiniciado com sucesso!
✅ Bot está rodando:
   root     12345  0.5  2.1 123456 54321 ?  S    22:15   0:00 python3 master_bot.py

🔍 Verificando deployment...
============================================================
📊 RELATÓRIO DE VERIFICAÇÃO
============================================================
✅ Diretório existe
✅ master_bot.py existe
✅ .env existe
✅ Bot está rodando
✅ Estratégias carregadas: 14
============================================================

📋 Últimas 30 linhas do log:
[2026-02-15 22:15:23] [INFO] 🔥 MILLION BOTS ENGINE STARTING...
[2026-02-15 22:15:24] [INFO] 🔧 Inicializando Strategy Loader...
[2026-02-15 22:15:25] [INFO] 📦 Estratégias disponíveis: ['strategy_1_...', ...]
[2026-02-15 22:15:26] [INFO] 🔌 Subscribing to assets: ['R_100', 'R_75', '1HZ100V']
[2026-02-15 22:15:27] [INFO] ✅ Conectado ao WebSocket
...

============================================================
✅ DEPLOYMENT CONCLUÍDO COM SUCESSO!
============================================================
```

## PASSO 4.3: VERIFICAÇÃO MANUAL (OPCIONAL)

Se quiser verificar manualmente via SSH:

```bash
ssh root@vps64469.publiccloud.com.br
# Senha: Vom29bd#@

cd /root/million_bots_vps
ps aux | grep master_bot
tail -f bot.log
```

Para sair: Ctrl+C, depois `exit`
```

---

### 🔹 FASE 5: VALIDAÇÃO FINAL
// turbo

```
✅ FASE 5: VALIDAÇÃO DO PIPELINE COMPLETO

Você é o **QA Engineer** responsável por validar que tudo está funcionando.

## PASSO 5.1: VERIFICAR LOGS DA VPS (5 MINUTOS)

Aguarde 5 minutos e verifique os logs novamente:

```bash
cd c:\Users\bialo\OneDrive\Documentos\beckbug
python -c "from deploy_to_vps import VPSDeployer; d = VPSDeployer(); d.connect(); d.get_bot_logs(100); d.close()"
```

**Procure por:**
- ✅ "Estratégias disponíveis: [...]" com 14-15 estratégias
- ✅ "Conectado ao WebSocket"
- ✅ Sinais sendo gerados: "🚀 SIGNAL SENT"
- ❌ Erros Python (Traceback)
- ❌ Erros de conexão

## PASSO 5.2: VERIFICAR SUPABASE

Acesse o Supabase e verifique a tabela `active_signals`:

```python
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv('million_bots_vps/.env')

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_KEY')
)

# Últimos 10 sinais
response = supabase.table('active_signals').select('*').order('created_at', desc=True).limit(10).execute()

print(f"📊 Últimos {len(response.data)} sinais:")
for signal in response.data:
    print(f"  - {signal['created_at']}: {signal['strategy']} → {signal['direction']} ({signal['asset']})")
```

**Output esperado:**
```
📊 Últimos 10 sinais:
  - 2026-02-15T22:20:15: strategy_47_bollinger_squeeze → CALL (R_100)
  - 2026-02-15T22:18:42: strategy_12_rsi_reversal → PUT (R_75)
  ...
```

Se não houver sinais nos últimos 10 minutos: ⚠️ Investigar

## PASSO 5.3: VERIFICAR PERFORMANCE DAS NOVAS ESTRATÉGIAS

Após 24 horas, verifique o desempenho:

```python
# Estratégias criadas hoje
from datetime import datetime, timedelta

response = supabase.table('strategy_performance').select('*').execute()

today = datetime.now().date()
new_strategies = []

for strat in response.data:
    created_at = datetime.fromisoformat(strat.get('created_at', '2020-01-01'))
    if created_at.date() >= today - timedelta(days=1):
        new_strategies.append(strat)

print(f"📊 Novas estratégias (últimas 24h): {len(new_strategies)}")
for strat in new_strategies:
    print(f"  - {strat['strategy_name']}: WR {strat['win_rate']*100:.1f}%, {strat['total_trades']} trades")
```

**Critérios de sucesso:**
- Win rate > 55% após 50+ trades
- Gerando sinais regularmente
- Sem erros nos logs
```

---

### 🔹 FASE 6: RELATÓRIO FINAL
// turbo

```
📊 RELATÓRIO FINAL DO PIPELINE

Gere um relatório consolidado:

```markdown
# 🎯 RELATÓRIO DE EXECUÇÃO DO PIPELINE

**Data:** {data_hora_atual}
**Duração total:** {tempo_total}

## ✅ FASE 1: LIMPEZA
- Estratégias removidas: {N}
- Motivos: {lista_motivos}

## ✅ FASE 2: GERAÇÃO
- Estratégias geradas: {N}
- IDs: {lista_ids}
- Tier: 1 (Conservador)

## ✅ FASE 3: INTEGRAÇÃO
- Arquivos copiados: {N}
- Total em tier1: {total}

## ✅ FASE 4: DEPLOY VPS
- Arquivos sincronizados: {N}
- Bot reiniciado: ✅
- Status: Rodando

## ✅ FASE 5: VALIDAÇÃO
- Estratégias carregadas na VPS: {N}
- Sinais gerados (últimos 10 min): {N}
- Erros detectados: {N}

## 📈 PRÓXIMOS PASSOS
1. Monitorar performance das novas estratégias por 24-48h
2. Executar pipeline novamente se win rate < 55%
3. Ajustar limite de estratégias se necessário

## 🔗 LINKS ÚTEIS
- VPS: ssh root@vps64469.publiccloud.com.br
- Supabase: https://xwclmxjeombwabfdvyij.supabase.co
- Logs: /root/million_bots_vps/bot.log
```

Salve este relatório em:
`c:\Users\bialo\OneDrive\Documentos\beckbug\pipeline_reports\report_{timestamp}.md`
```

---

## ⚙️ CONFIGURAÇÕES E VARIÁVEIS

### Limites e Thresholds
- **MAX_STRATEGIES**: 15 (configurado em `manage_strategies.py`)
- **MIN_WIN_RATE**: 55% (configurado em `manage_strategies.py`)
- **MAX_REMOVALS_PER_RUN**: 5 (segurança)

### Caminhos Importantes
- **Gerador**: `c:\Users\bialo\OneDrive\Documentos\beckbug\AGENTE GERADOR DE ESTRATEGIA`
- **Produção Local**: `c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps`
- **VPS**: `/root/million_bots_vps`

### Credenciais
- **VPS**: `.env.vps` (root do projeto)
- **Supabase**: `million_bots_vps/.env`

---

## 🚨 TROUBLESHOOTING

### Problema: "Nenhuma estratégia para remover"
**Solução:** Todas as estratégias estão com bom desempenho. Não há necessidade de gerar novas.

### Problema: "Erro ao conectar SSH"
**Solução:** Verificar credenciais em `.env.vps` e conectividade com VPS.

### Problema: "Bot não está rodando na VPS"
**Solução:** 
1. SSH na VPS
2. Verificar logs: `tail -100 /root/million_bots_vps/bot.log`
3. Reiniciar manualmente: `cd /root/million_bots_vps && nohup python3 master_bot.py > bot.log 2>&1 &`

### Problema: "Estratégias não geram sinais"
**Solução:**
1. Verificar se os indicadores estão sendo calculados
2. Verificar regime de mercado (pode estar pausado)
3. Ajustar thresholds de confidence

---

## 📅 FREQUÊNCIA RECOMENDADA

Execute este pipeline:
- **Diariamente**: Se quiser otimização agressiva
- **Semanalmente**: Recomendado para estabilidade
- **Sob demanda**: Quando detectar queda de performance

**Automação futura:** Considere agendar com cron/Task Scheduler.
