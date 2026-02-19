# -*- coding: utf-8 -*-
"""
live_diagnosis.py - Roda diagnóstico ao vivo na VPS:
1. Carrega o estado atual do JSON
2. Instancia os módulos
3. Avalia cada gate para cada ativo
4. Mostra exatamente o que está bloqueando os sinais
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
REMOTE = "/root/bug-deriv-engine"

DIAG_SCRIPT = r"""
import json, sys, os
sys.path.insert(0, '/root/bug-deriv-engine')

# Carrega estado
state_file = '/tmp/bug_deriv_state.json'
if os.path.exists(state_file):
    with open(state_file) as f:
        estado = json.load(f)
    print(f"[STATE] total_trades={estado.get('total_trades', 0)}")
    ph = estado.get('payout_historico', {})
    dh = estado.get('digit_historico', {})
    print(f"[STATE] payout amostras: { {k: len(v) for k, v in ph.items()} }")
    print(f"[STATE] digit amostras: { {k: len(v) for k, v in dh.items()} }")
else:
    print("[STATE] SEM ARQUIVO DE ESTADO")
    ph = {}
    dh = {}

from config import (
    ATIVOS, PAYOUT_PERCENTIL_MIN, PAYOUT_CV_MAX, PAYOUT_AMOSTRAS_MIN,
    CHISQUARE_P_MIN, DIGIT_AMOSTRAS_MIN, LGN_MIN_TRADES, RTT_MAX_MS
)
from engine.payout_monitor import PayoutMonitor
from engine.qualificador import Qualificador
from engine.health_guard import HealthGuard

pm = PayoutMonitor(historico_inicial=ph if ph else None)
ql = Qualificador(historico_inicial=dh if dh else None)
hg = HealthGuard()

total_trades = estado.get('total_trades', 0) if os.path.exists(state_file) else 0

print(f"\n=== ANALISE POR GATE ===")
print(f"LGN_MIN_TRADES={LGN_MIN_TRADES}, total_trades={total_trades}")
print(f"Gate 3 (LGN): {'OK' if total_trades >= LGN_MIN_TRADES else 'BLOQUEADO - trades insuficientes'}")

print(f"\nRTT_MAX_MS={RTT_MAX_MS}")
rtt_test = 50.0
print(f"Gate 2 (RTT=50ms teste): {'OK' if hg.rtt_ok(rtt_test) else 'BLOQUEADO'}")

print(f"\n=== GATE 4: PAYOUT POR ATIVO ===")
print(f"Config: PAYOUT_PERCENTIL_MIN={PAYOUT_PERCENTIL_MIN}, PAYOUT_CV_MAX={PAYOUT_CV_MAX}, PAYOUT_AMOSTRAS_MIN={PAYOUT_AMOSTRAS_MIN}")
for ativo in ATIVOS:
    n = pm.amostras(ativo)
    pct = pm.percentil_atual(ativo)
    cv = pm.cv_atual(ativo)
    ev = pm.ev_atual(ativo)
    qualif = pm.ativo_qualificado(ativo)
    status = "OK" if qualif else "BLOQUEADO"
    print(f"  {ativo}: amostras={n}, percentil={pct:.3f}, cv={cv:.4f}, ev={ev:.4f} -> {status}")

melhor, melhor_ev = pm.melhor_ativo()
print(f"Melhor ativo: {melhor} (ev={melhor_ev:.4f})")

print(f"\n=== GATE 5+6: QUALIFICADOR DE DIGITOS ===")
print(f"Config: DIGIT_AMOSTRAS_MIN={DIGIT_AMOSTRAS_MIN}, CHISQUARE_P_MIN={CHISQUARE_P_MIN}")
for ativo in ATIVOS:
    n = ql.amostras(ativo)
    sufic = ql.amostras_suficientes(ativo)
    if sufic:
        dist_ok, p = ql.distribuicao_normal(ativo)
        print(f"  {ativo}: amostras={n}, p={p:.4f} -> {'OK' if dist_ok else 'BLOQUEADO (distribuicao enviesada)'}")
    else:
        print(f"  {ativo}: amostras={n}/{DIGIT_AMOSTRAS_MIN} -> BLOQUEADO (amostras insuficientes)")

print("\n=== CONCLUSAO ===")
if melhor is None:
    print("BLOQUEADO NO GATE 4: nenhum ativo qualificado por payout")
    print("CAUSA PROVAVEL: payout_collector_loop nao esta coletando payouts via Deriv API")
    print("SOLUCAO: verificar broadcaster.py -> payout_collector_loop")
elif total_trades < LGN_MIN_TRADES:
    print(f"BLOQUEADO NO GATE 3: aquecimento ({total_trades}/{LGN_MIN_TRADES})")
else:
    print("TODOS OS GATES PARECEM OK - sinal deveria sair")
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

_, out, err = ssh.exec_command(f"cd {REMOTE} && python3 -c {repr(DIAG_SCRIPT)}", timeout=30)
o = out.read().decode('utf-8', errors='replace')
e = err.read().decode('utf-8', errors='replace')
print(o)
if e.strip(): print("STDERR:", e[:1000])
ssh.close()
