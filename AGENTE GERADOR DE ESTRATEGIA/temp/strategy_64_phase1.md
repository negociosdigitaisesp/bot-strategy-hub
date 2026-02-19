# FASE 1: GERAÇÃO - Estratégia #64

## Dados da Matriz
- **ID**: 64
- **Nome**: Ease Movement Rapid
- **Categoria**: Momentum / Turbo
- **Frequência alvo**: 19 sinais/hora
- **Win rate alvo**: 57%
- **Tier**: 3 (Aggressive)
- **Regime ideal**: Volatile
- **Asset**: Step Index
- **PERFIL**: TURBO

---

## 📋 CRIAÇÃO DE ESTRATÉGIA #64 - Ease Movement Rapid

### 1. NOME & DESCRIÇÃO
**Nome**: Ease of Movement (EOM) Rapid V3.0
**Descrição**: Estratégia focada em detectar "facilidade de movimento" combinada com volume. Identifica quando o preço se move com pouco volume (armadilha) ou muito volume (confirmação).

### 2. INDICADORES (máx 2 - PERFIL TURBO)
1. **Ease of Movement (EOM)**: Period 9. Mede a relação entre mudança de preço e volume.
2. **Volume (SMA)**: Para confirmar se o movimento tem respaldo financeiro.

### 3. REGRAS DE ENTRADA CALL
**Setup**: EOM Bullish Surge
- EOM cruza acima de Zero
- Volume atual > SMA(20) do Volume (confirmação de força)
- Candle atual é verde (fechamento > abertura)

### 4. REGRAS DE ENTRADA PUT
**Setup**: EOM Bearish Plunge
- EOM cruza abaixo de Zero
- Volume atual > SMA(20) do Volume
- Candle atual é vermelho (fechamento < abertura)

### 5. EXPIRATION
**1 Minuto (60s)** - Padrão Turbo

### 6. FREQUENCY TUNING (ATINGIR 19 SINAIS/HORA)
- **Cooldown**: 90 segundos (evitar sinais repetidos na mesma tendência)
- **Filtro Leve**: Exigir volume apenas 10% acima da média (Volume * 1.1)

### 7. FILTROS POR TIER (TIER 3 - AGGRESSIVE)
- **Regime**: Volatile (Step Index adora volatilidade)
- **Safety**: Ignorar se EOM estiver flat (perto de zero por 3 candles)

### 8. CONFIDENCE SCORE
```
Base: 50
+20: EOM rompe nível forte (+/- 1000 dependendo do ativo)
+15: Volume 2x maior que a média
+10: Wick rejection a favor da tendência

-10: Volume abaixo da média
```

### 9. BACKTESTING MENTAL
- **Win Rate**: 56-58% em Step Index
- **Risco**: Falsos rompimentos com baixo volume (filtrado pelo indicador de Volume)
- **Mitigação**: Exigência de Volume > SMA(20)

### 10. JUSTIFICATIVA TÉCNICA
Step Index é um ativo baseado em volume/steps. O indicador EOM é perfeito para ele pois leva em consideração o "box size" implícito do movimento.

### 11. PSEUDOCÓDIGO ESTRUTURADO

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Optional

class Strategy_64_EaseMovementRapid_V3:
    def __init__(self):
        self.id = 64
        self.name = "Ease Movement Rapid V3"
        self.version = "3.0"
        self.tier = 3
        self.target_frequency = 19
        self.ideal_regime = "Volatile"
        
        # Parameters
        self.eom_period = 9
        self.vol_sma = 20
        self.min_confidence = 0.50
        
        # Step Index divisor (ajuste de escala para EOM)
        self.scale_factor = 10000 
        
        self.cooldown_seconds = 90
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 30: return None
        
        current_time = market_state.get('timestamp', 0)
        if current_time - self.last_signal_time < self.cooldown_seconds: return None

        # Data prep
        highs = np.array([c['high'] for c in candles])
        lows = np.array([c['low'] for c in candles])
        volumes = np.array([c.get('tick_volume', 1) for c in candles]) # Use tick volume
        
        # 1. Calc EOM
        eom = self._calc_eom(highs, lows, volumes)
        if len(eom) < 2: return None
        
        # 2. Calc Volume SMA
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
                    'meta': f'EOM: {eom_curr:.2f} | Vol Ratio: {(current_vol/vol_sma):.1f}x',
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
        if vol > vol_sma * 2.0: score += 10 # Bonus extra
        
        # EOM forte (escala relativa)
        if abs(eom) > 0.5: score += 10
        
        return min(100, max(0, score))

    def _calc_eom(self, highs, lows, volumes):
        # EOM = (Dist Moved / Box Ratio)
        # Dist Moved = ((H + L) / 2) - ((H_prev + L_prev) / 2)
        # Box Ratio = (Volume / Scale) / (High - Low)
        
        res = []
        for i in range(1, len(highs)):
            dm = ((highs[i] + lows[i])/2) - ((highs[i-1] + lows[i-1])/2)
            
            box_ratio = (volumes[i] / self.scale_factor) / ((highs[i] - lows[i]) + 0.0001)
            
            eom_val = dm / (box_ratio + 0.0001)
            res.append(eom_val)
            
        # SMA smoothing
        return pd.Series(res).rolling(self.eom_period).mean().fillna(0).values

if __name__ == "__main__":
    s = Strategy_64_EaseMovementRapid_V3()
    print(f"{s.name} initialized")
```
