import sys
sys.path.append(r"c:\Users\brend\Music\bot-strategy-hub\bug-deriv-engine\deriv_engine")
from risk_manager import RiskManager

rm = RiskManager()
user = "test_user"

# Initial config from frontend
config = {
    "stake": 1.0,
    "use_martingale": True,
    "max_gale": 3,
    "martingale_factor": 2.5,
    "use_soros": False,
    "soros_levels": 2,
    "stop_win": 50.0,
    "stop_loss": 25.0
}

# 1. Init
rm.init_client(user, config)
print(f"Init Stake: {rm.get_stake(user)}")

# 2. Trade Lost
rm.process_result(user, "lost", -1.0)
stake_after_loss = rm.get_stake(user)
print(f"Stake after Loss 1: {stake_after_loss}")

# 3. Simulate Engine sync updating config with the NEW stake (this is what engine does)
config_after_sync = config.copy()
config_after_sync["stake"] = stake_after_loss
rm.sync_clients({user: config_after_sync})
print(f"Stake after Sync (Loss 1): {rm.get_stake(user)}")

# 4. Trade Lost again (using new stake)
rm.process_result(user, "lost", -stake_after_loss)
stake_after_loss2 = rm.get_stake(user)
print(f"Stake after Loss 2: {stake_after_loss2}")

# 5. Simulate Engine sync updating config again
config_after_sync2 = config.copy()
config_after_sync2["stake"] = stake_after_loss2
rm.sync_clients({user: config_after_sync2})
print(f"Stake after Sync (Loss 2): {rm.get_stake(user)}")

# 6. Trade Win
rm.process_result(user, "won", stake_after_loss2 * 0.9) # 90% payout
print(f"Stake after Win: {rm.get_stake(user)}")

# 7. Simulate Engine sync updating config (reverts to base)
config_after_sync_win = config.copy()
config_after_sync_win["stake"] = rm.get_stake(user)
rm.sync_clients({user: config_after_sync_win})
print(f"Stake after Sync (Win): {rm.get_stake(user)}")

