import paramiko
import os
import sys

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
LOCAL_BASE = r"C:\Users\bialo\OneDrive\Documentos\beckbug"
REMOTE_BASE = "/root/million_bots_vps"

def create_ssh_client():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS)
    return client

def main():
    print(f"-> Conectando a {HOST}...")
    try:
        ssh = create_ssh_client()
        sftp = ssh.open_sftp()
        print("-> Conectado com sucesso.")

        # 1. Upload da Pasta adaptive_engine
        local_dir = os.path.join(LOCAL_BASE, "adaptive_engine")
        remote_dir = f"{REMOTE_BASE}/adaptive_engine"
        
        # Função recursiva de upload
        def put_dir(local, remote):
            try:
                sftp.mkdir(remote)
                print(f"-> Criado remoto: {remote}")
            except OSError:
                pass # Dir já existe

            for item in os.listdir(local):
                if item == "__pycache__": continue
                local_path = os.path.join(local, item)
                remote_path = f"{remote}/{item}"
                
                if os.path.isfile(local_path):
                    sftp.put(local_path, remote_path)
                    print(f"   Upload: {item}")
                elif os.path.isdir(local_path):
                    put_dir(local_path, remote_path)

        print("-> Iniciando upload do adaptive_engine...")
        put_dir(local_dir, remote_dir)
        print("-> Upload concluido.")

        # 2. Criar Service Systemd (adaptive_bot)
        service_content = f"""[Unit]
Description=Million Bots Adaptive Engine (v2.0)
After=network.target

[Service]
User=root
WorkingDirectory={REMOTE_BASE}
ExecStart=/usr/bin/python3 -m adaptive_engine.main
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
"""
        with sftp.file(f"/etc/systemd/system/adaptive_bot.service", "w") as f:
            f.write(service_content)
        print("-> Service file criado: /etc/systemd/system/adaptive_bot.service")

        # 3. Reload e Start
        print("-> Configurando systemd...")
        commands = [
            "systemctl daemon-reload",
            "systemctl enable adaptive_bot",
            "systemctl restart adaptive_bot"
        ]
        
        for cmd in commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                print(f"ERROR executing {cmd}: {stderr.read().decode()}")
            else:
                print(f"OK: {cmd}")

        # 4. Verificar Status
        print("-> Verificando status do servico...")
        stdin, stdout, stderr = ssh.exec_command("systemctl status adaptive_bot")
        print(stdout.read().decode())
        
        # 5. Parar o Bot Legacy (Opcional, mas recomendado para economizar CPU)
        print("-> [OPCIONAL] Parando bot legacy (million_bot)...")
        ssh.exec_command("systemctl stop million_bot") 
        print("-> Bot legacy parado.")

        sftp.close()
        ssh.close()
        print("-> DEPLOY CONCLUIDO COM SUCESSO!")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    main()
