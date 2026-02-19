# FASE 1: GERAÇÃO - Estratégia #57

## Dados da Matriz
- **ID**: 57
- **Nome**: Noisefader Turbo
- **Categoria**: Turbo
- **Frequência alvo**: 25 sinais/hora
- **Win rate alvo**: 55%
- **Tier**: 3 (Aggressive)
- **Regime ideal**: Ranging (Lateral)
- **Asset**: V10 (Volatility 10 Index - baixa volatilidade, muito ruído)
- **PERFIL**: TURBO (>18 sinais/h)

---

## 📋 CRIAÇÃO DE ESTRATÉGIA #57 - Noisefader Turbo

### 1. NOME & DESCRIÇÃO
**Nome**: Noisefader Turbo V3.0
**Descrição**: Scalping de alta frequência que explora a reversão à média agressiva em mercados de "ruído" (V10), apostando contra qualquer micro-tendência insustentável que se afaste da média de curto prazo.

### 2. INDICADORES (máx 2 - PERFIL TURBO)
1. **Bollinger Bands (10, 1.5)**: Bandas rápidas e estreitas para capturar desvios menores (ruído).
2. **Williams %R (7)**: Oscilador rápido para detectar picos de pressão de compra/venda.

### 3. REGRAS DE ENTRADA CALL
**Setup**: Desvanecer movimento de baixa (Fade the drop).
- Preço toca ou rompe Banda Inferior da Bollinger (10, 1.5).
- Williams %R(7) < -90 (Extremamente sobrevendido).
- **Sem confirmação** (Execução imediata no tick).

### 4. REGRAS DE ENTRADA PUT
**Setup**: Desvanecer movimento de alta (Fade the pop).
- Preço toca ou rompe Banda Superior da Bollinger (10, 1.5).
- Williams %R(7) > -10 (Extremamente sobrecomprado).

### 5. EXPIRATION
**45-60 segundos** - TURBO
Justificativa: Em V10 (mercado lento/ruído), os desvios corrigem rápido, mas não sustentam tendência. 45-60s é o tempo para o "fading" ocorrer.

### 6. FREQUENCY TUNING (ATINGIR 25 SINAIS/HORA)
**Perfil TURBO → 25/h**:
- **Cooldown**: 0 segundos. Se o preço continuar forçando as bandas, continuar entrando (com gestão de risco).
- **Thresholds**:
  - BB(10, 1.5) é muito estreita. O preço vai interagir com ela constantemente.
  - Williams %R(7) é muito sensível.
- **Asset**: V10 é um ativo de "drift" lento com muito ruído em M1. Perfeito para fading.
- **Lógica**: "Qualquer esticada é ruído, aposte contra". Em V10, tendências reais são raras em M1.

### 7. FILTROS POR TIER (TIER 3 - AGGRESSIVE)
- **Regime**: Ranging preferencialmente, mas a estratégia CRIA seu próprio regime ao operar contra desvios. Funciona até "dar errado" (tendência forte), onde o stop loss/filtro de volatilidade deve atuar.
- **Volatility Filter**: Ignorar ATR mínimo (queremos operar o ruído). Filtro de MAX ATR para evitar notícias/spikes reais.

### 8. CONFIDENCE SCORE
```
Base: 50
+20: Williams %R tocando -100 ou 0 (Saturação total)
+10: Preço completamente fora das bandas (Open e Close fora)
+5: Candle anterior foi Doji ou Martelo/Estrela (sinal de reversão)

-20: Bandas se abrindo violentamente (Sinal de início de tendência/Breakout real)
```

### 9. BACKTESTING MENTAL
- **Win Rate**: 54-57% (Marginal, ganha no volume).
- **Frequência**: V10 toca BB(1.5) muitas vezes por hora. 25/h é factível.
- **Risco**: Entrar na frente de um trem (Breakout verdadeiro de V10). V10 quando tendência, NÃO olha pra trás.

### 10. JUSTIFICATIVA TÉCNICA
V10 é o índice de menor volatilidade. Ele passa 80% do tempo em range estreito (ruído). Usar desvio padrão baixo (1.5) e oscilador rápido (7) alinha a estratégia com a natureza estatística do ativo. É uma máquina de "fade" (apostar contra o movimento).

### 11. PSEUDOCÓDIGO ESTRUTURADO

```python
import numpy as np
from typing import Dict, List, Optional

class Strategy_57_NoisefaderTurbo_V3:
    def __init__(self):
        self.id = 57
        self.name = "Noisefader Turbo V3"
        self.version = "3.0"
        self.tier = 3
        self.target_frequency = 25
        self.ideal_regime = "Ranging"
        
        # Indicadores
        self.bb_period = 10
        self.bb_std = 1.5
        self.williams_period = 7
        
        # Thresholds
        self.williams_upper = -10 # Sobrecompra (> -10)
        self.williams_lower = -90 # Sobrevenda (< -90)
        
        self.min_confidence = 0.45
        self.cooldown_seconds = 0
        self.last_signal_time = 0
        
    def check_entry(self, candles: List[Dict], market_state: Dict) -> Optional[Dict]:
        if len(candles) < 20: return None
        
        # Dados
        closes = np.array([c['close'] for c in candles])
        highs = np.array([c['high'] for c in candles])
        lows = np.array([c['low'] for c in candles])
        
        # 1. Calc BB
        sma = np.mean(closes[-self.bb_period:])
        std = np.std(closes[-self.bb_period:])
        upper = sma + (std * self.bb_std)
        lower = sma - (std * self.bb_std)
        
        # 2. Calc Williams %R
        # %R = (Highest High - Close) / (Highest High - Lowest Low) * -100
        hh = np.max(highs[-self.williams_period:])
        ll = np.min(lows[-self.williams_period:])
        close = closes[-1]
        
        if hh == ll: return None
        wr = ((hh - close) / (hh - ll)) * -100
        
        entry_signal = None
        
        # CALL: Preço <= Lower Band + Williams < -90
        if close <= lower and wr < self.williams_lower:
            entry_signal = 'CALL'
            
        # PUT: Preço >= Upper Band + Williams > -10
        elif close >= upper and wr > self.williams_upper:
            entry_signal = 'PUT'
            
        if entry_signal:
            confidence = 60 # Base alta pois setup é específico
            # Penalizar se bandas estiverem abrindo muito (tendência)
            # (Lógica simplificada para Turbo)
            
            return {
                'id': self.id,
                'direction': entry_signal,
                'confidence': confidence,
                'expiration': 60,
                'meta': f'NF Turbo (WR {wr:.1f})'
            }
            
        return None
```
