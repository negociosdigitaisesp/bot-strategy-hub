// ============================================
// THE BUG DERIV SCANNER — HFT WEB WORKER v4.0
// ============================================
// Runs in a dedicated thread. Owns WebSocket, scoring, jitter filter,
// priority queue, and per-symbol auto-reconnect.
// Communicates with main thread via postMessage().

import type {
    WorkerCommand, WorkerEvent, ScannerConfig, ScannerSymbol, AssetState, AssetScore,
} from './scannerWorkerTypes';
import { SCANNER_SYMBOLS, SYMBOL_NAMES, ANOMALY_CONFIG, JITTER_CONFIG, ORBIT_CONFIG } from './scannerWorkerTypes';

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
const subscriptionIds: Record<string, string> = {};  // symbol → subscription_id
const lastTickTime: Record<string, number> = {};      // symbol → timestamp

// Execution lock
let isSocketBusy = false;
let socketBusyTimestamp = 0;
let isWaitingForContract = false;
let currentStake = 0;

// NTP Sync
let serverTimeOffset = 0;
let isTimeSynced = false;
let staleTicks = 0;

// Anomaly detection
let anomalyConfirmationCount = 0;
let anomalyType: 'negative' | 'positive' | null = null;
let lastTradeTimestamp = 0;

// Signal diagnostics
let signalTimestamp = 0;
let signalDigit = -1;
let signalSymbol = '';

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

// Auto-reconnect interval
let reconnectIntervalId: ReturnType<typeof setInterval> | null = null;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
let ntpSyncIntervalId: ReturnType<typeof setInterval> | null = null;

// ============================================
// SCORING ALGORITHMS (Pure Functions)
// ============================================
function calculateZScore(prices: number[]): number {
    if (prices.length < 10) return 0;
    const velocities: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        velocities.push(prices[i] - prices[i - 1]);
    }
    if (velocities.length < 2) return 0;
    const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    const latestVelocity = velocities[velocities.length - 1];
    return Math.abs((latestVelocity - mean) / stdDev);
}

function calculateEntropyScore(digits: number[]): number {
    if (digits.length < 15) return 30;
    const counts = new Array(10).fill(0);
    digits.forEach(d => counts[d]++);
    const expected = digits.length / 10;
    let chiSquare = 0;
    counts.forEach(count => {
        chiSquare += Math.pow(count - expected, 2) / expected;
    });
    const score = Math.max(0, 60 - (chiSquare * 3));
    return Math.min(60, Math.round(score));
}

function calculateAutocorrelation(digits: number[]): number {
    if (digits.length < 20) return 0;
    const n = digits.length;
    const mean = digits.reduce((a, b) => a + b, 0) / n;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n - 1; i++) {
        numerator += (digits[i] - mean) * (digits[i + 1] - mean);
        denominator += Math.pow(digits[i] - mean, 2);
    }
    return denominator === 0 ? 0 : numerator / denominator;
}

function calculateAutocorrScore(digits: number[]): number {
    const autocorr = calculateAutocorrelation(digits);
    if (autocorr < -0.15) return 40;
    if (autocorr < -0.05) return 30;
    if (autocorr < 0.05) return 20;
    if (autocorr < 0.15) return 10;
    return 0;
}

function analyzeStreak(digits: number[]): { currentStreak: number; isAnomalous: boolean } {
    if (digits.length < 3) return { currentStreak: 1, isAnomalous: false };
    let currentStreak = 1;
    const lastDigit = digits[digits.length - 1];
    for (let i = digits.length - 2; i >= 0; i--) {
        if (digits[i] === lastDigit) currentStreak++;
        else break;
    }
    return { currentStreak, isAnomalous: currentStreak >= 3 };
}

