"""
IQ Engine — Shadow Engine (Fase 2)
====================================
Valida o Trader-B (Momentum) em tempo real contra a IQ Option
em modo PRACTICE (shadow trading — zero execução de ordem real).

Fluxo por ativo:
  1. Subscreve candles M1 em tempo real
  2. Mantém buffer das últimas 15 velas fechadas
  3. Calcula sinal Trader-B a cada vela fechada
  4. Se sinal: registra no Redis, aguarda 60s, avalia resultado
  5. Atualiza estatísticas no Redis

Uso:
    python src/engine/shadow_engine.py

Saída:
    Terminal em tempo real + shadow_results/shadow_YYYY-MM-DD.json no Ctrl+C
"""

import os
import sys
import time
import json
import logging
import signal
import threading
import contextlib
import io
from collections import deque
from datetime import datetime, date
from pathlib import Path

# Adiciona o diretório raiz (2 níveis acima) ao sys.path para garantir que o import src.engine funcione
root_dir = Path(__file__).parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# ─── Forçar UTF-8 no terminal Windows ──────────────────────────────────────────
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import pandas as pd
import numpy as np
import redis as redis_lib
from dotenv import load_dotenv
from iqoptionapi.stable_api import IQ_Option

# ─── Suprimir logs verbosos ─────────────────────────────────────────────────────
logging.getLogger("iqoptionapi").setLevel(logging.CRITICAL)
logging.getLogger("websocket").setLevel(logging.CRITICAL)

# ─── Config ────────────────────────────────────────────────────────────────────
load_dotenv()

EMAIL     = os.getenv("IQ_MASTER_EMAIL")
PASSWORD  = os.getenv("IQ_MASTER_PASSWORD")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

OTC_ASSETS = [
    "EURUSD-OTC",
    "GBPUSD-OTC",
    "USDJPY-OTC",
    "EURJPY-OTC",
    "AUDUSD-OTC",
]

BUFFER_SIZE       = 35    # velas no buffer (aumentado para comportar rolling(20) do pandas sem NaNs)
DEBOUNCE_SECS     = 30    # segundos de cooldown por ativo depois de sinal (reduzido para testes)
CANDLE_DURATION   = 60    # duração do candle M1 em segundos
RESULT_TIMEOUT    = 5     # segundos extras de espera pelo candle de resultado
LOG_EVERY_N_OPS   = 10    # resumo a cada N operações totais
ADX_PERIOD        = 7     # fallback fallback tracker 
RECONNECT_DELAY   = 5     # segundos entre tentativas de reconexão

# ┌─────────────────────────────────────────────────────────────┐
# │  MODO TESTE — relaxa filtros para validar o fluxo completo │
# └─────────────────────────────────────────────────────────────┘
MODO_TESTE        = True
REDIS_SIGNAL_CHANNEL = "iq:signals"             # canal pub/sub para signal_server.js

# ┌─────────────────────────────────────────────────────────────┐
# │  SINAL SINTÉTICO — Gera sinais fakes a cada 15s            │
# └─────────────────────────────────────────────────────────────┘
TEST_MODE = True  # Muda para False em produção (desativa sinais artificiais)

SHADOW_DIR = Path("shadow_results")


# ══════════════════════════════════════════════════════════════════════════════
# REDIS
# ══════════════════════════════════════════════════════════════════════════════

def init_redis() -> redis_lib.Redis:
    """Conecta ao Redis e testa conexão."""
    r = redis_lib.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    return r


# ══════════════════════════════════════════════════════════════════════════════
# IQ OPTION — CONEXÃO
# ══════════════════════════════════════════════════════════════════════════════

def connect_iq(email: str, password: str, timeout: int = 30) -> IQ_Option:
    """Conecta na IQ Option e retorna a instância autenticada."""
    api = IQ_Option(email, password)
    api.connect()

    start = time.time()
    while not api.check_connect():
        if time.time() - start > timeout:
            raise ConnectionError("Timeout: nao foi possivel conectar em 30s.")
        time.sleep(1)

    api.change_balance("PRACTICE")
    return api


