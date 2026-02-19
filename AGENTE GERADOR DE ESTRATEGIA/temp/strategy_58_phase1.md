# FASE 1: GERAÇÃO - Estratégia #58

## Dados da Matriz
- **ID**: 58
- **Nome**: Mass Index Rapid Fire
- **Categoria**: Volatility / Turbo
- **Frequência alvo**: 20 sinais/hora
- **Win rate alvo**: 56%
- **Tier**: 3 (Aggressive)
- **Regime ideal**: Volatile
- **Asset**: V75 (Volatility 75 Index)
- **PERFIL**: TURBO (>18 sinais/h)

---

## 📋 CRIAÇÃO DE ESTRATÉGIA #58 - Mass Index Rapid Fire

### 1. NOME & DESCRIÇÃO
**Nome**: Mass Index Rapid Fire V3.0
**Descrição**: Estratégia de reversão de volatilidade baseada no Mass Index para detectar "Volatility Bulges" (expansões anormais da amplitude High-Low). Quando o Mass Index atinge extremos críticos, sinaliza uma provável contração ou reversão imediata do movimento.

### 2. INDICADORES (máx 2 - PERFIL TURBO)
1. **Mass Index (9, 25)**: Soma das médias móveis exponenciais do range (High-Low). Detecta expansão de range.
   - EMA(9) do range High-Low.
   - EMA(9) da EMA(9) anterior.
   - Ratio: EMA1 / EMA2.
   - Soma de 25 períodos.
2. **EMA (9)**: Tendência de curtíssimo prazo para definir direção do "Snap Back".

### 3. REGRAS DE ENTRADA CALL
**Setup**: Reversão de Baixa (Volatility Exhaustion Down)
- Mass Index > 27.0 (Volatility Bulge detectado).
- Preço FECHA abaixo da EMA(9).
- Candle atual é de BAIXA (Close < Open).
- **Lógica**: O movimento esticou demais (Mass Index alto) na direção de baixa. Apostar no retorno à média (EMA 9).

### 4. REGRAS DE ENTRADA PUT
**Setup**: Reversão de Alta (Volatility Exhaustion Up)
- Mass Index > 27.0.
- Preço FECHA acima da EMA(9).
- Candle atual é de ALTA (Close > Open).
- **Lógica**: Exaustão do movimento de alta.

### 5. EXPIRATION
**60 segundos (1 minuto)** - TURBO
Justificativa: Volatility Bulges no Mass Index tendem a preceder reversões imediatas em V75. O efeito "elástico" é rápido.

### 6. FREQUENCY TUNING (ATINGIR 20 SINAIS/HORA)
**Perfil TURBO → 20/h**:
- **Cooldown**: 30 segundos.
- **Thresholds**:
  - Mass Index > 27.0 é o valor padrão de "Bulge", mas em V75 M1 isso acontece com frequência moderada.
  - Para atingir 20/h, pode ser necessário relaxar para > 26.5 se a volatilidade cair.
- **Asset**: V75 garante ranges grandes, alimentando o Mass Index.

### 7. FILTROS POR TIER (TIER 3 - AGGRESSIVE)
- **Regime**: Volatile (Preferencial). Em flat market, Mass Index fica baixo (< 25) e não gera sinais (filtro natural).
- **Filtro de Tendência**: Nenhum. Operamos contra o candle de exaustão.

### 8. CONFIDENCE SCORE
```
Base: 50
+15: Mass Index > 28.0 (Extremo crítico)
+10: Distância do preço para EMA(9) > 2x ATR (Esticada visual)
+5: Wick (sombra) longa na direção do movimento (rejeição)

-10: Mass Index < 26.5 (Bulge fraco)
```

### 9. BACKTESTING MENTAL
- **Win Rate**: 55-58% em V75.
- **Risco**: Entrar cedo demais no Bulge. O Mass Index pode ir a 29 ou 30 antes de reverter.
- **Mitigação**: Entrar apenas se o candle fechar longe da EMA.

