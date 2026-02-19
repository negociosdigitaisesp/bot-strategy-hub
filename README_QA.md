# Million Bots - QA Automation System

Sistema completo de testes automatizados para validar toda a stack do Million Bots (Frontend React + Backend Python + Supabase + Deriv WebSocket).

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Categorias de Testes](#categorias-de-testes)
- [Interpretando Resultados](#interpretando-resultados)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)
- [Adicionando Novos Testes](#adicionando-novos-testes)

---

## 🎯 Visão Geral

O QA Master executa **12 categorias de testes** cobrindo:

- ✅ **6 Testes de Regressão** - Valida que bugs históricos não voltaram
- ✅ **1 Teste E2E** - Ciclo completo de trading (sinal → ordem → resultado)
- ✅ **4 Testes de UI** - Interface do usuário e funcionalidade
- ✅ **4 Testes de Performance** - Latências e tempos de resposta
- ✅ **6 Validações Supabase** - Integridade de dados
- ✅ **4 Análises de Logs** - Backend via SSH
- ✅ **3 Testes de Resiliência** - Auto-restart, reconnect, persistência

**Tempo de execução:**
- Modo completo: ~12-15 minutos
- Modo rápido: ~5-7 minutos (pula testes de 2min)

---

## 🏗️ Arquitetura

```
beckbug/
├── .agent/workflows/          # Workflows do Antigravity
│   ├── qa_master.md          # Suite completa
│   ├── qa_regression.md      # Apenas regressão
│   ├── qa_e2e.md            # Apenas E2E
│   └── qa_performance.md    # Apenas performance
├── tests/
│   ├── e2e/                 # Testes E2E (via browser_subagent)
│   ├── integration/         # Testes backend (SSH)
│   │   └── test_helpers.py # Helpers SSH/Supabase
│   ├── supabase/           # Validações SQL
│   │   └── validate.sql   # Queries de validação
│   └── config/
│       └── test_config.py # Configurações centralizadas
├── scripts/
│   └── run_qa_master.py   # Orquestrador principal
├── qa_reports/            # Relatórios gerados (gitignored)
│   └── screenshots/       # Screenshots dos testes
├── .env.qa               # Variáveis de ambiente (gitignored)
└── .env.qa.example       # Template de configuração
```

---

## 🚀 Instalação

### 1. Pré-requisitos

- **Python 3.8+**
- **Git Bash** (Windows) ou terminal Unix
- **SSH** configurado para VPS
- **Acesso ao Supabase**

### 2. Instalar Dependências Python

```bash
cd c:/Users/bialo/OneDrive/Documentos/beckbug
pip install supabase paramiko
```

### 3. Configurar SSH

Certifique-se de que você consegue acessar a VPS via SSH:

```bash
ssh -i ~/.ssh/id_rsa root@[VPS_IP]
```

Se não tiver chave SSH configurada:

```bash
ssh-keygen -t rsa -b 4096
ssh-copy-id -i ~/.ssh/id_rsa.pub root@[VPS_IP]
```

---

## ⚙️ Configuração

### 1. Criar Arquivo de Ambiente

```bash
cp .env.qa.example .env.qa
```

### 2. Preencher Variáveis

Edite `.env.qa` com suas credenciais:

```bash
# VPS
VPS_HOST=51.38.xxx.xxx
VPS_USER=root
VPS_SSH_KEY=~/.ssh/id_rsa

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...

# Frontend
FRONTEND_URL=http://localhost:5173
# Ou produção: https://your-app.vercel.app

# Deriv (opcional, para testes de WebSocket)
DERIV_APP_ID=your-app-id
```

### 3. Validar Configuração

```bash
python tests/config/test_config.py
```

Deve mostrar:
```
🔧 Test Configuration
Frontend URL: http://localhost:5173
Backend API: http://localhost:8000
Supabase: https://your-project.supabase.co
VPS Host: 51.38.xxx.xxx
QA Mode: development
```

---

## 🎮 Uso

### Modo Completo (Recomendado)

Executa TODOS os testes:

```bash
python scripts/run_qa_master.py
```

### Modo Rápido

Pula testes de 2 minutos (loop infinito, WebSocket monitoring):

```bash
python scripts/run_qa_master.py --quick
```

### Categorias Específicas

Executar apenas uma categoria:

```bash
# Apenas testes de regressão
python scripts/run_qa_master.py --category regression

# Apenas E2E
python scripts/run_qa_master.py --category e2e

# Apenas performance
python scripts/run_qa_master.py --category performance

# Apenas Supabase
python scripts/run_qa_master.py --category supabase

# Apenas backend logs
python scripts/run_qa_master.py --category backend
```

### Via Workflows do Antigravity

```bash
# No chat do Antigravity:
@antigravity /qa-full
@antigravity /qa-regression
@antigravity /qa-e2e
@antigravity /qa-performance
```

---

## 📊 Categorias de Testes

### 1. Regression Tests (6 testes)

Valida que bugs históricos não voltaram:

| Bug | O Que Testa | Como Detecta Falha |
|-----|-------------|-------------------|
| Loop Infinito | Re-renders excessivos | >10 "Carregando inteligência" em 2min |
| ActiveStrategies Reset | Persistência de estratégias ativas | Estratégias desativam após 90s |
| Supabase WS Crashes | Estabilidade da conexão real-time | Status != SUBSCRIBED por 2min |
| Scoring Logic | Cálculos de WR e score | Diferença >2% ou WR>60% com score<50 |
| Estratégias Não Carregadas | Todas as 15 estratégias carregam | Count de arquivos ≠ backend ≠ Supabase |
| Deriv WS Error 1006 | Erros de WebSocket | >0 erros "1006" nos logs |

### 2. E2E Tests (1 teste)

Ciclo completo de trading:

1. **Backend gera sinal** → Valida inserção no Supabase
2. **Frontend recebe sinal** → Monitora console por "📡 SINAL RECEBIDO"
3. **Frontend envia ordem** → Verifica log "🚀 Ordem enviada"
4. **Resultado registrado** → Query `bot_activity_logs` por WIN/LOSS

### 3. UI Tests (4 testes)

Interface e funcionalidade:

- **Ranking Load**: Cards de estratégias aparecem em <10s
- **Ativar Mejores Bots**: Botão ativa múltiplas estratégias
- **Toggle Individual**: Ativar/Desativar estratégias funciona
- **Resultado Global**: Números atualizam em tempo real

### 4. Performance Tests (4 testes)

Latências e tempos de resposta:

| Métrica | ✅ Excelente | ⚠️ Aceitável | ❌ Ruim |
|---------|-------------|-------------|---------|
| Backend API | <200ms | 200-500ms | >500ms |
| Frontend TTI | <2s | 2-4s | >4s |
| Supabase Query | <100ms | 100-500ms | >500ms |
| Real-time Latency | <1s | 1-3s | >3s |

### 5. Supabase Validation (6 validações)

Integridade de dados:

- **Strategy Count**: ≥10 estratégias
- **Data Freshness**: Todas atualizadas <10min
- **WR Consistency**: `total_trades = wins + losses`
- **Stale Signals**: 0 sinais >5min
- **Recent Activity**: >0 logs na última hora
- **Frequency Bug**: `frequency_1h=0` não zera score

### 6. Backend Log Analysis (4 análises)

Via SSH na VPS:

- **Critical Errors**: 0 erros CRITICAL/ERROR/EXCEPTION
- **Signal Generation**: ≥5 sinais em 10min
- **Regime Detection**: ≥3 detecções em 5min
- **Service Status**: `systemctl status million_bot` = active

### 7. Resiliency Tests (3 testes)

- **Auto-Restart**: Bot reinicia em <15s após kill
- **WS Reconnect**: Frontend reconecta após desconexão
- **State Persistence**: Estratégias ativas persistem após reload

---

## 📈 Interpretando Resultados

### Console Output

```
🚀 MILLION BOTS QA SUITE v2.0
=============================

[1/12] ✅ Pre-flight check: All services online
[2/12] ✅ Regression: Loop infinito (3 loads)
[3/12] ⚠️ Regression: Scoring logic (2 warnings)
...
=============================
📊 FINAL SCORE: 11/12 (91.6%)
🟢 STATUS: HEALTHY
```

### Relatório Markdown

Gerado em: `qa_reports/MASTER_REPORT_[timestamp].md`

**Seções:**
1. **Executive Summary** - Score e status geral
2. **Results Table** - Tabela com todos os testes
3. **Bugs Found** - Lista de falhas com severidade
4. **Performance Metrics** - Números de latência
5. **Screenshots** - Capturas de tela dos testes UI
6. **Logs** - Trechos relevantes de logs
7. **Recommendations** - Ações sugeridas

### Status Codes

| Score | Status | Ação |
|-------|--------|------|
| ≥90% | 🟢 SAUDÁVEL | Nenhuma ação necessária |
| 70-89% | 🟡 ATENÇÃO | Investigar warnings |
| <70% | 🔴 CRÍTICO | **Ação urgente** - Múltiplas falhas |

### Alertas Automáticos

**Score <70%:**
- Cria `qa_reports/ALERT_CRITICAL.txt`
- Lista todas as falhas críticas
- Pode ser integrado com Slack/Discord (veja CI/CD)

**Score ≥90%:**
- Cria `qa_reports/SUCCESS.txt`
- Log silencioso

---

## 🔧 Troubleshooting

### Erro: "Cannot connect to VPS"

**Causa:** SSH não configurado ou VPS offline

**Solução:**
```bash
# Testar conexão manual
ssh -i ~/.ssh/id_rsa root@[VPS_IP]

# Verificar se VPS_HOST está correto em .env.qa
cat .env.qa | grep VPS_HOST
```

### Erro: "Frontend not accessible"

**Causa:** Dev server não está rodando

**Solução:**
```bash
cd FRONTEND
npm run dev
```

Ou configure `FRONTEND_URL` para produção em `.env.qa`:
```bash
FRONTEND_URL=https://your-app.vercel.app
```

### Erro: "Supabase query failed"

**Causa:** Credenciais inválidas

**Solução:**
```bash
# Testar credenciais
curl https://your-project.supabase.co/rest/v1/strategy_scores \
  -H "apikey: YOUR_SERVICE_ROLE_KEY"
```

### Erro: "supabase-py not installed"

**Solução:**
```bash
pip install supabase
```

### Testes falhando intermitentemente

**Causa:** Latência de rede ou timeouts curtos

**Solução:** Aumentar timeouts em `tests/config/test_config.py`:
```python
DEFAULT_TIMEOUT = 60  # Era 30
PAGE_LOAD_TIMEOUT = 20  # Era 10
```

---

## 🤖 CI/CD Integration

### GitHub Actions

Criar `.github/workflows/qa.yml`:

```yaml
name: QA Suite

on:
  schedule:
    - cron: '0 2 * * *'  # Diariamente às 2am
  workflow_dispatch:  # Manual trigger

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: pip install supabase paramiko
      
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.VPS_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
      
      - name: Create .env.qa
        run: |
          echo "VPS_HOST=${{ secrets.VPS_HOST }}" >> .env.qa
          echo "SUPABASE_URL=${{ secrets.SUPABASE_URL }}" >> .env.qa
          echo "SUPABASE_SERVICE_ROLE_KEY=${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" >> .env.qa
          echo "FRONTEND_URL=${{ secrets.FRONTEND_URL }}" >> .env.qa
      
      - name: Run QA Suite
        run: python scripts/run_qa_master.py
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: qa-report
          path: qa_reports/
      
      - name: Notify Slack on Failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"🚨 QA Suite falhou! Score <70%"}'
```

### Windows Task Scheduler

```powershell
$action = New-ScheduledTaskAction `
  -Execute "python" `
  -Argument "c:\Users\bialo\OneDrive\Documentos\beckbug\scripts\run_qa_master.py" `
  -WorkingDirectory "c:\Users\bialo\OneDrive\Documentos\beckbug"

$trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask `
  -Action $action `
  -Trigger $trigger `
  -TaskName "MillionBotsQA" `
  -Description "QA diário do Million Bots"
```

---

## ➕ Adicionando Novos Testes

### 1. Teste de Regressão (Bug Novo)

Editar `scripts/run_qa_master.py`:

```python
def run_regression_tests(self):
    # ... testes existentes ...
    
    # Novo teste
    print("Testando Bug #7: Descrição...", end=" ")
    # Sua lógica aqui
    if test_passou:
        self.add_result("Regressão", "Bug #7", True, "Detalhes")
        print(f"{Colors.GREEN}✅{Colors.END}")
    else:
        self.add_result("Regressão", "Bug #7", False, "Falhou porque...")
        print(f"{Colors.RED}❌{Colors.END}")
```

### 2. Validação SQL Nova

Adicionar em `tests/supabase/validate.sql`:

```sql
-- Nova validação
SELECT ...
FROM ...
WHERE ...;
-- Esperado: descrição do resultado esperado
```

### 3. Teste de Performance Novo

Editar `scripts/run_qa_master.py`:

```python
def run_performance_tests(self):
    # ... testes existentes ...
    
    # Novo teste
    latency = measure_new_metric()
    if latency < THRESHOLD:
        self.add_result("Performance", "Nova Métrica", True, f"{latency}ms")
    else:
        self.add_result("Performance", "Nova Métrica", False, f"{latency}ms (lento)")
```

---

## 📝 Notas Importantes

### Testes via Browser Subagent

Os testes de **UI e E2E** que requerem interação com o browser são executados via **browser_subagent** do Antigravity, não via Playwright. Isso significa:

- ✅ Não precisa instalar Playwright
- ✅ Integração nativa com Antigravity
- ✅ Screenshots automáticos salvos em `qa_reports/screenshots/`
- ⚠️ Testes de browser devem ser invocados via workflows do Antigravity

### Segurança

- **Nunca commite `.env.qa`** (já está no `.gitignore`)
- **Use service role key** apenas em ambiente seguro
- **SSH keys** devem ter permissões 600: `chmod 600 ~/.ssh/id_rsa`

### Limitações

- **Testes E2E** requerem bot rodando na VPS
- **Testes de UI** requerem frontend acessível
- **Alguns testes** podem falhar se não houver atividade recente (sinais, logs)

---

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique [Troubleshooting](#troubleshooting)
2. Revise logs em `qa_reports/`
3. Execute testes individuais para isolar problema
4. Verifique configuração em `.env.qa`

---

**Desenvolvido para Million Bots Trading System** 🚀
