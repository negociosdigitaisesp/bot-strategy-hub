import numpy as np
from typing import Dict, List, Optional

class Strategy_60_SchaffTrendBlitz_V3:
    """
    Strategy #60: Schaff Trend Blitz V3
    Target: V50 (1min) | Freq: 21/h
    Logic: STC Cycle Reversal + EMA Trend Filter
    Safety: Neutral Zone Filter (40-60)
    """
    def __init__(self):
        self.id = 60
        self.name = "Schaff Trend Blitz V3"
        self.version = "3.1"
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
        self.neutral_lower = 40
        self.neutral_upper = 60
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
        
        # 3. Hard Filter: Neutral Zone
        if self.neutral_lower < stc_curr < self.neutral_upper:
            return None
        
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
        
        return min(100, max(0, score))

    def _calc_stc(self, data):
        # 1. MACD
        ema_fast = self._calc_ema_array(data, self.macd_fast)
        ema_slow = self._calc_ema_array(data, self.macd_slow)
        
        min_len = min(len(ema_fast), len(ema_slow))
        macd = ema_fast[-min_len:] - ema_slow[-min_len:]
        
        # 2. Stochastic of MACD
        stc = self._calc_stoch_array(macd, self.stoch_period)
        
        return stc

    def _calc_stoch_array(self, data, period):
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

if __name__ == "__main__":
    s = Strategy_60_SchaffTrendBlitz_V3()
    print(f"{s.name} initialized")