// ============================================
// HELPERS
// ============================================
function createInitialAssetState(symbol: ScannerSymbol): AssetState {
    return {
        symbol,
        displayName: SYMBOL_NAMES[symbol],
        digitBuffer: [],
        priceBuffer: [],
        healthScore: 50,
        score: { entropy: 0, volatility: 0, clusters: 0, total: 0 },
        shadowPattern: false,
        lastTwoDigits: null,
        inertiaOK: false,
        zScore: 0,
        status: 'scanning',
        lastPrice: 0,
        tickCount: 0,
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
            console.warn(`🌐 [JITTER] NETWORK_STRESS ON: stdDev=${stdDev.toFixed(1)}ms`);
        } else if (!isNetworkStressed && wasStressed) {
            const relaxMsg = isOrbitMode ? ' (Modo Órbita Relajado)' : '';
            emitLog(`✅ Red estabilizada${relaxMsg}: Jitter ${stdDev.toFixed(1)}ms — Trades habilitados`, 'success');
            console.log(`🌐 [JITTER] NETWORK_STRESS OFF: stdDev=${stdDev.toFixed(1)}ms`);
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
                console.warn(`🔄 [RECONNECT] ${SYMBOL_NAMES[sym]} stale for ${now - lastTick}ms — re-subscribing`);
                emitLog(`🔄 Re-suscribiendo ${SYMBOL_NAMES[sym]} (sin datos por ${((now - lastTick) / 1000).toFixed(1)}s)`, 'warning', sym);

                // Forget old subscription if we have an ID
                if (subscriptionIds[sym]) {
                    ws.send(JSON.stringify({ forget: subscriptionIds[sym] }));
                    delete subscriptionIds[sym];
                }

                // Re-subscribe
                ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
                lastTickTime[sym] = now; // Reset to avoid spamming
                emit({ type: 'SYMBOL_RECONNECTED', symbol: sym });
            }
        }
    }, 1000);
}

