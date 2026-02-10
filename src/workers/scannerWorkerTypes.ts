// ============================================
// SCANNER WEB WORKER - Shared Types
// ============================================
// Message protocol between Main Thread ↔ Web Worker

export const SCANNER_SYMBOLS = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'] as const;
export type ScannerSymbol = typeof SCANNER_SYMBOLS[number];

// Symbol display names
export const SYMBOL_NAMES: Record<ScannerSymbol, string> = {
    'R_10': 'V10',
    'R_25': 'V25',
    'R_50': 'V50',
    'R_75': 'V75',
    'R_100': 'V100',
};

// Asset Score Component
export interface AssetScore {
    entropy: number;
    volatility: number;
    clusters: number;
    total: number;
}

// Asset state for each tracked symbol
export interface AssetState {
    symbol: ScannerSymbol;
    displayName: string;
    digitBuffer: number[];
    priceBuffer: number[];
    healthScore: number;
    score: AssetScore;
    shadowPattern: boolean;
    lastTwoDigits: [number, number] | null;
    inertiaOK: boolean;
    zScore: number;
    status: 'scanning' | 'forming' | 'firing' | 'vetoed';
    lastPrice: number;
    tickCount: number;
}

// Scanner configuration
export interface ScannerConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    useMartingale?: boolean;
    maxMartingaleLevel?: number;
    martingaleFactor?: number;
    autoSwitch?: boolean;
    minScore?: number;
    useSoros?: boolean;
    maxSorosLevels?: number;
    profitTarget?: number;
    maxConsecutiveLosses?: number;
    cooldownDuration?: number;
    anomalyOnlyMode?: boolean;
}

// Scanner statistics
export interface ScannerStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    consecutiveLosses: number;
    cycleProfit: number;
    cycleCount: number;
}

// Log entry
export interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'gold';
    symbol?: ScannerSymbol;
}

// Anomaly detection config
export const ANOMALY_CONFIG = {
    BUFFER_SIZE: 50,
    AUTOCORR_ANOMALY_THRESHOLD: 0.10,
    ANOMALY_CONFIRMATION_TICKS: 3,
    ANTI_CLUSTERING_COOLDOWN_MS: 3000,
    MIN_TICKS_FOR_TRADE: 30,
};

// Jitter Filter config
export const JITTER_CONFIG = {
    PING_HISTORY_SIZE: 10,          // Track last 10 pings
    STRESS_THRESHOLD_MS: 50,         // StdDev > 50ms = NETWORK_STRESS
    STALE_SYMBOL_TIMEOUT_MS: 2000,   // 2s without tick = stale symbol
};

// ============================================
// MESSAGES: Main Thread → Worker
// ============================================
export type WorkerCommand =
    | { type: 'START'; config: ScannerConfig; wsUrl: string; authToken: string; currency: string }
    | { type: 'STOP' }
    | { type: 'PAUSE' }    // Cooldown started
    | { type: 'RESUME' }   // Cooldown ended
    | { type: 'UPDATE_STAKE'; stake: number }
    | { type: 'UPDATE_CONFIG'; config: Partial<ScannerConfig> };

// ============================================
// MESSAGES: Worker → Main Thread
// ============================================
export type WorkerEvent =
    | { type: 'TICK_UPDATE'; states: Record<ScannerSymbol, AssetState>; priorityOrder: ScannerSymbol[] }
    | { type: 'TRADE_OPENED'; symbol: ScannerSymbol; stake: number; triggerDigit: number; score: number; triggerReason: string }
    | { type: 'TRADE_RESULT'; contractId: string; profit: number; isWin: boolean; symbol: ScannerSymbol }
    | { type: 'LOG'; entry: LogEntry }
    | { type: 'NETWORK_STATUS'; latency: number; drift: number; jitter: number; isStressed: boolean; staleTicks: number }
    | { type: 'WARMUP_PROGRESS'; progress: number; isReady: boolean }
    | { type: 'ANOMALY_UPDATE'; isDetected: boolean; autocorr: number; anomalyType: 'negative' | 'positive' | null }
    | { type: 'DESYNC'; signalDigit: number; executionDigit: number; symbol: string }
    | { type: 'TRADE_LATENCY'; latencyMs: number; driftMs: number }
    | { type: 'EXEC_TIME'; avgMs: number }
    | { type: 'ERROR'; message: string; code?: string }
    | { type: 'WS_CONNECTED' }
    | { type: 'WS_DISCONNECTED' }
    | { type: 'SYMBOL_RECONNECTED'; symbol: ScannerSymbol };
