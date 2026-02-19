
import hashlib
import paramiko

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
LOCAL_FILE = r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine\engine\ws_pool.py"
REMOTE_FILE = "/root/bug-deriv-engine/engine/ws_pool.py"

def get_local_md5():
    with open(LOCAL_FILE, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    
    # 1. Check Websockets
    print("Checking websockets import...")
    cmd = "python3 -c \"import websockets; print('Websockets OK')\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(f"Websockets: {out} {err}")
    
    # 2. Check Remote MD5
    print("Checking remote MD5...")
    cmd = f"md5sum {REMOTE_FILE}"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    remote_md5 = out.split()[0] if out else "FAIL"
    print(f"Remote MD5: {remote_md5}")
    
    local_md5 = get_local_md5()
    print(f"Local MD5:  {local_md5}")
    
    if remote_md5 == local_md5:
        print("MD5 MATCH!")
    else:
        print("MD5 MISMATCH!")
        
    ssh.close()

if __name__ == "__main__":
    check()
