
import hashlib
import paramiko
import os

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"
BASE_LOCAL  = r"C:\Users\bialo\OneDrive\Documentos\beckbug\bug-deriv-engine"
BASE_REMOTE = "/root/bug-deriv-engine"

FILES = [
    "main.py",
    "config.py",
    "engine/__init__.py",
    "engine/ws_pool.py",
    "engine/tick_router.py",
]

def get_md5(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    
    print(f"{'FILE':<25} | {'LOCAL':<32} | {'REMOTE':<32} | STATUS")
    print("-" * 100)
    
    for rel in FILES:
        local_path = os.path.join(BASE_LOCAL, rel.replace("/", os.sep))
        remote_path = f"{BASE_REMOTE}/{rel}"
        
        local_md5 = get_md5(local_path)
        
        cmd = f"md5sum {remote_path}"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode().strip()
        remote_md5 = out.split()[0] if out else "FAIL"
        
        status = "MATCH" if local_md5 == remote_md5 else "MISMATCH"
        print(f"{rel:<25} | {local_md5:<32} | {remote_md5:<32} | {status}")
        
    ssh.close()

if __name__ == "__main__":
    check()
