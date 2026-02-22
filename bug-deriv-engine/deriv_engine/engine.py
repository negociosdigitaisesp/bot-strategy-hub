"""
deriv_engine/engine.py — Orquestrador central do Deriv Engine.

Responsabilidades:
  1. Mantém active_clients em RAM (dict: user_id → config)
  2. Sincroniza com Supabase a cada CLIENTS_SYNC_INTERVAL_S segundos
  3. Quando MarketAnalyzer emite sinal → dispara ordens para TODOS os clientes
  4. Escreve resultados em batch na tabela trade_history
  5. Loga contadores de saúde a cada HEALTH_LOG_INTERVAL_S segundos

Regras de performance:
  - Não consulta Supabase por tick (apenas por poll a cada 5s)
  - asyncio.gather() para ordens em paralelo (sem threads)
  - Batch insert em trade_history (1 chamada Supabase por ciclo de sinais)
  - Sem bloqueios no event loop
"""
import asyncio
import logging
import time
from typing import Any

from config import (
    CLIENTS_SYNC_INTERVAL_S,
    HEALTH_LOG_INTERVAL_S,
)
from market_analyzer import MarketAnalyzer
from order_executor import OrderExecutor
from risk_manager import RiskManager
from supabase_client import get_supabase

logger = logging.getLogger("DERIV_ENGINE")


