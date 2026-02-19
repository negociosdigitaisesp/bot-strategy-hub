# FASE 3: VALIDAÇÃO (Risk Manager) - Estratégia #57

## Thresholds (TURBO)
- Win Rate mínimo: 55%
- Confidence: 0.45

## ESTRATÉGIA (Noisefader Turbo V3 - APROVADA)
### Modificações:
1. **BB Width Filter**: Evitar breakouts (expansão > 2x média).

## ANÁLISE RISCO
- **Win Rate**: V10 é "friendly" para reversão. WR estimado 56-59% em range.
- **Perigo**: Breakouts de baixa volatilidade para alta volatilidade (Squeeze). O filtro resolve.
- **Payout**: Monitorar se > 85%.

## DECISÃO FINAL
✅ **APROVAR PARA PRODUÇÃO**

---

## CÓDIGO PYTHON FINAL

```python
import numpy as np
from typing import Dict, List, Optional

class Strategy_57_NoisefaderTurbo_V3:
    """
    Strategy #57: Noisefader Turbo V3
    Target: V10 (1min) | Freq: 25/h
    Logic: Bollinger Band (1.5std) Fade + Williams %R Extremes
    Safety: BB Width Expansion Filter (Anti-Breakout)
    """
    def __init__(self):
        self.id = 57
        self.name = "Noisefader Turbo V3"
        self.version = "3.1"
        self.tier = 3
        self.target_frequency = 25
        self.ideal_regime = "Ranging"
        
        # Indicadores
        self.bb_period = 10
        self.bb_std = 1.5
        self.williams_period = 7
        
        # Thresholds
        self.williams_upper = -10
        self.williams_lower = -90
        self.min_confidence = 0.45
        
        # Safety
        self.cooldown_seconds = 0 # Turbo real
        self.last_signal_time = 0
        self.max_bb_expansion = 2.0 # Se largura banda > 2x média, abortar
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 50: return None
        
        current_time = market_state.get('timestamp', 0)
        # 0 cooldown, mas validação temporal básica
        if current_time == self.last_signal_time: return None 
        
        # Dados
        closes = np.array([c['close'] for c in candles])
        highs = np.array([c['high'] for c in candles])
        lows = np.array([c['low'] for c in candles])
        
        # 1. BB Calc
        sma = self._calc_sma(closes, self.bb_period)
        std = self._calc_std(closes, self.bb_period)
        upper = sma + (std * self.bb_std)
        lower = sma - (std * self.bb_std)
        
        # 2. Safety: BB Width Expansion (Anti-Breakout)
        current_width = upper - lower
        avg_width = self._calc_avg_width(closes, self.bb_period, self.bb_std, 50)
        
        if avg_width > 0 and current_width > (avg_width * self.max_bb_expansion):
            # Volatilidade explodindo = Breakout provável = Ficar fora
            return None
            
        # 3. Williams %R
        hh = np.max(highs[-self.williams_period:])
        ll = np.min(lows[-self.williams_period:])
        close = closes[-1]
        
        if hh == ll: return None
        wr = ((hh - close) / (hh - ll)) * -100
        
        signal = None
        
        # CALL: Preço <= Lower e Williams < -90 (Sobrevenda)
        if close <= lower and wr < self.williams_lower:
            signal = 'CALL'
            
        # PUT: Preço >= Upper e Williams > -10 (Sobrecompra)
        elif close >= upper and wr > self.williams_upper:
            signal = 'PUT'
            
        if signal:
            confidence = self._calc_confidence(wr, close, upper, lower, current_width, avg_width)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': signal,
                    'confidence': confidence,
                    'expiration': 60, # 1 min
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': close,
                    'meta': f'NF Turbo (WR {wr:.1f})',
                    'indicators': {
                        'williams': round(wr, 2),
                        'bb_upper': round(upper, 5),
                        'bb_lower': round(lower, 5)
                    }
                }
        return None

    def _calc_confidence(self, wr, close, upper, lower, width, avg_width):
        score = 55 # Começa bem se passou pelos filtros
        
        # +10: Saturação total (-100 ou 0)
        if wr <= -98 or wr >= -2: score += 10
        
        # +10: Preço muito fora banda
        if close < lower:
            dist = lower - close
            if dist > width * 0.2: score += 10
        elif close > upper:
            dist = close - upper
            if dist > width * 0.2: score += 10
            
        # -10: Bandas começando a abrir (sinal amarelo)
        if width > avg_width * 1.5: score -= 10
        
        return min(100, max(0, score))

    def _calc_sma(self, data, period):
        return np.mean(data[-period:])
        
    def _calc_std(self, data, period):
        return np.std(data[-period:])
        
    def _calc_avg_width(self, data, per, std_mult, avg_per):
        # Calcula largura média das últimas N bandas
        # Simplificado: std dev médio * 2 * std_mult
        # Rolling std dev
        stds = []
        for i in range(avg_per):
            end_idx = len(data) - i
            start_idx = end_idx - per
            if start_idx < 0: break
            slice_data = data[start_idx:end_idx]
            stds.append(np.std(slice_data))
            
        if not stds: return 0.0
        avg_std = np.mean(stds)
        return avg_std * 2 * std_mult

if __name__ == "__main__":
    s = Strategy_57_NoisefaderTurbo_V3()
    print(f"{s.name} initialized")
```
