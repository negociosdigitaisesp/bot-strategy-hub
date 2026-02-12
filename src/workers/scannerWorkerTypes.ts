export type ScannerSymbol = 'R_10' | 'R_25' | 'R_50' | 'R_75' | 'R_100';

export const SCANNER_SYMBOLS: ScannerSymbol[] = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'];

export const SYMBOL_NAMES: Record<ScannerSymbol, string> = {
    'R_10': 'Vol 10 (1s)',
    'R_25': 'Vol 25 (1s)',
    'R_50': 'Vol 50 (1s)',
    'R_75': 'Vol 75 (1s)',
    'R_100': 'Vol 100 (1s)'
};

export interface ScannerConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    useMartingale: boolean;
    maxMartingaleLevel: number;
    martingaleFactor: number;
    autoSwitch: boolean;
    minScore: number;
    profitTarget: number;
    maxConsecutiveLosses: number;
    anomalyOnlyMode: boolean;
    useSoros?: boolean;
    maxSorosLevels?: number;
}

export interface AssetScore {
    volatility: number;
    calm: number;
    clusters: number;
    total: number;
}

export interface AssetState {
    symbol: ScannerSymbol;
    displayName: string;
    lastPrice: number;
    score: AssetScore;
    status: 'scanning' | 'firing' | 'cooldown';
}

export type WorkerCommand =
    | { type: 'START'; config: ScannerConfig; authToken: string; currency: string; wsUrl: string }
    | { type: 'STOP' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'UPDATE_STAKE'; stake: number };

export interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'gold';
}

export type WorkerEvent =
    | { type: 'LOG'; entry: LogEntry }
    | { type: 'TICK_UPDATE'; states: Record<ScannerSymbol, AssetState>; priorityOrder?: ScannerSymbol[] }
    | { type: 'WARMUP_PROGRESS'; progress: number; isReady: boolean }
    | { type: 'TRADE_OPENED'; symbol: ScannerSymbol; direction: 'CALL' | 'PUT'; barrierOffset: number }
    | { type: 'TRADE_RESULT'; profit: number; isWin: boolean; symbol: ScannerSymbol }
    | { type: 'ANOMALY_UPDATE'; isDetected: boolean; calmScore: number }
    | { type: 'TRADE_LATENCY'; latency: number }
    | { type: 'WS_CONNECTED' }
    | { type: 'WS_DISCONNECTED' }
    | { type: 'ERROR'; message: string };
