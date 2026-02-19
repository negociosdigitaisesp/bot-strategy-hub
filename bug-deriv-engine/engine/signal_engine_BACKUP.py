"""
engine/signal_engine.py — Cérebro do sistema de sinais (BACKUP ORIGINAL).

Responsabilidade única: receber um tick e decidir se emite sinal.
Puro Python síncrono — sem asyncio, sem I/O, sem WebSocket.

Fluxo de verificação (6 gates em sequência):
  1. Circuit breaker aberto?          → None
  2. RTT aceitável?                   → None
  3. Aquecimento LGN completo?        → None
  4. Existe ativo qualificado (payout)? → None  (REMOVIDO NA VERSAO ATUAL)
  5. Amostras de dígitos suficientes? → None
  6. Distribuição estatística OK?     → None
  Passou tudo → emite sinal dict
"""
import logging
import time
from typing import Optional

from config import DIGITO_DIFFERS, LGN_MIN_TRADES
from engine.payout_monitor import PayoutMonitor
from engine.qualificador import Qualificador
from engine.health_guard import HealthGuard

logger = logging.getLogger("SIGNAL_ENGINE")


class SignalEngine:
    """
    Processa cada tick e decide se emite sinal de trading (VERSAO ORIGINAL COM PAYOUT GATE).
    """

    def __init__(
        self,
        payout_monitor: PayoutMonitor,
        qualificador: Qualificador,
        health_guard: HealthGuard,
        lgn_min: int = LGN_MIN_TRADES,
        total_trades_inicial: int = 0,
    ) -> None:
        self._payout  = payout_monitor
        self._qual    = qualificador
        self._health  = health_guard
        self._lgn_min = lgn_min

        # Contador de sinais emitidos — pode ser restaurado do state cache
        self.total_trades: int = total_trades_inicial

        logger.info(
            f"SignalEngine BACKUP iniciado — "
            f"lgn_min={lgn_min}, total_trades={total_trades_inicial}"
        )

    # ── API principal ─────────────────────────────────────────────────────────

    def processar_tick(
        self,
        ativo: str,
        digito: int,
        quote: float,
        epoch: int,
        rtt_ms: float,
    ) -> Optional[dict]:
        """
        Processa um tick e retorna sinal ou None.
        """

        # ── Gate 1: Circuit breaker ────────────────────────────────────────────
        if self._health.circuit_breaker_aberto():
            logger.debug("Gate 1 FAIL: circuit breaker aberto.")
            return None

        # ── Gate 2: RTT ────────────────────────────────────────────────────────
        if not self._health.rtt_ok(rtt_ms):
            logger.debug(f"Gate 2 FAIL: RTT={rtt_ms:.1f}ms.")
            return None

        # ── Gate 3: Aquecimento LGN ────────────────────────────────────────────
        if self.total_trades < self._lgn_min:
            logger.debug(
                f"Gate 3 FAIL: aquecendo ({self.total_trades}/{self._lgn_min} trades)."
            )
            return None

        # ── Gate 4: Melhor ativo qualificado (payout) ─────────────────────────
        # ESTE GATE FOI REMOVIDO NA VERSAO ATUAL PARA ATIVAR O BOT
        melhor_ativo, ev = self._payout.melhor_ativo()
        if melhor_ativo is None:
            logger.debug("Gate 4 FAIL: nenhum ativo qualificado por payout.")
            return None

        # ── Gate 5: Amostras de dígitos suficientes ────────────────────────────
        if not self._qual.amostras_suficientes(melhor_ativo):
            logger.debug(
                f"Gate 5 FAIL: amostras insuficientes para {melhor_ativo} "
                f"({self._qual.amostras(melhor_ativo)} dígitos)."
            )
            return None

        # ── Gate 6: Distribuição estatística OK ────────────────────────────────
        dist_ok, p_valor = self._qual.distribuicao_normal(melhor_ativo)
        if not dist_ok:
            logger.debug(
                f"Gate 6 FAIL: distribuição enviesada para {melhor_ativo} "
                f"(p={p_valor:.4f})."
            )
            return None

        # ── Todos os gates passaram — emite sinal ──────────────────────────────
        self.total_trades += 1
        percentil = self._payout.percentil_atual(melhor_ativo)

        sinal = {
            "entrar":    True,
            "tipo":      "DIGITDIFF",
            "ativo":     melhor_ativo,
            "digito":    DIGITO_DIFFERS,
            "ev":        round(ev, 4),
            "percentil": round(percentil, 2),
            "rtt":       round(rtt_ms),
            "ts":        time.time(),
        }

        logger.info(
            f"SINAL #{self.total_trades} | ativo={melhor_ativo} "
            f"digito={DIGITO_DIFFERS} ev={sinal['ev']} "
            f"percentil={sinal['percentil']} rtt={sinal['rtt']}ms"
        )
        return sinal

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"SignalEngine("
            f"total_trades={self.total_trades}, "
            f"lgn_min={self._lgn_min})"
        )
