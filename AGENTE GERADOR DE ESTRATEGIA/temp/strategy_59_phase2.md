# FASE 2: ATAQUE (Devil's Advocate) - Estratégia #59

## Dados do Perfil
- **Perfil**: TURBO (>18 sinais/h)
- **Frequência alvo**: 19/h
- **Ativo**: V100

---

## 📋 DESTRUIÇÃO CRÍTICA - ESTRATÉGIA #59

### 1️⃣ TESTE DA FALÁCIA DO APOSTADOR
**Tendência vs Oscilador?**
- KST é um oscilador de momentum. Usar a favor da EMA(50) remove a falácia de "topo/fundo". Estamos comprando força.
- **Risco**: Lag. O KST é soma de 4 SMAs de ROCs. É smooth, mas lento.
- Em Turbo (1min), o lag pode fazer comprar o Topo do pullback ao invés do início do impulso.
- **Defesa (Não implementada na Fase 1)**: Precisamos garantir que o cruzamento ocorra PERTO da EMA(50). Se cruzar muito longe, já estamos no final da onda.

### 2️⃣ TESTE DE FREQUÊNCIA
- 19/h em V100?
- V100 é muito rápido. Cruzamentos KST (Turbo settings) ocorrem a cada 2-3 min.
- 19/h = 1 sinal a cada 3 min.
- **Problema de Cooldown**: Se cooldown for 60s, perderemos reentradas if trend continues.
- **Ajuste Proposto**: Reduzir cooldown para 30s se o KST continuar divergindo positivamente. Mas manter 60s por segurança padrão.

### 3️⃣ TESTE DE EXECUTION REALITY
- **Cálculo Pesado?**: KST requer 4 ROCs + 4 SMAs + Soma + Signal SMA.
- Python lida bem, mas requer histórico longo (>60 candles). O código checa `len < 60`, o que é ok.
- **Repaint**: SMA/ROC não repintam após fechar. Seguro.

### 4️⃣ TESTE DE REGIME (Whipsaw)
- Em mercado lateral, preço cruza EMA(50) toda hora. KST cruza toda hora.
- Estratégia vai ser massacrada no "Choppy Market".
- **Solução Obrigatória**: Filtro de ADX ou "Slope" da EMA.
- Se a EMA(50) estiver flat (horizontal), NÃO OPERAR.
- Como medir slope sem complicar? `abs(EMA - EMA_prev) > threshold`.

---

## VEREDICTO

✅ **APROVADA COM MODIFICAÇÕES** (Score 5/10)

### Modificações Obrigatórias:
1. **Filtro de Slope da EMA**:
   - `slope = abs(ema50 - ema50_prev)`
   - Se `slope < 0.05` (exemplo) -> Mercado Flat. Abortar.
   - Isso salva a conta em consolações.

2. **Distance Filter**:
   - Se preço estiver > 5x ATR longe da EMA, NÃO comprar (já esticou, KST vai dar sinal atrasado de topo).
   - "Don't buy the climax".

---

## ✅ FASE 2 CONCLUÍDA
Estratégia validada com proteção vital contra mercado lateral (EMA Slope Filter).
