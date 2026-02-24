import asyncio
import base64
import json
import logging
import random
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import redis.asyncio as aioredis
from supabase import create_client, Client
from iqoptionapi.stable_api import IQ_Option
from dotenv import load_dotenv
import os

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("IQEngine")

# Env Variables
SUPABASE_URL = "https://xwclmxjeombwabfdvyij.supabase.co"
# IMPORTANT: Use service_role key to bypass RLS (engine runs server-side, not client-side)
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4")
REDIS_URL = os.getenv("REDIS_URL", f"redis://{os.getenv('REDIS_HOST', '127.0.0.1')}:{os.getenv('REDIS_PORT', '6380')}")

# Init clients
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Supabase client created successfully.")
except Exception as e:
    logger.error(f"Error creating Supabase client: {e}")

redis_client = aioredis.from_url(REDIS_URL)

active_sessions = {}  # bot_id -> {'api': IQ_Option, 'email': str, 'status': str}
executor = ThreadPoolExecutor(max_workers=50)
TARGET_ASSETS = ["EURUSD-OTC", "GBPUSD-OTC", "AUDUSD-OTC"] # Sample


def ts():
    """Return current timestamp string for logs."""
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def connect_iq(email, password):
    api = IQ_Option(email, password)
    status, reason = api.connect()
    if status:
        return api, reason
    return None, reason

def update_bot_status(bot_id, status):
    """Synchronously update session_status in Supabase."""
    try:
        supabase.table('iq_bots').update({'session_status': status}).eq('id', bot_id).execute()
    except Exception as e:
        logger.error(f"[{ts()}] Erro ao atualizar status do bot {bot_id}: {e}")


async def sync_active_bots():
    """Fetch active bots from Supabase and synchronize sessions."""
    print(f"[{ts()}] Buscando bots ativos no Supabase...")
    try:
        response = supabase.table('iq_bots').select('*').eq('is_active', True).execute()
        bots = response.data
        print(f"[{ts()}] Encontrados: {len(bots)} bot(s) com is_active=true")

        current_bot_ids = {b['id'] for b in bots}

        # Disconnect removed/deactivated bots
        for bot_id in list(active_sessions.keys()):
            if bot_id not in current_bot_ids:
                print(f"[{ts()}] Bot {bot_id} desativado — removendo sessão.")
                update_bot_status(bot_id, 'disconnected')
                del active_sessions[bot_id]

        # Connect new bots not yet in active sessions
        for bot in bots:
            bot_id = bot['id']
            if bot_id not in active_sessions:
                email = bot.get('iq_email', '')
                raw_password = bot.get('iq_password', '')

                # === DECODE BASE64 PASSWORD ===
                try:
                    password = base64.b64decode(raw_password).decode('utf-8')
                    print(f"[{ts()}] Senha decodificada (base64) para {email}")
                except Exception:
                    # Fallback: senha pode já estar em texto puro
                    password = raw_password
                    print(f"[{ts()}] Senha usada em texto puro para {email}")

                # 1. Marcar como 'connecting'
                print(f"[{ts()}] Conectando: {email}")
                update_bot_status(bot_id, 'connecting')

                # 2. Login na IQ Option (bloqueante, rodar em executor)
                loop = asyncio.get_event_loop()
                api, reason = await loop.run_in_executor(executor, connect_iq, email, password)

                # 3. Atualizar status conforme resultado
                print(f"[{ts()}] Login resultado: {api is not None} | motivo: {reason}")

                if api:
                    active_sessions[bot_id] = {
                        'api': api,
                        'email': email,
                        'status': 'connected',
                        'config': bot
                    }
                    update_bot_status(bot_id, 'connected')
                    print(f"[{ts()}] Status atualizado: connected ({email})")
                else:
                    update_bot_status(bot_id, 'error')
                    print(f"[{ts()}] Status atualizado: error ({email}) — {reason}")
            else:
                # Bot já conectado, verificar se ainda está vivo
                session = active_sessions[bot_id]
                print(f"[{ts()}] Bot {session['email']} já conectado (status: {session['status']})")

    except Exception as e:
        logger.error(f"[{ts()}] Erro ao sincronizar bots: {e}")


def execute_trade(api, bot_config, asset, direction, amount):
    """Execute a trade for a single bot. (Blocking)"""
    try:
        # Check balance type
        balance_type = "PRACTICE" if bot_config.get('mode', 'demo') == 'demo' else "REAL"
        api.change_balance(balance_type)
        
        action = "call" if direction == "CALL" else "put"
        exp_time = 1  # 1 minute expiration
        
        # Execute options trade
        check, id = api.buy(amount, asset, action, exp_time)
        return check, id
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        return False, None


