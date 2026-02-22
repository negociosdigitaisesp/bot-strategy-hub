"""
deploy_full.py — Deploy completo para VPS.

Faz:
 1. Cria dirs na VPS via SSH
 2. Upload dos arquivos via SFTP
 3. Instala deps + configura systemd
 4. Imprime instrução manual para SQL no Supabase

Uso: python deploy_full.py
"""
import os
import time
import sys

VPS_HOST = "vps64469.publiccloud.com.br"
VPS_USER = "root"
VPS_PASS = "Vom29bd#@"
VPS_ENGINE_DIR = "/home/ubuntu/deriv_engine"
VPS_BUGDERIV_DIR = "/home/ubuntu/bug_deriv_engine"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = SCRIPT_DIR  # bug-deriv-engine/

# ── Pares (local_rel, remote_abs) ───────────────────────────────────────
# local_rel é relativo a PROJECT_ROOT (bug-deriv-engine/)
ENGINE_FILES = [
    ("deriv_engine/config.py",            f"{VPS_ENGINE_DIR}/config.py"),
    ("deriv_engine/supabase_client.py",   f"{VPS_ENGINE_DIR}/supabase_client.py"),
    ("deriv_engine/order_executor.py",    f"{VPS_ENGINE_DIR}/order_executor.py"),
    ("deriv_engine/market_analyzer.py",   f"{VPS_ENGINE_DIR}/market_analyzer.py"),
    ("deriv_engine/engine.py",            f"{VPS_ENGINE_DIR}/engine.py"),
    ("deriv_engine/main.py",              f"{VPS_ENGINE_DIR}/main.py"),
    ("deriv_engine/requirements.txt",     f"{VPS_ENGINE_DIR}/requirements.txt"),
    ("deriv_engine/.env",                 f"{VPS_ENGINE_DIR}/.env"),
    ("deriv_engine/deriv-engine.service", f"{VPS_ENGINE_DIR}/deriv-engine.service"),
]

BUGDERIV_FILES = [
    ("engine/__init__.py",        f"{VPS_BUGDERIV_DIR}/engine/__init__.py"),
    ("engine/signal_engine.py",   f"{VPS_BUGDERIV_DIR}/engine/signal_engine.py"),
    ("engine/qualificador.py",    f"{VPS_BUGDERIV_DIR}/engine/qualificador.py"),
    ("engine/health_guard.py",    f"{VPS_BUGDERIV_DIR}/engine/health_guard.py"),
    ("engine/payout_monitor.py",  f"{VPS_BUGDERIV_DIR}/engine/payout_monitor.py"),
    ("config.py",                 f"{VPS_BUGDERIV_DIR}/config.py"),
]


def run_ssh(client, cmd, timeout=60):
    """Executa comando e imprime output."""
    print(f"$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out:
        print(out)
    if err:
        # Filtra notas/hints informativos que não são erros reais
        for line in err.splitlines():
            lo = line.lower()
            if any(x in lo for x in ["error", "fail", "fatal", "cannot", "no such"]):
                print(f"  ERR: {line}")
    return out


def deploy():
    try:
        import paramiko
    except ImportError:
        print("❌ Instale paramiko: pip install paramiko")
        sys.exit(1)

    print("=" * 60)
    print("FULL DEPLOY – Deriv Engine + Bug Deriv Engine")
    print("=" * 60)

    print(f"\n🚀 Conectando em {VPS_HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
    print("✅ SSH conectado.")

    # ── 1. Criar diretórios remotos ─────────────────────────────────────
    print("\n📁 Criando diretórios remotos...")
    run_ssh(client, f"mkdir -p {VPS_ENGINE_DIR} {VPS_BUGDERIV_DIR}/engine {VPS_BUGDERIV_DIR}/state")
    # Cria __init__.py e stub de state/cache.py
    run_ssh(client, f"touch {VPS_BUGDERIV_DIR}/__init__.py {VPS_BUGDERIV_DIR}/state/__init__.py")
    stub = (
        "import json, os\n"
        "STATE_FILE='/tmp/bug_deriv_state.json'\n"
        "def load_state(): return None\n"
        "def save_state(**kwargs): pass\n"
    )
    run_ssh(client, f"cat > {VPS_BUGDERIV_DIR}/state/cache.py << 'PYEOF'\n{stub}\nPYEOF")
    time.sleep(0.5)

    # ── 2. SFTP upload ──────────────────────────────────────────────────
    sftp = client.open_sftp()

    def upload(files, label):
        print(f"\n📤 Uploading {label}...")
        for local_rel, remote in files:
            local_abs = os.path.join(PROJECT_ROOT, local_rel)
            if os.path.exists(local_abs):
                sftp.put(local_abs, remote)
                print(f"   ✅ {os.path.basename(local_abs)} → {remote}")
            else:
                print(f"   ⏭  {local_rel} (não encontrado localmente)")

    upload(ENGINE_FILES,  "deriv_engine/")
    upload(BUGDERIV_FILES, "bug_deriv_engine/")
    sftp.close()

    # ── 3. Instalar deps + systemd ──────────────────────────────────────
    print("\n⚙️  Instalando dependências...")
    run_ssh(client,
        f"pip3 install -r {VPS_ENGINE_DIR}/requirements.txt "
        f"--break-system-packages -q 2>&1 | tail -5",
        timeout=120
    )

    print("\n🔧 Configurando systemd...")
    run_ssh(client, f"cp {VPS_ENGINE_DIR}/deriv-engine.service /etc/systemd/system/deriv-engine.service")
    run_ssh(client, "systemctl daemon-reload")
    run_ssh(client, "systemctl enable deriv-engine")
    run_ssh(client, "systemctl restart deriv-engine")
    time.sleep(4)
    run_ssh(client, "systemctl status deriv-engine --no-pager -l", timeout=10)

    client.close()
    print("\n🎉 Deploy VPS concluído!")

    # ── 4. SQL instructions ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("⚠️  APLIQUE O SQL MANUALMENTE NO SUPABASE:")
    print("=" * 60)
    print("1. Vá em: https://supabase.com/dashboard/project/xwclmxjeombwabfdvyij/sql/new")
    print("2. Cole e execute o conteúdo de:")
    print("   bug-deriv-engine/deriv_engine/sql/setup_tables.sql")
    print("=" * 60)


if __name__ == "__main__":
    deploy()
