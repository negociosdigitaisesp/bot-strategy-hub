import json, sys, os
sys.path.insert(0, '/root/bug-deriv-engine')

state_file = '/tmp/bug_deriv_state.json'
if os.path.exists(state_file):
    with open(state_file) as f:
        estado = json.load(f)
    total_trades = estado.get('total_trades', 0)
    ph = estado.get('payout_historico', {})
    dh = estado.get('digit_historico', {})
    print("[STATE] total_trades=%d" % total_trades)
    print("[STATE] payout amostras: %s" % str({k: len(v) for k, v in ph.items()}))
    print("[STATE] digit amostras:  %s" % str({k: len(v) for k, v in dh.items()}))
else:
    print("[STATE] SEM ARQUIVO DE ESTADO")
    ph = {}
    dh = {}
    total_trades = 0

from config import (
    ATIVOS, PAYOUT_PERCENTIL_MIN, PAYOUT_CV_MAX, PAYOUT_AMOSTRAS_MIN,
    CHISQUARE_P_MIN, DIGIT_AMOSTRAS_MIN, LGN_MIN_TRADES
)
from engine.payout_monitor import PayoutMonitor
from engine.qualificador import Qualificador
from engine.health_guard import HealthGuard

pm = PayoutMonitor(historico_inicial=ph if ph else None)
ql = Qualificador(historico_inicial=dh if dh else None)
hg = HealthGuard()

print("\n=== GATE 3: LGN ===")
print("LGN_MIN=%d total_trades=%d -> %s" % (
    LGN_MIN_TRADES, total_trades,
    "OK" if total_trades >= LGN_MIN_TRADES else "BLOQUEADO"
))

print("\n=== GATE 4: PAYOUT ===")
print("Config: percentil_min=%.2f cv_max=%.3f amostras_min=%d" % (
    PAYOUT_PERCENTIL_MIN, PAYOUT_CV_MAX, PAYOUT_AMOSTRAS_MIN))
for ativo in ATIVOS:
    n = pm.amostras(ativo)
    pct = pm.percentil_atual(ativo)
    cv = pm.cv_atual(ativo)
    ev = pm.ev_atual(ativo)
    q = pm.ativo_qualificado(ativo)
    print("  %s: n=%d pct=%.3f cv=%.4f ev=%.4f -> %s" % (
        ativo, n, pct, cv if cv < 900 else -1, ev, "OK" if q else "FAIL"))

melhor, melhor_ev = pm.melhor_ativo()
print("Melhor ativo: %s ev=%.4f" % (str(melhor), melhor_ev))

print("\n=== GATE 5+6: DIGITOS ===")
print("Config: amostras_min=%d p_min=%.3f" % (DIGIT_AMOSTRAS_MIN, CHISQUARE_P_MIN))
for ativo in ATIVOS:
    n = ql.amostras(ativo)
    if n >= DIGIT_AMOSTRAS_MIN:
        ok, p = ql.distribuicao_normal(ativo)
        print("  %s: n=%d p=%.4f -> %s" % (ativo, n, p, "OK" if ok else "FAIL"))
    else:
        print("  %s: n=%d/%d -> BLOQUEADO (insuficiente)" % (ativo, n, DIGIT_AMOSTRAS_MIN))

print("\n=== CONCLUSAO ===")
if total_trades < LGN_MIN_TRADES:
    print("GATE 3 BLOQUEADO: aquecimento %d/%d" % (total_trades, LGN_MIN_TRADES))
elif melhor is None:
    print("GATE 4 BLOQUEADO: nenhum ativo qualificado por payout")
    print("CAUSA: payout_collector_loop nao esta coletando payouts da API Deriv")
else:
    print("Gates 3/4 OK. Verificar gate 6 (chi-square)")
