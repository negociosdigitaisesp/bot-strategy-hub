import numpy as np
from typing import Dict, List, Optional

class Strategy_65_RateChangeTurbo_V3:
    """
    Strategy #65: Rate Change Turbo V3
    Target: V10 (1min) | Freq: 24/h
    Logic: ROC(5) Cross + EMA(9) Trend
    Profile: Ultra-Aggressive High Frequency
    """
    def __init__(self):
        self.id = 65
        self.name = "Rate Change Turbo V3"
        self.version = "3.1"
        self.tier = 3
        self.target_frequency = 24
        self.ideal_regime = "Universal"
        
        # Parameters
        self.roc_period = 5
        self.ema_period = 9
        self.min_confidence = 0.45
        
        # Thresholds
        self.roc_threshold = 0.05
        self.doji_threshold = 0.01
        
        self.cooldown_seconds = 45 
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
        
        # Doji check (V10 specific scale)
        body_size = abs(price - open_price)
        if body_size < self.doji_threshold: return None 
        
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
                    'entry_price': closes[-1],
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
        if len(data) <= n: return np.zeros(len(data))
        
        # Vectorized ROC
        curr = data[n:]
        prev = data[:-n]
        
        # Avoid division by zero
        prev = np.where(prev == 0, 0.0001, prev)
        
        roc_vals = ((curr - prev) / prev) * 100
        
        # Pad beginning
        padding = np.zeros(n)
        return np.concatenate((padding, roc_vals))

    def _calc_ema(self, data, period):
        # Basic Loop EMA (Fast enough for 1000 candles)
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
