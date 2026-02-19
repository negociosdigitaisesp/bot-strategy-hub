# adaptive_engine/core/performance_tracker.py
import time
import logging
from typing import Dict, List, Optional
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Configuração Supabase (Mesma dos outros módulos)
SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4'

class PerformanceTracker:
    """
    Rastreia o resultado dos sinais emitidos (Win/Loss) e atualiza o Supabase.
    Isso garante que o Frontend mostre estatísticas reais da estratégia.
    """
    def __init__(self):
        try:
            self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            self.active_signals: List[Dict] = []
            self.enabled = True
            
            # Cache de estatísticas para evitar muitas leituras
            # Key: strategy_name -> {wins: int, losses: int}
            self.stats_cache = {} 
            
            logger.info("-> Performance Tracker inicializado.")
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar Performance Tracker: {e}")
            self.enabled = False

    def add_signal(self, signal: Dict, current_price: float):
        """
        Registra um sinal para monitoramento.
        """
        if not self.enabled: return

        tracker_entry = {
            "id": f"{signal['asset']}_{time.time()}", # ID temporário único
            "asset": signal['asset'],
            "direction": signal['direction'],
            "strategy": signal.get('strategy', 'Volatility Barrier'),
            "entry_price": current_price,
            "start_time": time.time(),
            "expiry_time": time.time() + 60, # Fixo por enquanto conforme broadcaster
            "processed": False
        }
        
        self.active_signals.append(tracker_entry)
        # logger.debug(f"Monitorando sinal: {signal['asset']} @ {current_price:.5f}")

    def update(self, current_prices: Dict[str, float]):
        """
        Verifica sinais expirados e calcula resultado.
        """
        if not self.enabled: return
        
        now = time.time()
        completed_signals = []

        # Filtrar sinais ativos
        remaining_signals = []
        
        for signal in self.active_signals:
            if now >= signal['expiry_time']:
                # Sinal expirou, verificar resultado
                exit_price = current_prices.get(signal['asset'])
                
                if exit_price:
                    is_win = False
                    if signal['direction'] == 'CALL':
                        is_win = exit_price > signal['entry_price']
                    else: # PUT
                        is_win = exit_price < signal['entry_price']
                    
                    self._record_result(signal['strategy'], is_win)
                    completed_signals.append(f"{signal['asset']} ({'WIN' if is_win else 'LOSS'})")
                else:
                    # Preço não disponível no momento da expiração (raro)
                    logger.warning(f"Preço indisponível para expiração de {signal['asset']}")
                    # Descarta sinal sem contabilizar (segurança)
            else:
                remaining_signals.append(signal)

        self.active_signals = remaining_signals

        if completed_signals:
            logger.info(f"✅ Resultados processados: {', '.join(completed_signals)}")

    def _record_result(self, strategy_name: str, is_win: bool):
        """
        Atualiza estatísticas no Supabase (tabela strategy_scores).
        """
        try:
            # 1. Buscar dados atuais (se não tiver cache)
            # Para garantir consistência, idealmente faríamos uma RPC procedure "increment_score"
            # mas vamos fazer Read-Modify-Write por simplicidade agora.
            
            response = self.client.table('strategy_scores')\
                .select('*')\
                .eq('strategy_name', strategy_name)\
                .execute()
            
            if response.data and len(response.data) > 0:
                record = response.data[0]
                wins = record.get('wins', 0)
                losses = record.get('losses', 0)
                
                if is_win:
                    wins += 1
                else:
                    losses += 1
                
                # Calcular Win Rate
                total = wins + losses
                win_rate = (wins / total) * 100 if total > 0 else 0
                
                # Calcular Score (exemplo simples)
                # Score = WinRate * (TotalTrades / 10) ajustado
                # Vamos manter o score existente + bonus
                score = win_rate # Simplificação para MVP
                
                # Atualizar
                self.client.table('strategy_scores')\
                    .update({
                        'wins': wins,
                        'losses': losses,
                        'total_trades': total,
                        'expected_wr': round(win_rate, 2), # Frontend usa isso
                        'score': round(score, 1),
                        'updated_at': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
                    })\
                    .eq('id', record['id'])\
                    .execute()
                
                # logger.info(f"Stats atualizados para {strategy_name}: {wins}W/{losses}L")
            else:
                logger.warning(f"Estratégia {strategy_name} não encontrada no banco para update.")

        except Exception as e:
            logger.error(f"Erro ao atualizar score no Supabase: {e}")
