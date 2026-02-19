from abc import ABC, abstractmethod
from typing import Dict, Optional

class BaseWorkflow(ABC):
    """
    Classe base para todos os workflows de estratégia.
    """
    def __init__(self, name: str):
        self.name = name
        self.active = True
        self.weight = 1.0 # Peso dinâmico ajustado pelo Optimizer

    @abstractmethod
    def evaluate(self, candle: Dict, features: Dict) -> Optional[Dict]:
        """
        Avalia o mercado e retorna um sinal se houver oportunidade.
        Retorno: {
            'workflow': str,
            'asset': str,
            'direction': 'CALL' | 'PUT',
            'confidence': float (0.0 - 1.0),
            'metadata': Dict
        } ou None.
        """
        pass
