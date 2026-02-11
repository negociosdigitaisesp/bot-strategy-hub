// ============================================
// QUANT SHIELD — HFT WEB WORKER v5.0
// ============================================
// Higher/Lower Barrier strategy — LAG-PROOF.
// Uses ATR + Median Range to set dynamic barriers.
// Runs in a dedicated thread for maximum performance.

import type {
    WorkerCommand, WorkerEvent, ScannerConfig, ScannerSymbol, AssetState, AssetScore,
} from './scannerWorkerTypes';
import { SCANNER_SYMBOLS, SYMBOL_NAMES, VOLATILITY_CONFIG, JITTER_CONFIG, ORBIT_CONFIG } from './scannerWorkerTypes';

// ============================================
// CONSTANTS
// ============================================
const BARRIER_PRECISION: Record<ScannerSymbol, number> = {
    R_10: 3,
    R_25: 3,
    R_50: 4,
    R_75: 4,
    R_100: 2,
};

// ============================================
// STATE
// ============================================
let ws: WebSocket | null = null;
let config: ScannerConfig | null = null;
let isPaused = false;
let isRunning = false;
let authToken = '';
let currency = 'USD';

// Per-symbol state
const assetStates: Record<string, AssetState> = {};
const subscriptionIds: Record<string, string> = {};
const lastTickTime: Record<string, number> = {};

// Execution lock
let isSocketBusy = false;
let socketBusyTimestamp = 0;
let isWaitingForContract = false;
let currentStake = 0;

// NTP Sync
let serverTimeOffset = 0;
let isTimeSynced = false;
let staleTicks = 0;

// Trade tracking
let lastTradeTimestamp = 0;
let lastTradeDirection: 'CALL' | 'PUT' = 'CALL';
let lastTradeSymbol = '';

// Performance tracking
let avgScoringTime = 0;
let scoringCount = 0;

// Jitter Filter
const pingHistory: number[] = [];
let isNetworkStressed = false;
let lastPingTime = 0;
let currentJitter = 0;
let currentLatency = 0;

// Warmup
let warmupLogged = false;

// Intervals
let reconnectIntervalId: ReturnType<typeof setInterval> | null = null;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
let ntpSyncIntervalId: ReturnType<typeof setInterval> | null = null;

// Calm regime tracking (global cross-asset)
let calmConfirmationCount = 0;

// ============================================
// SCORING ALGORITHMS
// ============================================

/**
 * Calculate ATR (Average True Range) from price buffer.
 * Uses absolute price differences as "ranges".
 */
