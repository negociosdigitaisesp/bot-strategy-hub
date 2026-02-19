# FASE 1: GERAÇÃO - Estratégia #59

## Dados da Matriz
- **ID**: 59
- **Nome**: Know Sure Thing Turbo
- **Categoria**: Momentum / Turbo
- **Frequência alvo**: 19 sinais/hora
- **Win rate alvo**: 57%
- **Tier**: 3 (Aggressive)
- **Regime ideal**: Trending
- **Asset**: V100 (Volatility 100 Index - Tendência forte)
- **PERFIL**: TURBO (>18 sinais/h)

---

## 📋 CRIAÇÃO DE ESTRATÉGIA #59 - Know Sure Thing Turbo

### 1. NOME & DESCRIÇÃO
**Nome**: KST Turbo V3.0
**Descrição**: Estratégia de momentum baseado no oscilador "Know Sure Thing" (KST) de Martin Pring, ajustado para timeframes curtos (Turbo). Busca cruzamentos de linha de sinal em zonas de aceleração de tendência em V100.

### 2. INDICADORES (máx 2 - PERFIL TURBO)
1. **KST Oscillator (10, 15, 20, 30)**: Soma ponderada de 4 ROCs (Rates of Change) suavizados.
   - ROC1 (10) smoothed by SMA(10) * 1
   - ROC2 (15) smoothed by SMA(10) * 2
   - ROC3 (20) smoothed by SMA(10) * 3
   - ROC4 (30) smoothed by SMA(15) * 4
   - Signal Line: SMA(9) do KST.
   *Nota: Settings reduzidos para Turbo (Padrão é muito lento).*
2. **EMA (50)**: Filtro de tendência macro.

### 3. REGRAS DE ENTRADA CALL
**Setup**: Momentum Bullish em Tendência de Alta.
- Preço > EMA(50).
- KST cruza ACIMA da Signal Line (Crossover).
- KST < 0 (Cruzamento preferencialmente vindo de baixo, mas em Turbo aceita-se continuação).

### 4. REGRAS DE ENTRADA PUT
**Setup**: Momentum Bearish em Tendência de Baixa.
- Preço < EMA(50).
- KST cruza ABAIXO da Signal Line.
- KST > 0.

### 5. EXPIRATION
**60 segundos (1 minuto)** - TURBO
Justificativa: V100 tem inércia forte. Quando o momentum (medido por 4 ciclos ROC) vira a favor da tendência, o movimento costuma durar 2-3 minutos. 1 minuto é seguro para capturar o impulso inicial.

### 6. FREQUENCY TUNING (ATINGIR 19 SINAIS/HORA)
**Perfil TURBO → 19/h**:
- **Cooldown**: 60 segundos (Evitar múltiplos sinais no mesmo crossover).
- **Thresholds**:
  - Cruzamento de KST é um evento mecânico claro.
  - V100 é muito tendencioso, gerando muitos sinais a favor da EMA(50).
  - Tuning nos períodos ROC (encurtados) garante frequência > 15/h.

### 7. FILTROS POR TIER (TIER 3 - AGGRESSIVE)
- **Regime**: Trending.
- **Filtro de Tendência**: EMA(50) obrigatória. Ignora contra-tendência (mesmo com crossover).
- **Safety**: Não operar se KST estiver "flat" (Signal e KST colados). Requer ângulo de cruzamento (diferença > X).

### 8. CONFIDENCE SCORE
```
Base: 50
+15: Ângulo do cruzamento agudo (Diferença > 5.0 entre KST e Signal no candle anterior era negativa/positiva forte)
+10: Preço acabou de fazer pullback na EMA(50) (Bounce)
+5: Todos os 4 ROCs estão alinhados na direção

-10: Crossover ocorreu muito longe da linha zero (Extremo, risco de reversão)
```

### 9. BACKTESTING MENTAL
- **Win Rate**: 56-60% (Trend Following puro).
- **Risco**: Whipsaw em mercado lateral (EMA flat).
- **Mitigação**: Angulação do crossover.

### 10. JUSTIFICATIVA TÉCNICA
O KST é superior ao MACD para ciclos complexos porque soma 4 timeframes de momentum. Em V100, que obedece ondas de Elliott fractais, o KST captura a "soma das ondas". Usar EMA(50) garante que só operamos a favor da maré.

### 11. PSEUDOCÓDIGO ESTRUTURADO