# ══════════════════════════════════════════════════════════════════════════════
# QUANT EVALUATOR — ESTRATÉGIAS EVOLUTIVAS
# ══════════════════════════════════════════════════════════════════════════════
from src.engine.quant_evaluator import calculate_rt_features, evaluate_strategies

def load_active_strategies():
    """Carrega as estratégias geradas pelo Auto Quant Factory."""
    json_path = Path("src/engine/active_strategies.json")
    if not json_path.exists():
        return []
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Para testes Shadow, vamos considerar TODAS como approved_for_shadow
            rules = data.get("strategies", [])
            for r in rules:
                r["approved_for_shadow"] = True
            return rules
    except Exception as e:
        print(f"[!] Erro ao carregar active_strategies.json: {e}")
        return []

ACTIVE_STRATEGIES = load_active_strategies()
print(f"[!] {len(ACTIVE_STRATEGIES)} Estratégias Quantitativas Carregadas.")


# ══════════════════════════════════════════════════════════════════════════════
# SHADOW TRACKER — estado por ativo
# ══════════════════════════════════════════════════════════════════════════════

class AssetTracker:
    """Mantém buffer, debounce e estatísticas de um único ativo."""

    def __init__(self, asset: str, redis: redis_lib.Redis):
        self.asset       = asset
        self.redis       = redis
        self.buffer      = deque(maxlen=BUFFER_SIZE)
        self.last_signal = 0.0    # timestamp do último sinal
        self.pending     = None   # sinal aguardando resultado: {"action", "candle_id"}
        self.lock        = threading.Lock()

    def add_candle(self, candle: dict) -> None:
        """Adiciona vela fechada ao buffer."""
        with self.lock:
            self.buffer.append({
                "open":   float(candle.get("open",   candle.get("Open",  0))),
                "high":   float(candle.get("max",    candle.get("High",  0))),
                "low":    float(candle.get("min",    candle.get("Low",   0))),
                "close":  float(candle.get("close",  candle.get("Close", 0))),
                "volume": float(candle.get("volume", candle.get("Volume",0))),
                "ts":     int(candle.get("from",    candle.get("id",     0))),
            })

    def in_debounce(self) -> bool:
        return (time.time() - self.last_signal) < DEBOUNCE_SECS

    def get_stats(self) -> dict:
        wins   = int(self.redis.get(f"iq:stats:{self.asset}:wins")   or 0)
        losses = int(self.redis.get(f"iq:stats:{self.asset}:losses") or 0)
        total  = wins + losses
        wr     = (wins / total * 100) if total > 0 else 0.0
        return {"wins": wins, "losses": losses, "total": total, "win_rate": wr}


# ══════════════════════════════════════════════════════════════════════════════
# GERENCIADOR DE SINAIS
# ══════════════════════════════════════════════════════════════════════════════

