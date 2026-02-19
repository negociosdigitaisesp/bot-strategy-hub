
import paramiko

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    
    print("Checking 'engine' package...")
    cmd = "cd /root/bug-deriv-engine && python3 -c \"import engine; print(engine.__file__)\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
    print("Checking 'engine.ws_pool'...")
    cmd = "cd /root/bug-deriv-engine && python3 -c \"import engine.ws_pool; print('OK')\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
    print("Checking 'main.py' content (first 50 bytes)...")
    cmd = "cd /root/bug-deriv-engine && head -c 50 main.py | xxd"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    check()