function calculateATR(ranges: number[], period: number): number {
    if (ranges.length < period) {
        if (ranges.length === 0) return 0;
        return ranges.reduce((a, b) => a + b, 0) / ranges.length;
    }
    const slice = ranges.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Calculate Median Range — more robust than ATR mean against spikes.
 */
function calculateMedianRange(ranges: number[]): number {
    if (ranges.length === 0) return 0;
    const sorted = [...ranges].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

/**
 * ATR-based volatility score (0-40).
 * Lower ATR = higher score (calmer market = better for barrier strategy).
 */
function calculateVolatilityScore(atr: number, medianRange: number): number {
    if (atr === 0 || medianRange === 0) return 20;
    // Ratio of ATR to Median — if close to 1, market is stable
    const ratio = atr / medianRange;
    // Stable market (ratio ~1.0) = high score, volatile (ratio > 2.0) = low score
    if (ratio <= 1.0) return 40;
    if (ratio <= 1.2) return 35;
    if (ratio <= 1.5) return 25;
    if (ratio <= 2.0) return 15;
    return 5;
}

/**
 * Calm market score (0-40).
 * Checks if recent ranges are consistently below median.
 */
function calculateCalmScore(ranges: number[], medianRange: number): number {
    if (ranges.length < 5 || medianRange === 0) return 20;
    const recent = ranges.slice(-5);
    const calmCount = recent.filter(r => r <= medianRange * VOLATILITY_CONFIG.CALM_REGIME_MULTIPLIER).length;
    // All 5 calm = 40, 4 = 32, 3 = 24, 2 = 16, 1 = 8, 0 = 0
    return Math.round((calmCount / 5) * 40);
}

/**
 * Volatility clustering bonus (0-20).
 * Rewards consistency: if ranges are tightly clustered (low std dev of ranges).
 */
function calculateClusterScore(ranges: number[]): number {
    if (ranges.length < 10) return 10;
    const recent = ranges.slice(-10);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (mean === 0) return 10;
    const variance = recent.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recent.length;
    const cv = Math.sqrt(variance) / mean; // Coefficient of variation
    // Low CV = tightly clustered = high score
    if (cv <= 0.3) return 20;
    if (cv <= 0.5) return 15;
    if (cv <= 0.8) return 10;
    if (cv <= 1.2) return 5;
    return 0;
}

/**
 * Determine price direction from last N prices.
 */
function getDirection(prices: number[], lookback: number): { direction: 'up' | 'down' | 'flat'; consecutive: number } {
    if (prices.length < lookback + 1) return { direction: 'flat', consecutive: 0 };

    const recent = prices.slice(-(lookback + 1));
    let ups = 0;
    let downs = 0;
    for (let i = 1; i < recent.length; i++) {
        if (recent[i] > recent[i - 1]) ups++;
        else if (recent[i] < recent[i - 1]) downs++;
    }

    if (ups >= lookback) return { direction: 'up', consecutive: ups };
    if (downs >= lookback) return { direction: 'down', consecutive: downs };
    return { direction: 'flat', consecutive: 0 };
}

// ============================================
// HELPERS
// ============================================
function createInitialAssetState(symbol: ScannerSymbol): AssetState {
    return {
        symbol,
        displayName: SYMBOL_NAMES[symbol],
        priceBuffer: [],
        rangeBuffer: [],
        healthScore: 50,
        score: { volatility: 0, calm: 0, clusters: 0, total: 0 },
        lastPrice: 0,
        tickCount: 0,
        status: 'scanning',
        currentATR: 0,
        medianRange: 0,
        isCalm: false,
        lastDirection: 'flat',
        consecutiveDirection: 0,
    };
}

function emitLog(message: string, type: 'info' | 'success' | 'error' | 'warning' | 'gold' = 'info', symbol?: ScannerSymbol) {
    const evt: WorkerEvent = {
        type: 'LOG',
        entry: {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
            symbol,
        }
    };
    self.postMessage(evt);
}

function emit(evt: WorkerEvent) {
    self.postMessage(evt);
}

// ============================================
// JITTER FILTER
// ============================================
function updateJitterFilter(pingMs: number) {
    pingHistory.push(pingMs);
    if (pingHistory.length > JITTER_CONFIG.PING_HISTORY_SIZE) {
        pingHistory.shift();
    }

    if (pingHistory.length >= 3) {
        const mean = pingHistory.reduce((a, b) => a + b, 0) / pingHistory.length;
        const variance = pingHistory.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / pingHistory.length;
        const stdDev = Math.sqrt(variance);
        currentJitter = stdDev;

        const isOrbitMode = Math.abs(serverTimeOffset) > ORBIT_CONFIG.LATENCY_THRESHOLD_MS;
        const jitterThreshold = isOrbitMode ? ORBIT_CONFIG.JITTER_TOLERANCE_MS : JITTER_CONFIG.STRESS_THRESHOLD_MS;

        const wasStressed = isNetworkStressed;
        isNetworkStressed = stdDev > jitterThreshold;

        if (isNetworkStressed && !wasStressed) {
            emitLog(`🌐 NETWORK_STRESS: Jitter ${stdDev.toFixed(1)}ms (>${jitterThreshold}ms) — TRADES BLOQUEADOS`, 'error');
        } else if (!isNetworkStressed && wasStressed) {
            emitLog(`✅ Red estabilizada: Jitter ${stdDev.toFixed(1)}ms — Trades habilitados`, 'success');
        }
    }

    currentLatency = pingMs;
    emit({
        type: 'NETWORK_STATUS',
        latency: currentLatency,
        drift: serverTimeOffset,
        jitter: currentJitter,
        isStressed: isNetworkStressed,
        staleTicks,
        isOrbitMode: Math.abs(serverTimeOffset) > ORBIT_CONFIG.LATENCY_THRESHOLD_MS,
    });
}

// ============================================
// PRIORITY QUEUE
// ============================================
function getPriorityOrder(): ScannerSymbol[] {
    return [...SCANNER_SYMBOLS].sort((a, b) => {
        const scoreA = assetStates[a]?.score?.total ?? 0;
        const scoreB = assetStates[b]?.score?.total ?? 0;
        return scoreB - scoreA;
    });
}

// ============================================
// PER-SYMBOL AUTO-RECONNECT
// ============================================
function startAutoReconnect() {
    if (reconnectIntervalId) clearInterval(reconnectIntervalId);

    reconnectIntervalId = setInterval(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN || isPaused || !isRunning) return;

        const now = Date.now();
        for (const sym of SCANNER_SYMBOLS) {
            const lastTick = lastTickTime[sym] || 0;
            if (lastTick > 0 && (now - lastTick) > JITTER_CONFIG.STALE_SYMBOL_TIMEOUT_MS) {
                emitLog(`🔄 Re-suscribiendo ${SYMBOL_NAMES[sym]} (sin datos por ${((now - lastTick) / 1000).toFixed(1)}s)`, 'warning', sym);

                if (subscriptionIds[sym]) {
                    ws.send(JSON.stringify({ forget: subscriptionIds[sym] }));
                    delete subscriptionIds[sym];
                }

                ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
                lastTickTime[sym] = now;
                emit({ type: 'SYMBOL_RECONNECTED', symbol: sym });
            }
        }
    }, 1000);
}

