"""
deriv_engine/signal_core.py — Módulo autocontido de análise de sinais.

Contém todas as classes do bug-deriv-engine (SignalEngine, Qualificador,
HealthGuard, PayoutMonitor) inlined em um único arquivo para evitar
conflitos de import no ambiente VPS.

NÃO depende de nenhum módulo externo além de scipy e numpy.
Importa constantes do config.py local (deriv_engine/config.py).
"""
import logging
import time
from collections import Counter, deque
from typing import Optional

import numpy as np
from scipy.stats import chisquare

from config import (
    ATIVOS,
    DIGIT_WINDOW,
    CHISQUARE_P_MIN,
    DIGIT_AMOSTRAS_MIN,
    PAYOUT_WINDOW,
    PAYOUT_PERCENTIL_MIN,
    PAYOUT_CV_MAX,
    PAYOUT_AMOSTRAS_MIN,
    RTT_MAX_MS,
    DIGITO_DIFFERS,
    LGN_MIN_TRADES,
)

logger = logging.getLogger("SIGNAL_CORE")


# ══════════════════════════════════════════════════════════════════════════
# HealthGuard — Circuit breaker + RTT check
# ══════════════════════════════════════════════════════════════════════════

_CB_FALHAS_LIMITE = 5
_CB_JANELA_S      = 120
_CB_COOLDOWN_S    = 300


class HealthGuard:
    def __init__(self):
        self._falhas: deque[float] = deque()
        self._cb_aberto_em: float = 0.0

    def rtt_ok(self, rtt_ms: float) -> bool:
        return rtt_ms < RTT_MAX_MS

    def circuit_breaker_aberto(self) -> bool:
        if self._cb_aberto_em == 0.0:
            return False
        agora = time.monotonic()
        if (agora - self._cb_aberto_em) >= _CB_COOLDOWN_S:
            self._cb_aberto_em = 0.0
            self._falhas.clear()
            return False
        return True

    def registrar_falha_conexao(self):
        agora = time.monotonic()
        self._falhas.append(agora)
        corte = agora - _CB_JANELA_S
        while self._falhas and self._falhas[0] < corte:
            self._falhas.popleft()
        if len(self._falhas) >= _CB_FALHAS_LIMITE and self._cb_aberto_em == 0.0:
            self._cb_aberto_em = agora
            logger.error(f"CIRCUIT BREAKER ABERTO — {len(self._falhas)} falhas.")


# ══════════════════════════════════════════════════════════════════════════
# PayoutMonitor — Coleta payouts e qualifica ativos
# ══════════════════════════════════════════════════════════════════════════

class PayoutMonitor:
    def __init__(self):
        self._historico: dict[str, deque] = {
            a: deque(maxlen=PAYOUT_WINDOW) for a in ATIVOS
        }

    def registrar_payout(self, ativo: str, payout: float):
        if ativo not in self._historico:
            self._historico[ativo] = deque(maxlen=PAYOUT_WINDOW)
        self._historico[ativo].append(payout)

    def amostras(self, ativo: str) -> int:
        return len(self._historico.get(ativo, []))

    def percentil_atual(self, ativo: str) -> float:
        hist = self._historico.get(ativo)
        if not hist or len(hist) < PAYOUT_AMOSTRAS_MIN:
            return 0.0
        arr = np.array(hist, dtype=float)
        return float(np.mean(arr <= arr[-1]))

    def cv_atual(self, ativo: str) -> float:
        hist = self._historico.get(ativo)
        if not hist or len(hist) < PAYOUT_AMOSTRAS_MIN:
            return 999.0
        arr = np.array(hist, dtype=float)
        media = arr.mean()
        return float(arr.std() / media) if media != 0.0 else 999.0

    def ativo_qualificado(self, ativo: str) -> bool:
        if self.amostras(ativo) < PAYOUT_AMOSTRAS_MIN:
            return False
        if self.percentil_atual(ativo) < PAYOUT_PERCENTIL_MIN:
            return False
        if self.cv_atual(ativo) > PAYOUT_CV_MAX:
            return False
        return True


# ══════════════════════════════════════════════════════════════════════════
# Qualificador — Buffer de dígitos + chi-square
# ══════════════════════════════════════════════════════════════════════════

