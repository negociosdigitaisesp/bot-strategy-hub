# FASE 1: GERAÇÃO - Estratégia #60

## Dados da Matriz
- **ID**: 60
- **Nome**: Schaff Trend Blitz
- **Categoria**: Trend Following / Turbo
- **Frequência alvo**: 21 sinais/hora
- **Win rate alvo**: 56%
- **Tier**: 3 (Aggressive)
- **Regime ideal**: Trending
- **Asset**: V50 (Volatility 50 Index)
- **PERFIL**: TURBO (>18 sinais/h)

---

## 📋 CRIAÇÃO DE ESTRATÉGIA #60 - Schaff Trend Blitz

### 1. NOME & DESCRIÇÃO
**Nome**: Schaff Trend Blitz V3.0
**Descrição**: Estratégia baseada no Schaff Trend Cycle (STC), um indicador híbrido que combina MACD com Stochastic para detectar ciclos de tendência com menos lag. Ideal para capturar reversões de curto prazo em tendências estabelecidas.

### 2. INDICADORES (máx 2 - PERFIL TURBO)
1. **Schaff Trend Cycle (23, 50, 10)**: 
   - MACD(23, 50) aplicado ao preço
   - Stochastic aplicado ao MACD
   - Double smoothing para gerar ciclo 0-100
2. **EMA (20)**: Filtro de tendência rápida

### 3. REGRAS DE ENTRADA CALL
**Setup**: STC Bullish Reversal
- STC cruza ACIMA de 25 (saindo da zona oversold)
- Preço > EMA(20) (confirmação de uptrend)
- STC estava < 25 no candle anterior

### 4. REGRAS DE ENTRADA PUT
**Setup**: STC Bearish Reversal
- STC cruza ABAIXO de 75 (saindo da zona overbought)
- Preço < EMA(20) (confirmação de downtrend)
- STC estava > 75 no candle anterior

### 5. EXPIRATION
**60 segundos (1 minuto)** - TURBO
Justificativa: STC é mais rápido que MACD tradicional. Em V50, os ciclos de 1min são bem definidos.

### 6. FREQUENCY TUNING (ATINGIR 21 SINAIS/HORA)
**Perfil TURBO → 21/h**:
- **Cooldown**: 45 segundos
- **Thresholds**: STC 25/75 são zonas padrão, mas podem ser ajustadas para 20/80 se necessário
- V50 tem volatilidade moderada, gerando ciclos frequentes

### 7. FILTROS POR TIER (TIER 3 - AGGRESSIVE)
- **Regime**: Trending (EMA filter obrigatório)
- **Safety**: Evitar sinais se STC estiver "pingando" entre 40-60 (zona neutra = indecisão)

### 8. CONFIDENCE SCORE
```
Base: 50
+15: STC cruzou com momentum (diferença > 10 pontos em 1 candle)
+10: Preço próximo da EMA (bounce ideal)
+5: STC vindo de extremo absoluto (< 10 ou > 90)

-10: STC na zona neutra (40-60) = indecisão
```

### 9. BACKTESTING MENTAL
- **Win Rate**: 55-58% em V50 trending
- **Risco**: Whipsaw em range
- **Mitigação**: EMA filter + zona neutra

### 10. JUSTIFICATIVA TÉCNICA
O STC foi desenvolvido por Doug Schaff para superar o lag do MACD. Ao aplicar Stochastic ao MACD, ele normaliza o oscilador em 0-100 e identifica ciclos mais rapidamente. É superior ao MACD puro para timeframes curtos.

### 11. PSEUDOCÓDIGO ESTRUTURADO

```python
import numpy as np
from typing import Dict, List, Optional

class Strategy_60_SchaffTrendBlitz_V3:
    def __init__(self):
        self.id = 60
        self.name = "Schaff Trend Blitz V3"
        self.version = "3.0"
        self.tier = 3
        self.target_frequency = 21
        self.ideal_regime = "Trending"
        
        # STC Parameters
        self.macd_fast = 23
        self.macd_slow = 50
        self.stoch_period = 10
        self.ema_period = 20
        
        # Thresholds
        self.stc_lower = 25
        self.stc_upper = 75
        self.min_confidence = 0.45
        
        self.cooldown_seconds = 45
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 60: return None
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None

        closes = np.array([c['close'] for c in candles])
        
        # 1. Calc EMA
        ema20 = self._calc_ema(closes, self.ema_period)
        
        # 2. Calc STC
        stc = self._calc_stc(closes)
        if len(stc) < 2: return None
        
        stc_curr = stc[-1]
        stc_prev = stc[-2]
        
        close = closes[-1]
        
        signal = None
        
        # CALL: STC crosses above 25 + Uptrend
        if close > ema20:
            if stc_prev < self.stc_lower and stc_curr > self.stc_lower:
                signal = 'CALL'
                
        # PUT: STC crosses below 75 + Downtrend
        elif close < ema20:
            if stc_prev > self.stc_upper and stc_curr < self.stc_upper:
                signal = 'PUT'
                
        if signal:
            confidence = self._calc_confidence(stc_curr, stc_prev, close, ema20)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': signal,
                    'confidence': confidence,
                    'expiration': 60,
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': close,
                    'meta': f'STC Blitz ({stc_curr:.1f})',
                    'indicators': {
                        'stc': round(stc_curr, 2),
                        'ema': round(ema20, 5)
                    }
                }
        return None

    def _calc_confidence(self, stc, stc_prev, close, ema):
        score = 50
        
        # Momentum do cruzamento
        stc_change = abs(stc - stc_prev)
        if stc_change > 10: score += 15
        
        # Proximidade EMA
        dist = abs(close - ema)
        if dist < (close * 0.001): score += 10
        
        # Extremo
        if stc < 10 or stc > 90: score += 5
        
        # Penalizar zona neutra
        if 40 < stc < 60: score -= 10
        
        return min(100, max(0, score))

    def _calc_stc(self, data):
        # Simplified STC calculation
        # 1. MACD
        ema_fast = self._calc_ema_array(data, self.macd_fast)
        ema_slow = self._calc_ema_array(data, self.macd_slow)
        
        min_len = min(len(ema_fast), len(ema_slow))
        macd = ema_fast[-min_len:] - ema_slow[-min_len:]
        
        # 2. Stochastic of MACD
        stc = self._calc_stoch_array(macd, self.stoch_period)
        
        return stc

    def _calc_stoch_array(self, data, period):
        # Stochastic: (value - min) / (max - min) * 100
        result = []
        for i in range(period - 1, len(data)):
            window = data[i - period + 1:i + 1]
            high = np.max(window)
            low = np.min(window)
            if high == low:
                result.append(50)
            else:
                result.append(((data[i] - low) / (high - low)) * 100)
        return np.array(result)

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
