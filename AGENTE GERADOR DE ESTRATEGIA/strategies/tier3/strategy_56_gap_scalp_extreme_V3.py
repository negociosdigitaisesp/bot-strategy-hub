import numpy as np
from typing import Dict, List, Optional

class Strategy_56_GapScalpExtreme_V3:
    """
    Strategy #56: Gap Scalp Extreme V3 (Turbo)
    Target: V50 (1min) | Freq: 22/h
    Logic: Keltner Channel Breakout + RSI Extremes (Mean Reversion)
    Safety: Panic Filter (Max Candle Size) + 5s Cooldown
    """
    def __init__(self):
        self.id = 56
        self.name = "Gap Scalp Extreme V3"
        self.version = "3.1" # Bump version post-review
        self.tier = 3 # Aggressive
        self.target_frequency = 22 # sinais/hora
        self.ideal_regime = "Volatile"
        
        # Indicadores Turbo
        self.rsi_period = 5     # Ultra-rápido
        self.keltner_period = 20
        self.keltner_mult = 2.0
        self.atr_period = 14
        
        # Thresholds TIER 3
        self.rsi_lower = 20
        self.rsi_upper = 80
        self.min_confidence = 0.45
        
        # Safety
        self.cooldown_seconds = 5 # Ajustado na Fase 2
        self.last_signal_time = 0
        self.max_body_atr = 3.0   # Panic filter
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        # 1. Validação Mínima
        if len(candles) < 50: return None
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None
        
        # Dados
        closes = np.array([c['close'] for c in candles])
        opens = np.array([c['open'] for c in candles])
        
        # 2. Calcular Indicadores (Otimizado)
        # RSI(5)
        rsi = self._calc_rsi(closes, self.rsi_period)
        
        # ATR(14)
        atr = self._calc_atr(candles, self.atr_period)
        if atr == 0: return None
        
        # Keltner Channels (EMA 20 +/- 2 ATR)
        ema20 = self._calc_ema(closes, self.keltner_period)
        upper_band = ema20 + (atr * self.keltner_mult)
        lower_band = ema20 - (atr * self.keltner_mult)
        
        # Candle Atual
        close = closes[-1]
        open_price = opens[-1]
        body_size = abs(close - open_price)
        
        # 3. Filtros de Segurança (Fase 2)
        # Panic Filter: Se corpo > 3x ATR, movimento é explosivo demais para contra-apostar
        if body_size > (atr * self.max_body_atr):
            return None
            
        # 4. Lógica de Entrada (Turbo Reversion)
        signal = None
        
        # CALL: Fechou abaixo da banda + RSI Sobrevendido
        if close < lower_band and rsi < self.rsi_lower:
            signal = 'CALL'
            
        # PUT: Fechou acima da banda + RSI Sobrecomprado
        elif close > upper_band and rsi > self.rsi_upper:
            signal = 'PUT'
            
        if signal:
            # 5. Confiança
            confidence = self._calc_confidence(rsi, close, upper_band, lower_band, atr)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': signal,
                    'confidence': confidence,
                    'expiration': 60, # 1 min (Turbo)
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': close,
                    'meta': f'Gap Scalp (RSI {rsi:.1f})',
                    'indicators': {
                        'rsi': round(rsi, 2),
                        'keltner_upper': round(upper_band, 5),
                        'keltner_lower': round(lower_band, 5),
                        'atr': round(atr, 5)
                    }
                }
        
        return None

    def _calc_confidence(self, rsi, close, upper, lower, atr):
        score = 50 # Base TIER 3
        
        # +15: RSI Extremo Absoluto (<10 ou >90)
        if rsi < 10 or rsi > 90: score += 15
        
        # +10: Distância Significativa da Banda (Overshoot)
        if close < lower:
            overshoot = lower - close
            if overshoot > 0.5 * atr: score += 10
        elif close > upper:
            overshoot = close - upper
            if overshoot > 0.5 * atr: score += 10
            
        # +5: Rejeição de pavio (Pinbar) - Opcional mas bom
        # (Não implementado para manter velocidade/simplicidade Turbo)
        
        return min(100, max(0, score))

    def _calc_rsi(self, prices, period=14):
        # Otimizado com NumPy
        deltas = np.diff(prices)
        seed = deltas[:period+1]
        up = seed[seed >= 0].sum()/period
        down = -seed[seed < 0].sum()/period
        
        # Avoid division by zero
        if down == 0: return 100.0 if up > 0 else 50.0

        rs = up/down
        rsi = np.zeros_like(prices)
        rsi[:period] = 100. - 100./(1. + rs)

        for i in range(period, len(prices)):
            delta = deltas[i-1]
            if delta > 0:
                upval = delta
                downval = 0.
            else:
                upval = 0.
                downval = -delta

            up = (up * (period - 1) + upval) / period
            down = (down * (period - 1) + downval) / period
            
            if down == 0:
                rsi[i] = 100.0 if up > 0 else 50.0
            else:
                rs = up/down
                rsi[i] = 100. - 100./(1. + rs)
        return rsi[-1]

    def _calc_ema(self, data, period):
        alpha = 2 / (period + 1)
        ema = np.zeros_like(data)
        ema[0] = data[0]
        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i-1]
        return ema[-1]
        
    def _calc_atr(self, candles, period):
        if len(candles) < period + 1: return 0.0
        highs = np.array([c['high'] for c in candles])
        lows = np.array([c['low'] for c in candles])
        closes = np.array([c['close'] for c in candles])
        
        tr1 = highs[1:] - lows[1:]
        tr2 = np.abs(highs[1:] - closes[:-1])
        tr3 = np.abs(lows[1:] - closes[:-1])
        tr = np.max(np.vstack((tr1, tr2, tr3)), axis=0)
        
        return np.mean(tr[-period:])

if __name__ == "__main__":
    s = Strategy_56_GapScalpExtreme_V3()
    print(f"{s.name} V{s.version} [Tier {s.tier}] initialized.")
