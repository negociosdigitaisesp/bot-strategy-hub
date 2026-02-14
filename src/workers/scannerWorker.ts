/* eslint-disable no-restricted-globals */
import {
    ScannerConfig, ScannerSymbol, AssetState, WorkerCommand, WorkerEvent,
    SCANNER_SYMBOLS, SYMBOL_NAMES
} from './scannerWorkerTypes';

// ============================================
// QUANTUM INERTIA STRATEGY v1.0
// ============================================
// Logic: "Trends in motion stay in motion" (Newton's 1st Law for Markets)
// 1. Velocity: Price moved > 2.0x ATR in 1 sec (Force)
// 2. Acceleration: Current move > Previous move (Gaining power)
// 3. Execution: FOLLOW the force (Call if UP, Put if DOWN)
// 4. Duration: 5 ticks (Surfing the 200ms delay wave)

// ============================================
// CONFIGURATION
// ============================================
const WARMUP_TICKS = 25;
const ATR_PERIOD = 20;

// Quantum Vector Pressure Constants (v2.1)
const EMA_PERIOD = 9;               // Micro-trend baseline
const PRESSURE_THRESHOLD = 0.70;    // 70% directional dominance required (High Conviction)
const PRESSURE_WINDOW = 10;         // Look at last 10 ticks for pressure (More data)
const VECTOR_DURATION = 7;          // 7 ticks duration (Survival Logic)
const MAX_SIMULTANEOUS_TRADES = 2;
const COOLDOWN_PER_ASSET = 30000;   // 30s cooldown per asset
const LATENCY_THRESHOLD = 500;
const MIN_TRADE_INTERVAL = 5000;    // 5s between trades

// Tick Interface
interface Tick {
    epoch: number;
    quote: number;
}

// Internal Worker State
let config: ScannerConfig | null = null;
let authToken: string | null = null;
let ws: WebSocket | null = null;
let isScanActive = false;
let isPaused = false;
let currentStake = 0;
let tradeCurrency = 'USD';
let activeTradeCount = 0;
let warmupReady = false;
let lastTradeTime = 0;
let activeContractId: string | null = null;

// Cooldown tracking per asset
const assetCooldowns: Record<ScannerSymbol, number> = {
    'R_10': 0, 'R_25': 0, 'R_50': 0, 'R_75': 0, 'R_100': 0
};

// Data Buffers
const tickHistory: Record<ScannerSymbol, Tick[]> = {
    'R_10': [], 'R_25': [], 'R_50': [], 'R_75': [], 'R_100': []
};

// Asset State
const assetStates: Record<ScannerSymbol, AssetState> = {
    'R_10': { symbol: 'R_10', displayName: SYMBOL_NAMES['R_10'], lastPrice: 0, score: { volatility: 0, calm: 0, clusters: 0, total: 0 }, status: 'scanning' },
    'R_25': { symbol: 'R_25', displayName: SYMBOL_NAMES['R_25'], lastPrice: 0, score: { volatility: 0, calm: 0, clusters: 0, total: 0 }, status: 'scanning' },
    'R_50': { symbol: 'R_50', displayName: SYMBOL_NAMES['R_50'], lastPrice: 0, score: { volatility: 0, calm: 0, clusters: 0, total: 0 }, status: 'scanning' },
    'R_75': { symbol: 'R_75', displayName: SYMBOL_NAMES['R_75'], lastPrice: 0, score: { volatility: 0, calm: 0, clusters: 0, total: 0 }, status: 'scanning' },
    'R_100': { symbol: 'R_100', displayName: SYMBOL_NAMES['R_100'], lastPrice: 0, score: { volatility: 0, calm: 0, clusters: 0, total: 0 }, status: 'scanning' },
};

// NTP
let timeOffset = 0;

const reply = (event: WorkerEvent) => {
    self.postMessage(event);
};

// ============================================
// MATH HELPERS
// ============================================

const calculateATR = (ticks: Tick[], period: number): number => {
    if (ticks.length < period + 1) return 0;
    const recent = ticks.slice(-(period + 1));
    let sum = 0;
    for (let i = 1; i < recent.length; i++) {
        sum += Math.abs(recent[i].quote - recent[i - 1].quote);
    }
    return sum / period;
};

