"""
engine/ws_pool.py — Pool de conexões WebSocket com a Deriv API.

Mantém exatamente 2 conexões simultâneas:
  - Conexão A: tick stream permanente (subscribe de todos os ativos)
  - Conexão B: request queue serializada (proposals, pings RTT)

Nenhum outro módulo deve abrir conexão direta com a Deriv.
"""
import asyncio
import json
import logging
import time
from typing import Callable, Optional

import websockets
import websockets.exceptions

from config import (
    ATIVOS,
    DERIV_WSS_PRIMARY,
    DERIV_WSS_FALLBACK,
    RTT_INTERVAL_S,
)

# ── Logging ────────────────────────────────────────────────────────────────────
logger = logging.getLogger("WS_POOL")

_BACKOFF_SEQUENCE = [1, 2, 4, 8, 16, 30]   # segundos; cap em 30s
_REQUEST_TIMEOUT  = 5.0                      # segundos por request na fila B
_PING_INTERVAL    = RTT_INTERVAL_S           # segundos entre heartbeats
_REQUEST_MAXSIZE  = 20                       # tamanho máximo da fila B


def _backoff(attempt: int) -> float:
    """Retorna o tempo de espera em segundos para a tentativa N (0-indexed)."""
    idx = min(attempt, len(_BACKOFF_SEQUENCE) - 1)
    return float(_BACKOFF_SEQUENCE[idx])