// ============================================
// TICK PROCESSING PIPELINE
// ============================================
function processTick(tickSymbol: ScannerSymbol, price: number, epoch?: number) {
    lastTickTime[tickSymbol] = Date.now();

    // NTP stale tick rejection
    if (isTimeSynced && epoch) {
        const tickServerTime = epoch * 1000;
        const correctedLocalTime = Date.now() + serverTimeOffset;
        const tickAge = correctedLocalTime - tickServerTime;
        if (tickAge > 500) {
            staleTicks++;
            // Higher/Lower is more tolerant — only reject very old ticks
            if (tickAge > 2000) {
                return;
            }
        }
    }

    const scoringStartTime = performance.now();
    const asset = assetStates[tickSymbol];
    if (!asset) return;

    // Calculate range (absolute price difference)
    const range = asset.lastPrice > 0 ? Math.abs(price - asset.lastPrice) : 0;

    // Buffer update
    const newPriceBuffer = asset.priceBuffer.length >= VOLATILITY_CONFIG.BUFFER_SIZE
        ? [...asset.priceBuffer.slice(1), price]
        : [...asset.priceBuffer, price];

    const newRangeBuffer = asset.rangeBuffer.length >= VOLATILITY_CONFIG.BUFFER_SIZE
        ? [...asset.rangeBuffer.slice(1), range]
        : asset.lastPrice > 0
            ? [...asset.rangeBuffer, range]
            : [...asset.rangeBuffer];

    // ============================================
    // VOLATILITY SCORING
    // ============================================
    const calcStart = performance.now();

    const atr = calculateATR(newRangeBuffer, VOLATILITY_CONFIG.ATR_PERIOD);
    const medianRange = calculateMedianRange(newRangeBuffer);

    const volatilityScore = calculateVolatilityScore(atr, medianRange);
    const calmScore = calculateCalmScore(newRangeBuffer, medianRange);
    const clusterScore = calculateClusterScore(newRangeBuffer);

    const totalScore = volatilityScore + calmScore + clusterScore;

    const calcTime = performance.now() - calcStart;
    scoringCount++;
    avgScoringTime = avgScoringTime * 0.9 + calcTime * 0.1;
    if (scoringCount % 50 === 0) {
        emit({ type: 'EXEC_TIME', avgMs: avgScoringTime });
    }

    const scoreObj: AssetScore = {
        volatility: volatilityScore,
        calm: calmScore,
        clusters: clusterScore,
        total: totalScore,
    };

    // Direction analysis
    const { direction, consecutive } = getDirection(newPriceBuffer, VOLATILITY_CONFIG.DIRECTION_LOOKBACK);

    // Is market calm enough?
    const isCalm = calmScore >= 24; // At least 3 out of 5 recent ticks below threshold

    // Calm regime global confirmation
    if (isCalm) {
        calmConfirmationCount = Math.min(calmConfirmationCount + 1, VOLATILITY_CONFIG.ANOMALY_CONFIRMATION_TICKS + 1);
    } else {
        calmConfirmationCount = Math.max(0, calmConfirmationCount - 1);
    }
    const isConfirmedCalm = calmConfirmationCount >= VOLATILITY_CONFIG.ANOMALY_CONFIRMATION_TICKS;

    // Emit anomaly update (calm regime = our "anomaly" / edge)
    emit({
        type: 'ANOMALY_UPDATE',
        isDetected: isConfirmedCalm,
        calmScore: totalScore,
        regime: isCalm ? 'calm' : totalScore > 50 ? 'neutral' : 'volatile',
    });

    // Determine status
    let status: AssetState['status'] = 'scanning';
    const isAutoSwitchOn = config?.autoSwitch;
    const minScore = config?.minScore || 55;
    const priorityOrder = getPriorityOrder();
    const isLeader = priorityOrder[0] === tickSymbol;
    const scorePass = totalScore >= minScore;

    if (isAutoSwitchOn && (!isLeader || !scorePass)) {
        status = 'vetoed';
    } else if (isCalm && direction !== 'flat' && consecutive >= 2) {
        status = 'forming';
    }

    // Update asset state
    assetStates[tickSymbol] = {
        ...asset,
        priceBuffer: newPriceBuffer,
        rangeBuffer: newRangeBuffer,
        healthScore: Math.round(totalScore),
        score: scoreObj,
        lastPrice: price,
        tickCount: asset.tickCount + 1,
        status,
        currentATR: atr,
        medianRange,
        isCalm,
        lastDirection: direction,
        consecutiveDirection: consecutive,
    };

    // Emit state update
    const updatedPriorityOrder = getPriorityOrder();
    emit({
        type: 'TICK_UPDATE',
        states: { ...assetStates } as Record<ScannerSymbol, AssetState>,
        priorityOrder: updatedPriorityOrder,
    });

    // Check warmup
    checkWarmup();

    // Performance tracking
    const totalScoringTime = performance.now() - scoringStartTime;
    if (totalScoringTime > 10) {
        console.warn(`⚠️ [PULSE] Slow scoring: ${tickSymbol} took ${totalScoringTime.toFixed(1)}ms`);
    }

    // ============================================
    // TRADE DECISION
    // ============================================
    evaluateTradeForTick(tickSymbol, price, {
        totalScore,
        isCalm,
        isConfirmedCalm,
        direction,
        consecutive,
        atr,
        medianRange,
        newPriceBuffer,
        newRangeBuffer,
    });
}