// Exponential Moving Average (EMA)
const calculateEMA = (ticks: Tick[], period: number): number => {
    if (ticks.length < period) return 0;

    // Simple MA for the first point
    let k = 2 / (period + 1);
    let ema = ticks[0].quote;

    // Calculate EMA step by step
    for (let i = 1; i < ticks.length; i++) {
        ema = (ticks[i].quote * k) + (ema * (1 - k));
    }
    return ema;
};

// Vector Pressure: Frequency of up/down ticks in window
const calculatePressure = (ticks: Tick[], window: number): { pressure: number; direction: 'UP' | 'DOWN'; persistence: number } => {
    if (ticks.length < window) return { pressure: 0, direction: 'UP', persistence: 0 };

    const recent = ticks.slice(-window);
    let upCount = 0;
    let downCount = 0;

    // Count directional moves
    for (let i = 1; i < recent.length; i++) {
        const diff = recent[i].quote - recent[i - 1].quote;
        if (diff > 0) upCount++;
        if (diff < 0) downCount++;
    }

    const totalMoves = upCount + downCount;
    if (totalMoves === 0) return { pressure: 0, direction: 'UP', persistence: 0 };

    const upRatio = upCount / totalMoves;
    const downRatio = downCount / totalMoves;

    // Persistence Check: Last 4 ticks
    const last4 = ticks.slice(-4);
    let persistenceCount = 0;
    const lastTick = last4[last4.length - 1];
    const trendDir = upRatio > downRatio ? 1 : -1;

    for (let i = 1; i < last4.length; i++) {
        const diff = last4[i].quote - last4[i - 1].quote;
        if ((trendDir === 1 && diff > 0) || (trendDir === -1 && diff < 0)) {
            persistenceCount++;
        }
    }

    return {
        pressure: Math.max(upRatio, downRatio),
        direction: upRatio > downRatio ? 'UP' : 'DOWN',
        persistence: persistenceCount // Max 3 (since 4 ticks have 3 moves)
    };
};

// Calm Score for UI (Inverted Volatility basically)
const calculateCalmScore = (atr: number, symbol: ScannerSymbol): number => {
    const normalizers: Record<ScannerSymbol, number> = {
        'R_10': 0.02, 'R_25': 0.05, 'R_50': 0.10, 'R_75': 0.15, 'R_100': 0.20
    };
    const norm = normalizers[symbol] || 0.10;
    const ratio = atr / norm;
    return Math.max(0, Math.min(100, 100 - (ratio * 80)));
};

// ============================================
// WEBSOCKET CONNECTION
// ============================================
const connectWS = (url: string) => {
    ws = new WebSocket(url);

    ws.onopen = () => {
        reply({ type: 'WS_CONNECTED' });
        if (authToken) {
            ws?.send(JSON.stringify({ authorize: authToken }));
        }
    };

    ws.onclose = () => {
        reply({ type: 'WS_DISCONNECTED' });
        setTimeout(() => {
            if (isScanActive) connectWS(url);
        }, 2000);
    };

    ws.onerror = () => {
        reply({ type: 'ERROR', message: 'WebSocket Error' });
    };

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        if (data.msg_type === 'authorize') {
            reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: '✅ Worker Autorizado', type: 'success' } });
            ws?.send(JSON.stringify({ ticks: SCANNER_SYMBOLS, subscribe: 1 }));
            ws?.send(JSON.stringify({ time: 1 }));
        }

        if (data.msg_type === 'time') {
            const serverTime = data.time * 1000;
            timeOffset = serverTime - Date.now();
        }

        if (data.msg_type === 'tick') {
            processTick(data.tick);
        }

        if (data.msg_type === 'proposal') {
            if (data.error) {
                reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: `⚠️ Proposal Error: ${data.error.message || JSON.stringify(data.error)}`, type: 'error' } });
                activeTradeCount = Math.max(0, activeTradeCount - 1);
                activeContractId = null;
                return;
            }
            ws?.send(JSON.stringify({ buy: data.proposal.id, price: data.proposal.ask_price }));
        }

        if (data.msg_type === 'buy') {
            if (data.error) {
                reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: `⚠️ Buy Error: ${data.error?.message || JSON.stringify(data.error)}`, type: 'error' } });
                activeTradeCount = Math.max(0, activeTradeCount - 1);
                activeContractId = null;
                return;
            }
            if (data.buy) {
                activeContractId = data.buy.contract_id;
                ws?.send(JSON.stringify({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 }));
            }
        }

        if (data.msg_type === 'proposal_open_contract') {
            const contract = data.proposal_open_contract;
            if (contract.is_sold) {
                const profit = parseFloat(contract.profit);
                const symbol = contract.underlying as ScannerSymbol;
                activeTradeCount = Math.max(0, activeTradeCount - 1);
                if (activeContractId === null || contract.contract_id == activeContractId) {
                    activeContractId = null;
                }
                if (assetStates[symbol]) {
                    assetStates[symbol].status = 'scanning';
                }
                reply({ type: 'TRADE_RESULT', profit, isWin: profit > 0, symbol });
            }
        }
    };
};

