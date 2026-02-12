/* eslint-disable no-restricted-globals */
import {
    ScannerConfig, ScannerSymbol, AssetState, WorkerCommand, WorkerEvent,
    SCANNER_SYMBOLS, SYMBOL_NAMES
} from './scannerWorkerTypes';

// ============================================
// CONFIGURATION Constants
// ============================================
const VOLATILITY_WINDOW = 20;
const BARRIER_FACTOR = 2.2; // Quant Shield Safety Factor
const MIN_RANGE = 0.05;     // Minimum range floor to avoid 0 barrier
const REGIME_MULTIPLIER = 2; // Block trades if last 3 ranges > 2x median

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
let tradeCurrency = 'USD';  // Dynamic currency from account
let isTrading = false;       // Concurrency lock — only 1 trade at a time
let warmupReady = false;     // Track warmup completion
let lastTradeTime = 0;       // Timestamp of last trade — enforce minimum interval
let activeContractId: string | null = null; // Track active contract for lock release
const MIN_TRADE_INTERVAL = 10000; // 10 seconds minimum between trades

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

// NTP / Jitter
let timeOffset = 0;

// HELPER: Send Event to Main Thread
const reply = (event: WorkerEvent) => {
    self.postMessage(event);
};

// ============================================
// MATH HELPERS (Dependency Free)
// ============================================
const getMedianRange = (ticks: Tick[], period: number): number => {
    if (ticks.length < 2) return 0;
    const relevant = ticks.slice(-period - 1);
    const ranges: number[] = [];
    for (let i = 1; i < relevant.length; i++) {
        ranges.push(Math.abs(relevant[i].quote - relevant[i - 1].quote));
    }
    if (ranges.length === 0) return 0;
    ranges.sort((a, b) => a - b);
    const mid = Math.floor(ranges.length / 2);
    return ranges.length % 2 ? ranges[mid] : (ranges[mid - 1] + ranges[mid]) / 2;
};

// Volatility Regime Filter: block if last 3 ranges > 2x median
const isVolatilityRegimeBlocked = (ticks: Tick[], medianRange: number): boolean => {
    if (ticks.length < 4 || medianRange <= 0) return false;
    for (let i = ticks.length - 1; i >= ticks.length - 3; i--) {
        const range = Math.abs(ticks[i].quote - ticks[i - 1].quote);
        if (range <= medianRange * REGIME_MULTIPLIER) {
            return false; // At least one tick is within normal range
        }
    }
    return true; // All 3 exceeded 2x median → BLOCK
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
        // Auto-reconnect after 2s
        setTimeout(() => {
            if (isScanActive) connectWS(url);
        }, 2000);
    };

    ws.onerror = (err) => {
        reply({ type: 'ERROR', message: 'WebSocket Error' });
    };

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        // Authorization Response
        if (data.msg_type === 'authorize') {
            reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: '✅ Worker Autorizado', type: 'success' } });
            // Subscribe to ticks
            ws?.send(JSON.stringify({
                ticks: SCANNER_SYMBOLS,
                subscribe: 1
            }));
            // Initial Time Sync
            ws?.send(JSON.stringify({ time: 1 }));
        }

        // Time Sync Logic
        if (data.msg_type === 'time') {
            const serverTime = data.time * 1000;
            const localTime = Date.now();
            timeOffset = serverTime - localTime;
        }

        // Tick Handling
        if (data.msg_type === 'tick') {
            processTick(data.tick);
        }

        // Proposal (Trade Response)
        if (data.msg_type === 'proposal') {
            if (data.error) {
                const errMsg = data.error.message || JSON.stringify(data.error);
                reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: `⚠️ Proposal Error: ${errMsg}`, type: 'error' } });
                // Release lock on failed proposal
                isTrading = false;
                activeContractId = null;
                return;
            }
            // Execute Buy
            ws?.send(JSON.stringify({
                buy: data.proposal.id,
                price: data.proposal.ask_price
            }));
        }

        // Buy Response (Trade Opened)
        if (data.msg_type === 'buy') {
            if (data.error) {
                const errMsg = data.error?.message || JSON.stringify(data.error);
                reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: `⚠️ Buy Error: ${errMsg}`, type: 'error' } });
                // Release lock on failed buy
                isTrading = false;
                activeContractId = null;
                return;
            }
            if (data.buy) {
                activeContractId = data.buy.contract_id;
                // Subscribe to open contract to track result
                ws?.send(JSON.stringify({
                    proposal_open_contract: 1,
                    contract_id: data.buy.contract_id,
                    subscribe: 1
                }));
            }
        }

        // Open Contract Update (Trade Result)
        if (data.msg_type === 'proposal_open_contract') {
            const contract = data.proposal_open_contract;
            if (contract.is_sold) {
                const profit = parseFloat(contract.profit);
                const isWin = profit > 0;

                const symbol = contract.underlying as ScannerSymbol;

                // Only release lock if this is OUR active contract
                if (activeContractId === null || contract.contract_id == activeContractId) {
                    isTrading = false;
                    activeContractId = null;
                }
                if (assetStates[symbol]) {
                    assetStates[symbol].status = 'scanning';
                }

                reply({
                    type: 'TRADE_RESULT',
                    profit: profit,
                    isWin: isWin,
                    symbol: symbol
                });
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
    const epoch = tickData.epoch * 1000; // ms
    const quote = tickData.quote;

    // 1. Jitter Filter (Lag Proofing)
    const now = Date.now();
    const tickTime = epoch - timeOffset;
    const latency = now - tickTime;

    if (latency > 500) {
        return; // Ignore stale tick
    }

    // 2. Update History
    const history = tickHistory[symbol];
    history.push({ epoch, quote });
    if (history.length > 50) history.shift(); // Keep 50 ticks

    // 3. Calculate Median Range + Calm Score
    const medianRange = getMedianRange(history, VOLATILITY_WINDOW);
    const calmScore = Math.max(0, Math.min(100, 100 - (medianRange * 50)));

    // Update State
    assetStates[symbol].lastPrice = quote;
    assetStates[symbol].score = {
        volatility: parseFloat(medianRange.toFixed(4)),
        calm: parseFloat(calmScore.toFixed(2)),
        clusters: 0,
        total: parseFloat(calmScore.toFixed(2))
    };

    // 4. Warmup Progress — emit until all 5 assets have >= VOLATILITY_WINDOW ticks
    if (!warmupReady) {
        const readyCount = SCANNER_SYMBOLS.filter(s => tickHistory[s].length >= VOLATILITY_WINDOW).length;
        const progress = Math.floor((readyCount / SCANNER_SYMBOLS.length) * 100);
        reply({ type: 'WARMUP_PROGRESS', progress, isReady: readyCount >= SCANNER_SYMBOLS.length });
        if (readyCount >= SCANNER_SYMBOLS.length) {
            warmupReady = true;
            reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: '✅ Calibração completa — 5 ativos prontos', type: 'success' } });
        }
    }

    // 5. Broadcast State Update
    reply({
        type: 'TICK_UPDATE',
        states: assetStates,
        priorityOrder: Object.keys(assetStates).sort((a, b) => assetStates[b as ScannerSymbol].score.total - assetStates[a as ScannerSymbol].score.total) as ScannerSymbol[]
    });

    // 6. Trade Logic (Quant Shield)
    if (config && warmupReady && history.length >= VOLATILITY_WINDOW && calmScore >= (config.minScore || 50)) {
        // Volatility Regime Filter: block if last 3 ticks had range > 2x median
        if (isVolatilityRegimeBlocked(history, medianRange)) {
            return; // Market too volatile — skip
        }
        checkTradeOpportunity(symbol, history, medianRange);
    }
};