// ============================================
// TRADE EVALUATION — HIGHER/LOWER BARRIER
// ============================================
interface TradeContext {
    totalScore: number;
    isCalm: boolean;
    isConfirmedCalm: boolean;
    direction: 'up' | 'down' | 'flat';
    consecutive: number;
    atr: number;
    medianRange: number;
    newPriceBuffer: number[];
    newRangeBuffer: number[];
}

function evaluateTradeForTick(
    tickSymbol: ScannerSymbol,
    price: number,
    ctx: TradeContext,
) {
    if (!isRunning || isPaused || isWaitingForContract || isSocketBusy || !ws || !config) return;

    // JITTER GUARD
    if (isNetworkStressed) return;

    // Auto-reset stuck lock
    if (isSocketBusy && socketBusyTimestamp > 0) {
        const busyDuration = Date.now() - socketBusyTimestamp;
        if (busyDuration > 5000) {
            emitLog(`🚨 Semáforo atascado ${(busyDuration / 1000).toFixed(1)}s - Reset forzado`, 'error');
            isSocketBusy = false;
            socketBusyTimestamp = 0;
            isWaitingForContract = false;
        }
    }

    // Warmup check
    const allReady = SCANNER_SYMBOLS.every(sym => (assetStates[sym]?.tickCount ?? 0) >= VOLATILITY_CONFIG.MIN_TICKS_FOR_TRADE);
    if (!allReady) return;

    // Anti-clustering cooldown
    const timeSinceLastTrade = Date.now() - lastTradeTimestamp;
    if (timeSinceLastTrade < VOLATILITY_CONFIG.ANTI_CLUSTERING_COOLDOWN_MS) return;

    // Minimum ticks
    const hasEnoughTicks = ctx.newRangeBuffer.length >= VOLATILITY_CONFIG.MIN_TICKS_FOR_TRADE;
    if (!hasEnoughTicks) return;

    // ============================================
    // ENTRY CONDITIONS
    // ============================================
    // 1. Market must be calm (low volatility regime)
    // 2. Price must have a clear short-term direction (3 ticks same way)
    // 3. Score must pass minimum threshold
    // 4. We trade OPPOSITE to the direction (mean reversion on volatility)
    //    - If price went UP 3 ticks → market "stretched" → PUT (price won't go HIGHER than barrier)
    //    - If price went DOWN 3 ticks → market "stretched" → CALL (price won't go LOWER than barrier)

    const shouldTrigger = ctx.isCalm
        && ctx.direction !== 'flat'
        && ctx.consecutive >= VOLATILITY_CONFIG.DIRECTION_LOOKBACK
        && ctx.medianRange > 0;

    if (!shouldTrigger) return;

    // Auto-switch guard
    if (config.autoSwitch) {
        const minScore = config.minScore || 55;
        if (ctx.totalScore < minScore) {
            assetStates[tickSymbol] = { ...assetStates[tickSymbol], status: 'vetoed' };
            return;
        }

        const priorityOrder = getPriorityOrder();
        if (priorityOrder[0] !== tickSymbol) {
            const leaderState = assetStates[priorityOrder[0]];
            if (leaderState && (leaderState.status === 'forming' || leaderState.isCalm)) {
                return;
            }
        }
    }

    // Anomaly-only mode: require confirmed calm regime
    if (config.anomalyOnlyMode && !ctx.isConfirmedCalm) {
        if (Math.random() > 0.95) {
            emitLog(`⏸️ Modo SOLO ANOMALÍA: Esperando régimen calmado confirmado...`, 'info', tickSymbol);
        }
        return;
    }

    // ============================================
    // CALCULATE BARRIER & DIRECTION
    // ============================================
    const safetyFactor = VOLATILITY_CONFIG.SAFETY_FACTOR_DEFAULT;
    const barrierOffset = ctx.medianRange * safetyFactor;

    // Mean reversion: trade opposite to recent direction
    // UP 3 ticks → PUT (barrier above) — price won't reach that high
    // DOWN 3 ticks → CALL (barrier below) — price won't reach that low
    const tradeDirection: 'CALL' | 'PUT' = ctx.direction === 'up' ? 'PUT' : 'CALL';

    // For Deriv API: barrier is the offset from entry spot
    // CALL (Higher) with negative barrier = price must stay ABOVE barrier
    // PUT (Lower) with positive barrier = price must stay BELOW barrier
    // We use the OPPOSITE: bet that price WONT reach the barrier
    const precision = BARRIER_PRECISION[tickSymbol] || 3;
    const barrierString = tradeDirection === 'PUT'
        ? `+${barrierOffset.toFixed(precision)}`   // PUT: barrier above → price won't go HIGHER
        : `-${barrierOffset.toFixed(precision)}`; // CALL: barrier below → price won't go LOWER

    const triggerReason = `${ctx.direction === 'up' ? '📈→📉' : '📉→📈'} Mean-Rev | ATR:${ctx.atr.toFixed(4)} Med:${ctx.medianRange.toFixed(4)}`;

    // ============================================
    // EXECUTE TRADE
    // ============================================
    lastTradeTimestamp = Date.now();
    lastTradeDirection = tradeDirection;
    lastTradeSymbol = SYMBOL_NAMES[tickSymbol];

    isSocketBusy = true;
    socketBusyTimestamp = Date.now();
    isWaitingForContract = true;

    assetStates[tickSymbol] = { ...assetStates[tickSymbol], status: 'firing' };

    const stakeAmount = parseFloat(currentStake.toFixed(2));
    const duration = config.duration || 5;

    emitLog(
        `🛡️ QUANT SHIELD ${SYMBOL_NAMES[tickSymbol]}: ${tradeDirection} | Barrier: ${barrierString} | Score: ${ctx.totalScore}% | ${triggerReason}`,
        'gold',
        tickSymbol
    );

    emit({
        type: 'TRADE_OPENED',
        symbol: tickSymbol,
        stake: stakeAmount,
        direction: tradeDirection,
        barrierOffset: barrierString,
        score: ctx.totalScore,
        triggerReason,
    });

    const buyRequest = {
        buy: 1,
        subscribe: 1,
        price: 10000,
        parameters: {
            contract_type: tradeDirection,
            symbol: tickSymbol,
            currency: currency,
            amount: stakeAmount,
            basis: 'stake',
            duration: duration,
            duration_unit: 't',
            barrier: barrierString,
        }
    };

    // Send immediately — Higher/Lower is lag-tolerant
    // Barrier is relative to entry spot, so latency doesn't affect safety margin
    ws.send(JSON.stringify(buyRequest));

    const execLatency = (performance.now() - lastTradeTimestamp).toFixed(0);
    console.log(`⚡ [SHIELD] BUY ${tradeDirection} SENT: ${SYMBOL_NAMES[tickSymbol]} | Barrier: ${barrierString} | exec=${execLatency}ms`);
}