// ============================================
// CORE LOGIC
// ============================================
const processTick = (tickData: any) => {
    if (isPaused) return;

    const symbol = tickData.symbol as ScannerSymbol;
    const epoch = tickData.epoch * 1000;
    const quote = tickData.quote;

    // Latency filter
    const now = Date.now();
    const latency = now - (epoch - timeOffset);
    if (latency > LATENCY_THRESHOLD) return;

    // Update history
    const history = tickHistory[symbol];
    history.push({ epoch, quote });
    if (history.length > 60) history.shift();

    // Calculate scores
    const atr = calculateATR(history, ATR_PERIOD);
    const calmScore = calculateCalmScore(atr, symbol);

    // Calculate new metrics
    const ema = calculateEMA(history, EMA_PERIOD);
    const { pressure, direction } = calculatePressure(history, PRESSURE_WINDOW);

    // Update state for UI
    assetStates[symbol].lastPrice = quote;
    assetStates[symbol].score = {
        volatility: parseFloat(atr.toFixed(6)),
        calm: parseFloat(calmScore.toFixed(2)),
        clusters: Math.round(pressure * 100), // Show pressure % in clusters field for debug
        total: parseFloat(calmScore.toFixed(2))
    };

    // Warmup
    if (!warmupReady) {
        const readyCount = SCANNER_SYMBOLS.filter(s => tickHistory[s].length >= WARMUP_TICKS).length;
        const progress = Math.floor((readyCount / SCANNER_SYMBOLS.length) * 100);
        reply({ type: 'WARMUP_PROGRESS', progress, isReady: readyCount >= SCANNER_SYMBOLS.length });
        if (readyCount >= SCANNER_SYMBOLS.length) {
            warmupReady = true;
            reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: '✅ Calibração completa — 5 ativos prontos', type: 'success' } });
        }
    }

    // Broadcast state
    reply({
        type: 'TICK_UPDATE',
        states: assetStates,
        priorityOrder: Object.keys(assetStates).sort((a, b) =>
            assetStates[b as ScannerSymbol].score.total - assetStates[a as ScannerSymbol].score.total
        ) as ScannerSymbol[]
    });

    // Strategy Logic: VECTOR PRESSURE
    if (config && warmupReady && history.length >= WARMUP_TICKS) {
        scanForVectorPressure(symbol, history, atr, ema);
    }
};

