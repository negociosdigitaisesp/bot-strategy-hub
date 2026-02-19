"""
main.py — Orquestrador do Bug Deriv Signal Engine.

Responsabilidade: inicializar todos os módulos, conectar callbacks
e manter o servidor rodando 24h. Zero lógica de negócio aqui.
"""
import asyncio
import logging

from config import LGN_MIN_TRADES, STATE_SAVE_INTERVAL
from state.cache import load_state, save_state
from engine.ws_pool import DerivWSPool
from engine.tick_router import TickRouter
from engine.payout_monitor import PayoutMonitor
from engine.qualificador import Qualificador
from engine.health_guard import HealthGuard
from engine.signal_engine import SignalEngine
from engine.broadcaster import Broadcaster, payout_collector_loop


async def main() -> None:
    # ── 1. Carrega estado anterior (restart rápido sem re-aquecer) ─────────────
    estado = load_state()
    if estado:
        logging.info(
            f"Estado restaurado — trades={estado['total_trades']}"
        )
    else:
        logging.info("Sem estado anterior — iniciando do zero.")

    # ── 2. Inicializa módulos com histórico salvo ───────────────────────────────
    payout_monitor = PayoutMonitor(
        historico_inicial=estado["payout_historico"] if estado else None
    )
    qualificador = Qualificador(
        historico_inicial=estado["digit_historico"] if estado else None
    )
    health_guard  = HealthGuard()
    signal_engine = SignalEngine(
        payout_monitor=payout_monitor,
        qualificador=qualificador,
        health_guard=health_guard,
        lgn_min=LGN_MIN_TRADES,
        total_trades_inicial=estado["total_trades"] if estado else 0,
    )

    tick_router = TickRouter()
    broadcaster = Broadcaster()

    # ── 3. Callback de tick — coração do sistema ───────────────────────────────
    async def on_tick(ativo: str, digito: int, quote: float, epoch: int) -> None:
        # Registra tick e dígito nos módulos de estado
        tick_router.register_tick(ativo, digito, quote, epoch)
        qualificador.registrar_digito(ativo, digito)

        # Decide se emite sinal
        sinal = signal_engine.processar_tick(
            ativo=ativo,
            digito=digito,
            quote=quote,
            epoch=epoch,
            rtt_ms=ws_pool.rtt_ms,
        )

        # Só distribui sinais positivos — clientes não recebem spam
        if sinal and sinal.get("entrar"):
            await broadcaster.broadcast(sinal)

    # ── 4. Cria pool com callback registrado ───────────────────────────────────
    ws_pool = DerivWSPool(on_tick=on_tick)

    # Integra health_guard com eventos de conexão do pool
    # (ws_pool chama esses métodos internamente via monkey-patch leve)
    ws_pool._health_guard = health_guard

    # ── 5. Loop de persistência de estado ─────────────────────────────────────
    async def state_saver() -> None:
        while True:
            await asyncio.sleep(STATE_SAVE_INTERVAL)
            try:
                save_state(
                    payout_historico=payout_monitor.exportar_historico(),
                    digit_historico=qualificador.exportar_historico(),
                    total_trades=signal_engine.total_trades,
                )
            except Exception as e:
                logging.error(f"Erro ao salvar estado: {e}")

    # ── 6. Sobe servidor WebSocket para clientes ───────────────────────────────
    servidor = await broadcaster.iniciar_servidor()
    logging.info("Sistema pronto. Aguardando ticks...")

    # ── 7. Executa tudo em paralelo ────────────────────────────────────────────
    try:
        await asyncio.gather(
            ws_pool.start(),                              # inicia pool (conn A + B)
            payout_collector_loop(ws_pool, payout_monitor),  # coleta payouts
            state_saver(),                                # persiste estado
            asyncio.get_event_loop().create_future(),    # mantém servidor vivo
        )
    finally:
        # Garante save final ao encerrar
        try:
            save_state(
                payout_historico=payout_monitor.exportar_historico(),
                digit_historico=qualificador.exportar_historico(),
                total_trades=signal_engine.total_trades,
            )
            logging.info("Estado salvo no encerramento.")
        except Exception as e:
            logging.error(f"Erro no save final: {e}")
        servidor.close()
        await servidor.wait_closed()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Servidor encerrado pelo usuário.")
