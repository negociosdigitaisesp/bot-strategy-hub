"""
deriv_engine/market_analyzer.py — Analisador de mercado em tempo real.

Usa o módulo autocontido signal_core.py (SignalEngine, Qualificador,
HealthGuard, PayoutMonitor) — tudo inline, sem dependências externas.

1 conexão WebSocket por símbolo — compartilhada por TODOS os clientes.
Nunca abre conexão por cliente. Máximo de 5 WS simultâneos (um por ativo).
"""
import asyncio
import json
import logging
import time
from typing import TYPE_CHECKING

import websockets

from config import (
    ATIVOS,
    DERIV_WSS_PRIMARY,
    DERIV_WSS_FALLBACK,
    LGN_MIN_TRADES,
    RECONNECT_BACKOFF_S,
)

from signal_core import (
    SignalEngine,
    Qualificador,
    HealthGuard,
    PayoutMonitor,
)

if TYPE_CHECKING:
    from engine import DerivEngine

logger = logging.getLogger("MARKET_ANALYZER")


class MarketAnalyzer:
    """
    Conecta em 1 WebSocket por ativo e analisa o mercado em tempo real.
    """

    def __init__(self) -> None:
        self._payout_monitor = PayoutMonitor()
        self._qualificador   = Qualificador()
        self._health_guard   = HealthGuard()
        self._signal_engine  = SignalEngine(
            payout_monitor=self._payout_monitor,
            qualificador=self._qualificador,
            health_guard=self._health_guard,
            lgn_min=LGN_MIN_TRADES,
            total_trades_inicial=0,
        )

        self._rtt_ms: float = 0.0
        logger.info("MarketAnalyzer inicializado com SignalEngine real.")


    async def run(self, engine: "DerivEngine") -> None:
        """
        Inicia tasks de tick listener para cada ativo — executa para sempre.
        Cada ativo tem sua própria conexão WS independente.
        """
        logger.info(f"Iniciando listeners para {len(ATIVOS)} ativos: {ATIVOS}")
        tasks = [
            asyncio.create_task(
                self._listen_ativo(ativo, engine),
                name=f"tick_listener_{ativo}"
            )
            for ativo in ATIVOS
        ]
        await asyncio.gather(*tasks)

    async def _listen_ativo(self, ativo: str, engine: "DerivEngine") -> None:
        """Loop de reconexão para um ativo específico."""
        attempt = 0
        while True:
            url = DERIV_WSS_PRIMARY if attempt % 2 == 0 else DERIV_WSS_FALLBACK
            try:
                logger.info(f"[{ativo}] Conectando em {url}...")
                async with websockets.connect(url, ping_interval=None, open_timeout=15) as ws:
                    attempt = 0  # reset após conexão OK
                    await ws.send(json.dumps({"ticks": ativo, "subscribe": 1}))
                    logger.info(f"[{ativo}] ✅ Feed de ticks ativo.")

                    async for raw in ws:
                        msg = json.loads(raw)
                        if msg.get("msg_type") != "tick":
                            continue

                        tick = msg["tick"]
                        symbol = tick.get("symbol", ativo)
                        quote  = float(tick.get("quote", 0.0))
                        epoch  = int(tick.get("epoch", 0))
                        digito = int(round(quote * 100)) % 10

                        # Alimenta o SignalEngine (síncrono, sem I/O)
                        sinal = self._signal_engine.processar_tick(
                            ativo=symbol,
                            digito=digito,
                            quote=quote,
                            epoch=epoch,
                            rtt_ms=self._rtt_ms,
                        )

                        if sinal and sinal.get("entrar"):
                            await engine.on_signal(sinal)

            except asyncio.CancelledError:
                logger.info(f"[{ativo}] Listener cancelado.")
                break
            except Exception as e:
                wait = min(RECONNECT_BACKOFF_S * (2 ** min(attempt, 4)), 60)
                logger.warning(
                    f"[{ativo}] Conexão perdida ({type(e).__name__}: {e}). "
                    f"Reconectando em {wait}s..."
                )
                await asyncio.sleep(wait)
                attempt += 1
