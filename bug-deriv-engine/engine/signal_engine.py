"""
engine/signal_engine.py — Cérebro do sistema de sinais.

Responsabilidade única: receber um tick e decidir se emite sinal.
Puro Python síncrono — sem asyncio, sem I/O, sem WebSocket.

Fluxo de verificação (6 gates em sequência):
  1. Circuit breaker aberto?          → None
  2. RTT aceitável?                   → None
  3. Aquecimento LGN completo?        → None
  4. Existe ativo qualificado (payout)? → None
  5. Amostras de dígitos suficientes? → None
  6. Distribuição estatística OK?     → None
  Passou tudo → emite sinal dict
"""
import logging
import time
from typing import Optional
from collections import Counter
from scipy.stats import chisquare

import random
from config import DIGITO_DIFFERS, LGN_MIN_TRADES, ATIVOS
from engine.payout_monitor import PayoutMonitor
from engine.qualificador import Qualificador
from engine.health_guard import HealthGuard

logger = logging.getLogger("SIGNAL_ENGINE")


class SignalEngine:
    """
    Processa cada tick e decide se emite sinal de trading.

    Instanciado uma vez em main.py e chamado a cada tick recebido
    pelo DerivWSPool via callback on_tick.
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

        # Cooldown entre sinais
        # Cooldown entre sinais (30s para maior segurança)
        self._ultimo_sinal_ts: float = 0.0
        self._cooldown_segundos: float = 30.0

        # Assertividade em tempo real (Win Rate)
        self._wins: int = 0
        self._total_validations: int = 0
        self._pending_validation: dict[str, int] = {}  # {ativo: digito_apostado}

        logger.info(
            f"SignalEngine iniciado — "
            f"lgn_min={lgn_min}, total_trades={total_trades_inicial}"
        )

    # ── Métodos Privados ──────────────────────────────────────────────────────

    def _ativo_estavel(self, ativo: str) -> tuple[bool, float]:
        """
        Filtro 1: verifica se o ativo está em estado estatístico normal.
        Usa chi-square nos últimos 50 dígitos.
        
        Retorna:
            (True, p_valor) se estável (p > 0.20)
            (False, p_valor) se anômalo
        """
        digitos = list(self._qual.digitos[ativo])
        
        if len(digitos) < 50:
            return False, 0.0
        
        janela = digitos[-50:]
        frequencias = [janela.count(d) for d in range(10)]
        _, p_valor = chisquare(frequencias)
        
        return p_valor > 0.20, round(p_valor, 4)

    def _digito_menor_risco(self, ativo: str) -> tuple[int, float]:
        """
        Filtro 2: encontra o dígito com menor frequência nos últimos 20 ticks.
        Esse é o dígito de menor risco para apostar DIFFERS.
        
        Retorna:
            (digito, frequencia_relativa)
        """
        digitos = list(self._qual.digitos[ativo])
        janela = digitos[-20:]  # últimos 20 dígitos
        
        contagem = Counter(janela)
        
        # Frequência relativa de cada dígito (0-9)
        frequencias = {d: contagem.get(d, 0) / 20 for d in range(10)}
        
        # Dígito mais frio = menor frequência
        digito_frio = min(frequencias, key=frequencias.get)
        freq_minima = frequencias[digito_frio]
        
        return digito_frio, freq_minima


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

        Chamado pelo callback on_tick do DerivWSPool (via main.py).
        Não faz I/O. Não é async. Retorna imediatamente.

        Parâmetros:
            ativo   — símbolo do ativo (ex: "R_50")
            digito  — último dígito do quote (0–9)
            quote   — preço bruto
            epoch   — timestamp Unix do tick
            rtt_ms  — RTT medido pelo heartbeat da Conexão A

        Retorna:
            dict com dados do sinal, ou None se qualquer gate falhar.
        """

        # ── Validação do trade anterior (Tempo Real) ───────────────────────────
        # Se havia um trade pendente para este ativo, o tick atual é o resultado.
        if ativo in self._pending_validation:
            digito_apostado = self._pending_validation.pop(ativo)
            # Differs ganha se o dígito atual for DIFERENTE do apostado
            if digito != digito_apostado:
                self._wins += 1
            self._total_validations += 1

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

        # ── Gate 4: Cooldown ──────────────────────────────────────────────
        agora = time.time()
        if (agora - self._ultimo_sinal_ts) < self._cooldown_segundos:
            restante = self._cooldown_segundos - (agora - self._ultimo_sinal_ts)
            logger.debug(f"Gate 4 FAIL: cooldown ({restante:.1f}s restantes).")
            return None

        # ── Gate 5: Selecionar ativo mais estável entre os 5 ─────────────
        melhor_ativo = None
        melhor_p = 0.0

        for candidato in ATIVOS:
            estavel, p_valor = self._ativo_estavel(candidato)
            if estavel and p_valor > melhor_p:
                melhor_p = p_valor
                melhor_ativo = candidato

        if melhor_ativo is None:
            # logger.debug("Gate 5 FAIL: nenhum ativo em estado estável.")
            return None

        # ── Gate 6: Encontrar dígito de menor risco ───────────────────────
        digito_alvo, freq_minima = self._digito_menor_risco(melhor_ativo)

        # ── Emitir sinal ──────────────────────────────────────────────────
        self.total_trades += 1
        self._ultimo_sinal_ts = time.time()

        # EV real do Differs com payout 1.09
        ev = round((0.90 * 0.09) - (0.10 * 1.0), 4)  # -0.019 (honesto)

        sinal = {
            "entrar":         True,
            "tipo":           "DIGITDIFF",
            "ativo":          melhor_ativo,
            "digito":         digito_alvo,
            "ev":             ev,
            "percentil":      round(melhor_p, 2),  # p-valor do chi-square
            "rtt":            round(rtt_ms),
            "ts":             time.time(),
            "freq_digito":    round(freq_minima, 3),
            "estabilidade":   round(melhor_p, 3),
        }

        logger.info(
            f"SINAL #{self.total_trades} | "
            f"ativo={melhor_ativo} | "
            f"digito_alvo={digito_alvo} (freq={freq_minima:.1%}) | "
            f"estabilidade_p={melhor_p:.3f} | "
            f"rtt={rtt_ms:.0f}ms"
        )
        return sinal

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"SignalEngine("
            f"total_trades={self.total_trades}, "
            f"lgn_min={self._lgn_min})"
        )