class SignalManager:
    """Orquestra detecção de sinais e avaliação de resultados."""

    def __init__(self, api: IQ_Option, redis: redis_lib.Redis):
        self.api        = api
        self.redis      = redis
        self.trackers   = {a: AssetTracker(a, redis) for a in OTC_ASSETS}
        self.total_ops  = 0
        self.ops_lock   = threading.Lock()
        self._stop      = threading.Event()

    def stop(self):
        self._stop.set()

    def on_candle_closed(self, asset: str, candle: dict) -> None:
        """Callback chamado a cada vela M1 fechada."""
        tracker = self.trackers[asset]
        tracker.add_candle(candle)

        if tracker.in_debounce():
            return

        if len(tracker.buffer) < 25:
            return # Aguardar o warmup do buffer vetorizado (20 velas no minimo)
            
        with tracker.lock:
            df_buffer = pd.DataFrame(list(tracker.buffer))
            df_buffer = df_buffer.astype({"open": float, "high": float, "low": float, "close": float, "volume": float})
            df_features = calculate_rt_features(df_buffer)
            # Retorna lista de dict[id -> CALL/PUT]
            multi_signals = evaluate_strategies(df_features, ACTIVE_STRATEGIES)

        if not multi_signals:
            return

        # Para cada estrategia que sinalizou no mesmo tick...
        for strat_id, signal_action in multi_signals.items():
            tracker.last_signal = time.time()
            entry_price = float(candle.get("close", 0))
            ts          = int(time.time())
            
            # Confidence baseada no OOS test
            strat_info = next((s for s in ACTIVE_STRATEGIES if s["id"] == strat_id), None)
            confidence = strat_info.get("validacao_wr", 0.8) if strat_info else 0.8
            
            # Registrar no Redis (adicionado strat_id ao nome de acesso no shadow engine)
            key = f"iq:shadow:{asset}:{ts}:{strat_id}"
            self.redis.hset(key, mapping={
                "asset":       asset,
                "trader":      strat_id,
                "action":      signal_action,
                "entry_price": str(entry_price),
                "timestamp":   str(ts),
                "confidence":  str(round(confidence, 4)),
            })
            self.redis.expire(key, 3600)   # TTL 1h

            # PUBLICAR no canal pub/sub
            import json as _json
            self.redis.publish(REDIS_SIGNAL_CHANNEL, _json.dumps({
                "trader":              strat_id,
                "asset":               asset,
                "action":              signal_action,
                "expiration_minutes":  1,
                "confidence":          round(confidence, 4),
                "entry_price":         entry_price,
                "timestamp":           datetime.utcnow().isoformat() + "Z",
            }))

            now = datetime.now().strftime("%H:%M:%S")
            print(f"[{now}] 🚨 SINAL | {asset:<12} | {signal_action:<4} | "
                  f"trader: {strat_id} | conf: {confidence*100:.1f}%")

            # Avaliar resultado na thread assíncrona
            threading.Thread(
                target=self._evaluate_result,
                args=(tracker, asset, signal_action, entry_price, ts, strat_id),
                daemon=True,
            ).start()

    def _evaluate_result(self, tracker: AssetTracker, asset: str,
                          action: str, entry_price: float, signal_ts: int, strat_id: str) -> None:
        """Aguarda 60s + timeout e avalia se o sinal foi WIN ou LOSS."""
        # Aguardar vela seguinte fechar
        wait_until = signal_ts + CANDLE_DURATION + RESULT_TIMEOUT
        while time.time() < wait_until and not self._stop.is_set():
            time.sleep(0.5)

        if self._stop.is_set():
            return

        # Buscar preço de saída via candle mais recente
        exit_price = self._get_exit_price(asset)
        if exit_price is None:
            return

        # WIN: preço foi na direção esperada
        if action == "CALL":
            win = exit_price > entry_price
        else:
            win = exit_price < entry_price

        result = "WIN" if win else "LOSS"

        # Atualizar contadores individuais por trader no Redis (Tracking avançado)
        if win:
            self.redis.incr(f"iq:stats:{asset}:{strat_id}:wins")
        else:
            self.redis.incr(f"iq:stats:{asset}:{strat_id}:losses")

        # Stats global
        if win:
            self.redis.incr(f"iq:stats:{asset}:wins")
        else:
            self.redis.incr(f"iq:stats:{asset}:losses")
            
        stats = tracker.get_stats()
        self.redis.set(f"iq:stats:{asset}:win_rate", f"{stats['win_rate']:.2f}")

        # Print da operação
        now     = datetime.now().strftime("%H:%M:%S")
        result_color = "WIN " if win else "LOSS"
        wr_str  = f"{stats['win_rate']:.1f}%"
        print(
            f"[{now}] {asset:<12} | {action:<4} | {result_color} | "
            f"trader:{strat_id} | entry:{entry_price:.5f} exit:{exit_price:.5f} | "
            f"wr_global: {wr_str}"
        )

        # Atualizar resultado no hash Redis
        key = f"iq:shadow:{asset}:{signal_ts}:{strat_id}"
        self.redis.hset(key, mapping={
            "exit_price": str(exit_price),
            "result":     result,
        })

        # Contagem total e resumo periódico
        with self.ops_lock:
            self.total_ops += 1
            if self.total_ops % LOG_EVERY_N_OPS == 0:
                self._print_summary()

    def _get_exit_price(self, asset: str) -> float | None:
        """Retorna o close da vela atual (proxy do preço de saída)."""
        try:
            candles = self.api.get_candles(asset, 60, 1, time.time())
            if candles:
                return float(candles[-1].get("close", 0))
        except Exception:
            pass
        return None

    def _print_summary(self) -> None:
        """Imprime resumo geral de todas as operações e traders."""
        print("\n" + "=" * 55)
        print(f"  RESUMO -- {self.total_ops} operacoes acumuladas")
        print("=" * 55)
        for asset in OTC_ASSETS:
            s_all = self.trackers[asset].get_stats()
            if s_all["total"] > 0:
                print(f"  {asset:<14}  Global WR: {s_all['win_rate']:>5.1f}%  ({s_all['total']} ops)")
                
                # Resumo individual por trader operando neste ativo
                for strat in ACTIVE_STRATEGIES:
                    sid = strat["id"]
                    wins = int(self.redis.get(f"iq:stats:{asset}:{sid}:wins") or 0)
                    losses = int(self.redis.get(f"iq:stats:{asset}:{sid}:losses") or 0)
                    tot = wins + losses
                    if tot > 0:
                        wr = (wins / tot) * 100
                        print(f"    └─ {sid:<12} wr: {wr:>5.1f}% ({tot} ops)")
        print("=" * 55 + "\n")


