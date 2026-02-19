"""
engine/broadcaster.py — Servidor WebSocket para clientes + loop de coleta de payout.

Duas responsabilidades neste arquivo:
  1. Broadcaster — gerencia clientes WebSocket conectados e distribui sinais
  2. payout_collector_loop — consulta proposals da Deriv via ws_pool.request()
     e alimenta o PayoutMonitor com os payouts observados
"""
import asyncio
import json
import logging
from typing import TYPE_CHECKING

import websockets
import websockets.exceptions

from config import (
    ATIVOS,
    DIGITO_DIFFERS,
    SERVER_HOST,
    SERVER_PORT,
)

if TYPE_CHECKING:
    from engine.ws_pool import DerivWSPool
    from engine.payout_monitor import PayoutMonitor

logger = logging.getLogger("BROADCASTER")

# Intervalo entre ciclos de coleta de payout (segundos)
_PAYOUT_CYCLE_S   = 8.0
# Pausa entre requests de ativos dentro de um ciclo (anti-flood)
_PAYOUT_INTER_S   = 0.5


# ══════════════════════════════════════════════════════════════════════════════
# Broadcaster
# ══════════════════════════════════════════════════════════════════════════════

class Broadcaster:
    """
    Gerencia clientes WebSocket conectados e distribui sinais de trading.

    Cada cliente conectado recebe todos os sinais com ``entrar: True``.
    O main.py filtra antes de chamar broadcast() — o Broadcaster nunca
    recebe sinais negativos.
    """

    def __init__(self) -> None:
        self.clientes: set = set()

    # ── Gerenciamento de clientes ─────────────────────────────────────────────

    async def handler(self, websocket) -> None:
        """
        Handler de nova conexão WebSocket de cliente.

        Registra o cliente, aguarda até ele desconectar e remove.
        Compatível com websockets >= 10 (recebe apenas websocket).
        """
        addr = websocket.remote_address
        self.clientes.add(websocket)
        logger.info(f"Cliente conectado: {addr} — total={len(self.clientes)}")
        try:
            await websocket.wait_closed()
        finally:
            self.clientes.discard(websocket)
            logger.info(f"Cliente desconectado: {addr} — total={len(self.clientes)}")

    # ── Broadcast ─────────────────────────────────────────────────────────────

    async def broadcast(self, sinal: dict) -> None:
        """
        Envia o sinal (serializado como JSON) para todos os clientes ativos.

        Clientes mortos são removidos silenciosamente.
        Nunca lança exceção — falhas individuais são absorvidas.
        """
        if not self.clientes:
            return

        payload = json.dumps(sinal, ensure_ascii=False)
        mortos: set = set()

        for ws in list(self.clientes):
            try:
                await ws.send(payload)
            except (
                websockets.exceptions.ConnectionClosed,
                websockets.exceptions.ConnectionClosedError,
                websockets.exceptions.ConnectionClosedOK,
            ):
                mortos.add(ws)
            except Exception as e:
                logger.warning(f"Erro ao enviar para cliente {ws.remote_address}: {e}")
                mortos.add(ws)

        if mortos:
            self.clientes -= mortos
            logger.debug(f"{len(mortos)} cliente(s) removido(s) — total={len(self.clientes)}")

    # ── Servidor ──────────────────────────────────────────────────────────────

    async def iniciar_servidor(self):
        """
        Inicia o servidor WebSocket na porta SERVER_PORT.

        Retorna o server object (não bloqueia).
        O main.py deve fazer ``await server.wait_closed()`` ou manter
        o server vivo com ``async with server:``.
        """
        server = await websockets.serve(
            self.handler,
            SERVER_HOST,
            SERVER_PORT,
        )
        logger.info(f"Servidor WebSocket ouvindo em {SERVER_HOST}:{SERVER_PORT}")
        return server

    # ── Utilitários ───────────────────────────────────────────────────────────

    def clientes_count(self) -> int:
        """Retorna o número de clientes conectados."""
        return len(self.clientes)


# ══════════════════════════════════════════════════════════════════════════════
# Payout Collector Loop
# ══════════════════════════════════════════════════════════════════════════════

async def payout_collector_loop(
    ws_pool: "DerivWSPool",
    payout_monitor: "PayoutMonitor",
) -> None:
    """
    Loop infinito que coleta proposals da Deriv e alimenta o PayoutMonitor.

    Ciclo a cada _PAYOUT_CYCLE_S segundos:
      Para cada ativo em ATIVOS:
        1. Envia proposal via ws_pool.request()
        2. Extrai payout da resposta
        3. Registra no payout_monitor

    Fórmula do payout decimal:
      payout_decimal = resp["proposal"]["payout"] - 1
      (a Deriv retorna o valor total incluindo o stake de 1 USD,
       então subtraímos 1 para obter apenas o lucro proporcional)

    Erros individuais por ativo são logados e ignorados.
    Erros globais do ciclo são logados e o loop continua.
    """
    logger.info("payout_collector_loop iniciado.")

    while True:
        try:
            for ativo in ATIVOS:
                payload = {
                    "proposal":       1,
                    "amount":         1,
                    "basis":          "stake",
                    "contract_type":  "DIGITDIFF",
                    "currency":       "USD",
                    "duration":       1,
                    "duration_unit":  "t",
                    "symbol":         ativo,
                    "barrier":        str(DIGITO_DIFFERS),
                }

                try:
                    resp = await ws_pool.request(payload)

                    if resp is None:
                        logger.debug(f"[payout] Timeout/sem resposta para {ativo}.")
                    elif "error" in resp:
                        logger.warning(
                            f"[payout] Erro Deriv para {ativo}: {resp['error']}"
                        )
                    elif "proposal" in resp:
                        payout_bruto = resp["proposal"].get("payout", 0.0)
                        payout_decimal = float(payout_bruto) - 1.0
                        if payout_decimal > 0:
                            payout_monitor.registrar_payout(ativo, payout_decimal)
                            logger.debug(
                                f"[payout] {ativo} payout={payout_decimal:.4f} "
                                f"(n={payout_monitor.amostras(ativo)})"
                            )
                        else:
                            logger.warning(
                                f"[payout] {ativo} payout inválido: {payout_bruto}"
                            )
                    else:
                        logger.debug(f"[payout] Resposta inesperada para {ativo}: {resp}")

                except Exception as e_ativo:
                    logger.error(f"[payout] Erro ao processar {ativo}: {e_ativo}")

                # Pausa anti-flood entre ativos
                await asyncio.sleep(_PAYOUT_INTER_S)

        except asyncio.CancelledError:
            logger.info("payout_collector_loop cancelado.")
            break
        except Exception as e_ciclo:
            logger.error(f"[payout] Erro no ciclo: {e_ciclo}")

        # Aguarda próximo ciclo
        await asyncio.sleep(_PAYOUT_CYCLE_S)