class Qualificador:
    def __init__(self):
        self._historico: dict[str, deque] = {
            a: deque(maxlen=DIGIT_WINDOW) for a in ATIVOS
        }

    @property
    def digitos(self) -> dict[str, deque]:
        return self._historico

    def registrar_digito(self, ativo: str, digito: int):
        if ativo not in self._historico:
            self._historico[ativo] = deque(maxlen=DIGIT_WINDOW)
        self._historico[ativo].append(digito)

    def amostras(self, ativo: str) -> int:
        return len(self._historico.get(ativo, []))

    def amostras_suficientes(self, ativo: str) -> bool:
        return self.amostras(ativo) >= DIGIT_AMOSTRAS_MIN


# ══════════════════════════════════════════════════════════════════════════
# SignalEngine — Cérebro: recebe tick, emite sinal ou None
# ══════════════════════════════════════════════════════════════════════════

class SignalEngine:
    def __init__(
        self,
        payout_monitor: PayoutMonitor,
        qualificador: Qualificador,
        health_guard: HealthGuard,
        lgn_min: int = LGN_MIN_TRADES,
        total_trades_inicial: int = 0,
    ):
        self._payout = payout_monitor
        self._qual   = qualificador
        self._health = health_guard
        self._lgn_min = lgn_min
        self.total_trades = total_trades_inicial
        self._ultimo_sinal_ts: float = 0.0
        self._cooldown_segundos: float = 45.0
        self._wins = 0
        self._total_validations = 0
        self._pending_validation: dict[str, int] = {}
        logger.info(f"SignalEngine iniciado — lgn_min={lgn_min}")

    def _ativo_estavel(self, ativo: str) -> tuple[bool, float]:
        digitos = list(self._qual.digitos[ativo])
        if len(digitos) < 50:
            return False, 0.0
        janela = digitos[-50:]
        frequencias = [janela.count(d) for d in range(10)]
        _, p_valor = chisquare(frequencias)
        return p_valor > 0.20, round(p_valor, 4)

    def _digito_menor_risco(self, ativo: str) -> tuple[int, float]:
        """Seleciona o dígito com menor risco para DIGITDIFF.

        Melhorias v2:
          1. Janela expandida: 50 ticks (era 20) — mais estabilidade
          2. Blacklist de recência: ignora dígitos que apareceram nos últimos 5 ticks
          3. Consenso multi-janela: o dígito frio deve ser frio em 2+ janelas
          4. Frequência máxima: rejeita dígitos com freq > 8% (não são frios o bastante)
        """
        digitos = list(self._qual.digitos[ativo])
        n = len(digitos)

        # Blacklist: dígitos que apareceram nos últimos 5 ticks ("quentes")
        recentes = set(digitos[-5:]) if n >= 5 else set()

        # Janela primária: 50 ticks
        janela_50 = digitos[-50:] if n >= 50 else digitos
        contagem_50 = Counter(janela_50)
        freq_50 = {d: contagem_50.get(d, 0) / len(janela_50) for d in range(10)}

        # Janela secundária: 30 ticks (para consenso)
        janela_30 = digitos[-30:] if n >= 30 else digitos
        contagem_30 = Counter(janela_30)
        freq_30 = {d: contagem_30.get(d, 0) / len(janela_30) for d in range(10)}

        # Filtra candidatos:
        #   - Não pode ter aparecido nos últimos 5 ticks
        #   - Frequência <= 8% na janela de 50
        candidatos = {
            d: freq_50[d]
            for d in range(10)
            if d not in recentes and freq_50[d] <= 0.08
        }

        # Se não há candidatos seguros, relaxa filtro (remove recência)
        if not candidatos:
            candidatos = {
                d: freq_50[d]
                for d in range(10)
                if freq_50[d] <= 0.08
            }

        # Se ainda não há, usa o menos frequente sem filtros
        if not candidatos:
            candidatos = freq_50

        # Seleciona o mais frio entre candidatos
        digito_frio = min(candidatos, key=candidatos.get)

        # Verificação de consenso: o dígito frio na janela 50
        # também deve ser frio na janela 30
        frio_30 = min(freq_30, key=freq_30.get)
        if digito_frio != frio_30 and freq_30.get(digito_frio, 1.0) > 0.10:
            # Sem consenso — penaliza o confidence score
            # Retorna freq mais alta para que o confidence gate rejeite
            logger.debug(
                f"[SIGNAL] Sem consenso de dígito frio para {ativo}: "
                f"50t={digito_frio}({freq_50[digito_frio]:.1%}) vs "
                f"30t={frio_30}({freq_30[frio_30]:.1%})"
            )
            return digito_frio, max(freq_50[digito_frio], 0.12)

        return digito_frio, freq_50[digito_frio]

    def _calcular_confidence(self, ativo: str, digito_alvo: int, freq_minima: float, p_estabilidade: float) -> float:
        digitos = list(self._qual.digitos[ativo])
        n = len(digitos)

        score_estabilidade = min(1.0, max(0.0, (p_estabilidade - 0.20) / 0.60))
        score_frequencia = min(1.0, max(0.0, (0.10 - freq_minima) / 0.10))

        score_consenso = 0.0
        if n >= 100:
            janelas = [20, 50, 100]
        elif n >= 50:
            janelas = [20, 50]
        else:
            janelas = []

        if janelas:
            digitos_frios = []
            for w in janelas:
                sub = digitos[-w:]
                contagem_sub = Counter(sub)
                freqs_sub = {d: contagem_sub.get(d, 0) / w for d in range(10)}
                digitos_frios.append(min(freqs_sub, key=freqs_sub.get))
            score_consenso = digitos_frios.count(digito_alvo) / len(janelas)

        janela_disp = digitos[-50:] if n >= 50 else digitos
        contagem_disp = Counter(janela_disp)
        freqs_list = [contagem_disp.get(d, 0) / len(janela_disp) for d in range(10)]
        media = sum(freqs_list) / 10
        variancia = sum((f - media) ** 2 for f in freqs_list) / 10
        desvio = variancia ** 0.5
        score_dispersao = min(1.0, max(0.0, (0.06 - desvio) / 0.04))

        return round(
            score_estabilidade * 0.30 +
            score_frequencia   * 0.30 +
            score_consenso     * 0.25 +
            score_dispersao    * 0.15,
            3
        )

    def processar_tick(
        self,
        ativo: str,
        digito: int,
        quote: float,
        epoch: int,
        rtt_ms: float,
    ) -> Optional[dict]:
        # Validação do trade anterior
        if ativo in self._pending_validation:
            digito_apostado = self._pending_validation.pop(ativo)
            if digito != digito_apostado:
                self._wins += 1
            self._total_validations += 1

        # Registra dígito no qualificador
        self._qual.registrar_digito(ativo, digito)

        # Gate 1: Circuit breaker
        if self._health.circuit_breaker_aberto():
            return None

        # Gate 2: RTT
        if not self._health.rtt_ok(rtt_ms):
            return None

        # Gate 3: Aquecimento
        self.total_trades += 1  # Cada tick conta como um "trade" para aquecimento
        if self.total_trades < self._lgn_min:
            return None

        # Gate 4: Cooldown
        agora = time.time()
        if (agora - self._ultimo_sinal_ts) < self._cooldown_segundos:
            return None

        # Gate 5: Selecionar ativo mais estável
        melhor_ativo = None
        melhor_p = 0.0
        for candidato in ATIVOS:
            estavel, p_valor = self._ativo_estavel(candidato)
            if estavel and p_valor > melhor_p:
                melhor_p = p_valor
                melhor_ativo = candidato

        if melhor_ativo is None:
            return None

        # Gate 6: Dígito de menor risco
        digito_alvo, freq_minima = self._digito_menor_risco(melhor_ativo)

        # Gate 7: Confidence Score
        confidence = self._calcular_confidence(melhor_ativo, digito_alvo, freq_minima, melhor_p)
        if confidence < 0.80:
            return None

        # Emitir sinal
        self._ultimo_sinal_ts = time.time()
        ev = round((0.90 * 0.09) - (0.10 * 1.0), 4)

        sinal = {
            "entrar":       True,
            "tipo":         "DIGITDIFF",
            "ativo":        melhor_ativo,
            "digito":       digito_alvo,
            "ev":           ev,
            "percentil":    round(melhor_p, 2),
            "rtt":          round(rtt_ms),
            "ts":           time.time(),
            "freq_digito":  round(freq_minima, 3),
            "estabilidade": round(melhor_p, 3),
            "confidence":   confidence,
        }

        # Registra para validação no próximo tick
        self._pending_validation[melhor_ativo] = digito_alvo

        logger.info(
            f"SINAL | ativo={melhor_ativo} | "
            f"digito={digito_alvo} (freq={freq_minima:.1%}) | "
            f"confidence={confidence:.3f} | "
            f"p={melhor_p:.3f}"
        )
        return sinal
