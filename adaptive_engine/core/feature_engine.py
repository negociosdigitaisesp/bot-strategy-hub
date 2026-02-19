import pandas as pd
import numpy as np
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class FeatureEngine:
    """
    Calcula features estatísticas reais a partir de dados de mercado.
    Foco: Volatility Clustering, Regime Detection, Statistical Anomalies.
    """
    
    def calculate_features(self, df: pd.DataFrame) -> Dict:
        """
        Calcula conjunto completo de features para entrada no Signal Generator.
        Requer DataFrame com OHLC e pelo menos 50 candles.
        """
        if len(df) < 50:
            return {}

        try:
            # 1. Volatility Regime (ATR Normalized)
            atr = self._calc_atr(df, period=14)
            # Normalizar pelo preço para comparar ativos diferentes
            atr_norm = (atr.iloc[-1] / df['close'].iloc[-1]) * 10000 
            
            # 2. Volatility Clustering Score (Autocorrelation)
            # Mede persistência da volatilidade (GARCH-like behavior)
            returns = df['close'].pct_change().dropna()
            squared_returns = returns ** 2
            vol_clustering = squared_returns.autocorr(lag=1)
            
            # 3. Z-Score (Mean Reversion Potential)
            # Distância do preço atual para a média móvel em desvios padrão
            sma_20 = df['close'].rolling(20).mean().iloc[-1]
            std_20 = df['close'].rolling(20).std().iloc[-1]
            z_score = (df['close'].iloc[-1] - sma_20) / (std_20 + 1e-9)

            # 4. Momentum Score (RSI Adaptativo)
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
            rs = gain / (loss + 1e-9)
            rsi = 100 - (100 / (1 + rs)).iloc[-1]
            # Normalizar RSI para score -1 a 1 (0 = neutro)
            momentum_score = (rsi - 50) / 50

            # 5. Digit Anomalies (Últimos 100 dígitos)
            # Só faz sentido para sintéticos
            last_digits = df['close'].apply(lambda x: int(str(x)[-1])).tail(100)
            digit_counts = last_digits.value_counts(normalize=True)
            # Max deviation from expected 0.1
            max_digit_dev = digit_counts.max() - 0.1 

            return {
                "atr_regime": round(atr_norm, 2),
                "vol_clustering": round(vol_clustering, 3), # > 0.2 indica clustering forte
                "z_score": round(z_score, 2),
                "momentum": round(momentum_score, 2),
                "digit_anomaly": round(max_digit_dev, 3)
            }

        except Exception as e:
            logger.error(f"Erro ao calcular features: {e}")
            return {}

    def _calc_atr(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        high_low = df['high'] - df['low']
        high_close = (df['high'] - df['close'].shift()).abs()
        low_close = (df['low'] - df['close'].shift()).abs()
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        return true_range.rolling(period).mean()

    def _calc_regime_persistence(self, df: pd.DataFrame, window: int = 20) -> float:
        """Calcula persistência da volatilidade via autocorrelação de desvio padrão."""
        try:
            # Calcular log returns
            returns = np.log(df['close'] / df['close'].shift(1)).dropna()
            
            # Calcular volatilidade rolante (StdDev)
            rolling_vol = returns.rolling(window=window).std().dropna()
            
            # Autocorrelação da série de volatilidade (persistência)
            persistence = rolling_vol.autocorr(lag=1)
            
            return persistence if not np.isnan(persistence) else 0.0
        except Exception:
            return 0.0