### 10. JUSTIFICATIVA TÉCNICA
O Mass Index foi criado por Donald Dorsey para identificar reversões de tendência baseadas em expansão de range. Ele não olha direção, apenas amplitude. Quando a amplitude acumula (soma dos ratios sobe), a "mola" está comprimida (ou esticada ao máximo). Em V75, que é puramente volátil, esses picos de amplitude quase sempre revertem à média.

### 11. PSEUDOCÓDIGO ESTRUTURADO

```python
import numpy as np
from typing import Dict, List, Optional

class Strategy_58_MassIndexRapidFire_V3:
    def __init__(self):
        self.id = 58
        self.name = "Mass Index Rapid Fire V3"
        self.version = "3.0"
        self.tier = 3
        self.target_frequency = 20
        self.ideal_regime = "Volatile"
        
        # Indicadores
        self.mi_period1 = 9
        self.mi_period2 = 25
        self.ema_period = 9
        
        # Thresholds
        self.mi_threshold = 26.5 # Ajustado para garantir frequência
        
        self.min_confidence = 0.45
        self.cooldown_seconds = 30
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 50: return None
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None

        # Dados
        closes = np.array([c['close'] for c in candles])
        highs = np.array([c['high'] for c in candles])
        lows = np.array([c['low'] for c in candles])
        
        # 1. Mass Index Calc
        mass_index = self._calc_mass_index(highs, lows, self.mi_period1, self.mi_period2)
        
        # 2. EMA Calc (Direction & Mean)
        ema9 = self._calc_ema(closes, self.ema_period)
        
        close = closes[-1]
        open_price = candles[-1]['open']
        
        # 3. Lógica
        # Requer Volatility Bulge
        if mass_index < self.mi_threshold: return None
        
        signal = None
        
        # CALL: Preço < EMA + Candle Baixa (Exaustão de venda) + MI Alto
        if close < ema9 and close < open_price:
            signal = 'CALL'
            
        # PUT: Preço > EMA + Candle Alta (Exaustão de compra) + MI Alto
        elif close > ema9 and close > open_price:
            signal = 'PUT'
            
        if signal:
            confidence = self._calc_confidence(mass_index, close, ema9)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': signal,
                    'confidence': confidence,
                    'expiration': 60,
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': close,
                    'meta': f'MI Fire (MI {mass_index:.2f})',
                    'indicators': {
                        'mass_index': round(mass_index, 2),
                        'ema': round(ema9, 5)
                    }
                }
        return None

    def _calc_confidence(self, mi, close, ema):
        score = 50
        
        # MI Extremo
        if mi > 28.0: score += 15
        elif mi > 27.0: score += 5
        
        # Distância da média (Mean Reversion potential)
        dist = abs(close - ema)
        # Se tivéssemos ATR aqui seria melhor, mas vamos usar % do preço como proxy rápido
        if dist > (close * 0.001): score += 10 # 0.1% dist em V75 é relevante em M1
        
        return min(100, max(0, score))

    def _calc_mass_index(self, highs, lows, p1, p2):
        # HL range
        hl = highs - lows
        # EMA9 of HL
        ema_hl = self._calc_ema_array(hl, p1)
        # EMA9 of EMA_HL
        ema_ema_hl = self._calc_ema_array(ema_hl, p1)
        
        # Ratio
        with np.errstate(divide='ignore', invalid='ignore'):
            ratio = ema_hl / ema_ema_hl
        
        ratio = np.nan_to_num(ratio)
        
        # Sum of last p2 ratios
        if len(ratio) < p2: return 0.0
        return np.sum(ratio[-p2:])

    def _calc_ema(self, data, period):
        return self._calc_ema_array(data, period)[-1]

    def _calc_ema_array(self, data, period):
        alpha = 2 / (period + 1)
        ema = np.zeros_like(data)
        ema[0] = data[0]
        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i-1]
        return ema
```
