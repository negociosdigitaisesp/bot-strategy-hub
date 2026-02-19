"""
engine/payout_monitor.py — Monitor de payout por ativo.

Responsabilidade única: coletar histórico de payouts, calcular métricas
estatísticas (percentil, CV, EV) e qualificar ativos para trading.
"""
import logging
from collections import deque
from typing import Optional

import numpy as np

from config import (
    ATIVOS,
    PAYOUT_WINDOW,
    PAYOUT_PERCENTIL_MIN,
    PAYOUT_CV_MAX,
    PAYOUT_AMOSTRAS_MIN,
)

logger = logging.getLogger("PAYOUT_MONITOR")


class PayoutMonitor:
    """
    Coleta histórico de payouts e qualifica ativos para trading.

    Métricas calculadas por ativo:
      - Percentil: posição do payout atual vs histórico (0.0–1.0)
      - CV: coeficiente de variação (std/mean) — mede estabilidade
      - EV: valor esperado simplificado = (0.90 * payout) - 0.10

    Um ativo é qualificado quando:
      percentil >= PAYOUT_PERCENTIL_MIN  AND
      cv        <= PAYOUT_CV_MAX         AND
      amostras  >= PAYOUT_AMOSTRAS_MIN
    """

    def __init__(self, historico_inicial: Optional[dict] = None) -> None:
        """
        historico_inicial: dict exportado por exportar_historico() em sessão
        anterior. Se fornecido, restaura o histórico sem re-aquecer.
        """
        # { ativo: deque([float, ...]) }
        self._historico: dict[str, deque] = {
            a: deque(maxlen=PAYOUT_WINDOW) for a in ATIVOS
        }

        if historico_inicial:
            for ativo, valores in historico_inicial.items():
                if ativo in self._historico:
                    self._historico[ativo].extend(valores)
            logger.info(
                f"Histórico de payout restaurado: "
                f"{ {a: len(d) for a, d in self._historico.items()} }"
            )

    # ── Escrita ────────────────────────────────────────────────────────────────

    def registrar_payout(self, ativo: str, payout_decimal: float) -> None:
        """
        Registra um payout observado (ex: 0.85 para 85%).

        Chamado pelo PayoutMonitor após cada proposal recebida.
        """
        if ativo not in self._historico:
            self._historico[ativo] = deque(maxlen=PAYOUT_WINDOW)
        self._historico[ativo].append(payout_decimal)

    # ── Métricas ───────────────────────────────────────────────────────────────

    def amostras(self, ativo: str) -> int:
        """Quantidade de amostras coletadas para o ativo."""
        return len(self._historico.get(ativo, []))

    def percentil_atual(self, ativo: str) -> float:
        """
        Percentil do payout mais recente vs todo o histórico.
        Retorna 0.0 se amostras insuficientes.
        """
        hist = self._historico.get(ativo)
        if not hist or len(hist) < PAYOUT_AMOSTRAS_MIN:
            return 0.0
        arr = np.array(hist, dtype=float)
        ultimo = arr[-1]
        return float(np.mean(arr <= ultimo))

    def cv_atual(self, ativo: str) -> float:
        """
        Coeficiente de variação (std / mean) do histórico.
        Retorna 999.0 se amostras insuficientes ou média zero.
        """
        hist = self._historico.get(ativo)
        if not hist or len(hist) < PAYOUT_AMOSTRAS_MIN:
            return 999.0
        arr = np.array(hist, dtype=float)
        media = arr.mean()
        if media == 0.0:
            return 999.0
        return float(arr.std() / media)

    def ev_atual(self, ativo: str) -> float:
        """
        Valor esperado para DIGITDIFF:
          EV = (P_win * payout) - (P_lose * 1.0)
          onde P_win = 9/10 = 0.9  (9 dígitos possíveis diferem de um digito alvo)
               P_lose = 1/10 = 0.1
               payout = fração do stake retornada em caso de vitória (ex: 0.87 = 87%)

        Com payout=0.87: EV = (0.9 * 0.87) - (0.1 * 1.0) = 0.783 - 0.10 = 0.683 (positivo)

        NOTA: a fórmula anterior `(0.90 * payout) - 0.10` estava correta matematicamente
        mas o payout retornado pela Deriv já é o valor bruto da aposta (ex: 0.87 do stake).
        O EV em termos de GANHO LÍQUIDO é: (0.9 * payout) - (0.1 * 1.0).
        Retorna -999.0 se sem dados.
        """
        hist = self._historico.get(ativo)
        if not hist:
            return -999.0
        payout_medio = float(np.mean(np.array(hist, dtype=float)))
        # EV = prob_ganhar * payout - prob_perder * stake_unit
        return (0.9 * payout_medio) - (0.1 * 1.0)

    # ── Qualificação ───────────────────────────────────────────────────────────

    def ativo_qualificado(self, ativo: str) -> bool:
        """
        True se o ativo passou em todos os critérios de payout:
          - amostras >= PAYOUT_AMOSTRAS_MIN
          - percentil >= PAYOUT_PERCENTIL_MIN
          - cv <= PAYOUT_CV_MAX
        """
        if self.amostras(ativo) < PAYOUT_AMOSTRAS_MIN:
            return False
        if self.percentil_atual(ativo) < PAYOUT_PERCENTIL_MIN:
            return False
        if self.cv_atual(ativo) > PAYOUT_CV_MAX:
            return False
        return True

    def melhor_ativo(self) -> tuple[Optional[str], float]:
        """
        Retorna (ativo, ev) do ativo qualificado com maior EV.
        Retorna (None, -999.0) se nenhum ativo qualificado.
        """
        melhor_ativo = None
        melhor_ev = -999.0
        for ativo in self._historico:
            if self.ativo_qualificado(ativo):
                ev = self.ev_atual(ativo)
                if ev > melhor_ev:
                    melhor_ev = ev
                    melhor_ativo = ativo
        return melhor_ativo, melhor_ev

    # ── Persistência ───────────────────────────────────────────────────────────

    def exportar_historico(self) -> dict:
        """
        Serializa os deques para listas (compatível com JSON).
        Usar com state/cache.py → save_state().
        """
        return {ativo: list(dq) for ativo, dq in self._historico.items()}

    def __repr__(self) -> str:  # pragma: no cover
        qualificados = [a for a in self._historico if self.ativo_qualificado(a)]
        return (
            f"PayoutMonitor("
            f"amostras={ {a: len(d) for a, d in self._historico.items()} }, "
            f"qualificados={qualificados})"
        )
