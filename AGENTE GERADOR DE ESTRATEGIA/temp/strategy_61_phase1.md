# FASE 1: GERAÇÃO - Estratégia #61

## Dados da Matriz
- **ID**: 61
- **Nome**: True Strength Index Rush
- **Categoria**: Momentum / Turbo
- **Frequência alvo**: 18 sinais/hora
- **Win rate alvo**: 57%
- **Tier**: 3 (Aggressive)
- **Regime ideal**: Universal
- **Asset**: Crash1000
- **PERFIL**: TURBO (>18 sinais/h)

---

## 📋 CRIAÇÃO DE ESTRATÉGIA #61 - True Strength Index Rush

### 1. NOME & DESCRIÇÃO
**Nome**: TSI Rush V3.0
**Descrição**: Estratégia baseada no True Strength Index (TSI), um oscilador de momentum double-smoothed que filtra ruído e identifica reversões de força verdadeira. Ideal para Crash1000 que tem movimentos explosivos seguidos de exaustão.

### 2. INDICADORES (máx 2 - PERFIL TURBO)
1. **TSI (25, 13)**: Double EMA do momentum
   - Momentum = Close - Close[1]
   - First EMA(25) do momentum
   - Second EMA(13) da primeira EMA
   - Normalizado por double EMA do |momentum|
2. **Signal Line**: EMA(7) do TSI

### 3. REGRAS DE ENTRADA CALL
**Setup**: TSI Bullish Crossover
- TSI cruza ACIMA da Signal Line
- TSI < 0 (preferencialmente vindo de território negativo = oversold)
- Crash1000 mostra rejeição (wick inferior > 30% do corpo)

### 4. REGRAS DE ENTRADA PUT
**Setup**: TSI Bearish Crossover
- TSI cruza ABAIXO da Signal Line
- TSI > 0 (vindo de território positivo = overbought)
- Crash1000 mostra rejeição (wick superior > 30% do corpo)

### 5. EXPIRATION
**60 segundos (1 minuto)** - TURBO
Justificativa: Crash1000 tem impulsos rápidos. TSI captura o início da reversão, 1min é suficiente para capturar o movimento.

### 6. FREQUENCY TUNING (ATINGIR 18 SINAIS/HORA)
**Perfil TURBO → 18/h**:
- **Cooldown**: 60 segundos
- **Thresholds**: TSI crossover é evento claro
- Crash1000 tem volatilidade extrema, gerando cruzamentos frequentes

### 7. FILTROS POR TIER (TIER 3 - AGGRESSIVE)
- **Regime**: Universal (Crash1000 funciona em qualquer regime)
- **Safety**: Filtro de wick (rejeição) obrigatório para confirmar exaustão

### 8. CONFIDENCE SCORE
```
Base: 50
+15: TSI cruzou com ângulo forte (diferença > 5)
+10: Wick de rejeição > 50% do corpo
+5: TSI vindo de extremo (< -25 ou > 25)

-10: Cruzamento próximo de zero (indecisão)
```

### 9. BACKTESTING MENTAL
- **Win Rate**: 56-59% em Crash1000
- **Risco**: Crash1000 pode ter spikes violentos que ignoram TSI
- **Mitigação**: Wick filter

### 10. JUSTIFICATIVA TÉCNICA
TSI foi criado por William Blau para superar o ruído do RSI. O double smoothing torna o TSI mais confiável para identificar reversões verdadeiras. Em Crash1000, onde há muito ruído, o TSI é superior ao RSI simples.

### 11. PSEUDOCÓDIGO ESTRUTURADO

