import asyncio
import logging
import sys
from adaptive_engine.config import ASSETS
from adaptive_engine.data.market_buffer import MarketDataBuffer
from adaptive_engine.core.market_sensor import MarketSensor
from adaptive_engine.core.feature_engine import FeatureEngine

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ValidationScript")

async def validate_edge():
    logger.info("🚀 Iniciando Validação de Edge (Volatility Clustering)...")
    logger.info(f"Ativos: {ASSETS}")

    buffer = MarketDataBuffer(ASSETS, max_len=2000)
    sensor = MarketSensor(buffer)
    engine = FeatureEngine()

    # Iniciar Sensor em background
    sensor_task = asyncio.create_task(sensor.start())

    try:
        # Aguardar coleta de dados suficiente (120 candles ~ 2 min para 1Hz)
        logger.info("-> Aguardando coleta de dados (120 segundos)...")
        for i in range(120):
            await asyncio.sleep(1)
            if i % 30 == 0:
                counts = [len(buffer.buffers[a]) for a in ASSETS]
                logger.info(f"Buffers: {dict(zip(ASSETS, counts))}")

        logger.info("-> Calculando Estatísticas...")
        
        results = {}
        for asset in ASSETS:
            df = buffer.get_dataframe(asset)
            if len(df) < 50:
                logger.warning(f"Dados insuficientes para {asset}")
                continue
            
            # Calcular Features
            feats = engine.calculate_features(df)
            
            # Calcular Persistence (Nova Metrica)
            persistence = engine._calc_regime_persistence(df)
            feats['vol_persistence'] = persistence
            
            results[asset] = feats
            
            logger.info(f"--- {asset} ---")
            logger.info(f"ATR Temp: {feats.get('atr_regime')}")
            logger.info(f"Vol Clustering (Old): {feats.get('vol_clustering')}")
            logger.info(f"Vol Persistence (NEW): {persistence:.3f}")

        # Análise Final
        avg_clustering = sum(r.get('vol_persistence', 0) for r in results.values()) / len(results) if results else 0
        
        print("\n" + "="*40)
        print(f"RESULTADO FINAL (PERSISTENCIA): {avg_clustering:.3f}")
        print("="*40)
        
        if avg_clustering > 0.1:
            print("-> EDGE CONFIRMADO: Volatilidade apresenta persistencia (Regime).")
            print("Motor Adaptativo PODE prosseguir.")
        else:
            print("-> EDGE NAO DETECTADO: Mercado parece Random Walk puro.")
            print("Revisar Feature Engine ou aumentar amostra.")

    except KeyboardInterrupt:
        logger.info("Interrompido pelo usuário.")
    except Exception as e:
        logger.error(f"Erro na validação: {e}")
    finally:
        sensor.stop()
        await sensor_task

if __name__ == "__main__":
    try:
        # Fix para Windows Event Loop
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(validate_edge())
    except KeyboardInterrupt:
        pass
