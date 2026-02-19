---
description: QA E2E - Testa ciclo completo de trading (sinal → ordem → resultado)
---

# QA End-to-End Tests

Executa teste do ciclo completo de uma operação de trading.

## Execução

```bash
cd c:/Users/bialo/OneDrive/Documentos/beckbug
python scripts/run_qa_master.py --category e2e
```

## Ciclo Testado

1. **Backend gera sinal** → Valida inserção no Supabase
2. **Frontend recebe sinal** → Monitora console
3. **Frontend envia ordem** → Verifica log de envio
4. **Resultado registrado** → Query bot_activity_logs

Tempo total: ~3-5 minutos
