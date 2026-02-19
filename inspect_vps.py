
from deploy_to_vps import VPSDeployer, VPS_PROJECT_PATH, LOCAL_PROJECT_PATH
import os

def inspect():
    print(f"📍 LOCAL PATH: {LOCAL_PROJECT_PATH}")
    local_files = os.listdir(os.path.join(LOCAL_PROJECT_PATH, "strategies", "tier1"))
    print(f"📂 LOCAL FILES ({len(local_files)}):")
    for f in local_files:
        if f.endswith(".py"): print(f"  - {f}")

    deployer = VPSDeployer()
    if not deployer.connect():
        return

    print(f"\n📍 REMOTE PATH: {VPS_PROJECT_PATH}")
    _, output, _ = deployer.execute_command(f"ls {VPS_PROJECT_PATH}/strategies/tier1")
    remote_files = output.split()
    print(f"📂 REMOTE FILES ({len(remote_files)}):")
    for f in remote_files:
        if f.endswith(".py"): print(f"  - {f}")
        
    deployer.close()

if __name__ == "__main__":
    inspect()
