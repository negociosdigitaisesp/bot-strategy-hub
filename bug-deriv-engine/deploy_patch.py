"""
deploy_patch.py — Upload apenas dos arquivos corrigidos do Martingale para a VPS.
Uso: python deploy_patch.py
"""
import os, sys, time

VPS_HOST = "vps64469.publiccloud.com.br"
VPS_USER = "root"
VPS_PASS = "Vom29bd#@"
VPS_ENGINE_DIR = "/home/ubuntu/deriv_engine"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

PATCH_FILES = [
    (os.path.join(SCRIPT_DIR, "deriv_engine", "risk_manager.py"), f"{VPS_ENGINE_DIR}/risk_manager.py"),
    (os.path.join(SCRIPT_DIR, "deriv_engine", "engine.py"), f"{VPS_ENGINE_DIR}/engine.py"),
]


def run_ssh(client, cmd, timeout=60):
    print(f"$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out:
        print(out)
    if err:
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
    print("PATCH DEPLOY — Martingale Bulletproof Fix")
    print("=" * 60)

    print(f"\n🚀 Conectando em {VPS_HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
    print("✅ SSH conectado.")

    # Upload dos arquivos corrigidos
    sftp = client.open_sftp()
    for local_abs, remote in PATCH_FILES:
        if os.path.exists(local_abs):
            sftp.put(local_abs, remote)
            print(f"   ✅ {os.path.basename(local_abs)} → {remote}")
        else:
            print(f"   ⚠️  {local_abs} não encontrado!")
    sftp.close()

    # Verifica onde o serviço está rodando
    print("\n🔍 Procurando serviço do engine...")
    result = run_ssh(client, "pm2 list 2>/dev/null || systemctl list-units --type=service | grep -i deriv 2>/dev/null")

    # Tenta reiniciar por PM2 primeiro
    print("\n🔄 Restartando engine...")
    out = run_ssh(client, "pm2 restart deriv-engine 2>/dev/null || pm2 restart all 2>/dev/null || systemctl restart deriv-engine 2>/dev/null")

    time.sleep(4)

    # Verifica logs recentes
    print("\n📋 Últimas linhas do log:")
    run_ssh(client, "pm2 logs deriv-engine --lines 20 --nostream 2>/dev/null || journalctl -u deriv-engine -n 20 --no-pager 2>/dev/null")

    client.close()
    print("\n🎉 Patch aplicado com sucesso!")


if __name__ == "__main__":
    deploy()
