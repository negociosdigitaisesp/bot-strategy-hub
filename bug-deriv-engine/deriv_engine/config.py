"""
deriv_engine/config.py — Variáveis de configuração do Deriv Engine.

Carrega do .env (na VPS) via python-dotenv.
Nunca commitar o .env com valores reais.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ── Supabase ────────────────────────────────────────────────────────────
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")  # service_role key

# ── Deriv ────────────────────────────────────────────────────────────────
DERIV_APP_ID: str = os.getenv("DERIV_APP_ID", "85515")
DERIV_SYMBOL: str = os.getenv("DERIV_SYMBOL", "R_75")

DERIV_WSS_PRIMARY  = f"wss://ws.derivws.com/websockets/v3?app_id={DERIV_APP_ID}"
DERIV_WSS_FALLBACK = f"wss://ws.binaryws.com/websockets/v3?app_id={DERIV_APP_ID}"

# ── Ativos monitorados pelo engine ──────────────────────────────────────
# Todos os 5 ativos sintéticos da Deriv
ATIVOS = ["R_10", "R_25", "R_50", "R_75", "R_100"]

# ── Parâmetros da SignalEngine (herdados do bug-deriv-engine) ───────────
LGN_MIN_TRADES     = 30    # Aquecimento mínimo antes de emitir sinais
RTT_MAX_MS         = 500   # RTT máximo aceitável (ms)
RTT_INTERVAL_S     = 30    # Intervalo entre heartbeats (s)
DIGIT_WINDOW       = 100   # Buffer de dígitos por ativo
PAYOUT_WINDOW      = 200   # Buffer de payouts por ativo
PAYOUT_AMOSTRAS_MIN = 50   # Amostras mínimas de payout
CHISQUARE_P_MIN    = 0.001 # P-value mínimo Chi-square
DIGIT_AMOSTRAS_MIN = 50    # Amostras mínimas de dígitos
PAYOUT_PERCENTIL_MIN = 0.65
PAYOUT_CV_MAX      = 0.12
DIGITO_DIFFERS     = 5     # Barreira padrão para DIGITDIFF

# ── Engine ─────────────────────────────────────────────────────────────
CLIENTS_SYNC_INTERVAL_S = 5    # Sync de clientes ativos (poll Supabase)
HEALTH_LOG_INTERVAL_S   = 60   # Log de saúde do sistema
RECONNECT_BACKOFF_S     = 5    # Espera antes de reconectar WS

# ── Validações ──────────────────────────────────────────────────────────
if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL não definida no .env")
if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY não definida no .env")