// ============================================
// VECTOR PRESSURE SIGNAL (v2)
// ============================================
const scanForVectorPressure = (symbol: ScannerSymbol, ticks: Tick[], atr: number, ema: number) => {
    if (!canTrade(symbol)) return;
    if (atr <= 0) return;
    if (ticks.length < PRESSURE_WINDOW) return;

    const currentPrice = ticks[ticks.length - 1].quote;
    const { pressure, direction, persistence } = calculatePressure(ticks, PRESSURE_WINDOW);

    // 1. FILTER: Micro-Trend Alignment (EMA)
    // CALL only if Price > EMA
    // PUT only if Price < EMA
    if (direction === 'UP' && currentPrice <= ema) return;
    if (direction === 'DOWN' && currentPrice >= ema) return;

    // 2. TRIGGER: Pressure Threshold
    // Need > 60% of recent ticks to be in the trade direction
    if (pressure < PRESSURE_THRESHOLD) return;

    // 3. CONFIRMATION: Persistence (Anti-Latency Guard)
    // Need at least 2 of the last 3 moves to be in direction
    // This avoids "twitch" moves of 1 tick
    if (persistence < 2) return;

    // EXECUTION: VECTOR FOLLOW
    const tradeDir: 'CALL' | 'PUT' = direction === 'UP' ? 'CALL' : 'PUT';

    reply({
        type: 'LOG', entry: {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString(),
            message: `🚀 ${symbol}: VECTOR ${tradeDir} (Pressão: ${(pressure * 100).toFixed(0)}%, Persist: ${persistence}/3)`,
            type: 'info'
        }
    });

    placeTrade(symbol, tradeDir, VECTOR_DURATION, `VECTOR_${(pressure * 100).toFixed(0)}%`);
};

// ============================================
// TRADE GUARDS
// ============================================
const canTrade = (symbol: ScannerSymbol): boolean => {
    if (assetStates[symbol].status !== 'scanning') return false;
    if (activeTradeCount >= MAX_SIMULTANEOUS_TRADES) return false;
    const now = Date.now();
    if (now - lastTradeTime < MIN_TRADE_INTERVAL) return false;
    if (now - assetCooldowns[symbol] < COOLDOWN_PER_ASSET) return false;
    return true;
};

// ============================================
// TRADE EXECUTION — Rise/Fall
// ============================================
const placeTrade = (
    symbol: ScannerSymbol,
    type: 'CALL' | 'PUT',
    duration: number,
    reason: string
) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (activeTradeCount >= MAX_SIMULTANEOUS_TRADES) return;

    activeTradeCount++;
    lastTradeTime = Date.now();
    assetCooldowns[symbol] = Date.now();
    assetStates[symbol].status = 'firing';

    // Auto-unlock safety net
    setTimeout(() => {
        assetStates[symbol].status = 'scanning';
        activeTradeCount = Math.max(0, activeTradeCount - 1);
    }, 15000);

    const dirLabel = type === 'CALL' ? 'RISE ↑' : 'FALL ↓';

    reply({ type: 'TRADE_OPENED', symbol, direction: type, barrierOffset: 0 });

    reply({
        type: 'LOG', entry: {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString(),
            message: `🎯 ${symbol}: ${dirLabel} | ${duration}t | ${reason}`,
            type: 'gold'
        }
    });

    ws.send(JSON.stringify({
        proposal: 1,
        amount: currentStake,
        basis: 'stake',
        contract_type: type,
        currency: tradeCurrency,
        duration: duration,
        duration_unit: 't',
        symbol: symbol
    }));
};

// ============================================
// MAIN HANDLER
// ============================================
self.onmessage = (event: MessageEvent<WorkerCommand>) => {
    const cmd = event.data;

    switch (cmd.type) {
        case 'START':
            config = cmd.config;
            authToken = cmd.authToken;
            currentStake = cmd.config.stake;
            tradeCurrency = cmd.currency || 'USD';
            isScanActive = true;
            isPaused = false;
            activeTradeCount = 0;
            warmupReady = false;
            lastTradeTime = 0;
            activeContractId = null;
            SCANNER_SYMBOLS.forEach(s => {
                tickHistory[s] = [];
                assetCooldowns[s] = 0;
            });
            connectWS(cmd.wsUrl);
            reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: `🚀 Worker Iniciado | Moeda: ${tradeCurrency}`, type: 'info' } });
            reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: `⚛️ QUANTUM INERTIA ATIVADO`, type: 'gold' } });
            break;

        case 'STOP':
            isScanActive = false;
            if (ws) { ws.close(); ws = null; }
            reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: '🛑 Worker Parado', type: 'warning' } });
            break;

        case 'PAUSE':
            isPaused = true;
            break;

        case 'RESUME':
            isPaused = false;
            break;

        case 'UPDATE_STAKE':
            currentStake = cmd.stake;
            break;
    }
};
