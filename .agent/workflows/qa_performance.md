---
description: QA Performance - Mede latências e tempos de resposta
---

# QA Performance Tests

Executa apenas testes de performance e latência.

## Execução

```bash
cd c:/Users/bialo/OneDrive/Documentos/beckbug
python scripts/run_qa_master.py --category performance
```

## Métricas Medidas

### Backend API
- Latência do endpoint /health
- ✅ <200ms | ⚠️ 200-500ms | ❌ >500ms

### Frontend
- Time to Interactive (TTI)
- ✅ <2s | ⚠️ 2-4s | ❌ >4s

### Supabase
- Query speed em strategy_scores
- ✅ <100ms | ❌ >500ms

### Real-time
- Latência insert → frontend receive
- ✅ <1s | ❌ >3s

Tempo total: ~2 minutos
