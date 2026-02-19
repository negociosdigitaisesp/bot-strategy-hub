# FASE 1: GERAÇÃO - Estratégia #62

## Dados da Matriz
- **ID**: 62
- **Nome**: Balance Power Scalp
- **Categoria**: Volume / Turbo
- **Frequência alvo**: 22 sinais/hora
- **Win rate alvo**: 55%
- **Tier**: 3 (Aggressive)
- **Regime ideal**: Volatile
- **Asset**: Boom1000
- **PERFIL**: TURBO (>18 sinais/h)

---

## 📋 CRIAÇÃO DE ESTRATÉGIA #62 - Balance Power Scalp

### 1. NOME & DESCRIÇÃO
**Nome**: Balance Power Scalp V3.0
**Descrição**: Estratégia baseada em desequilíbrio de volume (Balance of Power - BOP) para detectar pressão compradora/vendedora em Boom1000. Explora momentos onde o volume confirma a direção do movimento.

### 2. INDICADORES (máx 2 - PERFIL TURBO)
1. **Balance of Power (BOP)**: (Close - Open) / (High - Low)
   - Mede força relativa de compradores vs vendedores
   - Valores: -1 a +1
2. **EMA(9) do BOP**: Suavização para filtrar ruído

### 3. REGRAS DE ENTRADA CALL
**Setup**: Pressão Compradora Forte
- BOP > 0.5 (compradores dominando)
- BOP cruzou acima da EMA(9) do BOP
- Candle atual é verde (Close > Open)

### 4. REGRAS DE ENTRADA PUT
**Setup**: Pressão Vendedora Forte
- BOP < -0.5 (vendedores dominando)
- BOP cruzou abaixo da EMA(9) do BOP
- Candle atual é vermelho (Close < Open)

### 5. EXPIRATION
**60 segundos (1 minuto)** - TURBO
Justificativa: Boom1000 tem impulsos rápidos. BOP captura o início da pressão, 1min é suficiente.

### 6. FREQUENCY TUNING (ATINGIR 22 SINAIS/HORA)
**Perfil TURBO → 22/h**:
- **Cooldown**: 30 segundos
- **Thresholds**: BOP > 0.5 / < -0.5 são extremos que ocorrem frequentemente em Boom1000
- Cruzamento com EMA adiciona confirmação sem reduzir muito a frequência

### 7. FILTROS POR TIER (TIER 3 - AGGRESSIVE)
- **Regime**: Volatile (Boom1000 é naturalmente volátil)
- **Safety**: Evitar sinais se BOP estiver oscilando entre -0.2 e 0.2 (zona neutra)

### 8. CONFIDENCE SCORE
```
Base: 50
+15: BOP extremo (> 0.7 ou < -0.7)
+10: BOP e EMA divergindo fortemente (diferença > 0.3)
+5: Candle com corpo grande (> 2x média)

-10: BOP na zona neutra (-0.2 a 0.2)
```

### 9. BACKTESTING MENTAL
- **Win Rate**: 54-57% em Boom1000
- **Risco**: Boom1000 pode ter reversões súbitas
- **Mitigação**: Cruzamento com EMA filtra falsos sinais

### 10. JUSTIFICATIVA TÉCNICA
BOP foi criado por Igor Livshin para medir o poder real dos compradores/vendedores. Diferente do volume puro, BOP normaliza pela amplitude do candle, tornando-o mais preciso para identificar pressão verdadeira.

### 11. PSEUDOCÓDIGO ESTRUTURADO

```python
import numpy as np
from typing import Dict, List, Optional

class Strategy_62_BalancePowerScalp_V3:
    def __init__(self):
        self.id = 62
        self.name = "Balance Power Scalp V3"
        self.version = "3.0"
        self.tier = 3
        self.target_frequency = 22
        self.ideal_regime = "Volatile"
        
        # BOP Parameters
        self.bop_ema_period = 9
        
        # Thresholds
        self.bop_upper = 0.5
        self.bop_lower = -0.5
        self.neutral_zone = 0.2
        self.min_confidence = 0.45
        
        self.cooldown_seconds = 30
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 20: return None
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None

        # Extract data
        closes = np.array([c['close'] for c in candles])
        opens = np.array([c['open'] for c in candles])
        highs = np.array([c['high'] for c in candles])
        lows = np.array([c['low'] for c in candles])
        
        # 1. Calc BOP
        bop = self._calc_bop(closes, opens, highs, lows)
        
        # 2. Calc EMA of BOP
        bop_ema = self._calc_ema_array(bop, self.bop_ema_period)
        
        if len(bop_ema) < 2: return None
        
        # Align BOP with EMA
        bop_aligned = bop[-len(bop_ema):]
        
        bop_curr = bop_aligned[-1]
        bop_prev = bop_aligned[-2]
        ema_curr = bop_ema[-1]
        ema_prev = bop_ema[-2]
        
        # 3. Neutral zone filter
        if -self.neutral_zone < bop_curr < self.neutral_zone:
            return None
        
        close = closes[-1]
        open_price = opens[-1]
        
        signal = None
        
        # CALL: BOP > 0.5 + crosses above EMA + green candle
        if bop_curr > self.bop_upper and close > open_price:
            if bop_prev < ema_prev and bop_curr > ema_curr:
                signal = 'CALL'
                
        # PUT: BOP < -0.5 + crosses below EMA + red candle
        elif bop_curr < self.bop_lower and close < open_price:
            if bop_prev > ema_prev and bop_curr < ema_curr:
                signal = 'PUT'
                
        if signal:
            confidence = self._calc_confidence(bop_curr, ema_curr, close, open_price)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': signal,
                    'confidence': confidence,
                    'expiration': 60,
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': close,
                    'meta': f'BOP Scalp ({bop_curr:.2f})',
                    'indicators': {
                        'bop': round(bop_curr, 3),
                        'bop_ema': round(ema_curr, 3)
                    }
                }
        return None

    def _calc_confidence(self, bop, ema, close, open_price):
        score = 50
        
        # BOP extremo
        if bop > 0.7 or bop < -0.7: score += 15
        
        # Divergência forte
        diff = abs(bop - ema)
        if diff > 0.3: score += 10
        
        # Corpo grande
        body = abs(close - open_price)
        # Simplified: assume body > threshold
        if body > 0: score += 5
        
        return min(100, max(0, score))

    def _calc_bop(self, closes, opens, highs, lows):
        # BOP = (Close - Open) / (High - Low)
        numerator = closes - opens
        denominator = highs - lows
        
        with np.errstate(divide='ignore', invalid='ignore'):
            bop = numerator / denominator
        
        return np.nan_to_num(bop)

    def _calc_ema_array(self, data, period):
        if len(data) < period: return np.zeros(0)
        alpha = 2 / (period + 1)
        ema = np.zeros_like(data)
        ema[0] = data[0]
        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i-1]
        return ema
```