const checkTradeOpportunity = (symbol: ScannerSymbol, ticks: Tick[], medianRange: number) => {
    if (assetStates[symbol].status !== 'scanning') return;
    if (isTrading) return; // Concurrency lock — only 1 trade at a time

    // Minimum interval between trades (prevents excessive frequency)
    const now = Date.now();
    if (now - lastTradeTime < MIN_TRADE_INTERVAL) return;

    // Need at least 3 ticks for pattern
    if (ticks.length < 3) return;

    const t0 = ticks[ticks.length - 1].quote;
    const t1 = ticks[ticks.length - 2].quote;
    const t2 = ticks[ticks.length - 3].quote;

    // Direction Detection (3-tick trend)
    const isUp = t0 > t1 && t1 > t2;
    const isDown = t0 < t1 && t1 < t2;

    // Barrier = median_range × safety_factor (spec: 2.2)
    const barrierOffset = Math.max(MIN_RANGE, medianRange * BARRIER_FACTOR);
    const barrierStr = barrierOffset.toFixed(2);

    if (isDown) {
        // Mean Reversion -> CALL (Higher)
        placeTrade(symbol, 'CALL', `-${barrierStr}`, barrierOffset);
    } else if (isUp) {
        // Mean Reversion -> PUT (Lower)
        placeTrade(symbol, 'PUT', `+${barrierStr}`, barrierOffset);
    }
};

const placeTrade = (symbol: ScannerSymbol, type: 'CALL' | 'PUT', barrier: string, rawOffset: number) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (isTrading) return; // Double-check concurrency lock

    isTrading = true; // Lock
    lastTradeTime = Date.now(); // Record trade time for interval enforcement
    assetStates[symbol].status = 'firing';

    // Auto-unlock after 5s (safety net)
    setTimeout(() => {
        assetStates[symbol].status = 'scanning';
        isTrading = false;
    }, 5000);

    reply({
        type: 'TRADE_OPENED',
        symbol,
        direction: type,
        barrierOffset: rawOffset
    });

    // Send Proposal with dynamic currency
    ws.send(JSON.stringify({
        proposal: 1,
        amount: currentStake,
        basis: 'stake',
        contract_type: type,
        currency: tradeCurrency,
        duration: 5,
        duration_unit: 't',
        symbol: symbol,
        barrier: barrier
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
            isTrading = false;
            warmupReady = false;
            lastTradeTime = 0;
            activeContractId = null;
            // Clear tick history for fresh start
            SCANNER_SYMBOLS.forEach(s => { tickHistory[s] = []; });
            connectWS(cmd.wsUrl);
            reply({ type: 'LOG', entry: { id: Date.now().toString(), time: new Date().toLocaleTimeString(), message: `🚀 Worker Iniciado | Moeda: ${tradeCurrency}`, type: 'info' } });
            break;

        case 'STOP':
            isScanActive = false;
            if (ws) {
                ws.close();
                ws = null;
            }
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
