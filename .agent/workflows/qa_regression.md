---
description: QA Regression - Testa apenas os 6 bugs históricos
---

# QA Regression Tests

Executa apenas os testes de regressão para validar que bugs históricos não voltaram.

## Execução

```bash
cd c:/Users/bialo/OneDrive/Documentos/beckbug
python scripts/run_qa_master.py --category regression
```

## Testes Executados

### 1. Loop Infinito de Re-renders
Monitora console por 2min contando "Carregando inteligência da VPS"

### 2. ActiveStrategies Reset
Ativa bots e verifica se persistem após 90s

### 3. Supabase WebSocket Crashes
Monitora conexão real-time por 2min

### 4. Scoring Logic Incorreta
Valida cálculos de WR e score no Supabase

### 5. Estratégias Não Carregadas
Compara count de arquivos vs backend vs Supabase

### 6. Deriv WebSocket Error 1006
Busca erros nos logs do systemd
