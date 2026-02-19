import numpy as np
from typing import Dict, List, Optional

class Strategy_64_EaseMovementRapid_V3:
    """
    Strategy #64: Ease Movement Rapid V3
    Target: Step Index (1min) | Freq: 19/h
    Logic: EOM Zero Cross + Volume Confirmation
    Optimization: Pure Numpy (No Pandas)
    """
    def __init__(self):
        self.id = 64
        self.name = "Ease Movement Rapid V3"
        self.version = "3.1"
        self.tier = 3
        self.target_frequency = 19
        self.ideal_regime = "Volatile"
        
        # Parameters
        self.eom_period = 9
        self.vol_sma = 20
        self.min_confidence = 0.50
        
        # Scale Factor for Step Index (crucial for EOM values)
        self.scale_factor = 100000 
        
        self.cooldown_seconds = 90
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 30: return None
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None

        # Data prep
        highs = np.array([c['high'] for c in candles])
        lows = np.array([c['low'] for c in candles])
        volumes = np.array([c.get('tick_volume', 1) for c in candles], dtype=float)
        
        # 1. Calc EOM
        eom = self._calc_eom(highs, lows, volumes)
        if len(eom) < 2: return None
        
        # 2. Calc Volume SMA
        if len(volumes) < self.vol_sma: return None
        vol_sma = np.mean(volumes[-self.vol_sma:])
        current_vol = volumes[-1]
        
        # Logic
        eom_curr = eom[-1]
        eom_prev = eom[-2]
        
        signal = None
        
        # CALL: EOM cross UP + Volume Confirmed
        if eom_prev < 0 and eom_curr > 0:
            if current_vol > vol_sma:
                signal = 'CALL'
                
        # PUT: EOM cross DOWN + Volume Confirmed
        elif eom_prev > 0 and eom_curr < 0:
            if current_vol > vol_sma:
                signal = 'PUT'
                
        if signal:
            confidence = self._calc_confidence(eom_curr, current_vol, vol_sma)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': signal,
                    'confidence': confidence,
                    'expiration': 60,
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': candles[-1]['close'],
                    'meta': f'EOM: {eom_curr:.2f} | Vol: {(current_vol/vol_sma):.1f}x',
                    'indicators': {
                        'eom': round(eom_curr, 4),
                        'vol_ratio': round(current_vol/vol_sma, 2)
                    }
                }
        return None

    def _calc_confidence(self, eom, vol, vol_sma):
        score = 50
        
        # Volume forte
        if vol > vol_sma * 1.5: score += 15
        if vol > vol_sma * 2.0: score += 10
        
        # EOM longe de zero
        if abs(eom) > 0.1: score += 10
        
        return min(100, max(0, score))

    def _calc_eom(self, highs, lows, volumes):
        # Numpy implementation of Ease of Movement
        # dm = ((H + L) / 2) - ((H_prev + L_prev) / 2)
        hl2 = (highs + lows) / 2
        dm = np.diff(hl2) # dm[i] corresponds to index i+1
        
        # Align arrays (remove first element from others to match diff)
        highs_s = highs[1:]
        lows_s = lows[1:]
        volumes_s = volumes[1:]
        
        # box_ratio = (Volume / Scale) / (High - Low)
        hl_range = (highs_s - lows_s)
        # Avoid zero division
        hl_range = np.where(hl_range == 0, 0.0001, hl_range)
        
        box_ratio = (volumes_s / self.scale_factor) / hl_range
        # Avoid zero division
        box_ratio = np.where(box_ratio == 0, 0.0001, box_ratio)
        
        eom_raw = dm / box_ratio
        
        # SMA Smoothing
        return self._sma(eom_raw, self.eom_period)

    def _sma(self, data, period):
        if len(data) < period: return np.zeros(len(data))
        return np.convolve(data, np.ones(period)/period, mode='valid')

if __name__ == "__main__":
    s = Strategy_64_EaseMovementRapid_V3()
    print(f"{s.name} initialized")
