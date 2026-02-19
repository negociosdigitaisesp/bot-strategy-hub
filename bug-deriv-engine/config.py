# Ativos — NUNCA usar índices 1HZ (1 segundo)
ATIVOS = ["R_10", "R_25", "R_50", "R_75", "R_100"]
DIGITO_DIFFERS = 5

# Deriv
DERIV_APP_ID = "85515"
DERIV_WSS_PRIMARY  = f"wss://ws.derivws.com/websockets/v3?app_id={DERIV_APP_ID}"
DERIV_WSS_FALLBACK = f"wss://ws.binaryws.com/websockets/v3?app_id={DERIV_APP_ID}"

# Servidor
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8000

# RTT
RTT_MAX_MS = 500
RTT_INTERVAL_S = 30

# Qualificação de payout
PAYOUT_WINDOW = 200       # últimos N payouts por ativo
PAYOUT_PERCENTIL_MIN = 0.65
PAYOUT_CV_MAX = 0.12
PAYOUT_AMOSTRAS_MIN = 50

# Qualificação estatística
DIGIT_WINDOW = 100        # últimos N dígitos por ativo
CHISQUARE_P_MIN = 0.001  # Relaxado: 0.01 era muito restritivo para mercados reais
DIGIT_AMOSTRAS_MIN = 50

# LGN aquecimento
LGN_MIN_TRADES = 30

# Persistência de estado
STATE_FILE = "/tmp/bug_deriv_state.json"
STATE_SAVE_INTERVAL = 60  # segundos entre saves
