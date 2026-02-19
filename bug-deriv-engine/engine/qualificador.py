"""
engine/qualificador.py — Qualificação estatística de ativos via chi-square.

Responsabilidade única: verificar se a distribuição de dígitos de um ativo
é suficientemente uniforme (distribuição esperada: 10% por dígito 0–9).

Usa o teste chi-quadrado de Pearson. Se p >= CHISQUARE_P_MIN, a distribuição
não é significativamente diferente da uniforme — ativo qualificado.
"""
import logging
from collections import deque
from typing import Optional

import numpy as np
from scipy.stats import chisquare

from config import (
    ATIVOS,
    DIGIT_WINDOW,
    CHISQUARE_P_MIN,
    DIGIT_AMOSTRAS_MIN,
)

logger = logging.getLogger("QUALIFICADOR")


class Qualificador:
    """
    Qualifica ativos com base na distribuição estatística dos dígitos.

    Um ativo é qualificado quando:
      - amostras >= DIGIT_AMOSTRAS_MIN
      - p-valor do chi-square >= CHISQUARE_P_MIN  (distribuição uniforme)
    """

    def __init__(self, historico_inicial: Optional[dict] = None) -> None:
        """
        historico_inicial: dict exportado por exportar_historico() em sessão
        anterior. Restaura histórico sem re-aquecer.
        """
        # { ativo: deque([int, ...]) }  — dígitos 0–9
        self._historico: dict[str, deque] = {
            a: deque(maxlen=DIGIT_WINDOW) for a in ATIVOS
        }

        if historico_inicial:
            for ativo, digitos in historico_inicial.items():
                if ativo in self._historico:
                    self._historico[ativo].extend(digitos)
            logger.info(
                f"Histórico de dígitos restaurado: "
                f"{ {a: len(d) for a, d in self._historico.items()} }"
            )

    # ── Escrita ────────────────────────────────────────────────────────────────

    @property
    def digitos(self) -> dict[str, deque]:
        """Acesso somente leitura aos deques de dígitos."""
        return self._historico

    def registrar_digito(self, ativo: str, digito: int) -> None:
        """
        Registra um dígito observado (0–9) para o ativo.

        Chamado pelo TickRouter / SignalEngine a cada tick.
        """
        if ativo not in self._historico:
            self._historico[ativo] = deque(maxlen=DIGIT_WINDOW)
        self._historico[ativo].append(digito)

    # ── Métricas ───────────────────────────────────────────────────────────────

    def amostras(self, ativo: str) -> int:
        """Quantidade de dígitos coletados para o ativo."""
        return len(self._historico.get(ativo, []))

    def amostras_suficientes(self, ativo: str) -> bool:
        """True se o ativo tem amostras >= DIGIT_AMOSTRAS_MIN."""
        return self.amostras(ativo) >= DIGIT_AMOSTRAS_MIN

    def distribuicao_normal(self, ativo: str) -> tuple[bool, float]:
        """
        Executa o teste chi-quadrado de Pearson sobre os últimos DIGIT_WINDOW
        dígitos do ativo.

        Hipótese nula: distribuição uniforme (10% por dígito 0–9).

        Retorna:
          (False, 1.0)      — amostras insuficientes (< DIGIT_AMOSTRAS_MIN)
          (True,  p_valor)  — p >= CHISQUARE_P_MIN  → distribuição uniforme
          (False, p_valor)  — p <  CHISQUARE_P_MIN  → distribuição enviesada
        """
        if not self.amostras_suficientes(ativo):
            return False, 1.0

        arr = np.array(self._historico[ativo], dtype=int)
        n   = len(arr)

        # Frequências observadas para cada dígito 0–9
        observado = np.array([np.sum(arr == d) for d in range(10)], dtype=float)

        # Frequência esperada uniforme
        esperado = np.full(10, n / 10.0)

        try:
            _, p_valor = chisquare(observado, f_exp=esperado)
        except Exception as e:
            logger.error(f"[{ativo}] Erro no chi-square: {e}")
            return False, 0.0

        qualificado = float(p_valor) >= CHISQUARE_P_MIN
        logger.debug(
            f"[{ativo}] chi-square p={p_valor:.4f} "
            f"({'OK' if qualificado else 'FAIL'})"
        )
        return qualificado, float(p_valor)

    def ativo_qualificado(self, ativo: str) -> bool:
        """
        True se o ativo passou no teste chi-square com amostras suficientes.
        Atalho conveniente para distribuicao_normal(ativo)[0].
        """
        qualificado, _ = self.distribuicao_normal(ativo)
        return qualificado

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
            f"Qualificador("
            f"amostras={ {a: len(d) for a, d in self._historico.items()} }, "
            f"qualificados={qualificados})"
        )
