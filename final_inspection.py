
from deploy_to_vps import VPSDeployer, VPS_PROJECT_PATH, LOCAL_PROJECT_PATH
import os

def inspect_recursive():
    print("🔍 LOCAL RECURSIVE LIST:")
    local_strategies = os.path.join(LOCAL_PROJECT_PATH, "strategies")
    for root, dirs, files in os.walk(local_strategies):
        for file in files:
            if file.endswith(".py"):
                path = os.path.relpath(os.path.join(root, file), local_strategies)
                print(f"  {path}")

    deployer = VPSDeployer()
    if not deployer.connect():
        return

    print(f"\n🔍 REMOTE RECURSIVE LIST ({VPS_PROJECT_PATH}/strategies):")
    _, output, _ = deployer.execute_command(f"find {VPS_PROJECT_PATH}/strategies -name '*.py'")
    print(output)
    
    # print("\n🔍 CHECKING StrategyLoader.py ON REMOTE:")
    # _, output, _ = deployer.execute_command(f"cat {VPS_PROJECT_PATH}/engine/strategy_loader.py")
    # if "archive" in output:
    #     print("✅ StrategyLoader contains 'archive' exclusion.")
    # else:
    #     print("❌ StrategyLoader DOES NOT contain 'archive' exclusion.")

    deployer.close()

if __name__ == "__main__":
    inspect_recursive()
