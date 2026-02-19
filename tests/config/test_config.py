"""
Test Configuration - Configurações centralizadas para testes
"""

import os
from pathlib import Path

# Diretórios
PROJECT_ROOT = Path(__file__).parent.parent.parent
FRONTEND_DIR = PROJECT_ROOT / "FRONTEND"
BACKEND_DIR = PROJECT_ROOT / "million_bots_vps"
QA_REPORTS_DIR = PROJECT_ROOT / "qa_reports"
SCREENSHOTS_DIR = QA_REPORTS_DIR / "screenshots"

# Carregar variáveis do .env.qa
def load_env_qa():
    """Carrega variáveis de ambiente do arquivo .env.qa"""
    env_file = PROJECT_ROOT / ".env.qa"
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

# Carregar .env.qa ao importar o módulo
load_env_qa()


# URLs e Endpoints
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000")

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# VPS
VPS_HOST = os.getenv("VPS_HOST", "")
VPS_USER = os.getenv("VPS_USER", "root")
VPS_SSH_KEY = os.path.expanduser(os.getenv("VPS_SSH_KEY", "~/.ssh/id_rsa"))

# Deriv
DERIV_APP_ID = os.getenv("DERIV_APP_ID", "")
DERIV_API_TOKEN = os.getenv("DERIV_API_TOKEN", "")

# Timeouts (em segundos)
DEFAULT_TIMEOUT = int(os.getenv("QA_TIMEOUT_MS", "30000")) / 1000
PAGE_LOAD_TIMEOUT = 10
API_TIMEOUT = 5
SSH_TIMEOUT = 15

# Performance Thresholds (em ms)
PERF_BACKEND_API_EXCELLENT = 200
PERF_BACKEND_API_GOOD = 500
PERF_FRONTEND_TTI_EXCELLENT = 2000
PERF_FRONTEND_TTI_GOOD = 4000
PERF_SUPABASE_QUERY_EXCELLENT = 100
PERF_SUPABASE_QUERY_GOOD = 500
PERF_REALTIME_LATENCY_EXCELLENT = 1000
PERF_REALTIME_LATENCY_GOOD = 3000

# Test Expectations
MIN_STRATEGIES_COUNT = 10
EXPECTED_STRATEGIES_COUNT = 15
MAX_CONSOLE_LOADS_2MIN = 10  # Para teste de loop infinito
MIN_SIGNAL_GENERATION_10MIN = 3  # Mínimo de sinais em 10 min

# Regression Test Thresholds
LOOP_INFINITE_THRESHOLD = 10  # >10 loads = loop infinito
ACTIVE_STRATEGIES_PERSIST_TIME = 90  # segundos para aguardar
SUPABASE_WS_MONITOR_TIME = 120  # segundos para monitorar conexão
WR_CALCULATION_TOLERANCE = 2.0  # % de tolerância no cálculo de WR

# Backend Log Analysis
MAX_CRITICAL_ERRORS_1H = 5
MIN_SIGNALS_10MIN = 5
MIN_REGIME_DETECTIONS_5MIN = 3

# Modo de teste
QA_MODE = os.getenv("QA_MODE", "development")
IS_PRODUCTION = QA_MODE == "production"

# Webhooks para alertas
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")

# Validação de configuração
def validate_config():
    """Valida se configurações essenciais estão presentes"""
    errors = []
    
    if not SUPABASE_URL:
        errors.append("SUPABASE_URL não configurado")
    
    if not SUPABASE_SERVICE_ROLE_KEY:
        errors.append("SUPABASE_SERVICE_ROLE_KEY não configurado")
    
    if not VPS_HOST:
        errors.append("VPS_HOST não configurado (alguns testes serão pulados)")
    
    if errors:
        print("WARNING: Configuration issues:")
        for error in errors:
            print(f"   - {error}")
        return False
    
    return True

if __name__ == "__main__":
    print("Test Configuration")
    print(f"Frontend URL: {FRONTEND_URL}")
    print(f"Backend API: {BACKEND_API_URL}")
    print(f"Supabase: {SUPABASE_URL}")
    print(f"VPS Host: {VPS_HOST}")
    print(f"QA Mode: {QA_MODE}")
    print()
    validate_config()
