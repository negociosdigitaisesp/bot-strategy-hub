# FASE 1: GERAÇÃO - Estratégia #65

## Dados da Matriz
- **ID**: 65
- **Nome**: Rate Change Turbo
- **Categoria**: High Frequency / Turbo
- **Frequência alvo**: 24 sinais/hora
- **Win rate alvo**: 55%
- **Tier**: 3 (Aggressive)
- **Regime ideal**: Universal
- **Asset**: V10 (Volatilidade 10)
- **PERFIL**: TURBO (MUITO AGRESSIVA)

---

## 📋 CRIAÇÃO DE ESTRATÉGIA #65 - Rate Change Turbo

### 1. NOME & DESCRIÇÃO
**Nome**: Rate of Change (ROC) Turbo V3.0
**Descrição**: Estratégia de altíssima frequência baseada puramente na taxa de variação (ROC - Rate of Change) do preço. Busca impulsos rápidos de momentum em V10.

### 2. INDICADORES (máx 2 - PERFIL TURBO)
1. **ROC (Rate of Change)**: Period 5. Mede a velocidade da mudança de preço.
2. **EMA (9)**: Filtro de tendência de curtíssimo prazo.

### 3. REGRAS DE ENTRADA CALL
**Setup**: ROC Impulse UP
- ROC cruza acima de zero
- Preço > EMA(9) (Tendência Micro de Alta)
- Vela atual é verde

### 4. REGRAS DE ENTRADA PUT
**Setup**: ROC Impulse DOWN
- ROC cruza abaixo de zero
- Preço < EMA(9) (Tendência Micro de Baixa)
- Vela atual é vermelha

### 5. EXPIRATION
**1 Minuto (60s)** - Padrão Turbo

### 6. FREQUENCY TUNING (ATINGIR 24 SINAIS/HORA)
- **Cooldown**: 45 segundos (Extremamente agressivo)
- **Sensibilidade**: ROC(5) é muito rápido, gera muitos cruzamentos.
- **Micro-Trend**: EMA(9) mantém a direção, permitindo múltiplas entradas na mesma tendência.

### 7. FILTROS POR TIER (TIER 3 - AGGRESSIVE)
- **Regime**: Universal (funciona em qualquer regime com momentum)
- **Safety**: Evitar entrada se Vela for Doji (corpo muito pequeno < 0.1% do preço)

### 8. CONFIDENCE SCORE
```
Base: 50
+20: ROC > 0.5 (Impulso forte)
+15: Vela engolfando a anterior
+10: Preço longe da EMA (aceleração)

-10: Vela Doji
```

### 9. BACKTESTING MENTAL
- **Win Rate**: 54-56% em V10
- **Risco**: Churning (mercado lateral faz ROC cruzar zero repetidamente)
- **Mitigação**: EMA(9) filter ajuda, mas V10 é errático. Cooldown curto aceita o risco para volume.

### 10. JUSTIFICATIVA TÉCNICA
V10 é o índice sintético mais estável, permitindo estratégias de alta frequência baseadas em pequenas variações (Rate of Change). ROC é o indicador mais puro de momentum.

### 11. PSEUDOCÓDIGO ESTRUTURADO

```python
import numpy as np
from typing import Dict, List, Optional

class Strategy_65_RateChangeTurbo_V3:
    def __init__(self):
        self.id = 65
        self.name = "Rate Change Turbo V3"
        self.version = "3.0"
        self.tier = 3
        self.target_frequency = 24
        self.ideal_regime = "Universal"
        
        # Parameters
        self.roc_period = 5
        self.ema_period = 9
        self.min_confidence = 0.45
        
        # Thresholds
        self.roc_threshold = 0.05 # Filtro de ruído mínimo
        
        self.cooldown_seconds = 45 # Agressivo
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 30: return None
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None

        closes = np.array([c['close'] for c in candles])
        
        # 1. Calc Indicators
        roc = self._calc_roc(closes)
        ema = self._calc_ema(closes, self.ema_period)
        
        if len(roc) < 2 or len(ema) < 1: return None
        
        # Values
        roc_curr = roc[-1]
        roc_prev = roc[-2]
        price = closes[-1]
        trend_ema = ema[-1]
        open_price = candles[-1]['open']
        
        # Doji check
        body_size = abs(price - open_price)
        if body_size < 0.01: return None # Doji filter strict on V10
        
        signal = None
        
        # CALL: ROC Cross UP + Trend + Green Candle
        if roc_prev < 0 and roc_curr > self.roc_threshold:
            if price > trend_ema:
                if price > open_price: # Green
                    signal = 'CALL'
                
        # PUT: ROC Cross DOWN + Trend + Red Candle
        elif roc_prev > 0 and roc_curr < -self.roc_threshold:
            if price < trend_ema:
                if price < open_price: # Red
                    signal = 'PUT'
                
        if signal:
            confidence = self._calc_confidence(roc_curr, price, open_price)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': signal,
                    'confidence': confidence,
                    'expiration': 60,
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': prices[-1],
                    'meta': f'ROC: {roc_curr:.3f}',
                    'indicators': {
                        'roc': round(roc_curr, 4),
                        'ema': round(trend_ema, 2)
                    }
                }
        return None

    def _calc_confidence(self, roc, close, open_p):
        score = 50
        
        # Momentum forte
        if abs(roc) > 0.1: score += 15
        
        # Vela de força
        body = abs(close - open_p)
        if body > 0.05: score += 10
        
        return min(100, max(0, score))

    def _calc_roc(self, data):
        # ROC = ((Close - Close_n) / Close_n) * 100
        n = self.roc_period
        if len(data) < n: return np.zeros(len(data))
        
        prev_closes = np.roll(data, n)
        prev_closes[:n] = np.nan # Invalidate rolled
        
        # Avoid division by zero
        prev_closes[prev_closes == 0] = 0.0001
        
        roc = ((data - prev_closes) / prev_closes) * 100
        return np.nan_to_num(roc)

    def _calc_ema(self, data, period):
        if len(data) < period: return np.zeros(len(data))
        alpha = 2 / (period + 1)
        ema = np.zeros_like(data)
        ema[0] = data[0]
        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i-1]
        return ema

if __name__ == "__main__":
    s = Strategy_65_RateChangeTurbo_V3()
    print(f"{s.name} initialized")
```