```python
import numpy as np
from typing import Dict, List, Optional

class Strategy_59_KnowSureThingTurbo_V3:
    def __init__(self):
        self.id = 59
        self.name = "Know Sure Thing Turbo V3"
        self.version = "3.0"
        self.tier = 3
        self.target_frequency = 19
        self.ideal_regime = "Trending"
        
        # Indicadores KST (Turbo Settings)
        # ROC Periods: 10, 15, 20, 30
        # SMA Periods per ROC: 10, 10, 10, 15
        self.roc_periods = [10, 15, 20, 30]
        self.sma_periods = [10, 10, 10, 15]
        self.signal_period = 9
        
        self.ema_trend_period = 50
        
        self.min_confidence = 0.45
        self.cooldown_seconds = 60
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 60: return None # Need history for ROC 30 + SMA 15 + EMA 50
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None

        # Dados
        closes = np.array([c['close'] for c in candles])
        
        # 1. Calc EMA Trend
        ema50 = self._calc_ema(closes, self.ema_trend_period)
        
        # 2. Calc KST
        kst, signal_line = self._calc_kst(closes)
        
        # Validação Cross
        # KST atual vs anterior
        kst_curr = kst[-1]
        kst_prev = kst[-2]
        sig_curr = signal_line[-1]
        sig_prev = signal_line[-2]
        
        close = closes[-1]
        
        entry_signal = None
        
        # CALL: 
        # 1. Trend Up (Price > EMA)
        # 2. Cross Up (KST_prev < Sig_prev AND KST_curr > Sig_curr)
        if close > ema50:
            if kst_prev < sig_prev and kst_curr > sig_curr:
                entry_signal = 'CALL'
                
        # PUT:
        # 1. Trend Down (Price < EMA)
        # 2. Cross Down (KST_prev > Sig_prev AND KST_curr < Sig_curr)
        elif close < ema50:
            if kst_prev > sig_prev and kst_curr < sig_curr:
                entry_signal = 'PUT'
                
        if entry_signal:
            confidence = self._calc_confidence(kst_curr, sig_curr, kst_prev, sig_prev, close, ema50)
            
            if confidence >= self.min_confidence * 100:
                self.last_signal_time = current_time
                return {
                    'direction': entry_signal,
                    'confidence': confidence,
                    'expiration': 60,
                    'strategy_id': self.id,
                    'tier': self.tier,
                    'entry_price': close,
                    'meta': f'KST Cross (KST {kst_curr:.2f})',
                    'indicators': {
                        'kst': round(kst_curr, 2),
                        'signal': round(sig_curr, 2),
                        'ema': round(ema50, 5)
                    }
                }
        return None

    def _calc_confidence(self, kst, sig, kst_prev, sig_prev, close, ema):
        score = 50
        
        # Angulação: Diferença cresceu?
        diff_prev = abs(kst_prev - sig_prev)
        diff_curr = abs(kst - sig)
        # Se diferença atual já é visível logo após cruzamento, é forte
        if diff_curr > 0.5: score += 10
        
        # Proximidade EMA (Pullback é melhor que esticado)
        dist_ema = abs(close - ema)
        if dist_ema < (close * 0.0005): score += 10 # Perto da média = inicio do impulso
        
        # KST value: cruzar perto do zero é melhor (início ciclo)
        if abs(kst) < 50: score += 5
        
        return min(100, max(0, score))

    def _calc_kst(self, data):
        # KST = (RCMA1 * 1) + (RCMA2 * 2) + (RCMA3 * 3) + (RCMA4 * 4)
        # RCMA = SMA(ROC)
        
        rcma1 = self._calc_sma_array(self._calc_roc(data, self.roc_periods[0]), self.sma_periods[0])
        rcma2 = self._calc_sma_array(self._calc_roc(data, self.roc_periods[1]), self.sma_periods[1])
        rcma3 = self._calc_sma_array(self._calc_roc(data, self.roc_periods[2]), self.sma_periods[2])
        rcma4 = self._calc_sma_array(self._calc_roc(data, self.roc_periods[3]), self.sma_periods[3])
        
        # Align lengths (ROC shrinks array, SMA shrinks further)
        min_len = min(len(rcma1), len(rcma2), len(rcma3), len(rcma4))
        
        # Slicing from end
        t1 = rcma1[-min_len:] * 1
        t2 = rcma2[-min_len:] * 2
        t3 = rcma3[-min_len:] * 3
        t4 = rcma4[-min_len:] * 4
        
        kst = t1 + t2 + t3 + t4
        
        # Signal Line = SMA(9) of KST
        signal = self._calc_sma_array(kst, self.signal_period)
        
        # Re-align KST to signal
        kst_aligned = kst[-len(signal):]
        
        return kst_aligned, signal

    def _calc_roc(self, data, period):
        # ROC = ((Close - Close_prev) / Close_prev) * 100
        # Numpy trick
        return ((data[period:] - data[:-period]) / data[:-period]) * 100

    def _calc_sma_array(self, data, period):
        return np.convolve(data, np.ones(period)/period, mode='valid')

    def _calc_ema(self, data, period):
        alpha = 2 / (period + 1)
        ema = np.zeros_like(data)
        ema[0] = data[0]
        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i-1]
        return ema[-1]
```
