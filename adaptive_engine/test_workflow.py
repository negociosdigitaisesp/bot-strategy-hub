import asyncio
import logging
from adaptive_engine.config import ASSETS
from adaptive_engine.data.market_buffer import MarketDataBuffer
from adaptive_engine.core.market_sensor import MarketSensor
from adaptive_engine.core.signal_generator import SignalGenerator

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TestWorkflow")

async def run_test():
    logger.info("-> Iniciando Teste de Workflow: Volatility Barrier")
    
    buffer = MarketDataBuffer(ASSETS, max_len=200)
    sensor = MarketSensor(buffer)
    generator = SignalGenerator()

    # Start Sensor
    sensor_task = asyncio.create_task(sensor.start())

    try:
        logger.info("-> Coletando dados (60s)...")
        # Loop de processamento
        for i in range(60):
            await asyncio.sleep(1)
            
            # Tentar gerar sinais para cada ativo
            for asset in ASSETS:
                df = buffer.get_dataframe(asset)
                if len(df) < 50: continue
                
                signal = generator.process_candle(asset, df)
                
                if signal:
                    print(f"\n[SINAL DETECTADO] {asset}: {signal['direction']} (Conf: {signal['confidence']})")
                    print(f"Metadata: {signal['metadata']}")
                else:
                    # Debug esporádico
                    if i % 10 == 0 and asset == '1HZ100V':
                        feat = generator.features_cache.get(asset, {})
                        print(f"[{asset}] Debug: Persistence={feat.get('vol_persistence', 0):.3f} | ATR={feat.get('atr_regime', 0):.2f}")

    except KeyboardInterrupt:
        pass
    finally:
        sensor.stop()
        await sensor_task

if __name__ == "__main__":
    asyncio.run(run_test())