```python
import numpy as np
from typing import Dict, List, Optional

class Strategy_61_TSIRush_V3:
    def __init__(self):
        self.id = 61
        self.name = "TSI Rush V3"
        self.version = "3.0"
        self.tier = 3
        self.target_frequency = 18
        self.ideal_regime = "Universal"
        
        # TSI Parameters
        self.tsi_long = 25
        self.tsi_short = 13
        self.signal_period = 7
        
        # Thresholds
        self.min_wick_ratio = 0.3
        self.min_confidence = 0.45
        
        self.cooldown_seconds = 60
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 50: return None
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None

        closes = np.array([c['close'] for c in candles])
        highs = np.array([c['high'] for c in candles])
        lows = np.array([c['low'] for c in candles])
        opens = np.array([c['open'] for c in candles])
        
        # 1. Calc TSI
        tsi, signal = self._calc_tsi(closes)
        if len(tsi) < 2: return None
        
        tsi_curr = tsi[-1]
        tsi_prev = tsi[-2]
        sig_curr = signal[-1]
        sig_prev = signal[-2]
        
        # 2. Candle analysis
        close = closes[-1]
        open_price = opens[-1]
        high = highs[-1]
        low = lows[-1]
        
        body = abs(close - open_price)
        if body == 0: return None
        
        upper_wick = high - max(close, open_price)
        lower_wick = min(close, open_price) - low
        
        signal_dir = None
        
        # CALL: TSI crosses up + Lower wick rejection
        if tsi_prev < sig_prev and tsi_curr > sig_curr:
            if lower_wick > (body * self.min_wick_ratio):
                signal_dir = 'CALL'
                
        # PUT: TSI crosses down + Upper wick rejection
        elif tsi_prev > sig_prev and tsi_curr < sig_curr:
            if upper_wick > (body * self.min_wick_ratio):
                signal_dir = 'PUT'
                
        if signal_dir:
            confidence = self._calc_confidence(tsi_curr, tsi_prev, sig_curr, 
                                              lower_wick if signal_dir=='CALL' else upper_wick, body)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': signal_dir,
                    'confidence': confidence,
                    'expiration': 60,
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': close,
                    'meta': f'TSI Rush ({tsi_curr:.2f})',
                    'indicators': {
                        'tsi': round(tsi_curr, 2),
                        'signal': round(sig_curr, 2)
                    }
                }
        return None

    def _calc_confidence(self, tsi, tsi_prev, sig, wick, body):
        score = 50
        
        # Ângulo do cruzamento
        diff = abs(tsi - sig)
        if diff > 5: score += 15
        
        # Wick forte
        if wick > (body * 0.5): score += 10
        
        # TSI vindo de extremo
        if tsi < -25 or tsi > 25: score += 5
        
        # Penalizar cruzamento próximo de zero
        if -5 < tsi < 5: score -= 10
        
        return min(100, max(0, score))

    def _calc_tsi(self, data):
        # Momentum
        momentum = np.diff(data)
        
        # Double EMA of momentum
        ema1 = self._calc_ema_array(momentum, self.tsi_long)
        ema2 = self._calc_ema_array(ema1, self.tsi_short)
        
        # Double EMA of |momentum|
        abs_momentum = np.abs(momentum)
        ema1_abs = self._calc_ema_array(abs_momentum, self.tsi_long)
        ema2_abs = self._calc_ema_array(ema1_abs, self.tsi_short)
        
        # Align lengths
        min_len = min(len(ema2), len(ema2_abs))
        
        # TSI = 100 * (ema2 / ema2_abs)
        with np.errstate(divide='ignore', invalid='ignore'):
            tsi = 100 * (ema2[-min_len:] / ema2_abs[-min_len:])
        tsi = np.nan_to_num(tsi)
        
        # Signal Line
        signal = self._calc_ema_array(tsi, self.signal_period)
        
        # Align
        tsi_aligned = tsi[-len(signal):]
        
        return tsi_aligned, signal

    def _calc_ema_array(self, data, period):
        if len(data) < period: return np.zeros(0)
        alpha = 2 / (period + 1)
        ema = np.zeros_like(data)
        ema[0] = data[0]
        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i-1]
        return ema
```
