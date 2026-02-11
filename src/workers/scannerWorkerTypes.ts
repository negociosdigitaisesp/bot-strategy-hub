// ============================================
// QUANT SHIELD — SHARED TYPES & CONSTANTS
// ============================================

// Scanner Symbols
export type ScannerSymbol = 'R_10' | 'R_25' | 'R_50' | 'R_75' | 'R_100';

export const SCANNER_SYMBOLS: ScannerSymbol[] = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'];

export const SYMBOL_NAMES: Record<ScannerSymbol, string> = {
    R_10: 'V10',
    R_25: 'V25',
    R_50: 'V50',
    R_75: 'V75',
    R_100: 'V100',
};

// ============================================
// SCORING & STRATEGY CONFIG
// ============================================
export const VOLATILITY_CONFIG = {
    BUFFER_SIZE: 30,             // Rolling window for volatility calc
    MIN_TICKS_FOR_TRADE: 20,     // Minimum ticks before trading
    ATR_PERIOD: 15,              // ATR calculation lookback
    SAFETY_FACTOR_DEFAULT: 2.2,  // Barrier = medianRange * safetyFactor
    CALM_REGIME_MULTIPLIER: 1.5, // If last 3 ranges > median * this → block
    DIRECTION_LOOKBACK: 3,       // How many ticks to determine direction
    ANTI_CLUSTERING_COOLDOWN_MS: 3000, // Min interval between trades
    ANOMALY_CONFIRMATION_TICKS: 3,     // Ticks to confirm low-vol anomaly
};

export const JITTER_CONFIG = {
    PING_HISTORY_SIZE: 10,
    STRESS_THRESHOLD_MS: 50,
    STALE_SYMBOL_TIMEOUT_MS: 5000,
};

export const ORBIT_CONFIG = {
    LATENCY_THRESHOLD_MS: 400,
    JITTER_TOLERANCE_MS: 100,
    NTP_SYNC_INTERVAL_MS: 15000,
    PREDICTION_OFFSET_MS: 15,
};

// ============================================
// ASSET STATE
// ============================================
export interface AssetScore {
    volatility: number;   // ATR-based score (0-40)
    calm: number;         // Market calmness score (0-40)
    clusters: number;     // Volatility clustering bonus (0-20)
    total: number;        // Combined
}

export interface AssetState {
    symbol: ScannerSymbol;
    displayName: string;
    priceBuffer: number[];
    rangeBuffer: number[];       // |price[i] - price[i-1]| for each tick
    healthScore: number;
    score: AssetScore;
    lastPrice: number;
    tickCount: number;
    status: 'scanning' | 'forming' | 'firing' | 'vetoed';
    currentATR: number;
    medianRange: number;
    isCalm: boolean;             // Is current regime calm enough to trade?
    lastDirection: 'up' | 'down' | 'flat';
    consecutiveDirection: number; // How many ticks in same direction
}

// ============================================
// SCANNER CONFIG (from main thread)
// ============================================
export interface ScannerConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    useMartingale: boolean;
    maxMartingaleLevel: number;
    martingaleFactor: number;
    autoSwitch: boolean;
    minScore: number;
    // Cooldown
    profitTarget: number;
    maxConsecutiveLosses: number;
    // Anomaly
    anomalyOnlyMode: boolean;
    // Soros
    useSoros?: boolean;
    maxSorosLevels?: number;
    // Duration
    duration?: number;           // Default 5 ticks
}

// ============================================
// LOG ENTRY
// ============================================
export interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'gold';
    symbol?: ScannerSymbol;
}

// ============================================
// WORKER COMMANDS (main → worker)
// ============================================
export type WorkerCommand =
    | { type: 'START'; config: ScannerConfig; authToken: string; currency: string; wsUrl: string }
    | { type: 'STOP' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'UPDATE_STAKE'; stake: number }
    | { type: 'UPDATE_CONFIG'; config: Partial<ScannerConfig> };

// ============================================
// WORKER EVENTS (worker → main)
// ============================================
export type WorkerEvent =
    | { type: 'LOG'; entry: LogEntry }
    | { type: 'TICK_UPDATE'; states: Record<ScannerSymbol, AssetState>; priorityOrder: ScannerSymbol[] }
    | { type: 'WARMUP_PROGRESS'; progress: number; isReady: boolean }
    | { type: 'TRADE_OPENED'; symbol: ScannerSymbol; stake: number; direction: 'CALL' | 'PUT'; barrierOffset: string; score: number; triggerReason: string }
    | { type: 'TRADE_RESULT'; contractId: string; profit: number; isWin: boolean; symbol: ScannerSymbol }
    | { type: 'TRADE_LATENCY'; latencyMs: number; driftMs: number }
    | { type: 'ANOMALY_UPDATE'; isDetected: boolean; calmScore: number; regime: 'calm' | 'volatile' | 'neutral' }
    | { type: 'NETWORK_STATUS'; latency: number; drift: number; jitter: number; isStressed: boolean; staleTicks: number; isOrbitMode: boolean }
    | { type: 'DESYNC'; signalDirection: string; executionPrice: number; symbol: string }
    | { type: 'EXEC_TIME'; avgMs: number }
    | { type: 'SYMBOL_RECONNECTED'; symbol: ScannerSymbol }
    | { type: 'WS_CONNECTED' }
    | { type: 'WS_DISCONNECTED' }
    | { type: 'ERROR'; message: string; code: string };
