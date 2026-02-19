import os
from dotenv import load_dotenv

load_dotenv()

# --- Configurações de Conexão ---
DERIV_APP_ID = os.getenv("DERIV_APP_ID", "1089")
DERIV_TOKEN = os.getenv("DERIV_TOKEN")
DERIV_WS_URL = "wss://ws.binaryws.com/websockets/v3"

# --- Ativos Monitorados (Multi-Símbolo) ---
ASSETS = [
    "1HZ10V",  # Volatility 10 (1s)
    "1HZ25V",  # Volatility 25 (1s)
    "1HZ50V",  # Volatility 50 (1s)
    "1HZ75V",  # Volatility 75 (1s)
    "1HZ100V", # Volatility 100 (1s)
]

# --- Parâmetros do Motor ---
CANDLE_HISTORY_SIZE = 500  # Tamanho do buffer (deque)
FEATURE_WINDOW = 50        # Janela para cálculo de volatilidade

# --- Gestão de Risco (Kelly) ---
BASE_STAKE = 0.35          # Stake mínimo
MAX_STAKE = 5.0            # Stake máximo (segurança)
KELLY_FRACTION = 0.25      # Fração de Kelly (Conservador)

# --- Toggles ---
ENABLE_TRADING = False     # Iniciar em modo "Paper Trading" (coleta de dados)
LOG_LEVEL = "INFO"
