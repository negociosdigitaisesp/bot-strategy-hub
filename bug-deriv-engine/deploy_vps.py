# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
deploy_vps.py - Limpa a VPS e faz deploy do bug-deriv-engine via paramiko.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import os
import paramiko
import time

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
LOCAL_BASE = r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine"
REMOTE_BASE = "/root/bug-deriv-engine"

FILES = [
    ("config.py",                  "config.py"),
    ("requirements.txt",           "requirements.txt"),
    ("state/cache.py",             "state/cache.py"),
    ("engine/__init__.py",         "engine/__init__.py"),
    ("engine/ws_pool.py",          "engine/ws_pool.py"),
    ("engine/tick_router.py",      "engine/tick_router.py"),
    ("engine/payout_monitor.py",   "engine/payout_monitor.py"),
    ("engine/qualificador.py",     "engine/qualificador.py"),
    ("engine/health_guard.py",     "engine/health_guard.py"),
    ("engine/signal_engine.py",    "engine/signal_engine.py"),
    ("engine/broadcaster.py",      "engine/broadcaster.py"),
]

def run(ssh, cmd, timeout=30):
    print(f"  $ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(f"    {out}")
    if err:
        print(f"    ERR: {err}")
    return out, err

def main():
    print(f"Conectando em {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    print("Conectado!")

    # ── 1. ZERAR VPS ──────────────────────────────────────────────────────────
    print("\n[1/3] Zerando VPS...")
    cmds_clean = [
        # Para e remove todos os containers Docker se existirem
        "docker stop $(docker ps -aq) 2>/dev/null || true",
        "docker rm $(docker ps -aq) 2>/dev/null || true",
        # Remove projetos Python antigos em /root
        "rm -rf /root/bug-deriv-engine /root/million-bots /root/beckbug /root/app /root/*.py /root/*.sh /root/*.json /root/*.log 2>/dev/null || true",
        # Remove processos Python rodando (exceto sistema)
        "pkill -f 'python3 /root' 2>/dev/null || true",
        # Remove crons antigos do root
        "crontab -r 2>/dev/null || true",
        # Limpa /tmp de arquivos do projeto
        "rm -f /tmp/bug_deriv_state.json /tmp/*.json /tmp/*.py 2>/dev/null || true",
        # Remove serviços systemd do projeto
        "systemctl stop bug-deriv 2>/dev/null || true",
        "systemctl disable bug-deriv 2>/dev/null || true",
        "rm -f /etc/systemd/system/bug-deriv.service 2>/dev/null || true",
        "systemctl daemon-reload 2>/dev/null || true",
    ]
    for cmd in cmds_clean:
        run(ssh, cmd, timeout=15)

    print("VPS zerada!")

    # ── 2. CRIAR ESTRUTURA REMOTA ─────────────────────────────────────────────
    print("\n[2/3] Criando estrutura de diretórios na VPS...")
    run(ssh, f"mkdir -p {REMOTE_BASE}/state {REMOTE_BASE}/engine")

    # ── 3. UPLOAD DOS ARQUIVOS ────────────────────────────────────────────────
    print("\n[3/3] Fazendo upload dos arquivos...")
    sftp = ssh.open_sftp()
    for local_rel, remote_rel in FILES:
        local_path  = os.path.join(LOCAL_BASE, local_rel.replace("/", os.sep))
        remote_path = f"{REMOTE_BASE}/{remote_rel}"
        print(f"  Upload: {local_rel} -> {remote_path}")
        sftp.put(local_path, remote_path)
    sftp.close()

    # ── Verificação final ─────────────────────────────────────────────────────
    print("\nVerificando estrutura na VPS:")
    run(ssh, f"find {REMOTE_BASE} -type f | sort")

    ssh.close()
    print("\n✅ Deploy concluído com sucesso!")

if __name__ == "__main__":
    main()