// ============================================
// WARMUP CHECK
// ============================================
function checkWarmup() {
    const totalTicks = SCANNER_SYMBOLS.reduce((sum, sym) => sum + (assetStates[sym]?.tickCount ?? 0), 0);
    const minRequired = SCANNER_SYMBOLS.length * VOLATILITY_CONFIG.MIN_TICKS_FOR_TRADE;
    const progress = Math.min(100, (totalTicks / minRequired) * 100);
    const allReady = SCANNER_SYMBOLS.every(sym => (assetStates[sym]?.tickCount ?? 0) >= VOLATILITY_CONFIG.MIN_TICKS_FOR_TRADE);

    emit({ type: 'WARMUP_PROGRESS', progress, isReady: totalTicks >= minRequired && allReady });

    if (totalTicks >= minRequired && !warmupLogged) {
        warmupLogged = true;
        emitLog('🔥 Sistema calibrado. Motor Quant Shield Activo.', 'gold');
    }
}

// ============================================
// WEBSOCKET MESSAGE HANDLER
// ============================================
function handleWsMessage(event: MessageEvent) {
    if (isPaused) return;

    try {
        const data = JSON.parse(event.data);

        // NTP time sync
        if (data.msg_type === 'time' && data.time) {
            const serverTimeMs = data.time * 1000;
            const localTime = Date.now();
            serverTimeOffset = serverTimeMs - localTime;
            isTimeSynced = true;
            // Only log if drift is significant (> 500ms) to avoid spam
            if (Math.abs(serverTimeOffset) > 500) {
                emitLog(`🕐 Sincronizado: drift ${serverTimeOffset}ms`, 'warning');
            }
            emit({
                type: 'NETWORK_STATUS',
                latency: currentLatency,
                drift: serverTimeOffset,
                jitter: currentJitter,
                isStressed: isNetworkStressed,
                staleTicks,
                isOrbitMode: Math.abs(serverTimeOffset) > ORBIT_CONFIG.LATENCY_THRESHOLD_MS,
            });
            return;
        }

        // Ping response → jitter filter
        if (data.msg_type === 'ping' && lastPingTime > 0) {
            const pingLatency = performance.now() - lastPingTime;
            lastPingTime = 0;
            updateJitterFilter(pingLatency);
            if (pingLatency > 300) {
                emitLog(`⚠️ WebSocket lento: ${pingLatency.toFixed(0)}ms`, 'warning');
            }
            return;
        }

        // Tick subscription id capture
        if (data.msg_type === 'tick' && data.subscription) {
            const sym = data.tick?.symbol;
            if (sym && SCANNER_SYMBOLS.includes(sym as ScannerSymbol)) {
                subscriptionIds[sym] = data.subscription.id;
            }
        }

        // Tick data
        if (data.msg_type === 'tick' && data.tick) {
            const tickSymbol = data.tick.symbol as ScannerSymbol;
            if (!SCANNER_SYMBOLS.includes(tickSymbol)) return;

            const price = parseFloat(data.tick.quote);
            processTick(tickSymbol, price, data.tick.epoch);
        }

        // Buy response
        if (data.msg_type === 'buy' && data.buy) {
            const t2 = performance.now();
            const latencyMs = lastTradeTimestamp > 0 ? t2 - lastTradeTimestamp : -1;

            isSocketBusy = false;
            socketBusyTimestamp = 0;

            const drift = serverTimeOffset;

            if (latencyMs > 0) {
                const latencyIcon = latencyMs > 500 ? '🚨' : latencyMs > 200 ? '⚠️' : '✅';
                emitLog(`${latencyIcon} [SYNC] ${latencyMs.toFixed(0)}ms | Drift: ${drift}ms | ID: ${data.buy.contract_id}`, latencyMs > 500 ? 'error' : 'success');
                emit({ type: 'TRADE_LATENCY', latencyMs, driftMs: drift });
            } else {
                emitLog(`✅ Contrato abierto: ${data.buy.contract_id}`, 'success');
            }
        }

        // Contract result
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
            const contract = data.proposal_open_contract;

            if (contract.is_sold) {
                isWaitingForContract = false;
                const profit = parseFloat(contract.profit);
                const isWin = profit > 0;
                const tradedSymbol = (contract.underlying as ScannerSymbol) || SCANNER_SYMBOLS[0];

                // Reset asset status
                if (assetStates[tradedSymbol]) {
                    assetStates[tradedSymbol] = { ...assetStates[tradedSymbol], status: 'scanning' };
                }

                emit({
                    type: 'TRADE_RESULT',
                    contractId: contract.contract_id,
                    profit,
                    isWin,
                    symbol: tradedSymbol,
                });
            }
        }

        // Error handling
        if (data.error) {
            if (data.error.code === 'AlreadySubscribed' || data.error.message?.includes('already subscribed')) {
                return;
            }
            const errorMsg = data.error.message || 'Error desconocido';
            const errorCode = data.error.code || 'UNKNOWN';
            emitLog(`⚠️ Error de Bróker [${errorCode}]: ${errorMsg}`, 'error');
            console.error('[DERIV API ERROR]', data.error);
            isSocketBusy = false;
            socketBusyTimestamp = 0;
            isWaitingForContract = false;
            emit({ type: 'ERROR', message: errorMsg, code: errorCode });
        }

    } catch (err) {
        console.error("CRITICAL ERROR in Worker Scanner:", err);
        emitLog('❌ Error interno en scanner worker. Recuperando...', 'error');
    }
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================
function connectWebSocket(wsUrl: string, token: string) {
    if (ws) {
        try { ws.close(); } catch (_) { /* ignore */ }
    }

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('🔌 [WORKER] WebSocket connected');
        emit({ type: 'WS_CONNECTED' });

        // Authorize
        ws!.send(JSON.stringify({ authorize: token }));

        // Request server time sync
        ws!.send(JSON.stringify({ time: 1 }));
        emitLog('🕐 Sincronizando reloj con servidor...', 'info');

        // Subscribe to all symbols
        SCANNER_SYMBOLS.forEach(sym => {
            ws!.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
            lastTickTime[sym] = Date.now();
            emitLog(`📡 Suscrito a ${SYMBOL_NAMES[sym]}`, 'info');
        });

        // Start auto-reconnect watchdog
        startAutoReconnect();

        // Heartbeat (10s)
        if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                lastPingTime = performance.now();
                ws.send(JSON.stringify({ ping: 1 }));
            }
        }, 10000);

        // NTP re-sync
        if (ntpSyncIntervalId) clearInterval(ntpSyncIntervalId);
        ntpSyncIntervalId = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ time: 1 }));
            }
        }, ORBIT_CONFIG.NTP_SYNC_INTERVAL_MS);
    };

    ws.onmessage = handleWsMessage;

    ws.onclose = () => {
        emit({ type: 'WS_DISCONNECTED' });
        emitLog('⚠️ WebSocket desconectado. Reintentando...', 'warning');

        if (isRunning && !isPaused) {
            setTimeout(() => {
                if (isRunning && !isPaused) {
                    connectWebSocket(wsUrl, token);
                }
            }, 2000);
        }
    };

    ws.onerror = (err) => {
        console.error('🔌 [WORKER] WebSocket error:', err);
        emitLog('❌ Error de conexión WebSocket', 'error');
    };
}

