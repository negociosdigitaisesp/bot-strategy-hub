
import paramiko

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    
    print("Checking 'engine/__init__.py' content...")
    cmd = "cd /root/bug-deriv-engine/engine && xxd __init__.py"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:\n", stdout.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    check()
