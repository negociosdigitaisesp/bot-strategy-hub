# Análise de Capacidade VPS - 65 Estratégias

## Especificações Atuais
- **RAM**: 2 GB (2048 MB)
- **CPU**: 2 vCPUs
- **Estratégias Atuais**: 15
- **Meta**: 65 estratégias (15 + 50 novas)

## Consumo Estimado por Componente

### 1. Processo Master Bot (Python)
- Base: ~100-150 MB RAM
- Overhead threading: ~20 MB

### 2. Por Estratégia (modo shadow)
Cada estratégia consome:
- **RAM**: ~5-8 MB (código + estado)
- **CPU**: ~1-2% (análise técnica + scoring)

### 3. Cálculo Total para 65 Estratégias

#### RAM
```
Base master_bot:           150 MB
65 estratégias × 8 MB:     520 MB
Buffer scoring + cache:    100 MB
Conexões Supabase:          50 MB
Sistema/Python overhead:   150 MB
─────────────────────────────────
TOTAL ESTIMADO:           ~970 MB
```

**Margem**: 2048 MB - 970 MB = **1078 MB livres** ✅

#### CPU
```
Master bot (base):          10%
65 estratégias × 2%:       130%
Scoring + persistência:     20%
─────────────────────────────────
TOTAL ESTIMADO:           ~160%
```

**Disponível**: 2 vCPUs = 200% → **40% livres** ✅

## ⚠️ Pontos de Atenção

### 1. **Gargalo: CPU (não RAM)**
Com 65 estratégias rodando em paralelo, o CPU pode ficar saturado em momentos de alta volatilidade (todos calculando indicadores ao mesmo tempo).

### 2. **I/O Supabase**
65 estratégias gerando sinais → potencial de atingir rate limits do Supabase.

### 3. **Latência**
Com CPU >150%, pode haver lentidão na geração de sinais.

## ✅ Recomendações para Suportar 65 Estratégias

### Otimização 1: **Staggered Execution** (Execução Escalonada)
Dividir estratégias em grupos que executam em momentos diferentes.

```python
# engine/optimized_master_bot.py
STRATEGY_GROUPS = {
    'group_A': strategies[0:21],   # 0s
    'group_B': strategies[21:43],  # 20s delay
    'group_C': strategies[43:65],  # 40s delay
}
```

**Benefício**: Reduz pico de CPU de 160% → 60% por grupo.

### Otimização 2: **Lazy Loading de Indicadores**
Calcular indicadores apenas quando necessário (não pré-calcular tudo).

```python
@lru_cache(maxsize=128)
def calcular_indicador(symbol, timeframe):
    # Cache evita recalcular mesmo indicador
    pass
```

**Benefício**: -30% CPU, -20% RAM.

### Otimização 3: **Batch Writes no Supabase**
Acumular dados de múltiplas estratégias e enviar em lote.

```python
# Ao invés de 65 writes individuais:
supabase.table('strategy_scores').upsert([
    {'strategy': 'A', 'score': 80},
    {'strategy': 'B', 'score': 75},
    # ... 65 registros
]).execute()
```

**Benefício**: -50% latência I/O, evita rate limits.

### Otimização 4: **Process Pool (Multiprocessing)**
Se CPU ficar saturado, distribuir estratégias em processos separados.

```python
from multiprocessing import Pool

with Pool(processes=2) as pool:
    results = pool.map(execute_strategy_group, [group_A, group_B, group_C])
```

**Benefício**: Usa os 2 vCPUs eficientemente.

## 📈 Projeção Final

### Cenário Otimizado (com melhorias acima)
| Recurso | Usado | Disponível | Margem |
|---------|-------|------------|--------|
| **RAM** | 800 MB | 2048 MB | 61% livre |
| **CPU** | 120% | 200% | 40% livre |
| **Disco** | 2 GB | 60 GB | 97% livre |

### Veredicto
**✅ SIM, aguenta 65 estratégias** com as otimizações:
1. Staggered execution (prioridade 1)
2. Batch writes Supabase (prioridade 2)
3. Lazy loading indicadores (prioridade 3)

**Sem otimizações**: Funcionará, mas com lentidão em horários de pico.

## 🚀 Plano de Implementação

### Fase 1: Adicionar 20 estratégias (total 35)
- Testar sem otimizações
- Monitorar: `htop`, `free -h`, logs de latência

### Fase 2: Se CPU >150%, aplicar Staggered Execution
- Dividir em 3 grupos de ~12 estratégias

### Fase 3: Adicionar restantes 30 (total 65)
- Aplicar Batch Writes
- Monitorar Supabase rate limits

### Fase 4: Se necessário, upgrade VPS
- Próximo tier: 4 GB RAM / 2 vCPUs (~$15-20/mês)
- Ou horizontal scaling: 2 VPS de 2GB (uma para cada 32 estratégias)

## 📝 Scripts de Monitoramento

```bash
# Monitorar uso de recursos
watch -n 2 'free -h && echo "---CPU---" && top -bn1 | head -20'

# Log de latência por estratégia
tail -f /root/million_bots_vps/logs/performance.log | grep "execution_time"
```

## Conclusão

**Resposta curta**: ✅ Sim, aguenta 65 estratégias com otimizações básicas.

**Resposta longa**: O gargalo será CPU, não RAM. Com as 3 otimizações principais (staggered execution, batch writes, lazy loading), você terá margem confortável. Recomendo adicionar gradualmente e monitorar.
