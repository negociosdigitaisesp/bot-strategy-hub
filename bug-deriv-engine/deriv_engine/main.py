"""
deriv_engine/main.py — Ponto de entrada do Deriv Engine.

Uso na VPS:
    cd /home/ubuntu/deriv_engine
    python3 main.py

Ou via systemd (recomendado):
    sudo systemctl start deriv-engine
"""
import asyncio
import logging
import signal
import sys

from engine import DerivEngine


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )
    # Diminui verbosidade de libs externas
    logging.getLogger("websockets").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


async def main() -> None:
    engine = DerivEngine()

    # Graceful shutdown em SIGTERM (systemd envia isso ao parar)
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def handle_signal():
        logging.info("🛑 Sinal de parada recebido. Encerrando...")
        stop_event.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, handle_signal)

    # Executa engine e monitora stop_event em paralelo
    engine_task = asyncio.create_task(engine.run(), name="deriv_engine")
    stop_task   = asyncio.create_task(stop_event.wait(), name="stop_monitor")

    done, pending = await asyncio.wait(
        [engine_task, stop_task],
        return_when=asyncio.FIRST_COMPLETED,
    )

    for task in pending:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    logging.info("✅ DerivEngine encerrado.")


if __name__ == "__main__":
    setup_logging()
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Interrompido pelo usuário.")