// ============================================
// TICK PROCESSING PIPELINE
// ============================================
function processTick(tickSymbol: ScannerSymbol, price: number, epoch?: number) {
    // Update last tick time for auto-reconnect
    lastTickTime[tickSymbol] = Date.now();

    // NTP stale tick rejection
    if (isTimeSynced && epoch) {
        const tickServerTime = epoch * 1000;
        const correctedLocalTime = Date.now() + serverTimeOffset;
        const tickAge = correctedLocalTime - tickServerTime;
        if (tickAge > 300) {
            staleTicks++;
            if (tickAge > 1000) {
                console.warn(`⛔ [STALE] Tick REJECTED: ${tickSymbol} age=${tickAge.toFixed(0)}ms`);
            }
            return;
        }
    }

    const quote = price.toFixed(2);
    const currentDigit = parseInt(quote.charAt(quote.length - 1));
    const scoringStartTime = performance.now();

    const asset = assetStates[tickSymbol];
    if (!asset) return;

    // Buffer update
    const newDigitBuffer = asset.digitBuffer.length >= ANOMALY_CONFIG.BUFFER_SIZE
        ? [...asset.digitBuffer.slice(1), currentDigit]
        : [...asset.digitBuffer, currentDigit];
    const newPriceBuffer = asset.priceBuffer.length >= ANOMALY_CONFIG.BUFFER_SIZE
        ? [...asset.priceBuffer.slice(1), price]
        : [...asset.priceBuffer, price];

    // Scoring
    const calcStart = performance.now();
    const zScore = calculateZScore(newPriceBuffer);
    const entropyScore = calculateEntropyScore(newDigitBuffer);
    const autocorrScore = calculateAutocorrScore(newDigitBuffer);
    const rawAutocorr = calculateAutocorrelation(newDigitBuffer);
    const calcTime = performance.now() - calcStart;

    // Performance tracking
    scoringCount++;
    avgScoringTime = avgScoringTime * 0.9 + calcTime * 0.1;
    if (scoringCount % 50 === 0) {
        emit({ type: 'EXEC_TIME', avgMs: avgScoringTime });
    }

    const totalScore = entropyScore + autocorrScore;
    const scoreObj: AssetScore = { entropy: entropyScore, volatility: autocorrScore, clusters: 0, total: totalScore };

    // Anomaly detection
    const isAutocorrAnomaly = Math.abs(rawAutocorr) > ANOMALY_CONFIG.AUTOCORR_ANOMALY_THRESHOLD;
    const detectedAnomalyType: 'negative' | 'positive' | null =
        rawAutocorr < -ANOMALY_CONFIG.AUTOCORR_ANOMALY_THRESHOLD ? 'negative' :
            rawAutocorr > ANOMALY_CONFIG.AUTOCORR_ANOMALY_THRESHOLD ? 'positive' : null;

    if (isAutocorrAnomaly) {
        anomalyConfirmationCount++;
        anomalyType = detectedAnomalyType;
    } else {
        anomalyConfirmationCount = 0;
        anomalyType = null;
    }

    const isConfirmedAnomaly = anomalyConfirmationCount >= ANOMALY_CONFIG.ANOMALY_CONFIRMATION_TICKS;

    // Emit anomaly update
    if (isConfirmedAnomaly && anomalyConfirmationCount === ANOMALY_CONFIG.ANOMALY_CONFIRMATION_TICKS) {
        const typeEmoji = anomalyType === 'negative' ? '📉' : '📈';
        emitLog(`${typeEmoji} ANOMALÍA CONFIRMADA: Autocorr ${rawAutocorr.toFixed(3)} (${anomalyType}) en ${SYMBOL_NAMES[tickSymbol]}`, 'gold', tickSymbol);
    }
    emit({ type: 'ANOMALY_UPDATE', isDetected: isConfirmedAnomaly, autocorr: rawAutocorr, anomalyType });

    const lastTwo = newDigitBuffer.length >= 2
        ? [newDigitBuffer[newDigitBuffer.length - 2], newDigitBuffer[newDigitBuffer.length - 1]] as [number, number]
        : null;
    const shadowPattern = lastTwo !== null && lastTwo[0] === lastTwo[1];
    const { currentStreak, isAnomalous: isStreakAnomalous } = analyzeStreak(newDigitBuffer);
    const inertiaOK = zScore < 1.5;

    let status: AssetState['status'] = 'scanning';
    const isAutoSwitchOn = config?.autoSwitch;
    const minScore = config?.minScore || 55;
    const priorityOrder = getPriorityOrder();
    const isLeader = priorityOrder[0] === tickSymbol;
    const scorePass = totalScore >= minScore;

    if (isAutoSwitchOn && (!isLeader || !scorePass)) {
        status = 'vetoed';
    } else if (isConfirmedAnomaly || shadowPattern || isStreakAnomalous) {
        status = 'forming';
    }

    // Update asset state
    assetStates[tickSymbol] = {
        ...asset,
        digitBuffer: newDigitBuffer,
        priceBuffer: newPriceBuffer,
        healthScore: Math.round(totalScore),
        score: scoreObj,
        shadowPattern: shadowPattern || isStreakAnomalous || isConfirmedAnomaly,
        lastTwoDigits: lastTwo,
        inertiaOK,
        zScore,
        status,
        lastPrice: price,
        tickCount: asset.tickCount + 1,
    };

    // Emit state update with priority order
    const updatedPriorityOrder = getPriorityOrder();
    emit({
        type: 'TICK_UPDATE',
        states: { ...assetStates } as Record<ScannerSymbol, AssetState>,
        priorityOrder: updatedPriorityOrder,
    });

    // Check warmup
    checkWarmup();

    // Track scoring time
    const totalScoringTime = performance.now() - scoringStartTime;
    if (totalScoringTime > 10) {
        console.warn(`⚠️ [PULSE] Slow scoring: ${tickSymbol} took ${totalScoringTime.toFixed(1)}ms`);
    }

    // ============================================
    // TRADE DECISION — Priority Queue Order
    // ============================================
    evaluateTradeForTick(tickSymbol, currentDigit, price, {
        newDigitBuffer, newPriceBuffer, zScore, entropyScore, autocorrScore,
        rawAutocorr, totalScore, isConfirmedAnomaly, shadowPattern,
        isStreakAnomalous, currentStreak, inertiaOK, lastTwo,
    });
}

// ============================================
// TRADE EVALUATION
// ============================================
interface TradeContext {
    newDigitBuffer: number[];
    newPriceBuffer: number[];
    zScore: number;
    entropyScore: number;
    autocorrScore: number;
    rawAutocorr: number;
    totalScore: number;
    isConfirmedAnomaly: boolean;
    shadowPattern: boolean;
    isStreakAnomalous: boolean;
    currentStreak: number;
    inertiaOK: boolean;
    lastTwo: [number, number] | null;
}

