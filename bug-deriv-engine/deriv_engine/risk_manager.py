"""
deriv_engine/risk_manager.py — Gerenciador de risco por cliente.

Responsabilidades:
  1. Martingale: escala stake após derrota (fator × nível), reseta após vitória
  2. Soros: reinveste lucro após vitória consecutiva, reseta após N vitórias
  3. Stop Win / Stop Loss: para o cliente quando o lucro acumulado atinge limite
  4. Streak Protection: pausa após 3+ derrotas consecutivas (60s cooldown)

Estado é mantido em RAM por sessão (reseta quando o cliente desativa e reativa).
"""
import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("RISK_MANAGER")


@dataclass
class ClientRiskState:
    """Estado de risco de um cliente individual."""
    base_stake: float = 1.0

    # ── Martingale ──────────────────────────────────────────────────────
    use_martingale: bool = False
    max_gale: int = 3
    martingale_factor: float = 2.5
    gale_level: int = 0  # 0 = base, 1 = primeiro gale, etc.

    # ── Soros ───────────────────────────────────────────────────────────
    use_soros: bool = False
    soros_levels: int = 2
    consecutive_wins: int = 0
    soros_accumulated: float = 0.0  # lucro acumulado para reinvestir

    # ── Stop Win / Stop Loss ───────────────────────────────────────────
    stop_win: float = 50.0
    stop_loss: float = 25.0
    session_profit: float = 0.0
    is_stopped: bool = False

    # ── Streak Protection ──────────────────────────────────────────────
    consecutive_losses: int = 0
    pause_until: float = 0.0  # timestamp monotonic

    # ── Trava de Execução ──────────────────────────────────────────────
    is_processing_result: bool = False