class DerivEngine:
    """Motor principal do sistema de trading Deriv."""

    def __init__(self) -> None:
        self._supabase       = get_supabase()
        self._market_analyzer = MarketAnalyzer()
        self._order_executor  = OrderExecutor()
        self._risk_manager    = RiskManager()

        # Cache em RAM: user_id → { token, stake, strategy_id, symbol, ... }
        self.active_clients: dict[str, dict[str, Any]] = {}

        # ── Contadores de saúde ──────────────────────────────────────────
        self._total_signals_dispatched = 0
        self._total_orders_sent        = 0
        self._total_errors             = 0
        self._started_at               = time.time()

        logger.info("🟢 DerivEngine instanciado (com RiskManager).")

    # ── Ciclo principal ────────────────────────────────────────────────────

    async def run(self) -> None:
        """Ponto de entrada — executa todos os loops em paralelo."""
        logger.info("🟢 DerivEngine iniciado.")
        await self._load_active_clients()

        await asyncio.gather(
            self._clients_sync_loop(),
            self._health_log_loop(),
            self._market_analyzer.run(self),
        )

    # ── Carregamento e sincronização de clientes ──────────────────────────

    async def _load_active_clients(self) -> None:
        """Carregamento inicial dos clientes ativos."""
        try:
            resp = (
                self._supabase.table("active_bots")
                .select("*")
                .eq("broker", "deriv")
                .eq("is_active", True)
                .execute()
            )
            for row in resp.data:
                self.active_clients[row["user_id"]] = self._row_to_client(row)

            # Inicializa estado de risco para clientes carregados
            self._risk_manager.sync_clients(self.active_clients)

            logger.info(f"Clientes Deriv ativos carregados: {len(self.active_clients)}")
        except Exception as e:
            logger.error(f"Erro ao carregar clientes: {e}")

    async def _clients_sync_loop(self) -> None:
        """Poll periódico para sincronizar active_clients com Supabase."""
        while True:
            await asyncio.sleep(CLIENTS_SYNC_INTERVAL_S)
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, self._sync_clients_blocking
                )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Erro no sync de clientes: {e}")

    def _sync_clients_blocking(self) -> None:
        """Sync bloqueante — rodado em executor para não bloquear event loop.

        Estratégia: reconstrói o dict de clientes ativos a cada ciclo.
        Isso garante que:
          - Novos clientes / reativados são adicionados
          - Clientes desativados são removidos
          - Configs atualizadas (stake, martingale, etc.) são aplicadas
          - Re-toggles rápidos (OFF→ON em < 5s) funcionam corretamente
        """
        resp = (
            self._supabase.table("active_bots")
            .select("*")
            .eq("broker", "deriv")
            .execute()
        )

        # Constrói novo dict apenas com clientes ativos
        new_active: dict[str, dict] = {}
        for row in resp.data:
            if row["is_active"]:
                new_active[row["user_id"]] = self._row_to_client(row)

        # Detecta mudanças para logging
        old_ids = set(self.active_clients.keys())
        new_ids = set(new_active.keys())

        for uid in (new_ids - old_ids):
            logger.info(
                f"✅ Cliente ativado: {uid} — "
                f"stake={new_active[uid]['stake']} "
                f"(total: {len(new_active)})"
            )
        for uid in (old_ids - new_ids):
            logger.info(f"❌ Cliente desativado: {uid} (total: {len(new_active)})")

        # Substitui o dict inteiro (atômico para o event loop)
        self.active_clients = new_active

        # Sincroniza estado de risco com os clientes ativos
        self._risk_manager.sync_clients(self.active_clients)

    @staticmethod
    def _row_to_client(row: dict) -> dict[str, Any]:
        """Converte uma row do Supabase no formato usado pelo engine."""
        return {
            "token":       row["deriv_token"],
            "stake":       float(row["stake_amount"]),
            "strategy_id": row["strategy_id"],
            "symbol":      row.get("symbol", "R_75"),  # ativo default
            "record_id":   row["id"],
            # ── Gestão de Risco ──────────────────────────────────────────
            "use_martingale":    row.get("use_martingale", False),
            "max_gale":          row.get("max_gale", 3),
            "martingale_factor": float(row.get("martingale_factor", 2.5)),
            "stop_win":          float(row.get("stop_win", 50.0)),
            "stop_loss":         float(row.get("stop_loss", 25.0)),
            # ── Soros ────────────────────────────────────────────────────
            "use_soros":         row.get("use_soros", False),
            "soros_levels":      row.get("soros_levels", 2),
        }

    # ── Handler de sinal ──────────────────────────────────────────────────

    async def on_signal(self, sinal: dict) -> None:
        """
        Chamado pelo MarketAnalyzer quando há sinal de trading.

        Dispara ordens para clientes ativos com gestão de risco:
          - Verifica se o cliente pode operar (stop win/loss, streak pause)
          - Calcula stake via RiskManager (martingale, soros)
          - Executa ordens em paralelo
          - Processa resultados no RiskManager
        """
        if not self.active_clients:
            return

        ativo      = sinal.get("ativo", "R_75")
        digito     = sinal.get("digito", 5)
        confidence = sinal.get("confidence", 0.0)

        self._total_signals_dispatched += 1

        # Filtra clientes que podem operar (stop/streak protection)
        eligible = {
            uid: info
            for uid, info in self.active_clients.items()
            if self._risk_manager.should_trade(uid)
        }

        if not eligible:
            return

        logger.info(
            f"🔫 Sinal #{self._total_signals_dispatched} | "
            f"ativo={ativo} | "
            f"digito_alvo={digito} | "
            f"confidence={confidence:.3f} | "
            f"elegíveis={len(eligible)}/{len(self.active_clients)}"
        )

        # Cria coroutines com stake calculado pelo RiskManager
        tasks = [
            self._order_executor.execute_order(
                user_id=uid,
                token=info["token"],
                stake=self._risk_manager.get_stake(uid),
                strategy_id=info["strategy_id"],
                symbol=ativo,
                digito_alvo=digito,
            )
            for uid, info in eligible.items()
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)
        self._total_orders_sent += len(tasks)

        # Salva resultados e processa gestão de risco
        await self._save_results(results)

    # ── Persistência de resultados ─────────────────────────────────────────

    async def _save_results(self, results: list) -> None:
        """Batch insert dos resultados + atualiza RiskManager por cliente."""
        rows_to_insert = []
        for res in results:
            if isinstance(res, Exception):
                self._total_errors += 1
                logger.error(f"Exceção em execute_order: {res}")
                continue
            if isinstance(res, dict):
                rows_to_insert.append(res)

                # ── Processa resultado no RiskManager ──────────────────
                uid    = res.get("user_id", "")
                status = res.get("status", "")
                profit = float(res.get("profit", 0))
                if status in ("won", "lost"):
                    self._risk_manager.process_result(uid, status, profit)

        if not rows_to_insert:
            return

        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self._supabase.table("trade_history").insert(rows_to_insert).execute()
            )
            logger.debug(f"✅ {len(rows_to_insert)} trade(s) registrados no Supabase.")
        except Exception as e:
            self._total_errors += 1
            logger.error(f"Erro ao salvar trade_history: {e}")

    # ── Loop de monitoramento ─────────────────────────────────────────────

    async def _health_log_loop(self) -> None:
        """Loga métricas de saúde a cada HEALTH_LOG_INTERVAL_S segundos."""
        while True:
            await asyncio.sleep(HEALTH_LOG_INTERVAL_S)
            uptime_min = (time.time() - self._started_at) / 60
            logger.info(
                f"📊 HEALTH | "
                f"uptime={uptime_min:.1f}min | "
                f"clientes={len(self.active_clients)} | "
                f"sinais={self._total_signals_dispatched} | "
                f"ordens={self._total_orders_sent} | "
                f"erros={self._total_errors}"
            )
