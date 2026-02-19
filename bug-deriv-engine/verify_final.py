# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko, time

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

def run(cmd, timeout=20):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if o: print(o)
    if e: print("ERR:", e[:300])

print("=== STATUS FINAL ===\n")
print("--- Servico systemd ---")
run("systemctl is-active bug-deriv && echo 'ATIVO' || echo 'INATIVO'")
run("systemctl status bug-deriv --no-pager | head -5")

print("\n--- Porta 8000 ---")
run("ss -tlnp | grep 8000 || echo 'PORTA FECHADA'")

print("\n--- Logs ultimos 30s (sinais emitidos?) ---")
run("journalctl -u bug-deriv --no-pager -n 25 --since '30 seconds ago'")

print("\n--- EV dos ativos (codigo novo) ---")
run("""cd /root/bug-deriv-engine && python3 -c "
import json, numpy as np
with open('/tmp/bug_deriv_state.json') as f:
    st = json.load(f)
ph = st.get('payout_historico', {})
for ativo, vals in ph.items():
    if vals:
        pm = float(np.mean(vals))
        ev_novo = (0.9 * pm) - (0.1 * 1.0)
        ev_antigo = (0.90 * pm) - 0.10
        print(f'{ativo}: payout_medio={pm:.4f} ev_antigo={ev_antigo:.4f} ev_CORRETO={ev_novo:.4f}')
" 2>&1""")

ssh.close()
