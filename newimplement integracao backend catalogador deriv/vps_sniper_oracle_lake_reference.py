"""
vps_sniper_oracle_lake_reference.py
VPS Sniper de referência para o Oracle Quant Lake

@DEBUG_SENTINEL: FIX para variacao=null
O campo `variacao` estava nulo porque o Sniper não incluía `filtros_aprovados`
no payload do INSERT. Este script corrige isso.

INSTALAÇÃO NA VPS:
  pip install supabase python-dotenv

VARIÁVEIS DE AMBIENTE (.env na VPS):
  ORACLE_SUPABASE_URL=https://seu-oracle.supabase.co
  ORACLE_SUPABASE_KEY=eyJ... (service_role key do Oracle Quant)
  MB_SUPABASE_URL=https://seu-mb.supabase.co
  MB_SUPABASE_KEY=eyJ... (service_role key do Million Bots)
"""

import asyncio
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SNIPER_ORACLE")

# ── Clientes Supabase ──────────────────────────────────────────────────────────

# Supabase B — Oracle Quant (contém vw_sinais_autorizados)
oracle: Client = create_client(
    os.environ["ORACLE_SUPABASE_URL"],
    os.environ["ORACLE_SUPABASE_KEY"],
)

# Supabase A — Million Bots (onde os sinais são inseridos para o frontend)
mb: Client = create_client(
    os.environ["MB_SUPABASE_URL"],
    os.environ["MB_SUPABASE_KEY"],
)


# ── Funções principais ─────────────────────────────────────────────────────────

def get_clientes_autorizados(strategy_id: str) -> list[dict]:
    """
    Consulta vw_sinais_autorizados no Supabase B.
    Retorna clientes com ativo_flag=TRUE para essa estratégia.

    @DEBUG_SENTINEL: inclui filtros_aprovados → será salvo como variacao no sinal
    """
    try:
        resp = (
            oracle
            .schema("hft_lake")
            .from_("vw_sinais_autorizados")
            .select(
                "client_id, stake_final, ativo, hh_mm, direcao, "
                "status, filtros_aprovados, n_filtros"  # ← @FIX: inclui filtros_aprovados
            )
            .eq("strategy_id", strategy_id)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.error("[ORACLE] Erro ao buscar clientes autorizados: %s", e)
        return []


def broadcast_signal(
    client_id: str,
    strategy_id: str,
    ativo: str,
    hh_mm: str,
    direcao: str,
    status: str,
    stake_final: float,
    filtros_aprovados: str | None,  # @FIX: variacao agora é preenchida!
) -> bool:
    """
    Insere um sinal na tabela public.signals do Supabase A.

    @DEBUG_SENTINEL: campo variacao agora recebe filtros_aprovados do Oracle Quant
    Isso resolve o bug variacao=null que aparecia nos logs do console frontend.
    """
    try:
        payload = {
            "client_id":   client_id,
            "strategy_id": strategy_id,
            "ativo":       ativo,
            "hh_mm":       hh_mm,
            "direcao":     direcao,
            "status":      status,
            "stake_final": stake_final,
            # @FIX: era None antes — agora vem de filtros_aprovados da grade
            "variacao":    filtros_aprovados or "SEM_FILTRO",
        }

        mb.schema("public").from_("signals").insert(payload).execute()
        logger.info(
            "[MB] Sinal inserido: %s | %s | %s | %s | variacao=%s",
            client_id[:8], strategy_id, status, ativo, filtros_aprovados
        )
        return True
    except Exception as e:
        logger.error("[MB] Erro ao inserir sinal: %s", e)
        return False


async def sniper_loop(strategy_id: str, hh_mm_alvo: str) -> None:
    """
    Loop principal do sniper para uma estratégia específica.

    Timing:
      - No segundo :50 do minuto anterior → INSERT PRE_SIGNAL
      - No segundo :00 do minuto alvo → INSERT CONFIRMED

    Args:
      strategy_id: ex. "T1430_R100_CALL"
      hh_mm_alvo:  ex. "14:30"
    """
    hora_alvo, minuto_alvo = map(int, hh_mm_alvo.split(":"))
    logger.info("[SNIPER] Aguardando %s para estratégia %s", hh_mm_alvo, strategy_id)

    while True:
        agora = datetime.now(tz=timezone.utc)
        hora_atual = agora.hour
        min_atual  = agora.minute
        seg_atual  = agora.second

        # Minuto anterior ao alvo, segundo :50 → PRE_SIGNAL
        minuto_pre = minuto_alvo - 1 if minuto_alvo > 0 else 59
        hora_pre   = hora_alvo  if minuto_alvo > 0 else hora_alvo - 1

        if (hora_atual == hora_pre and min_atual == minuto_pre and seg_atual == 50):
            clientes = get_clientes_autorizados(strategy_id)
            logger.info("[SNIPER] PRE_SIGNAL — %d clientes autorizados", len(clientes))
            for c in clientes:
                broadcast_signal(
                    client_id=c["client_id"],
                    strategy_id=strategy_id,
                    ativo=c["ativo"],
                    hh_mm=c["hh_mm"],
                    direcao=c["direcao"],
                    status="PRE_SIGNAL",
                    stake_final=float(c.get("stake_final", 1.0)),
                    filtros_aprovados=c.get("filtros_aprovados"),  # @FIX
                )
            await asyncio.sleep(1)

        # Minuto alvo, segundo :00 → CONFIRMED
        elif (hora_atual == hora_alvo and min_atual == minuto_alvo and seg_atual == 0):
            clientes = get_clientes_autorizados(strategy_id)
            logger.info("[SNIPER] CONFIRMED — %d clientes autorizados", len(clientes))
            for c in clientes:
                broadcast_signal(
                    client_id=c["client_id"],
                    strategy_id=strategy_id,
                    ativo=c["ativo"],
                    hh_mm=c["hh_mm"],
                    direcao=c["direcao"],
                    status="CONFIRMED",
                    stake_final=float(c.get("stake_final", 1.0)),
                    filtros_aprovados=c.get("filtros_aprovados"),  # @FIX
                )
            await asyncio.sleep(1)

        await asyncio.sleep(0.5)


# ── Entrypoint ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Exemplo: rodar para uma estratégia específica
    # Para múltiplas estratégias, carregar de vw_grade_unificada e criar tasks
    import sys
    strategy = sys.argv[1] if len(sys.argv) > 1 else "T1430_R100_CALL"
    hh_mm    = sys.argv[2] if len(sys.argv) > 2 else "14:30"

    asyncio.run(sniper_loop(strategy, hh_mm))
