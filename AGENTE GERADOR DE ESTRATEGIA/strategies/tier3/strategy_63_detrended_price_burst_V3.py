import numpy as np
from typing import Dict, List, Optional

class Strategy_63_DetrendedPriceBurst_V3:
    """
    Strategy #63: Detrended Price Burst V3
    Target: V25 (1min) | Freq: 20/h
    Logic: DPO Zero Cross from Extremes
    Safety: Neutral Zone Filter + Extreme Requirement
    """
    def __init__(self):
        self.id = 63
        self.name = "Detrended Price Burst V3"
        self.version = "3.1"
        self.tier = 3
        self.target_frequency = 20
        self.ideal_regime = "Universal"
        
        # DPO Parameters
        self.dpo_period = 14
        self.displacement = 7
        
        # Thresholds
        self.extreme_threshold = 0.5
        self.neutral_zone = 0.2
        self.min_confidence = 0.45
        
        self.cooldown_seconds = 60
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 30: return None
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None

        closes = np.array([c['close'] for c in candles])
        
        # 1. Calc DPO
        dpo = self._calc_dpo(closes)
        if len(dpo) < 2: return None
        
        dpo_curr = dpo[-1]
        dpo_prev = dpo[-2]
        
        # 2. Neutral zone filter
        if -self.neutral_zone < dpo_curr < self.neutral_zone:
            return None
        
        signal = None
        
        # CALL: DPO crosses above zero from oversold
        if dpo_prev < 0 and dpo_curr > 0:
            if dpo_prev < -self.extreme_threshold:
                signal = 'CALL'
                
        # PUT: DPO crosses below zero from overbought
        elif dpo_prev > 0 and dpo_curr < 0:
            if dpo_prev > self.extreme_threshold:
                signal = 'PUT'
                
        if signal:
            confidence = self._calc_confidence(dpo_curr, dpo_prev)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': signal,
                    'confidence': confidence,
                    'expiration': 60,
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': closes[-1],
                    'meta': f'DPO Burst ({dpo_curr:.2f})',
                    'indicators': {
                        'dpo': round(dpo_curr, 3)
                    }
                }
        return None

    def _calc_confidence(self, dpo, dpo_prev):
        score = 50
        
        # Extremo
        if abs(dpo_prev) > 1.0: score += 15
        
        # Momentum do cruzamento
        diff = abs(dpo - dpo_prev)
        if diff > 0.3: score += 10
        
        return min(100, max(0, score))

    def _calc_dpo(self, data):
        # DPO = Close - SMA(period) displaced by (period/2 + 1)
        sma = self._calc_sma_array(data, self.dpo_period)
        
        if len(sma) < self.displacement: return np.zeros(0)
        
        # Price array aligned with SMA
        price_aligned = data[-len(sma):]
        
        # Displace SMA backward
        sma_displaced = sma[:-self.displacement] if self.displacement > 0 else sma
        price_for_dpo = price_aligned[-len(sma_displaced):]
        
        dpo = price_for_dpo - sma_displaced
        
        return dpo

    def _calc_sma_array(self, data, period):
        if len(data) < period: return np.zeros(0)
        return np.convolve(data, np.ones(period)/period, mode='valid')

if __name__ == "__main__":
    s = Strategy_63_DetrendedPriceBurst_V3()
    print(f"{s.name} initialized")
