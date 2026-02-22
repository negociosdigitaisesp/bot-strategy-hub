"""
deriv_engine/order_executor.py — Executor de ordens na Deriv.

Cada chamada a execute_order():
  1. Abre uma nova conexão WebSocket com a Deriv
  2. Autoriza com o token do cliente
  3. Envia a ordem (DIGITDIFF com barreira = dígito_alvo)
  4. Recebe o contract_id
  5. Fecha a conexão e retorna um dict de resultado

Performance: uma coroutine leve por cliente, sem estado interno.
A concorrência entre clientes é gerenciada por asyncio.gather() no engine.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

import websockets

from config import DERIV_WSS_PRIMARY, DERIV_WSS_FALLBACK

logger = logging.getLogger("ORDER_EXECUTOR")


class OrderExecutor:
    """Executa ordens DIGITDIFF na Deriv para um cliente especÍfico."""

    async def execute_order(
        self,
        *,
        user_id: str,
        token: str,
        stake: float,
        strategy_id: str,
        symbol: str,
        digito_alvo: int,
    ) -> dict:
        """
        Executa uma ordem DIGITDIFF para o cliente user_id.

        Tenta a URL primária. Em caso de falha de conexão, tenta a fallback.

        Retorna dict compatível com a tabela trade_history.
        Nunca lança exceção — erros são capturados e retornados como status.
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        for attempt, url in enumerate([DERIV_WSS_PRIMARY, DERIV_WSS_FALLBACK]):
            try:
                return await self._do_order(
                    url=url,
                    user_id=user_id,
                    token=token,
                    stake=stake,
                    strategy_id=strategy_id,
                    symbol=symbol,
                    digito_alvo=digito_alvo,
                    now_iso=now_iso,
                )
            except Exception as e:
                if attempt == 0:
                    logger.warning(
                        f"[ORDER] Falha em {url} para {user_id}: {e}. "
                        f"Tentando fallback..."
                    )
                    continue
                # Ambas as URLs falharam
                logger.error(f"[ORDER] Erro fatal para {user_id}: {e}")
                return {
                    "user_id": user_id,
                    "broker": "deriv",
                    "strategy_id": strategy_id,
                    "contract_type": "DIGITDIFF",
                    "stake": stake,
                    "status": "exception",
                    "profit": 0,
                    "contract_id": None,
                    "raw_response": {"exception": str(e)},
                    "executed_at": now_iso,
                }

    async def _do_order(
        self,
        *,
        url: str,
        user_id: str,
        token: str,
        stake: float,
        strategy_id: str,
        symbol: str,
        digito_alvo: int,
        now_iso: str,
    ) -> dict:
        """Conexão, autorização e compra — WS de vida curta."""
        async with websockets.connect(url, ping_interval=None, open_timeout=10) as ws:

            # ── 1. Autorizar ────────────────────────────────────────────────
            await ws.send(json.dumps({"authorize": token}))
            auth_raw = await asyncio.wait_for(ws.recv(), timeout=8.0)
            auth = json.loads(auth_raw)

            if auth.get("error"):
                return {
                    "user_id": user_id,
                    "broker": "deriv",
                    "strategy_id": strategy_id,
                    "contract_type": "DIGITDIFF",
                    "stake": stake,
                    "status": "auth_error",
                    "profit": 0,
                    "contract_id": None,
                    "raw_response": auth,
                    "executed_at": now_iso,
                }

            # ── 2. Comprar ─────────────────────────────────────────────────
            # DIGITDIFF: aposta que o último dígito é DIFERENTE de digito_alvo
            buy_payload = {
                "buy": 1,
                "price": stake,
                "parameters": {
                    "amount": stake,
                    "basis": "stake",
                    "contract_type": "DIGITDIFF",
                    "currency": "USD",
                    "duration": 1,
                    "duration_unit": "t",      # ticks (1 tick = contrato mais rápido)
                    "symbol": symbol,
                    "barrier": str(digito_alvo),  # dígito a ser diferente
                },
            }
            await ws.send(json.dumps(buy_payload))

            # Consome mensagens até receber a resposta de compra
            resp = {}
            for _ in range(5):
                resp_raw = await asyncio.wait_for(ws.recv(), timeout=8.0)
                resp = json.loads(resp_raw)
                if resp.get("msg_type") == "buy" or "buy" in resp or "error" in resp:
                    break

            if resp.get("error"):
                return {
                    "user_id": user_id,
                    "broker": "deriv",
                    "strategy_id": strategy_id,
                    "contract_type": "DIGITDIFF",
                    "stake": stake,
                    "status": "order_error",
                    "profit": 0,
                    "contract_id": None,
                    "raw_response": resp,
                    "executed_at": now_iso,
                }

            buy_data = resp.get("buy", {})
            contract_id = buy_data.get("contract_id")

            logger.info(
                f"[ORDER] Ordem aberta para {user_id} | "
                f"contract={contract_id} | stake={stake}"
            )

            # ── 3. Aguardar resultado (settlement) ────────────────────────
            # Subscreve ao contrato para receber o resultado
            if contract_id:
                await ws.send(json.dumps({
                    "proposal_open_contract": 1,
                    "contract_id": contract_id,
                    "subscribe": 1,
                }))

                # Aguarda o contrato fechar (is_sold=1 ou is_expired=1)
                final_profit = 0.0
                final_status = "opened"
                try:
                    for _ in range(20):  # máximo ~15s
                        msg_raw = await asyncio.wait_for(ws.recv(), timeout=15.0)
                        msg = json.loads(msg_raw)
                        poc = msg.get("proposal_open_contract", {})
                        if poc.get("is_sold") or poc.get("is_expired"):
                            final_profit = float(poc.get("profit", 0))
                            final_status = "won" if final_profit > 0 else "lost"
                            logger.info(
                                f"[ORDER] Resultado {user_id}: {final_status} | "
                                f"profit={final_profit:+.2f} USD"
                            )
                            break
                except asyncio.TimeoutError:
                    logger.warning(f"[ORDER] Timeout aguardando resultado para {user_id}")
                    final_status = "timeout"

                return {
                    "user_id": user_id,
                    "broker": "deriv",
                    "strategy_id": strategy_id,
                    "contract_type": "DIGITDIFF",
                    "stake": stake,
                    "status": final_status,
                    "profit": final_profit,
                    "contract_id": str(contract_id),
                    "raw_response": resp,
                    "executed_at": now_iso,
                }

            return {
                "user_id": user_id,
                "broker": "deriv",
                "strategy_id": strategy_id,
                "contract_type": "DIGITDIFF",
                "stake": stake,
                "status": "no_contract",
                "profit": 0,
                "contract_id": None,
                "raw_response": resp,
                "executed_at": now_iso,
            }