function evaluateTradeForTick(
    tickSymbol: ScannerSymbol,
    currentDigit: number,
    price: number,
    ctx: TradeContext,
) {
    if (!isRunning || isPaused || isWaitingForContract || isSocketBusy || !ws || !config) return;

    // ============================================
    // JITTER GUARD: Block trades during NETWORK_STRESS
    // ============================================
    if (isNetworkStressed) {
        return;  // CRITICAL: No trades with unstable network
    }

    // Auto-reset stuck execution lock
    if (isSocketBusy && socketBusyTimestamp > 0) {
        const busyDuration = Date.now() - socketBusyTimestamp;
        if (busyDuration > 5000) {
            console.error(`🚨 [ATOMIC] Socket busy for ${busyDuration}ms - FORCE UNLOCKING`);
            emitLog(`🚨 Semáforo atascado ${(busyDuration / 1000).toFixed(1)}s - Reset forzado`, 'error');
            isSocketBusy = false;
            socketBusyTimestamp = 0;
            isWaitingForContract = false;
        }
    }

    // Check warmup
    const allReady = SCANNER_SYMBOLS.every(sym => (assetStates[sym]?.tickCount ?? 0) >= 15);
    if (!allReady) return;

    // Anti-clustering temporal cooldown
    const timeSinceLastTrade = Date.now() - lastTradeTimestamp;
    if (timeSinceLastTrade < ANOMALY_CONFIG.ANTI_CLUSTERING_COOLDOWN_MS) return;

    const hasEnoughTicks = ctx.newDigitBuffer.length >= ANOMALY_CONFIG.MIN_TICKS_FOR_TRADE;
    const shouldTrigger = hasEnoughTicks && (ctx.isConfirmedAnomaly || ctx.shadowPattern || ctx.isStreakAnomalous);

    if (shouldTrigger && ctx.inertiaOK) {
        console.log(`🛠️ [v4.0] Trigger en ${SYMBOL_NAMES[tickSymbol]}. Score: ${ctx.totalScore}. Autocorr: ${ctx.rawAutocorr.toFixed(3)}. Anomaly: ${ctx.isConfirmedAnomaly}`);

        // Auto-switch guard
        if (config.autoSwitch) {
            const minScore = config.minScore || 55;
            if (ctx.totalScore < minScore) {
                assetStates[tickSymbol] = { ...assetStates[tickSymbol], status: 'vetoed' };
                return;
            }
            // Check if another asset is leader and forming
            const priorityOrder = getPriorityOrder();
            if (priorityOrder[0] !== tickSymbol) {
                const leaderState = assetStates[priorityOrder[0]];
                if (leaderState && (leaderState.status === 'forming' || leaderState.shadowPattern)) {
                    return;
                }
            }
        }

        // Anomaly-only mode guard
        if (config.anomalyOnlyMode) {
            if (!ctx.isConfirmedAnomaly) {
                if (Math.random() > 0.95) {
                    emitLog(`⏸️ Modo SOLO ANOMALÍA: Esperando anomalía confirmada...`, 'info', tickSymbol);
                }
                return;
            }
            if (ctx.rawAutocorr > 0) {
                emitLog(`⚠️ Anomalía positiva detectada - EVITANDO trade`, 'warning', tickSymbol);
                return;
            }
            emitLog(`📉 MODO ANOMALÍA: Edge confirmado (r=${ctx.rawAutocorr.toFixed(3)})`, 'gold', tickSymbol);
        }

        // EXECUTE TRADE
        const triggerDigit = ctx.lastTwo ? ctx.lastTwo[0] : ctx.newDigitBuffer[ctx.newDigitBuffer.length - 1];

        // Capture signal timestamp
        signalTimestamp = performance.now();
        signalDigit = currentDigit;
        signalSymbol = SYMBOL_NAMES[tickSymbol];
        const drift = serverTimeOffset;
        console.log(`⏱️ [ATOMIC] T1: Signal at ${signalTimestamp.toFixed(2)}ms | Digit: ${triggerDigit} | Tick: ${currentDigit} | Drift: ${drift}ms | ${SYMBOL_NAMES[tickSymbol]}`);

        lastTradeTimestamp = Date.now();

        // Lock
        isSocketBusy = true;
        socketBusyTimestamp = Date.now();
        isWaitingForContract = true;

        // Update status to firing
        assetStates[tickSymbol] = { ...assetStates[tickSymbol], status: 'firing' };

        const stakeAmount = parseFloat(currentStake.toFixed(2));

        // Trigger reason
        const triggerReason = ctx.isConfirmedAnomaly
            ? `ANOMALÍA (r=${ctx.rawAutocorr.toFixed(3)})`
            : ctx.isStreakAnomalous
                ? `Streak x${ctx.currentStreak}`
                : `Patrón ${triggerDigit}-${triggerDigit}`;

        // Check if Orbit Mode applies
        const currentDriftMs = serverTimeOffset;
        const isOrbitMode = Math.abs(currentDriftMs) > ORBIT_CONFIG.LATENCY_THRESHOLD_MS;

        emitLog(`🎯 SEÑAL ${SYMBOL_NAMES[tickSymbol]}: ${triggerReason} | E:${ctx.entropyScore} A:${ctx.autocorrScore} = ${ctx.totalScore}%${isOrbitMode ? ' | 🪐 ORBIT MODE' : ''}`, 'gold', tickSymbol);

        emit({
            type: 'TRADE_OPENED',
            symbol: tickSymbol,
            stake: stakeAmount,
            triggerDigit,
            score: ctx.totalScore,
            triggerReason,
            orbitMode: isOrbitMode,
        });

        const buyRequest = {
            buy: 1,
            subscribe: 1,
            price: 10000,
            parameters: {
                contract_type: 'DIGITDIFF',
                symbol: tickSymbol,
                currency: currency,
                amount: stakeAmount,
                basis: 'stake',
                duration: 1,
                duration_unit: 't',
                barrier: triggerDigit.toString(),
            }
        };

        // PREDICTIVE ORBIT MODE vs STANDARD PULSE
        const avgExecTimeMs = avgScoringTime;

        if (isOrbitMode) {
            // 🪐 Orbit Mode: Aim for START of NEXT second (T+1)
            // Calculate time to next second boundary
            const useServerTime = Date.now() + currentDriftMs;
            const nextSecondBoundary = Math.ceil(useServerTime / 1000) * 1000;
            const timeToBoundary = nextSecondBoundary - useServerTime;

            // Schedule to arrive 15ms before boundary (ORBIT_CONFIG.PREDICTION_OFFSET_MS)
            const networkMargin = ORBIT_CONFIG.PREDICTION_OFFSET_MS;
            const scheduleDelay = Math.max(0, timeToBoundary - networkMargin);

            console.log(`🪐 [ORBIT] Drift ${currentDriftMs}ms | Next Boundary: ${timeToBoundary}ms | Sched Delay: ${scheduleDelay.toFixed(0)}ms`);
            emitLog(`🪐 MODO ÓRBITA (Drift ${currentDriftMs}ms): Programando tiro en ${scheduleDelay.toFixed(0)}ms para T+1`, 'warning', tickSymbol);

            setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(buyRequest));
                    emitLog(`🚀 TIRO ORBITAL ENVIADO`, 'info', tickSymbol);
                }
            }, scheduleDelay);

        } else {
            // Standard Pulse Logic (for low latency)
            const shouldSendAnticipated = currentDriftMs < -250;

            if (shouldSendAnticipated) {
                console.log(`🚀 [PULSE] Anticipatory send: drift=${currentDriftMs}ms, exec=${avgExecTimeMs.toFixed(1)}ms`);
                ws.send(JSON.stringify(buyRequest));
            } else {
                const optimalDelay = Math.max(0, Math.min(50, -currentDriftMs / 2));
                if (optimalDelay > 5) {
                    console.log(`⏱️ [PULSE] Delayed send: ${optimalDelay.toFixed(0)}ms (drift=${currentDriftMs}ms)`);
                    setTimeout(() => {
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(buyRequest));
                        }
                    }, optimalDelay);
                } else {
                    ws.send(JSON.stringify(buyRequest));
                }
            }
        }

        const execLatency = (performance.now() - signalTimestamp).toFixed(0);
        console.log(`⚡ [PULSE/ORBIT] BUY PROCESSED: exec=${execLatency}ms | orbit=${isOrbitMode}`);
    } else if (shouldTrigger && !ctx.inertiaOK) {
        if (Math.random() > 0.9) {
            emitLog(`⚠️ Señal ${SYMBOL_NAMES[tickSymbol]} ignorada: Volatilidad alta (Z:${ctx.zScore.toFixed(2)})`, 'warning');
        }
    }
}