// ============================================
// FLUSH BUFFERS
// ============================================
function flushBuffers(reason: string) {
    SCANNER_SYMBOLS.forEach(sym => {
        if (assetStates[sym]) {
            assetStates[sym] = {
                ...assetStates[sym],
                priceBuffer: [],
                rangeBuffer: [],
                tickCount: 0,
                score: { volatility: 0, calm: 0, clusters: 0, total: 0 },
            };
        }
    });
    calmConfirmationCount = 0;
    warmupLogged = false;
    emitLog(`🧹 Buffers limpiados: ${reason}`, 'warning');
}

// ============================================
// CLEANUP
// ============================================
function cleanup() {
    isRunning = false;
    isPaused = false;

    if (reconnectIntervalId) { clearInterval(reconnectIntervalId); reconnectIntervalId = null; }
    if (heartbeatIntervalId) { clearInterval(heartbeatIntervalId); heartbeatIntervalId = null; }
    if (ntpSyncIntervalId) { clearInterval(ntpSyncIntervalId); ntpSyncIntervalId = null; }

    if (ws) {
        try {
            ws.send(JSON.stringify({ forget_all: 'ticks' }));
            ws.close();
        } catch (_) { /* ignore */ }
        ws = null;
    }
}

// ============================================
// COMMAND HANDLER (Main Thread → Worker)
// ============================================
self.onmessage = (event: MessageEvent<WorkerCommand>) => {
    const cmd = event.data;

    switch (cmd.type) {
        case 'START': {
            console.log('🚀 [WORKER] Starting Quant Shield...');
            cleanup();

            config = cmd.config;
            authToken = cmd.authToken;
            currency = cmd.currency;
            currentStake = cmd.config.stake;
            isRunning = true;
            isPaused = false;
            staleTicks = 0;
            isNetworkStressed = false;
            pingHistory.length = 0;
            currentJitter = 0;
            calmConfirmationCount = 0;
            lastTradeTimestamp = 0;
            isSocketBusy = false;
            socketBusyTimestamp = 0;
            isWaitingForContract = false;
            warmupLogged = false;
            scoringCount = 0;
            avgScoringTime = 0;

            SCANNER_SYMBOLS.forEach(sym => {
                assetStates[sym] = createInitialAssetState(sym);
                lastTickTime[sym] = 0;
                delete subscriptionIds[sym];
            });

            emitLog('🛡️ QUANT SHIELD v5.0 [WORKER] — Higher/Lower Barrier Strategy', 'gold');
            if (config.autoSwitch) {
                emitLog('🧠 Selección Inteligente ACTIVADA', 'info');
            }
            emitLog('⏳ Calibrando volatilidad de 5 activos...', 'info');
            emitLog('🌐 Jitter Filter ACTIVADO', 'info');
            emitLog('📊 Priority Queue ACTIVADO', 'info');
            emitLog('🔄 Auto-Reconnect ACTIVADO', 'info');

            connectWebSocket(cmd.wsUrl, cmd.authToken);
            break;
        }

        case 'STOP': {
            emitLog('🛑 Quant Shield detenido', 'warning');
            cleanup();
            break;
        }

        case 'PAUSE': {
            isPaused = true;
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ forget_all: 'ticks' }));
            }
            if (reconnectIntervalId) { clearInterval(reconnectIntervalId); reconnectIntervalId = null; }
            break;
        }

        case 'RESUME': {
            isPaused = false;
            warmupLogged = false;
            flushBuffers('cooldown_resume');
            isWaitingForContract = false;
            isSocketBusy = false;

            if (ws && ws.readyState === WebSocket.OPEN) {
                SCANNER_SYMBOLS.forEach(sym => {
                    ws!.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
                    lastTickTime[sym] = Date.now();
                });
                startAutoReconnect();
                emitLog('🚀 Resfriamento completo! Reiniciando análise...', 'success');
                emitLog('⏳ Calibrando sistema...', 'info');
            } else {
                if (authToken && config) {
                    const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=1089`;
                    connectWebSocket(wsUrl, authToken);
                }
            }
            break;
        }

        case 'UPDATE_STAKE': {
            currentStake = cmd.stake;
            break;
        }

        case 'UPDATE_CONFIG': {
            if (config) {
                config = { ...config, ...cmd.config };
            }
            break;
        }
    }
};