class DerivWSPool:
    """
    Pool de 2 conexões WebSocket com a Deriv API.

    Uso:
        pool = DerivWSPool(on_tick=meu_callback)
        await pool.start()          # inicia ambas as conexões em background
        resp = await pool.request({"ticks_history": "R_50", ...})
        await pool.stop()
    """

    def __init__(self, on_tick: Callable[[str, int, float, int], None]):
        """
        on_tick(ativo, digito, quote, epoch) — chamado para cada tick recebido.
        """
        self._on_tick = on_tick

        # Estado interno
        self._conn_a: Optional[websockets.WebSocketClientProtocol] = None
        self._conn_b: Optional[websockets.WebSocketClientProtocol] = None
        self._conn_a_ok = False
        self._conn_b_ok = False

        # RTT
        self._rtt_ms: float = 0.0
        self._ping_sent_at: float = 0.0

        # Fila de requests para Conexão B
        self._req_queue: asyncio.Queue = asyncio.Queue(maxsize=_REQUEST_MAXSIZE)

        # Tasks de background
        self._task_a: Optional[asyncio.Task] = None
        self._task_b: Optional[asyncio.Task] = None
        self._task_ping: Optional[asyncio.Task] = None

        # Sinaliza parada
        self._stopping = False

    # ── Propriedades públicas ──────────────────────────────────────────────────

    @property
    def rtt_ms(self) -> float:
        """RTT em milissegundos medido pelo último heartbeat da Conexão A."""
        return self._rtt_ms

    @property
    def connected(self) -> bool:
        """True apenas quando ambas as conexões estão ativas."""
        return self._conn_a_ok and self._conn_b_ok

    # ── Ciclo de vida ──────────────────────────────────────────────────────────

    async def start(self) -> None:
        """Inicia as duas conexões em background."""
        logger.info("Iniciando DerivWSPool...")
        self._stopping = False
        self._task_a    = asyncio.create_task(self._run_conn_a(), name="ws_pool_conn_a")
        self._task_b    = asyncio.create_task(self._run_conn_b(), name="ws_pool_conn_b")
        self._task_ping = asyncio.create_task(self._heartbeat_loop(), name="ws_pool_ping")
        logger.info("DerivWSPool iniciado.")

    async def stop(self) -> None:
        """Para todas as conexões e tasks de background."""
        logger.info("Parando DerivWSPool...")
        self._stopping = True
        for task in (self._task_a, self._task_b, self._task_ping):
            if task and not task.done():
                task.cancel()
        await asyncio.gather(
            self._task_a, self._task_b, self._task_ping,
            return_exceptions=True
        )
        self._conn_a_ok = False
        self._conn_b_ok = False
        logger.info("DerivWSPool parado.")

    # ── Conexão A — Tick Stream ────────────────────────────────────────────────

    async def _run_conn_a(self) -> None:
        """Loop de reconexão da Conexão A (tick stream permanente)."""
        attempt = 0
        while not self._stopping:
            url = DERIV_WSS_PRIMARY if attempt % 2 == 0 else DERIV_WSS_FALLBACK
            try:
                logger.info(f"[A] Conectando em {url} (tentativa {attempt + 1})...")
                async with websockets.connect(url, ping_interval=None) as ws:
                    self._conn_a = ws
                    attempt = 0  # reset backoff após conexão bem-sucedida
                    await self._subscribe_all_ticks(ws)
                    self._conn_a_ok = True
                    logger.info("[A] Tick stream ativo — aguardando mensagens.")
                    await self._recv_loop_a(ws)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._conn_a_ok = False
                self._conn_a = None
                wait = _backoff(attempt)
                logger.warning(f"[A] Conexão perdida ({type(e).__name__}: {e}). Reconectando em {wait}s...")
                await asyncio.sleep(wait)
                attempt += 1

    async def _subscribe_all_ticks(self, ws: websockets.WebSocketClientProtocol) -> None:
        """Envia subscribe de ticks para todos os ativos na Conexão A."""
        for ativo in ATIVOS:
            payload = {
                "ticks": ativo,
                "subscribe": 1,
            }
            await ws.send(json.dumps(payload))
            logger.debug(f"[A] Subscrito em ticks: {ativo}")
            # Pequena pausa para não sobrecarregar a Deriv no burst inicial
            await asyncio.sleep(0.1)

    async def _recv_loop_a(self, ws: websockets.WebSocketClientProtocol) -> None:
        """Recebe mensagens da Conexão A e despacha ticks ou pongs."""
        async for raw in ws:
            if self._stopping:
                break
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning(f"[A] Mensagem inválida (não-JSON): {raw[:80]}")
                continue

            msg_type = msg.get("msg_type", "")

            # ── Pong do heartbeat ──────────────────────────────────────────────
            if msg_type == "ping":
                if self._ping_sent_at > 0:
                    self._rtt_ms = (time.monotonic() - self._ping_sent_at) * 1000
                    logger.debug(f"[A] Pong recebido — RTT={self._rtt_ms:.1f}ms")
                continue

            # ── Tick ───────────────────────────────────────────────────────────
            if msg_type == "tick":
                tick = msg.get("tick", {})
                symbol = tick.get("symbol", "")
                quote  = tick.get("quote", 0.0)
                epoch  = tick.get("epoch", 0)
                # Último dígito do preço (ex: 1234.56 → dígito = 6)
                digito = int(round(quote * 100)) % 10
                try:
                    await self._on_tick(symbol, digito, float(quote), int(epoch))
                except Exception as cb_err:
                    logger.error(f"[A] Erro no callback on_tick: {cb_err}")
                continue

            # ── Erro da API ────────────────────────────────────────────────────
            if "error" in msg:
                logger.error(f"[A] Erro Deriv: {msg['error']}")
                continue

    # ── Heartbeat (Conexão A) ──────────────────────────────────────────────────

    async def _heartbeat_loop(self) -> None:
        """Envia ping pela Conexão A a cada RTT_INTERVAL_S segundos."""
        while not self._stopping:
            await asyncio.sleep(_PING_INTERVAL)
            if self._conn_a and self._conn_a_ok:
                try:
                    self._ping_sent_at = time.monotonic()
                    await self._conn_a.send(json.dumps({"ping": 1}))
                    logger.debug("[A] Ping enviado.")
                except Exception as e:
                    logger.warning(f"[A] Falha ao enviar ping: {e}")

    # ── Conexão B — Request Queue ──────────────────────────────────────────────

    async def _run_conn_b(self) -> None:
        """Loop de reconexão da Conexão B (request queue serializada)."""
        attempt = 0
        while not self._stopping:
            url = DERIV_WSS_PRIMARY if attempt % 2 == 0 else DERIV_WSS_FALLBACK
            try:
                logger.info(f"[B] Conectando em {url} (tentativa {attempt + 1})...")
                async with websockets.connect(url, ping_interval=None) as ws:
                    self._conn_b = ws
                    attempt = 0
                    self._conn_b_ok = True
                    logger.info("[B] Request queue ativa.")
                    await self._request_loop(ws)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._conn_b_ok = False
                self._conn_b = None
                wait = _backoff(attempt)
                logger.warning(f"[B] Conexão perdida ({type(e).__name__}: {e}). Reconectando em {wait}s...")
                await asyncio.sleep(wait)
                attempt += 1

    async def _request_loop(self, ws: websockets.WebSocketClientProtocol) -> None:
        """
        Consome a fila de requests e envia um por vez pela Conexão B.
        Cada item da fila é uma tupla (payload: dict, future: asyncio.Future).
        """
        while not self._stopping:
            try:
                payload, future = await asyncio.wait_for(
                    self._req_queue.get(), timeout=1.0
                )
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

            if future.cancelled():
                self._req_queue.task_done()
                continue

            try:
                await ws.send(json.dumps(payload))
                raw = await asyncio.wait_for(ws.recv(), timeout=_REQUEST_TIMEOUT)
                result = json.loads(raw)
                if not future.done():
                    future.set_result(result)
            except asyncio.TimeoutError:
                logger.warning(f"[B] Timeout no request: {list(payload.keys())}")
                if not future.done():
                    future.set_result(None)
            except Exception as e:
                logger.error(f"[B] Erro no request: {e}")
                if not future.done():
                    future.set_exception(e)
                # Propaga para reconectar
                raise
            finally:
                self._req_queue.task_done()

    # ── API pública — request ──────────────────────────────────────────────────

    async def request(self, payload: dict) -> Optional[dict]:
        """
        Envia um request pela Conexão B e aguarda a resposta.

        Retorna o dict de resposta da Deriv, ou None em caso de timeout.
        Lança exceção se a conexão B estiver indisponível após 5s de espera.
        """
        loop = asyncio.get_event_loop()
        future: asyncio.Future = loop.create_future()

        try:
            self._req_queue.put_nowait((payload, future))
        except asyncio.QueueFull:
            logger.error("[B] Fila de requests cheia — request descartado.")
            return None

        try:
            result = await asyncio.wait_for(
                asyncio.shield(future), timeout=_REQUEST_TIMEOUT + 1.0
            )
            return result
        except asyncio.TimeoutError:
            future.cancel()
            logger.warning(f"[B] Request expirou (>{_REQUEST_TIMEOUT}s): {list(payload.keys())}")
            return None
        except Exception as e:
            logger.error(f"[B] Erro aguardando resposta: {e}")
            return None
