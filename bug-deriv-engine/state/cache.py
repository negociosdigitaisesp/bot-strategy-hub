import json
import logging
from config import STATE_FILE

logger = logging.getLogger(__name__)


def save_state(payout_historico: dict, digit_historico: dict, total_trades: int) -> None:
    """Serializa o estado atual para STATE_FILE como JSON."""
    state = {
        "payout_historico": payout_historico,
        "digit_historico": digit_historico,
        "total_trades": total_trades,
    }
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False)
        logger.debug(f"Estado salvo em {STATE_FILE} (trades={total_trades})")
    except Exception as e:
        logger.error(f"Erro ao salvar estado: {e}")


def load_state() -> dict | None:
    """
    Carrega o estado persistido de STATE_FILE.

    Retorna dict com chaves:
        - "payout_historico": dict
        - "digit_historico": dict
        - "total_trades": int
    Ou None se o arquivo não existir ou estiver corrompido.
    """
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            state = json.load(f)
        # Validação mínima das chaves esperadas
        required = {"payout_historico", "digit_historico", "total_trades"}
        if not required.issubset(state.keys()):
            logger.warning("Estado carregado com chaves incompletas — ignorando.")
            return None
        logger.info(
            f"Estado carregado de {STATE_FILE} "
            f"(trades={state['total_trades']})"
        )
        return state
    except FileNotFoundError:
        logger.info(f"Arquivo de estado não encontrado: {STATE_FILE}")
        return None
    except (json.JSONDecodeError, Exception) as e:
        logger.error(f"Estado corrompido ou ilegível: {e}")
        return None
