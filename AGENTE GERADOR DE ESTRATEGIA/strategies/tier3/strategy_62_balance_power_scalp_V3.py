import numpy as np
from typing import Dict, List, Optional

class Strategy_62_BalancePowerScalp_V3:
    """
    Strategy #62: Balance Power Scalp V3
    Target: Boom1000 (1min) | Freq: 22/h
    Logic: Balance of Power (BOP) Crossover + EMA Confirmation
    Safety: Neutral Zone Filter (-0.2 to 0.2)
    """
    def __init__(self):
        self.id = 62
        self.name = "Balance Power Scalp V3"
        self.version = "3.1"
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
        
        # Corpo grande (simplified check)
        body = abs(close - open_price)
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

if __name__ == "__main__":
    s = Strategy_62_BalancePowerScalp_V3()
    print(f"{s.name} initialized")
