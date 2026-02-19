from collections import deque
import pandas as pd
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class MarketDataBuffer:
    """
    Mantém um buffer circular de candles para múltiplos ativos.
    Garante integridade e fornece dados para cálculo de features.
    """
    def __init__(self, assets: List[str], max_len: int = 500):
        self.assets = assets
        self.max_len = max_len
        # Estrutura: { '1HZ10V': deque([...], maxlen=500), ... }
        self.buffers: Dict[str, deque] = {asset: deque(maxlen=max_len) for asset in assets}
        self.last_update: Dict[str, float] = {asset: 0 for asset in assets}

    def add_candle(self, asset: str, candle: Dict):
        """
        Adiciona um novo candle ao buffer do ativo.
        Formato esperado candle: {'time': int, 'open': float, 'high': float, 'low': float, 'close': float}
        """
        if asset not in self.buffers:
            logger.warning(f"Ativo não monitorado recebido: {asset}")
            return

        # Validação básica de integridade
        if not self._validate_candle(candle):
            logger.error(f"Candle inválido descartado para {asset}: {candle}")
            return

        # Detecção de Gaps (simples)
        last_time = self.last_update.get(asset, 0)
        current_time = candle.get('epoch', candle.get('time'))
        
        if last_time > 0 and (current_time - last_time) > 60: # 1 min gap tolerance
             logger.warning(f"⚠️ GAP detectado em {asset}: {current_time - last_time}s sem dados")

        self.buffers[asset].append(candle)
        self.last_update[asset] = current_time
        
        # Log heartbeat (debug)
        if len(self.buffers[asset]) % 50 == 0:
            logger.debug(f"{asset}: Buffer com {len(self.buffers[asset])} candles.")

    def get_dataframe(self, asset: str) -> pd.DataFrame:
        """Retorna o buffer como DataFrame Pandas para cálculos vetorizados."""
        if asset not in self.buffers or len(self.buffers[asset]) == 0:
            return pd.DataFrame()
        
        df = pd.DataFrame(list(self.buffers[asset]))
        # Padronizar nomes de colunas se necessário
        return df

    def is_ready(self, asset: str, min_needed: int = 50) -> bool:
        """Verifica se há dados suficientes para cálculo de features."""
        return len(self.buffers.get(asset, [])) >= min_needed

    def _validate_candle(self, candle: Dict) -> bool:
        required = ['open', 'close', 'high', 'low'] # 'time'/'epoch' handled flex
        return all(key in candle for key in required)