async def broadcast_signal(asset, direction):
    """Broadcast signal to all connected bots."""
    logger.info(f"BROADCASTING SIGNAL: {direction} on {asset}")
    
    # 1. Publish to Redis for Frontend live updates
    signal_data = {
        "type": "signal",
        "asset": asset,
        "action": direction,
        "timestamp": datetime.now().isoformat()
    }
    await redis_client.publish("iq:live:signals", json.dumps(signal_data))

    # 2. Execute trades for active sessions (Anti-Ban protection: 50 clients max, random delay)
    loop = asyncio.get_event_loop()
    tasks = []
    
    # Limit max clients to 50 per minute per asset (simple slice for now)
    bots_to_trade = list(active_sessions.items())[:50]
    
    for bot_id, session in bots_to_trade:
        if session['status'] == 'connected':
            bot_config = session['config']
            amount = float(bot_config.get('stake_amount', 10.0))
            
            # Anti-ban delay: 0 to 500ms
            delay = random.uniform(0, 0.5)
            
            async def run_with_delay(b_id, b_api, b_cfg, b_amt, dly):
                await asyncio.sleep(dly)
                logger.info(f"Bot {b_id} executing {direction} on {asset} with {b_amt} after {dly:.2f}s delay")
                success, order_id = await loop.run_in_executor(executor, execute_trade, b_api, b_cfg, asset, direction, b_amt)
                
                # Save log
                if success:
                    log_data = {
                        "bot_id": b_id,
                        "user_id": b_cfg.get('user_id'),
                        "asset": asset,
                        "direction": direction,
                        "amount": b_amt,
                        "result": "pending",
                        "strategy_id": "auto",
                        "executed_at": datetime.now().isoformat()
                    }
                    supabase.table('iq_trade_logs').insert(log_data).execute()

            tasks.append(run_with_delay(bot_id, session['api'], bot_config, amount, delay))
    
    await asyncio.gather(*tasks)


def calculate_features(candles):
    """Calculate basic features for strategies."""
    if not candles:
        return {}
    current = candles[-1]
    
    open_p, close_p, high_p, low_p = current['open'], current['close'], current['max'], current['min']
    range_total = high_p - low_p if high_p != low_p else 0.0001
    
    body = abs(close_p - open_p)
    wick_up = high_p - max(open_p, close_p)
    wick_down = min(open_p, close_p) - low_p
    
    body_pct = body / range_total
    wick_up_pct = wick_up / range_total
    wick_down_pct = wick_down / range_total
    
    # Vol ratio (current total range vs previous)
    prev_range = (candles[-2]['max'] - candles[-2]['min']) if len(candles)>1 else range_total
    vol_ratio = range_total / (prev_range if prev_range != 0 else 0.0001)
    
    return {
        "body_pct": body_pct,
        "wick_up_pct": wick_up_pct,
        "wick_down_pct": wick_down_pct,
        "vol_ratio": vol_ratio
    }


async def market_analyzer_loop():
    """Main loop checking candles at second 55."""
    with open("src/engine/active_strategies.json", "r") as f:
        strategies_config = json.load(f)

    # Master API to fetch candles (Use the first connected bot, or ideally a dedicated master bot)
    master_api = None
    
    while True:
        now = datetime.now()
        
        if now.second == 55:
            # Try to get master API
            if not master_api and active_sessions:
                master_api = list(active_sessions.values())[0]['api']
            
            if master_api:
                loop = asyncio.get_event_loop()
                for asset in TARGET_ASSETS:
                    logger.info(f"Checking features for {asset}...")
                    
                    try:
                        candles = await loop.run_in_executor(executor, master_api.get_candles, asset, 60, 2, time.time())
                        if candles:
                            features = calculate_features(candles)
                            
                            # Extremely simple evaluation based on the first strategy
                            strat = strategies_config.get('strategies', [])[0]
                            params = strat.get('params', {})
                            
                            # Check conditions
                            if features.get('wick_up_pct', 0) >= params.get('wick_up_pct_min', 0) and \
                               features.get('vol_ratio', 0) >= params.get('vol_ratio_min', 0):
                                
                                direction = strat.get('params', {}).get('direction_bias', 'UP')
                                action = 'CALL' if direction == 'UP' else 'PUT'
                                
                                await broadcast_signal(asset, action)
                    except Exception as e:
                        logger.error(f"Error fetching candles for {asset}: {e}")
            else:
                logger.warning("No Master API available. Skipping analysis.")
            
            # Sleep so we don't trigger multiple times in the 55th second
            await asyncio.sleep(1)
        
        await asyncio.sleep(0.1)


async def main_loop():
    logger.info("Starting Central IQ Engine...")
    
    # Start analyzer task
    asyncio.create_task(market_analyzer_loop())

    # Start sync task loop
    while True:
        await sync_active_bots()
        await asyncio.sleep(30)


if __name__ == "__main__":
    asyncio.run(main_loop())