# ══════════════════════════════════════════════════════════════════════════════
# WATCHER DE CANDLES POR ATIVO
# ══════════════════════════════════════════════════════════════════════════════

import contextlib as _ctx
import io as _io


@contextlib.contextmanager
def _suppress_iq_prints():
    """
    Suprime prints internos da iqoptionapi (ex.: 'Asset X not found on consts')
    redirecionando temporariamente sys.stdout para um buffer descartável.
    O stdout do thread principal não é afetado.
    """
    original_stdout = sys.stdout
    original_stderr = sys.stderr
    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()
    try:
        yield
    finally:
        sys.stdout = original_stdout
        sys.stderr = original_stderr


def watch_asset(asset: str, api: IQ_Option, mgr: SignalManager) -> None:
    """
    Loop de polling de candles M1 para um ativo.
    Detecta vela fechada comparando o timestamp do candle atual.
    Roda em thread dedicada por ativo.
    """
    last_candle_ts  = 0
    unavail_warned  = False
    print(f"  [*] Monitorando: {asset}")

    while not mgr._stop.is_set():
        try:
            with _suppress_iq_prints():
                candles = api.get_candles(asset, 60, 2, time.time())

            if not candles or len(candles) < 2:
                # Ativo indisponível neste horário (OTC fechado)
                if not unavail_warned:
                    print(f"  [~] {asset}: sem candles agora (mercado OTC fechado?) — aguardando...")
                    unavail_warned = True
                time.sleep(30)   # checar de novo em 30s
                continue

            unavail_warned = False

            # O penúltimo candle é o último fechado
            closed_candle = candles[-2]
            closed_ts     = int(closed_candle.get("from", 0))

            if closed_ts > last_candle_ts:
                last_candle_ts = closed_ts
                mgr.on_candle_closed(asset, closed_candle)

            # Aguarda antes do próximo poll para não sobrecarregar
            time.sleep(5)

        except Exception as e:
            if not mgr._stop.is_set():
                print(f"  [!] Erro em {asset}: {e} — reconectando em {RECONNECT_DELAY}s")
                time.sleep(RECONNECT_DELAY)


# ══════════════════════════════════════════════════════════════════════════════
# RELATÓRIO FINAL
# ══════════════════════════════════════════════════════════════════════════════

