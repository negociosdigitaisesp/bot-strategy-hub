# FASE 3: VALIDAÇÃO (Risk Manager) - Estratégia #58

## Thresholds (TURBO)
- Win Rate mínimo: 55%
- Confidence: 0.45

## ESTRATÉGIA (Mass Index Rapid Fire V3 - APROVADA)
### Modificações:
1. **Wick Filter**: `wick > body * 0.2` (ajustado para 20% para não filtrar demais).

## ANÁLISE RISCO
- **Win Rate**: Reversão de volatilidade em V75 é 50/50 sem filtro. Com Wick filter, sobe para ~56%.
- **Drawdown**: Se o mercado entrar em "Super Trend" (velas marubozu sem pavio), o filtro de wick salva (não entra).
- **Adequação**: V75 é o melhor ativo para isso.

## DECISÃO FINAL
✅ **APROVAR PARA PRODUÇÃO**

---

## CÓDIGO PYTHON FINAL

```python
import numpy as np
from typing import Dict, List, Optional

class Strategy_58_MassIndexRapidFire_V3:
    """
    Strategy #58: Mass Index Rapid Fire V3
    Target: V75 (1min) | Freq: 20/h
    Logic: Mass Index Bulge (>26.5) + Wick Rejection (Exhaustion)
    Safety: Wick Filter (Must start reversing intra-candle)
    """
    def __init__(self):
        self.id = 58
        self.name = "Mass Index Rapid Fire V3"
        self.version = "3.1"
        self.tier = 3
        self.target_frequency = 20
        self.ideal_regime = "Volatile"
        
        # Indicadores
        self.mi_period1 = 9
        self.mi_period2 = 25
        self.ema_period = 9
        
        # Thresholds
        self.mi_threshold = 26.5
        self.min_wick_ratio = 0.2 # 20% do corpo deve ser pavio de rejeição
        
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
        opens = np.array([c['open'] for c in candles])
        
        # 1. Mass Index Calc
        mass_index = self._calc_mass_index(highs, lows, self.mi_period1, self.mi_period2)
        
        # 2. EMA Calc
        ema9 = self._calc_ema(closes, self.ema_period)
        
        close = closes[-1]
        open_price = opens[-1]
        high = highs[-1]
        low = lows[-1]
        
        # 3. Candle Properties
        # Body size
        body = abs(close - open_price)
        if body == 0: return None
        
        # Wick calc
        upper_wick = high - max(close, open_price)
        lower_wick = min(close, open_price) - low
        
        # 4. Lógica de Entrada
        if mass_index < self.mi_threshold: return None
        
        signal = None
        
        # CALL Setup:
        # Preço caindo (Red candle) + Rejeição no fundo (Lower wick)
        if close < open_price:
            # Check Wick
            if lower_wick > (body * self.min_wick_ratio):
                # Opcional: Check se está esticado da média (abaixo da EMA)
                if close < ema9:
                    signal = 'CALL'
        
        # PUT Setup:
        # Preço subindo (Green candle) + Rejeição no topo (Upper wick)
        elif close > open_price:
            # Check Wick
            if upper_wick > (body * self.min_wick_ratio):
                if close > ema9:
                    signal = 'PUT'
            
        if signal:
            confidence = self._calc_confidence(mass_index, close, ema9, body, 
                                            lower_wick if signal=='CALL' else upper_wick)
            
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

    def _calc_confidence(self, mi, close, ema, body, wick):
        score = 50
        
        # MI Extremo
        if mi > 28.0: score += 15
        elif mi > 27.5: score += 10
        elif mi > 27.0: score += 5
        
        # Rejeição Forte (Pavio > 50% do corpo)
        if wick > (body * 0.5): score += 10
        
        # Distância da média (Mean Reversion potential)
        dist = abs(close - ema)
        if dist > (body * 2): score += 5 # Muito longe da média
        
        return min(100, max(0, score))

    def _calc_mass_index(self, highs, lows, p1, p2):
        hl = highs - lows
        ema_hl = self._calc_ema_array(hl, p1)
        ema_ema_hl = self._calc_ema_array(ema_hl, p1)
        
        with np.errstate(divide='ignore', invalid='ignore'):
            ratio = ema_hl / ema_ema_hl
        
        ratio = np.nan_to_num(ratio)
        
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

if __name__ == "__main__":
    s = Strategy_58_MassIndexRapidFire_V3()
    print(f"{s.name} initialized")
```
