"""
engine/tick_router.py — Roteador de ticks por ativo.

Responsabilidade única: manter os últimos N ticks de cada ativo
e fornecer acesso rápido ao último tick/dígito.
"""
import logging
from collections import deque
from typing import Optional

logger = logging.getLogger("TICK_ROUTER")

_TICK_BUFFER = 10  # últimos N ticks mantidos por ativo


class TickRouter:
    """
    Registra ticks recebidos do DerivWSPool e fornece acesso ao estado atual.

    Thread-safety: não necessária — tudo asyncio single-thread.
    """

    def __init__(self) -> None:
        # { ativo: deque([{"digito": int, "quote": float, "epoch": int}, ...]) }
        self._buffer: dict[str, deque] = {}

    # ── Escrita ────────────────────────────────────────────────────────────────

    def register_tick(
        self,
        ativo: str,
        digito: int,
        quote: float,
        epoch: int,
    ) -> None:
        """
        Registra um tick recebido do DerivWSPool.

        Chamado pelo callback on_tick do DerivWSPool.
        """
        if ativo not in self._buffer:
            self._buffer[ativo] = deque(maxlen=_TICK_BUFFER)
            logger.debug(f"Novo ativo registrado: {ativo}")

        self._buffer[ativo].append({
            "digito": digito,
            "quote":  quote,
            "epoch":  epoch,
        })

    # ── Leitura ────────────────────────────────────────────────────────────────

    def get_last_tick(self, ativo: str) -> Optional[dict]:
        """
        Retorna o último tick do ativo como dict com chaves
        ``digito``, ``quote``, ``epoch``, ou None se não houver dados.
        """
        buf = self._buffer.get(ativo)
        if not buf:
            return None
        return buf[-1]

    def get_last_digit(self, ativo: str) -> Optional[int]:
        """Retorna o último dígito do ativo, ou None se não houver dados."""
        tick = self.get_last_tick(ativo)
        if tick is None:
            return None
        return tick["digito"]

    def ativos_ativos(self) -> list[str]:
        """Lista de ativos que já receberam pelo menos 1 tick."""
        return [a for a, buf in self._buffer.items() if buf]

    def __repr__(self) -> str:  # pragma: no cover
        counts = {a: len(b) for a, b in self._buffer.items()}
        return f"TickRouter(buffers={counts})"