def save_report(mgr: SignalManager) -> str:
    """Salva JSON com estatísticas finais."""
    SHADOW_DIR.mkdir(exist_ok=True)
    today    = date.today().isoformat()
    out_path = SHADOW_DIR / f"shadow_{today}.json"

    results = []
    for asset in OTC_ASSETS:
        s = mgr.trackers[asset].get_stats()
        results.append({
            "asset":    asset,
            "wins":     s["wins"],
            "losses":   s["losses"],
            "total":    s["total"],
            "win_rate": round(s["win_rate"], 2),
            "aprovado": s["total"] >= 30 and s["win_rate"] >= 57.0,
        })

    payload = {
        "run_date":   today,
        "run_time":   datetime.now().isoformat(),
        "total_ops":  mgr.total_ops,
        "results":    results,
        "summary": {
            "approved": [r["asset"] for r in results if r["aprovado"]],
            "rejected": [r["asset"] for r in results if not r["aprovado"]],
        },
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    return str(out_path)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 55)
    print("  IQ ENGINE -- Shadow Engine (Fase 2)")
    print(f"  Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("  Modo:   SHADOW TRADING (zero execucao real)")
    print("=" * 55)

    # ─── Redis ──────────────────────────────────────────────────────────────────
    print("\n[Redis] Conectando...")
    try:
        r = init_redis()
        print("[Redis] OK\n")
    except Exception as e:
        print(f"[Redis] ERRO: {e}")
        print("  Inicie o Redis antes: redis-server.exe")
        sys.exit(1)

    # ─── IQ Option ──────────────────────────────────────────────────────────────
    print("[IQ] Conectando na IQ Option...")
    api = None
    for attempt in range(3):
        try:
            api = connect_iq(EMAIL, PASSWORD)
            print(f"[IQ] Conectado como {EMAIL} (PRACTICE)\n")
            break
        except Exception as e:
            print(f"[IQ] Tentativa {attempt+1}/3 falhou: {e}")
            time.sleep(RECONNECT_DELAY)

    if api is None:
        print("[IQ] Nao foi possivel conectar. Verifique credenciais.")
        sys.exit(1)

    # ─── Signal Manager ─────────────────────────────────────────────────────────
    mgr = SignalManager(api, r)

    # ─── Graceful shutdown via Ctrl+C ───────────────────────────────────────────
    def shutdown(signum, frame):
        print("\n\n[!] Encerrando shadow engine...")
        mgr.stop()

    signal.signal(signal.SIGINT,  shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # ─── Threads por ativo ──────────────────────────────────────────────────────
    print(f"Monitorando {len(OTC_ASSETS)} pares OTC (debounce: {DEBOUNCE_SECS}s):")
    threads = []
    for asset in OTC_ASSETS:
        t = threading.Thread(
            target=watch_asset,
            args=(asset, api, mgr),
            daemon=True,
        )
        t.start()
        threads.append(t)
        time.sleep(0.5)   # escalonar conexões

    print("\nAguardando sinais do Quant Evaluator (Ctrl+C para encerrar)...\n")
    print(f"{'─'*65}")
    print(f"{'[HH:MM:SS]':<12} {'Ativo':<14} {'Dir':<6} {'Res':<5} {'Trader':<12}")
    print(f"{'─'*65}")

    # ─── Loop principal ─────────────────────────────────────────────────────────
    # Reconexão automática se a IQ Option desconectar
    
    if TEST_MODE:
        pass # Os logs mockados do Trader B foram desativados em prol da análise real do Quant Evaluator OOS

    while not mgr._stop.is_set():
        if not api.check_connect():
            print("\n[IQ] Conexao perdida — reconectando...")
            try:
                api.connect()
                time.sleep(RECONNECT_DELAY)
                if api.check_connect():
                    api.change_balance("PRACTICE")
                    print("[IQ] Reconectado OK\n")
            except Exception as e:
                print(f"[IQ] Falha na reconexao: {e}")
        time.sleep(10)

    # ─── Resultado final ────────────────────────────────────────────────────────
    mgr._print_summary()
    report_path = save_report(mgr)
    print(f"\nRelatorio salvo em: {report_path}")
    print("\nShadow engine encerrado.\n")


if __name__ == "__main__":
    main()
