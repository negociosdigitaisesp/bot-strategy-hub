# adaptive_engine/core/ev_filter.py
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class EVFilter:
    """
    Filtro de Expected Value (EV).
    Só permite a execução de sinais com EV real positivo.
    EV = (WinProb * Payout) - (LossProb * Stake)
    """
    def __init__(self):
        self.min_ev = 0.05 # EV mínimo (5% de retorno esperado sobre stake)

    def filter(self, signal: Dict, stake: float) -> Optional[Dict]:
        """
        Avalia o sinal e retorna o mesmo sinal enriquecido com dados de EV,
        ou None se o EV for insuficiente.
        """
        win_prob = signal.get('confidence', 0.5)
        loss_prob = 1.0 - win_prob
        
        # TODO: Consultar Payout REAL na API (proposal)
        # Por enquanto, assumimos payout conservador para sintéticos (85%)
        # Em produção, isso deve ser uma chamada async ao Pricer
        payout_rate = 0.85 
        potential_profit = stake * payout_rate
        potential_loss = stake

        ev = (win_prob * potential_profit) - (loss_prob * potential_loss)
        
        # Normalizar EV pelo Stake (ROI esperado)
        ev_roi = ev / stake

        if ev_roi > self.min_ev:
            signal['ev_roi'] = round(ev_roi, 3)
            signal['stake'] = stake
            signal['payout_rate'] = payout_rate
            return signal
        else:
            logger.info(f"Sinal rejeitado por EV baixo: {signal['asset']} ROI={ev_roi:.2f}")
            return None
