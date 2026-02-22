"""
deriv_engine/deploy_deriv_engine.py — Script de deploy para VPS.

Faz upload de todos os arquivos do deriv_engine para a VPS via SSH
e configura o serviço systemd.

Uso:
    python3 deploy_deriv_engine.py

Pré-requisito: paramiko instalado (pip install paramiko)
Se não tiver paramiko, execute manualmente os comandos do bloco
MANUAL_DEPLOY abaixo.
"""
import os
import subprocess
import sys

# ── Configuração da VPS ──────────────────────────────────────────────────
VPS_HOST = "vps64469.publiccloud.com.br"
VPS_USER = "root"
VPS_PASS = "Vom29bd#@"
VPS_DIR  = "/home/ubuntu/deriv_engine"

# Diretório local dos arquivos do engine
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

FILES_TO_UPLOAD = [
    "config.py",
    "supabase_client.py",
    "signal_core.py",
    "risk_manager.py",
    "order_executor.py",
    "market_analyzer.py",
    "engine.py",
    "main.py",
    "requirements.txt",
    ".env",
    "deriv-engine.service",
]

SETUP_COMMANDS = [
    # Cria diretórios necessários
    f"mkdir -p {VPS_DIR}",
    f"mkdir -p /home/ubuntu/bug_deriv_engine/engine",
    f"mkdir -p /home/ubuntu/bug_deriv_engine/state",

    # Instala dependências (Ubuntu externally managed = usar --break-system-packages)
    f"cd {VPS_DIR} && pip3 install -r requirements.txt --break-system-packages --quiet",

    # Configura o serviço systemd
    f"cp {VPS_DIR}/deriv-engine.service /etc/systemd/system/deriv-engine.service",
    "systemctl daemon-reload",
    "systemctl enable deriv-engine",
    "systemctl restart deriv-engine",

    # Status final
    "sleep 3",
    "systemctl status deriv-engine --no-pager",
]


def deploy_with_paramiko():
    """Deploy usando paramiko (SSH library Python)."""
    try:
        import paramiko
    except ImportError:
        print("❌ paramiko não instalado. Instale com: pip install paramiko")
        print("   Ou use o deploy manual abaixo.")
        return False

    print(f"🚀 Conectando em {VPS_HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
        print("✅ Conectado.")

        # Cria diretório remoto
        client.exec_command(f"mkdir -p {VPS_DIR}")

        # Upload dos arquivos
        sftp = client.open_sftp()
        for filename in FILES_TO_UPLOAD:
            local_path  = os.path.join(SCRIPT_DIR, filename)
            remote_path = f"{VPS_DIR}/{filename}"
            if os.path.exists(local_path):
                sftp.put(local_path, remote_path)
                print(f"   ✅ {filename}")
            else:
                print(f"   ⚠️  {filename} não encontrado localmente — pulando.")
        sftp.close()

        # Executa comandos de setup
        for cmd in SETUP_COMMANDS:
            print(f"\n$ {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
            out = stdout.read().decode("utf-8", errors="replace").strip()
            err = stderr.read().decode("utf-8", errors="replace").strip()
            if out:
                print(out)
            if err and "warning" not in err.lower():
                print(f"STDERR: {err}")

        print("\n🎉 Deploy concluído!")
        print(f"📋 Logs em tempo real: journalctl -u deriv-engine -f")
        client.close()
        return True

    except Exception as e:
        print(f"❌ Erro no deploy: {e}")
        return False


def print_manual_deploy():
    """Imprime comandos para deploy manual via SCP + SSH."""
    print("\n" + "=" * 60)
    print("DEPLOY MANUAL (copie e cole no terminal):")
    print("=" * 60)
    print(f"\n# 1. Na sua máquina local, de dentro de bug-deriv-engine/deriv_engine:")
    print(f"scp config.py supabase_client.py order_executor.py market_analyzer.py engine.py main.py requirements.txt .env deriv-engine.service {VPS_USER}@{VPS_HOST}:{VPS_DIR}/")
    print(f"\n# 2. Na VPS:")
    for cmd in SETUP_COMMANDS:
        print(f"  {cmd}")


if __name__ == "__main__":
    print("=" * 60)
    print("DERIV ENGINE – Deploy Script")
    print("=" * 60)

    success = deploy_with_paramiko()
    if not success:
        print_manual_deploy()
