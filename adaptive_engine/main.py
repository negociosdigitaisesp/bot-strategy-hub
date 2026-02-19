# adaptive_engine/main.py
import asyncio
import logging
import sys
from adaptive_engine.config import ASSETS, LOG_LEVEL
from adaptive_engine.data.market_buffer import MarketDataBuffer
from adaptive_engine.core.market_sensor import MarketSensor
from adaptive_engine.core.signal_generator import SignalGenerator
from adaptive_engine.core.ev_filter import EVFilter
from adaptive_engine.core.broadcaster import SupabaseBroadcaster
from adaptive_engine.core.performance_tracker import PerformanceTracker

# Setup Logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("adaptive_engine.log")
    ]
)
logger = logging.getLogger("AdaptiveEngine")

class AdaptiveEngine:
    def __init__(self):
        self.buffer = MarketDataBuffer(ASSETS, max_len=1000)
        self.sensor = MarketSensor(self.buffer)
        self.generator = SignalGenerator()
        self.ev_filter = EVFilter()
        self.broadcaster = SupabaseBroadcaster()
        self.tracker = PerformanceTracker()
        self.running = False

    async def run(self):
        logger.info("-> Iniciando Motor Adaptativo (Bug Deriv 2.0)...")
        self.running = True
        
        # Iniciar Sensor (WebSocket)
        sensor_task = asyncio.create_task(self.sensor.start())

        try:
            logger.info("-> Aguardando aquecimento de dados (60s)...")
            await asyncio.sleep(60)
            logger.info("-> Motor aquecido! Iniciando analise em tempo real.")

            while self.running:
                # Loop Principal de Análise (1Hz)
                await asyncio.sleep(1) 
                
                # 0. Atualizar Tracker de Performance (Verificar sinais expirados)
                current_prices = {}
                for asset in ASSETS:
                    last_candle = self.buffer.get_latest(asset)
                    if last_candle:
                        current_prices[asset] = last_candle['close']
                
                self.tracker.update(current_prices)

                for asset in ASSETS:
                    df = self.buffer.get_dataframe(asset)
                    if len(df) < 50: continue

                    # 1. Gerar Sinal (Workflow Decision)
                    signal = self.generator.process_candle(asset, df)
                    
                    if signal:
                        # 2. Calcular Stake (Kelly Criterion)
                        # f = (p(b+1) - 1) / b
                        # b = payout_rate (ex: 0.85)
                        # p = confidence
                        p = signal['confidence']
                        b = 0.85 # Default payout estimate
                        
                        kelly_pct = (p * (b + 1) - 1) / b
                        kelly_pct = max(0, kelly_pct) * 0.25 # Fraction (Safety)
                        
                        bankroll = 100.0 # Exemplo: Banca de $100 (Pegar da API no futuro)
                        stake = max(0.35, min(bankroll * kelly_pct, 5.0)) # Min $0.35, Max $5.0

                        # 3. Filtrar por EV (Risk Check)
                        approved_signal = self.ev_filter.filter(signal, stake=stake)
                        
                        if approved_signal:
                            self._execute_signal(approved_signal)

        except KeyboardInterrupt:
            logger.info("-> Parando motor...")
        except Exception as e:
            logger.error(f"ERROR critico no loop principal: {e}")
        finally:
            self.sensor.stop()
            await sensor_task
            logger.info("-> Motor encerrado.")

    def _execute_signal(self, signal: dict):
        """
        Mock de execução + Broadcast para Frontend.
        """
        logger.info(f"EXECUCAO: {signal['direction']} {signal['asset']} | Stake: ${signal['stake']:.2f} | Conf: {signal['confidence']:.2f} | EV: {signal['ev_roi']:.2f}")
        
        # Track signal for outcome verification
        last_candle = self.buffer.get_latest(signal['asset'])
        if last_candle:
            current_price = last_candle.get('close')
            self.tracker.add_signal(signal, current_price)

        # Enviar para Supabase (Frontend escuta isso)
        self.broadcaster.broadcast(signal)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    engine = AdaptiveEngine()
    asyncio.run(engine.run())