class RiskManager:
    """Gerencia estado de risco para TODOS os clientes ativos."""

    def __init__(self) -> None:
        # user_id → ClientRiskState
        self._states: dict[str, ClientRiskState] = {}

    def init_client(self, user_id: str, config: dict[str, Any]) -> None:
        """Inicializa ou reinicializa estado de risco do cliente."""
        self._states[user_id] = ClientRiskState(
            base_stake=config.get("stake", 1.0),
            use_martingale=config.get("use_martingale", False),
            max_gale=config.get("max_gale", 3),
            martingale_factor=config.get("martingale_factor", 2.5),
            use_soros=config.get("use_soros", False),
            soros_levels=config.get("soros_levels", 2),
            stop_win=config.get("stop_win", 50.0),
            stop_loss=config.get("stop_loss", 25.0),
        )
        logger.info(
            f"[RISK] Cliente {user_id} inicializado — "
            f"martingale={'ON' if config.get('use_martingale') else 'OFF'} "
            f"soros={'ON' if config.get('use_soros') else 'OFF'} "
            f"stop_win={config.get('stop_win', 50)} "
            f"stop_loss={config.get('stop_loss', 25)}"
        )

    def remove_client(self, user_id: str) -> None:
        """Remove estado de risco do cliente (desativou o bot)."""
        self._states.pop(user_id, None)

    def should_trade(self, user_id: str) -> bool:
        """Retorna True se o cliente deve receber ordens neste momento."""
        state = self._states.get(user_id)
        if state is None:
            return True  # sem estado = sem restrições

        # Trava: ainda estamos processando o resultado anterior
        if state.is_processing_result:
            return False

        # Stop Win / Stop Loss atingido
        if state.is_stopped:
            return False

        # Streak protection (pausa temporária)
        if state.pause_until > 0 and time.monotonic() < state.pause_until:
            return False

        return True

    def get_stake(self, user_id: str) -> float:
        """Calcula o stake atual para este cliente baseado no estado de risco."""
        state = self._states.get(user_id)
        if state is None:
            return 1.0

        stake = state.base_stake

        # ── Martingale: escala stake após derrota ──────────────────────
        if state.use_martingale and state.gale_level > 0:
            stake = state.base_stake * (state.martingale_factor ** state.gale_level)
            logger.info(
                f"[RISK] 🎰 {user_id} Martingale G{state.gale_level}: "
                f"base={state.base_stake:.2f} × {state.martingale_factor}^{state.gale_level} = "
                f"stake={stake:.2f}"
            )

        # ── Soros: reinveste lucro acumulado ───────────────────────────
        if state.use_soros and state.consecutive_wins > 0 and state.soros_accumulated > 0:
            stake = state.base_stake + state.soros_accumulated
            logger.info(
                f"[RISK] 🔄 {user_id} Soros W{state.consecutive_wins}: "
                f"stake={stake:.2f} (base + {state.soros_accumulated:.2f})"
            )

        return round(stake, 2)

    def lock_trade(self, user_id: str) -> None:
        """Trava o cliente para não receber novas ordens até o resultado processar."""
        state = self._states.get(user_id)
        if state:
            state.is_processing_result = True
            logger.debug(f"[RISK] 🔒 Lock ativado para {user_id}")

    def unlock_trade(self, user_id: str) -> None:
        """Destrava o cliente."""
        state = self._states.get(user_id)
        if state:
            state.is_processing_result = False
            logger.debug(f"[RISK] 🔓 Lock desativado para {user_id}")

    def process_result(self, user_id: str, status: str, profit: float) -> None:
        """
        Processa resultado de um trade e atualiza estado de risco.

        Args:
            user_id: ID do cliente
            status: 'won', 'lost', ou outro
            profit: lucro/prejuízo do trade (positivo = ganho, negativo = perda)
        """
        state = self._states.get(user_id)
        if state is None:
            return

        # ── Atualiza lucro da sessão ───────────────────────────────────
        state.session_profit += profit

        # ── Verifica Stop Win / Stop Loss ──────────────────────────────
        if state.stop_win > 0 and state.session_profit >= state.stop_win:
            state.is_stopped = True
            logger.info(
                f"[RISK] 🛑 STOP WIN atingido para {user_id}: "
                f"${state.session_profit:.2f} >= ${state.stop_win:.2f}"
            )
            return

        if state.stop_loss > 0 and state.session_profit <= -state.stop_loss:
            state.is_stopped = True
            logger.info(
                f"[RISK] 🛑 STOP LOSS atingido para {user_id}: "
                f"${state.session_profit:.2f} <= -${state.stop_loss:.2f}"
            )
            return

        is_win = status == "won"

        if is_win:
            # ── VITÓRIA ────────────────────────────────────────────────
            # Martingale: reseta gale
            state.gale_level = 0
            state.consecutive_losses = 0

            # Soros: acumula lucro e conta vitórias consecutivas
            if state.use_soros:
                state.consecutive_wins += 1
                state.soros_accumulated += profit

                if state.consecutive_wins >= state.soros_levels:
                    # Atingiu nível máximo de Soros → reseta
                    logger.info(
                        f"[RISK] 🔄 Soros reset para {user_id}: "
                        f"{state.consecutive_wins} vitórias consecutivas, "
                        f"acumulado=${state.soros_accumulated:.2f}"
                    )
                    state.consecutive_wins = 0
                    state.soros_accumulated = 0.0
            else:
                state.consecutive_wins = 0
                state.soros_accumulated = 0.0

            logger.info(
                f"[RISK] ✅ WIN {user_id}: profit={profit:+.2f} | "
                f"session={state.session_profit:+.2f} | "
                f"gale=0 | soros_wins={state.consecutive_wins}"
            )

        elif status == "lost":
            # ── DERROTA ────────────────────────────────────────────────
            # Soros: reseta
            state.consecutive_wins = 0
            state.soros_accumulated = 0.0

            # Martingale: escala gale ou reseta
            state.consecutive_losses += 1

            if state.use_martingale:
                if state.gale_level < state.max_gale:
                    state.gale_level += 1
                    logger.info(
                        f"[RISK] 🎰 Martingale G{state.gale_level} para {user_id}: "
                        f"próximo stake=${self.get_stake(user_id):.2f}"
                    )
                else:
                    # Max gale atingido → reseta
                    logger.info(
                        f"[RISK] 🔄 Max gale atingido para {user_id}: "
                        f"resetando ao base"
                    )
                    state.gale_level = 0

            # Streak protection: 3+ derrotas consecutivas → pausa 60s
            if state.consecutive_losses >= 3:
                state.pause_until = time.monotonic() + 60
                state.consecutive_losses = 0
                state.gale_level = 0
                logger.info(
                    f"[RISK] ⏸️ Streak protection para {user_id}: "
                    f"pausa de 60s após 3+ derrotas"
                )

            logger.info(
                f"[RISK] ❌ LOSS {user_id}: profit={profit:+.2f} | "
                f"session={state.session_profit:+.2f} | "
                f"gale={state.gale_level} | losses={state.consecutive_losses}"
            )

    def sync_clients(self, active_clients: dict[str, dict]) -> None:
        """
        Sincroniza estados com os clientes ativos.
        - Inicializa novos clientes
        - Remove desativados
        - Hot-update configs de clientes existentes (sem resetar contadores)
        """
        current_ids = set(self._states.keys())
        new_ids = set(active_clients.keys())

        # Novos clientes: inicializar estado
        for uid in (new_ids - current_ids):
            self.init_client(uid, active_clients[uid])

        # Clientes existentes: atualizar config SEM resetar contadores de sessão
        for uid in (new_ids & current_ids):
            self._hot_update_config(uid, active_clients[uid])

        # Clientes removidos: limpar estado
        for uid in (current_ids - new_ids):
            self.remove_client(uid)

    def _hot_update_config(self, user_id: str, config: dict) -> None:
        """Atualiza configs de risco sem resetar estado de sessão (gale_level, profit, etc.)."""
        state = self._states.get(user_id)
        if state is None:
            return

        new_use_mg = bool(config.get("use_martingale", False))
        new_max_gale = int(config.get("max_gale", 3))
        new_mg_factor = float(config.get("martingale_factor", 2.5))
        new_use_soros = bool(config.get("use_soros", False))
        new_soros_levels = int(config.get("soros_levels", 2))
        new_stop_win = float(config.get("stop_win", 50.0))
        new_stop_loss = float(config.get("stop_loss", 25.0))
        
        changed = (
            state.use_martingale != new_use_mg
            or state.max_gale != new_max_gale
            or state.martingale_factor != new_mg_factor
            or state.use_soros != new_use_soros
            or state.soros_levels != new_soros_levels
            or state.stop_win != new_stop_win
            or state.stop_loss != new_stop_loss
        )

        new_base_stake = float(config.get("stake", state.base_stake))
        # APENAS atualiza o stake base se o usuário não estiver dentro de um Martingale. 
        # Isso evita que o Supabase sobrescreva a base_stake com o valor de um "Gale Stake" lido do DB a cada 5s.
        if state.gale_level == 0 and state.base_stake != new_base_stake:
            state.base_stake = new_base_stake
            changed = True
        elif state.gale_level > 0 and state.base_stake != new_base_stake:
            logger.info(
                f"[RISK] 🛡️ GUARD: Bloqueou atualização de base_stake para {user_id} "
                f"(gale_level={state.gale_level}, base={state.base_stake:.2f}, "
                f"DB_tentou={new_base_stake:.2f})"
            )

        if not changed:
            return

        # Se Martingale foi desativado → resetar gale_level
        if state.use_martingale and not new_use_mg:
            state.gale_level = 0

        # Se Soros foi desativado → resetar acumulado
        if state.use_soros and not new_use_soros:
            state.consecutive_wins = 0
            state.soros_accumulated = 0.0

        state.use_martingale = new_use_mg
        state.max_gale = new_max_gale
        state.martingale_factor = new_mg_factor
        state.use_soros = new_use_soros
        state.soros_levels = new_soros_levels
        state.stop_win = new_stop_win
        state.stop_loss = new_stop_loss
        
        logger.info(
            f"[RISK] ♻️ Config atualizada para {user_id} — "
            f"martingale={'ON' if new_use_mg else 'OFF'} "
            f"(G{new_max_gale}×{new_mg_factor}) "
            f"soros={'ON' if new_use_soros else 'OFF'} "
            f"stake={state.base_stake}"
        )

    def get_state_summary(self, user_id: str) -> dict | None:
        """Retorna resumo do estado de risco (para logging/debug)."""
        state = self._states.get(user_id)
        if state is None:
            return None
        return {
            "gale_level": state.gale_level,
            "consecutive_wins": state.consecutive_wins,
            "consecutive_losses": state.consecutive_losses,
            "session_profit": round(state.session_profit, 2),
            "current_stake": self.get_stake(user_id),
            "is_stopped": state.is_stopped,
        }
