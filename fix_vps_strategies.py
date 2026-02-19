
from deploy_to_vps import VPSDeployer, VPS_PROJECT_PATH
import time

def fix():
    deployer = VPSDeployer()
    if not deployer.connect():
        return

    print("🔍 DIAGNOSTIC: Listing files in strategies/tier1...")
    # List all files
    _, output, _ = deployer.execute_command(f"ls -l {VPS_PROJECT_PATH}/strategies/tier1")
    print(output)
    
    # Count V2 and V3
    _, v2_count, _ = deployer.execute_command(f"ls {VPS_PROJECT_PATH}/strategies/tier1/*_V2.py | wc -l")
    _, v3_count, _ = deployer.execute_command(f"ls {VPS_PROJECT_PATH}/strategies/tier1/*_V3.py | wc -l")
    
    print(f"📊 V2 Files: {v2_count.strip()}")
    print(f"📊 V3 Files: {v3_count.strip()}")
    
    # Force delete V2
    print("🧹 FORCE REMOVING V2 Strategies...")
    deployer.execute_command(f"rm -f {VPS_PROJECT_PATH}/strategies/tier1/*_V2.py")
    
    # Verify removal
    _, output, _ = deployer.execute_command(f"ls {VPS_PROJECT_PATH}/strategies/tier1/*_V2.py")
    if "No such file" in output or output.strip() == "":
        print("✅ V2 Strategies Removed.")
    else:
        print("⚠️ V2 Strategies still exist!")
        print(output)
        
    # Restart
    print("🔄 Restarting Bot...")
    deployer.restart_bot()
    
    # Check Logs
    print("📋 Checking Logs for V3 Strategy Names...")
    time.sleep(5)
    output = deployer.get_bot_logs(50)
    
    if "V3" in output:
        print("✅ FOUND 'V3' in LOGS! Upgrade Successful.")
    else:
        print("⚠️ 'V3' NOT FOUND in logs yet. Check manual output.")

    deployer.close()

if __name__ == "__main__":
    fix()