// ============================================
// WARMUP CHECK
// ============================================
function checkWarmup() {
    const totalTicks = SCANNER_SYMBOLS.reduce((sum, sym) => sum + (assetStates[sym]?.tickCount ?? 0), 0);
    const minRequired = SCANNER_SYMBOLS.length * 25;
    const progress = Math.min(100, (totalTicks / minRequired) * 100);
    const allReady = SCANNER_SYMBOLS.every(sym => (assetStates[sym]?.tickCount ?? 0) >= 15);

    emit({ type: 'WARMUP_PROGRESS', progress, isReady: totalTicks >= minRequired && allReady });

    if (totalTicks >= minRequired && !warmupLogged) {
        warmupLogged = true;
        emitLog('🔥 Sistema calibrado. Motor Quant Activo.', 'gold');
        console.log('✅ WARMUP COMPLETE: All assets ready');
    }
}

// ============================================
// WEBSOCKET MESSAGE HANDLER
// ============================================
function handleWsMessage(event: MessageEvent) {
    if (isPaused) return;

    try {
        const data = JSON.parse(event.data);

        // NTP time sync response
        if (data.msg_type === 'time' && data.time) {
            const serverTimeMs = data.time * 1000;
            const localTime = Date.now();
            serverTimeOffset = serverTimeMs - localTime;
            isTimeSynced = true;
            console.log(`🕐 [NTP SYNC] Server offset: ${serverTimeOffset}ms`);
            emitLog(`🕐 Sincronizado con servidor: drift ${serverTimeOffset}ms`, 'info');
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
                console.warn(`⚠️ [HEARTBEAT] WebSocket LENTO: ${pingLatency.toFixed(0)}ms`);
                emitLog(`⚠️ WebSocket lento: ${pingLatency.toFixed(0)}ms`, 'warning');
            } else {
                console.log(`💓 [HEARTBEAT] WebSocket latency: ${pingLatency.toFixed(0)}ms`);
            }
            return;
        }

        // Tick subscription response → capture subscription ID
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
            const latencyMs = signalTimestamp > 0 ? t2 - signalTimestamp : -1;

            isSocketBusy = false;
            socketBusyTimestamp = 0;

            const drift = serverTimeOffset;

            if (latencyMs > 0) {
                const latencyIcon = latencyMs > 500 ? '🚨' : latencyMs > 200 ? '⚠️' : '✅';
                console.log(`${latencyIcon} [SYNC] Ejecutando en ${latencyMs.toFixed(0)}ms | Drift: ${drift}ms | Contrato: ${data.buy.contract_id}`);
                emitLog(`${latencyIcon} [SYNC] ${latencyMs.toFixed(0)}ms | Drift: ${drift}ms | ID: ${data.buy.contract_id}`, latencyMs > 500 ? 'error' : 'success');
                emit({ type: 'TRADE_LATENCY', latencyMs, driftMs: drift });

                if (latencyMs > 500) {
                    console.error(`🚨🚨🚨 LATENCIA CRÍTICA: ${latencyMs.toFixed(0)}ms | Drift: ${drift}ms`);
                    emitLog(`🚨 LATENCIA CRÍTICA: ${latencyMs.toFixed(0)}ms - Datos posiblemente stale!`, 'error');
                }
            } else {
                emitLog(`✅ Contrato abierto: ${data.buy.contract_id}`, 'success');
            }

            signalTimestamp = 0;
        }

        // Contract result
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
            const contract = data.proposal_open_contract;

            // Desync detection
            if (contract.entry_tick_display_value && signalDigit >= 0) {
                const entryTickStr = contract.entry_tick_display_value.toString();
                const executionDigit = parseInt(entryTickStr.charAt(entryTickStr.length - 1));
                if (executionDigit !== signalDigit) {
                    console.error(`🚨 DESINCRONIZACIÓN: Señal=${signalDigit} vs Ejecutado=${executionDigit}`);
                    emit({ type: 'DESYNC', signalDigit, executionDigit, symbol: signalSymbol });
                    emitLog(`🚨 DESINCRONIZACIÓN: Señal dígito ${signalDigit} → Ejecutado dígito ${executionDigit}`, 'error');
                } else {
                    console.log(`✅ [SYNC OK] Dígito señal=${signalDigit} == Dígito ejecución=${executionDigit}`);
                }
                signalDigit = -1;
            }

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

        // Authorize with token
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

        // Heartbeat (10s) — feeds jitter filter
        if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                lastPingTime = performance.now();
                ws.send(JSON.stringify({ ping: 1 }));
            }
        }, 10000);

        // NTP re-sync (60s)
        if (ntpSyncIntervalId) clearInterval(ntpSyncIntervalId);
        ntpSyncIntervalId = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ time: 1 }));
            }
        }, ORBIT_CONFIG.NTP_SYNC_INTERVAL_MS); // 15s interval for high drift environments
    };

    ws.onmessage = handleWsMessage;

    ws.onclose = () => {
        console.warn('🔌 [WORKER] WebSocket disconnected');
        emit({ type: 'WS_DISCONNECTED' });
        emitLog('⚠️ WebSocket desconectado. Reintentando...', 'warning');

        // Auto-reconnect after 2s
        if (isRunning && !isPaused) {
            setTimeout(() => {
                if (isRunning && !isPaused) {
                    console.log('🔄 [WORKER] Auto-reconnecting WebSocket...');
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
    console.log(`⚠️ BUFFER LIMPIO: Datos stale eliminados (razón: ${reason})`);
    SCANNER_SYMBOLS.forEach(sym => {
        if (assetStates[sym]) {
            assetStates[sym] = {
                ...assetStates[sym],
                digitBuffer: [],
                priceBuffer: [],
                tickCount: 0,
                score: { entropy: 0, volatility: 0, clusters: 0, total: 0 },
            };
        }
    });
    anomalyConfirmationCount = 0;
    anomalyType = null;
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
            console.log('🚀 [WORKER] Starting scanner...');
            cleanup(); // Clean any previous state

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
            anomalyConfirmationCount = 0;
            anomalyType = null;
            lastTradeTimestamp = 0;
            signalTimestamp = 0;
            signalDigit = -1;
            isSocketBusy = false;
            socketBusyTimestamp = 0;
            isWaitingForContract = false;
            warmupLogged = false;
            scoringCount = 0;
            avgScoringTime = 0;

            // Initialize asset states
            SCANNER_SYMBOLS.forEach(sym => {
                assetStates[sym] = createInitialAssetState(sym);
                lastTickTime[sym] = 0;
                delete subscriptionIds[sym];
            });

            emitLog('🚀 BUG DERIV SCANNER v4.0 [WORKER] iniciado - Escaneando 5 activos', 'gold');
            if (config.autoSwitch) {
                emitLog('🧠 Selección Inteligente ACTIVADA', 'info');
            }
            emitLog('⏳ Calibrando sistema...', 'info');
            emitLog('🌐 Jitter Filter ACTIVADO (umbral: 50ms)', 'info');
            emitLog('📊 Priority Queue ACTIVADO', 'info');
            emitLog('🔄 Auto-Reconnect ACTIVADO (umbral: 2s)', 'info');

            connectWebSocket(cmd.wsUrl, cmd.authToken);
            break;
        }

        case 'STOP': {
            console.log('🛑 [WORKER] Stopping scanner...');
            emitLog('🛑 Scanner detenido', 'warning');
            cleanup();
            break;
        }

        case 'PAUSE': {
            console.log('🧊 [WORKER] Pausing (cooldown)...');
            isPaused = true;
            // Unsubscribe to save resources
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ forget_all: 'ticks' }));
            }
            if (reconnectIntervalId) { clearInterval(reconnectIntervalId); reconnectIntervalId = null; }
            break;
        }

        case 'RESUME': {
            console.log('✅ [WORKER] Resuming from cooldown...');
            isPaused = false;
            warmupLogged = false;
            flushBuffers('cooldown_resume');
            isWaitingForContract = false;
            isSocketBusy = false;

            // Re-subscribe
            if (ws && ws.readyState === WebSocket.OPEN) {
                SCANNER_SYMBOLS.forEach(sym => {
                    ws!.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
                    lastTickTime[sym] = Date.now();
                });
                startAutoReconnect();
                emitLog('🚀 Resfriamento completo! Reiniciando análise...', 'success');
                emitLog('⏳ Calibrando sistema...', 'info');
            } else {
                // WebSocket might be dead, reconnect
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
