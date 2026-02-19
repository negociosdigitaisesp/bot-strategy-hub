# adaptive_engine/core/signal_generator.py
import logging
from typing import List, Dict, Optional
from adaptive_engine.core.feature_engine import FeatureEngine
from adaptive_engine.workflows.base import BaseWorkflow
from adaptive_engine.workflows.volatility_barrier import VolatilityBarrierWorkflow

logger = logging.getLogger(__name__)

class SignalGenerator:
    """
    Orquestra a geração de sinais:
    1. Recebe DataFrame do MarketSensor
    2. Calcula Features via FeatureEngine
    3. Consulta Workflows ativos
    4. Agrega e filtra sinais
    """
    def __init__(self):
        self.feature_engine = FeatureEngine()
        self.workflows: List[BaseWorkflow] = [
            VolatilityBarrierWorkflow(),
            # Outros workflows virão aqui (Convergence, RegimeReversal, etc)
        ]
        self.features_cache = {} # Cache features por ativo

    def process_candle(self, asset: str, df) -> Optional[Dict]:
        """
        Processa um novo candle e retorna o MELHOR sinal encontrado (se houver).
        """
        if len(df) < 50:
            return None

        # 1. Calcular Features
        features = self.feature_engine.calculate_features(df)
        
        # Adicionar persistência
        features['vol_persistence'] = self.feature_engine._calc_regime_persistence(df)
        
        self.features_cache[asset] = features

        # 2. Consultar Workflows
        candidates = []
        for wf in self.workflows:
            try:
                # Mock candle (pegar ultimo do df)
                last_candle = df.iloc[-1].to_dict()
                
                signal = wf.evaluate(asset, last_candle, features)
                if signal:
                    # Aplicar peso do workflow na confiança
                    signal['score'] = signal['confidence'] * wf.weight
                    candidates.append(signal)
            except Exception as e:
                logger.error(f"Erro no workflow {wf.name}: {e}")

        # 3. Seleção (Winner Takes All)
        if not candidates:
            return None

        # Ordenar por Score
        best_signal = sorted(candidates, key=lambda x: x['score'], reverse=True)[0]
        
        # Threshold Global Mínimo
        if best_signal['score'] < 0.55: # Confiança mínima base
            return None

        return best_signal
