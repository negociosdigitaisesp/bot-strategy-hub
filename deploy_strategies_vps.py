import paramiko
import os
import sys

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
LOCAL_BASE = r"C:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps"
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
        print(f"-> Conectado com sucesso.")

        # Verificar se diretório remoto existe
        try:
            sftp.stat(REMOTE_BASE)
            print(f"-> Diretório base remoto confirmado: {REMOTE_BASE}")
        except FileNotFoundError:
            print(f"ERROR: Diretório remoto {REMOTE_BASE} não encontrado!")
            print("-> Listando /root para debug:")
            stdin, stdout, stderr = ssh.exec_command("ls -F /root")
            print(stdout.read().decode())
            return

        # 1. Upload Strategy Selector (Otimização)
        local_selector = os.path.join(LOCAL_BASE, "engine", "strategy_selector.py")
        remote_selector = f"{REMOTE_BASE}/engine/strategy_selector.py"
        try:
            sftp.put(local_selector, remote_selector)
            print(f"-> Uploaded: engine/strategy_selector.py (Otimizado)")
        except Exception as e:
            print(f"ERROR: Falha ao enviar selector: {e}")

        # 2. Upload TIER 3 Strategies
        local_tier3 = os.path.join(LOCAL_BASE, "strategies", "tier3")
        remote_tier3 = f"{REMOTE_BASE}/strategies/tier3"
        
        # Garantir diretório remoto
        try:
            sftp.stat(remote_tier3)
        except FileNotFoundError:
            sftp.mkdir(remote_tier3)
            print(f"-> Criado diretório: {remote_tier3}")

        # Listar e enviar arquivos
        if os.path.exists(local_tier3):
            files = [f for f in os.listdir(local_tier3) if f.endswith(".py")]
            print(f"-> Enviando {len(files)} estratégias do Tier 3...")
            
            for f in files:
                local_path = os.path.join(local_tier3, f)
                remote_path = f"{remote_tier3}/{f}"
                try:
                    sftp.put(local_path, remote_path)
                except Exception as e:
                    print(f"  ERROR em {f}: {e}")
            print(f"-> Upload de estratégias concluído.")
        else:
            print(f"WARNING: Diretório local {local_tier3} não encontrado!")

        # 3. Reiniciar Serviço
        print("-> Reiniciando serviço 'million_bot'...")
        stdin, stdout, stderr = ssh.exec_command("systemctl restart million_bot")
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status == 0:
            print("-> Bot reiniciado com sucesso! Sistema rodando com novas estratégias.")
        else:
            err = stderr.read().decode()
            print(f"ERROR ao reiniciar: {err}")
            # Tentar ver status
            stdin, stdout, stderr = ssh.exec_command("systemctl status million_bot")
            print("Status do serviço:")
            print(stdout.read().decode())

        sftp.close()
        ssh.close()

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    main()
