import asyncio
import json
import logging
import websockets
import time
from adaptive_engine.config import DERIV_WS_URL, DERIV_APP_ID, ASSETS
from adaptive_engine.data.market_buffer import MarketDataBuffer

logger = logging.getLogger(__name__)

class MarketSensor:
    """
    Conecta ao WebSocket da Deriv, assina ticks e alimenta o buffer.
    Gerencia reconexão e integridade do fluxo de dados.
    """
    def __init__(self, buffer: MarketDataBuffer):
        self.buffer = buffer
        self.ws = None
        self.running = False
        self.ticks_history = {asset: [] for asset in ASSETS} # Temp buffer for candle construction

    async def start(self):
        """Inicia o loop de conexão e processamento."""
        self.running = True
        while self.running:
            try:
                uri = f"{DERIV_WS_URL}?app_id={DERIV_APP_ID}"
                logger.info(f"Connecting to {uri}...")
                
                async with websockets.connect(uri) as ws:
                    self.ws = ws
                    logger.info("Connected via WebSocket!")
                    
                    # 1. Authorize (Optional for public data, but good practice)
                    # await self._authorize()

                    # 2. Subscribe to Ticks
                    await self._subscribe_ticks()

                    # 3. Process Messages
                    async for message in ws:
                        if not self.running: break
                        await self._handle_message(message)
            
            except Exception as e:
                logger.error(f"WebSocket error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    async def _subscribe_ticks(self):
        """Envia request de assinatura para todos os ativos."""
        for asset in ASSETS:
            req = {
                "ticks_history": asset,
                "end": "latest",
                "start": 1,
                "style": "ticks",
                "subscribe": 1,
                "count": 50 # Pega histórico recente pra encher buffer rápido
            }
            await self.ws.send(json.dumps(req))
            logger.info(f"Subscribed to {asset}")

    async def _handle_message(self, message):
        data = json.loads(message)
        
        # Handle Error
        if 'error' in data:
            logger.error(f"Deriv Error: {data['error']['message']}")
            return

        msg_type = data.get('msg_type')

        # Handle History (Snapshot)
        if msg_type == 'history':
            asset = data['echo_req']['ticks_history']
            self._process_history(asset, data['history'])

        # Handle Live Tick
        elif msg_type == 'tick':
            tick = data['tick']
            asset = tick['symbol']
            self._process_tick(asset, tick)

    def _process_history(self, asset, history):
        """Processa snapshot inicial de ticks."""
        times = history['times']
        prices = history['prices']
        for t, p in zip(times, prices):
             self._update_candle(asset, t, p)

    def _process_tick(self, asset, tick):
        """Processa tick em tempo real."""
        self._update_candle(asset, tick['epoch'], tick['quote'])

    def _update_candle(self, asset, epoch, price):
        """
        Simplificação: Em sintéticos 1Hz (V100, etc), cada tick É um candle de 1s.
        Se fosse M1, teríamos que agregar. O config define ativos 1Hz?
        Sim: 1HZ100V.
        """
        # Para ativos 1HZ, cada tick é um close.
        candle = {
            'time': int(epoch),
            'open': price,
            'high': price,
            'low': price,
            'close': price,
            'epoch': int(epoch)
        }
        self.buffer.add_candle(asset, candle)

    def stop(self):
        self.running = False
        if self.ws:
            asyncio.create_task(self.ws.close())
