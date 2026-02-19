"""
engine/health_guard.py — Circuit breaker e verificação de RTT.

Responsabilidade única: proteger o sistema contra condições degradadas
(latência alta, instabilidade de conexão).

Circuit breaker: abre se >= 5 falhas de conexão em 2 minutos.
Quando aberto, bloqueia sinais por 5 minutos antes de tentar fechar.
"""
import logging
import time
from collections import deque

from config import RTT_MAX_MS

logger = logging.getLogger("HEALTH_GUARD")

# Parâmetros do circuit breaker
_CB_FALHAS_LIMITE   = 5      # falhas de conexão para abrir o breaker
_CB_JANELA_S        = 120    # janela de observação em segundos (2 min)
_CB_COOLDOWN_S      = 300    # tempo de bloqueio após abertura (5 min)


class HealthGuard:
    """
    Monitora a saúde da conexão e protege o SignalEngine de emitir sinais
    em condições degradadas.

    Dois mecanismos independentes:
      1. RTT check  — verifica latência pontual por tick
      2. Circuit breaker — conta falhas de conexão em janela deslizante
    """

    def __init__(self) -> None:
        # Timestamps das falhas de conexão recentes (janela deslizante)
        self._falhas: deque[float] = deque()

        # Timestamp em que o circuit breaker foi aberto (0 = fechado)
        self._cb_aberto_em: float = 0.0

        # Histórico de resultados de trades (estrutura para uso futuro)
        self._resultados: deque[bool] = deque(maxlen=100)

    # ── RTT ───────────────────────────────────────────────────────────────────

    def rtt_ok(self, rtt_ms: float) -> bool:
        """
        True se a latência está dentro do limite aceitável.
        Loga aviso se RTT estiver alto mas ainda dentro do limite.
        """
        ok = rtt_ms < RTT_MAX_MS
        if not ok:
            logger.warning(f"RTT alto: {rtt_ms:.1f}ms >= {RTT_MAX_MS}ms — sinal bloqueado.")
        return ok

    # ── Circuit Breaker ───────────────────────────────────────────────────────

    def registrar_falha_conexao(self) -> None:
        """
        Registra uma falha de conexão WebSocket.
        Chamado pelo ws_pool quando perde conexão.
        Abre o circuit breaker se o limite for atingido na janela.
        """
        agora = time.monotonic()
        self._falhas.append(agora)
        self._limpar_falhas_antigas(agora)

        n_falhas = len(self._falhas)
        logger.warning(f"Falha de conexão registrada ({n_falhas}/{_CB_FALHAS_LIMITE} na janela de {_CB_JANELA_S}s).")

        if n_falhas >= _CB_FALHAS_LIMITE and self._cb_aberto_em == 0.0:
            self._cb_aberto_em = agora
            logger.error(
                f"CIRCUIT BREAKER ABERTO — {n_falhas} falhas em {_CB_JANELA_S}s. "
                f"Sinais bloqueados por {_CB_COOLDOWN_S}s."
            )

    def registrar_conexao_ok(self) -> None:
        """
        Reseta o contador de falhas após reconexão bem-sucedida.
        Fecha o circuit breaker se estava aberto e o cooldown passou.
        """
        agora = time.monotonic()
        self._falhas.clear()

        if self._cb_aberto_em > 0.0:
            tempo_aberto = agora - self._cb_aberto_em
            if tempo_aberto >= _CB_COOLDOWN_S:
                logger.info(
                    f"Circuit breaker FECHADO após {tempo_aberto:.0f}s de cooldown."
                )
                self._cb_aberto_em = 0.0
            else:
                logger.info(
                    f"Conexão OK mas circuit breaker ainda em cooldown "
                    f"({_CB_COOLDOWN_S - tempo_aberto:.0f}s restantes)."
                )
        else:
            logger.debug("Conexão OK — circuit breaker fechado.")

    def circuit_breaker_aberto(self) -> bool:
        """
        True se o circuit breaker está aberto (sinais devem ser bloqueados).
        Fecha automaticamente após o período de cooldown.
        """
        if self._cb_aberto_em == 0.0:
            return False

        agora = time.monotonic()
        tempo_aberto = agora - self._cb_aberto_em

        if tempo_aberto >= _CB_COOLDOWN_S:
            logger.info(
                f"Circuit breaker FECHADO automaticamente após {tempo_aberto:.0f}s."
            )
            self._cb_aberto_em = 0.0
            self._falhas.clear()
            return False

        logger.debug(
            f"Circuit breaker ABERTO — {_CB_COOLDOWN_S - tempo_aberto:.0f}s restantes."
        )
        return True

    # ── Resultados de trades (estrutura para uso futuro) ──────────────────────

    def registrar_resultado(self, ganhou: bool) -> None:
        """
        Registra o resultado de um trade (ganhou=True / perdeu=False).
        Estrutura implementada mas não utilizada ainda pelo SignalEngine.
        """
        self._resultados.append(ganhou)
        total = len(self._resultados)
        wins  = sum(self._resultados)
        logger.debug(f"Resultado registrado: {'WIN' if ganhou else 'LOSS'} — WR={wins}/{total}")

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _limpar_falhas_antigas(self, agora: float) -> None:
        """Remove falhas fora da janela de observação."""
        corte = agora - _CB_JANELA_S
        while self._falhas and self._falhas[0] < corte:
            self._falhas.popleft()

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"HealthGuard("
            f"cb={'ABERTO' if self.circuit_breaker_aberto() else 'fechado'}, "
            f"falhas={len(self._falhas)}, "
            f"resultados={len(self._resultados)})"
        )
