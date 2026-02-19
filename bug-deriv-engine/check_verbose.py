
import paramiko

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    
    cmd = "cd /root/bug-deriv-engine && python3 -v -c \"import engine.ws_pool\" 2>&1 | tail -n 20"
    print(f"CMD: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("OUTPUT:", stdout.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    check()
