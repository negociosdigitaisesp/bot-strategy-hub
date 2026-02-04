import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// ============================================
// THE BUG DERIV SCANNER - Multi-Asset Opportunity Scanner
// ============================================

// Supported volatility symbols
export const SCANNER_SYMBOLS = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'] as const;
export type ScannerSymbol = typeof SCANNER_SYMBOLS[number];

// Asset Score Component
export interface AssetScore {
    entropy: number;        // 0-50 pts (Randomness)
    volatility: number;     // 0-30 pts (Low Volatility preferred)
    clusters: number;       // 0-20 pts (Lack of clusters preferred)
    total: number;          // 0-100 pts
}

// Asset state for each tracked symbol
export interface AssetState {
    symbol: ScannerSymbol;
    displayName: string;
    digitBuffer: number[];      // Last 25 digits
    priceBuffer: number[];      // Last 25 prices for Z-Score
    healthScore: number;        // Legacy random score
    score: AssetScore;          // Detailed Quant Score
    shadowPattern: boolean;     // Same digit repeated 2 times
    lastTwoDigits: [number, number] | null;
    inertiaOK: boolean;         // Z-Score velocity < 1.0
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
    martingaleFactor?: number;  // Configurable Martingale multiplier (default 2.5)
    autoSwitch?: boolean;       // Smart Asset Selection
    minScore?: number;          // Min score to trade (default 75)
    useSoros?: boolean;         // Turbo-Scalp Mode (Mini-Soros L2)
    maxSorosLevels?: number;    // Configurable Soros Levels
    // Profit Reservation & Loss Protection
    profitTarget?: number;      // Cycle profit target to trigger cooldown (default $3)
    maxConsecutiveLosses?: number; // Max losses before cooldown (default 2)
    cooldownDuration?: number;  // Base cooldown duration in seconds (default 60)
}

// Scanner statistics
export interface ScannerStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    consecutiveLosses: number;
    cycleProfit: number;        // Profit accumulated in current cycle
    cycleCount: number;         // Number of completed cycles
}

// Log entry
export interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'gold';
    symbol?: ScannerSymbol;
}

// Symbol display names
const SYMBOL_NAMES: Record<ScannerSymbol, string> = {
    'R_10': 'V10',
    'R_25': 'V25',
    'R_50': 'V50',
    'R_75': 'V75',
    'R_100': 'V100',
};

// ============================================
// QUANT SCORING ALGORITHMS v2.0 (LEAN)
// ============================================
// Removed: Cluster Score (irrelevant for PRNG)
// Added: Autocorrelation (detects real edge)
// Focus: Entropy-based analysis without gambler's fallacy

// 1. Z-Score Calculation (Volatility) - SIMPLIFIED
const calculateZScore = (prices: number[]): number => {
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
};

// 2. Entropy Score (0-60 pts) - MAIN METRIC
// Measures randomness quality using Chi-Square test
// High entropy = uniform distribution = GOOD for DIGITDIFF
const calculateEntropyScore = (digits: number[]): number => {
    if (digits.length < 15) return 30; // Neutral until sufficient data
    const counts = new Array(10).fill(0);
    digits.forEach(d => counts[d]++);

    const expected = digits.length / 10;
    let chiSquare = 0;
    counts.forEach(count => {
        chiSquare += Math.pow(count - expected, 2) / expected;
    });

    // Chi-Square critical value for df=9, α=0.05 is 16.92
    // Lower χ² = more uniform = higher score
    const score = Math.max(0, 60 - (chiSquare * 3));
    return Math.min(60, Math.round(score));
};

// 3. Autocorrelation Score (0-40 pts) - REAL EDGE DETECTOR
// Measures if consecutive digits are correlated
// Negative autocorr = digits tend to alternate = EDGE for DIGITDIFF!
const calculateAutocorrelation = (digits: number[]): number => {
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
};

const calculateAutocorrScore = (digits: number[]): number => {
    const autocorr = calculateAutocorrelation(digits);

    // Interpretation:
    // autocorr ≈ 0: Independent (expected for perfect PRNG) → 20 pts (neutral)
    // autocorr > 0.1: Positive correlation (next similar) → 0-10 pts (BAD)
    // autocorr < -0.1: Negative correlation (next different) → 30-40 pts (GOOD!)

    if (autocorr < -0.15) return 40; // Strong negative = EDGE!
    if (autocorr < -0.05) return 30; // Mild negative = Good
    if (autocorr < 0.05) return 20;  // Neutral (independent)
    if (autocorr < 0.15) return 10;  // Mild positive = Caution
    return 0; // Strong positive = Avoid
};

// 4. Streak Analysis (Bonus/Penalty)
// Detects anomalously long streaks of same digit
const analyzeStreak = (digits: number[]): { currentStreak: number; isAnomalous: boolean } => {
    if (digits.length < 3) return { currentStreak: 1, isAnomalous: false };

    let currentStreak = 1;
    const lastDigit = digits[digits.length - 1];

    for (let i = digits.length - 2; i >= 0; i--) {
        if (digits[i] === lastDigit) {
            currentStreak++;
        } else {
            break;
        }
    }

    // Streak >= 3 is genuinely rare (0.1^2 = 1% chance)
    // This is NOT gambler's fallacy - it's detecting actual statistical anomaly
    const isAnomalous = currentStreak >= 3;

    return { currentStreak, isAnomalous };
};

// LEGACY: Keep for compatibility but deprecate
const calculateVolatilityScore = (zScore: number): number => {
    // Simplified: just check if market is stable
    return zScore < 1.5 ? 20 : 0;
};

// REMOVED: Cluster Score - irrelevant for PRNG markets
// The distinction between "high" (5-9) and "low" (0-4) digits is arbitrary
// and has no statistical significance in synthetic indices
const calculateClusterScore = (_digits: number[]): number => {
    return 0; // Removed - always returns 0
};


// Initialize empty asset state
const createInitialAssetState = (symbol: ScannerSymbol): AssetState => ({
    symbol,
    displayName: SYMBOL_NAMES[symbol],
    digitBuffer: [],
    priceBuffer: [],
    healthScore: 50,
    score: {
        entropy: 0,
        volatility: 0,
        clusters: 0,
        total: 0
    },
    shadowPattern: false,
    lastTwoDigits: null,
    inertiaOK: false,
    zScore: 0,
    status: 'scanning',
    lastPrice: 0,
    tickCount: 0,
});

export const useMultiAssetScanner = () => {
    const { socket, isConnected } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();

    // Scanner State
    const [isRunning, setIsRunning] = useState(false);
    const [assetStates, setAssetStates] = useState<Record<ScannerSymbol, AssetState>>(() => {
        const initial: Record<string, AssetState> = {};
        SCANNER_SYMBOLS.forEach(symbol => {
            initial[symbol] = createInitialAssetState(symbol);
        });
        return initial as Record<ScannerSymbol, AssetState>;
    });
    const [activeAsset, setActiveAsset] = useState<ScannerSymbol | null>(null);
    const [leaderAsset, setLeaderAsset] = useState<ScannerSymbol | null>(null);

    const [opportunityMessage, setOpportunityMessage] = useState<string | null>(null);
    const [stats, setStats] = useState<ScannerStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0,
        consecutiveLosses: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isWarmingUp, setIsWarmingUp] = useState(true);
    const [warmUpProgress, setWarmUpProgress] = useState(0);

    // Cooldown & Cycle Protection States
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [cooldownTime, setCooldownTime] = useState(0);
    const [cooldownReason, setCooldownReason] = useState<'profit' | 'loss' | null>(null);

    // Refs for stable values
    const configRef = useRef<ScannerConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const currentStakeRef = useRef<number>(0);
    const isWaitingForContractRef = useRef<boolean>(false);
    const totalProfitRef = useRef<number>(0);
    const consecutiveLossesRef = useRef<number>(0);
    const assetStatesRef = useRef<Record<ScannerSymbol, AssetState>>(assetStates);
    const leaderAssetRef = useRef<ScannerSymbol | null>(null);
    const sorosLevelRef = useRef<number>(0);
    // Cycle tracking refs
    const cycleProfitRef = useRef<number>(0);
    const cycleCountRef = useRef<number>(0);
    // Cooldown ref for synchronous guard (avoids async state delay)
    const isCoolingDownRef = useRef<boolean>(false);
    // Watchdog Ref
    const lastTickTimeRef = useRef<number>(Date.now());

    // Keep ref in sync with state
    useEffect(() => {
        assetStatesRef.current = assetStates;
    }, [assetStates]);

    useEffect(() => {
        leaderAssetRef.current = leaderAsset;
    }, [leaderAsset]);

    // Keep cooldown ref in sync with state (for synchronous guard)
    useEffect(() => {
        isCoolingDownRef.current = isCoolingDown;
    }, [isCoolingDown]);

    // Helper to add log
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info', symbol?: ScannerSymbol) => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
            symbol,
        };
        setLogs(prev => [...prev.slice(-100), newLog]);
    }, []);

    // Start Cooldown Helper
    const startCooldown = useCallback((reason: 'profit' | 'loss') => {
        const baseDuration = configRef.current?.cooldownDuration || 60;
        // Random duration between base and base+30 seconds
        const duration = baseDuration + Math.floor(Math.random() * 30);

        console.log(`🧊 COOLDOWN TRIGGERED: ${reason} - ${duration}s`);

        setIsCoolingDown(true);
        setCooldownTime(duration);
        setCooldownReason(reason);

        // Reset cycle tracking
        cycleProfitRef.current = 0;
        consecutiveLossesRef.current = 0;
        sorosLevelRef.current = 0;
        currentStakeRef.current = initialStakeRef.current;

        // Increment cycle count
        cycleCountRef.current += 1;

        // Clear asset buffers for fresh analysis
        setAssetStates(prev => {
            const cleared: Record<ScannerSymbol, AssetState> = {} as any;
            SCANNER_SYMBOLS.forEach(sym => {
                cleared[sym] = {
                    ...prev[sym],
                    digitBuffer: [],
                    priceBuffer: [],
                    tickCount: 0,
                    score: { entropy: 0, volatility: 0, clusters: 0, total: 0 }
                };
            });
            return cleared;
        });

        const logMsg = reason === 'profit'
            ? `🏦 Meta de lucro atingida! Resfriando ${duration}s...`
            : `🛡️ Proteção ativada (${configRef.current?.maxConsecutiveLosses || 2} losses). Resfriando ${duration}s...`;
        addLog(logMsg, reason === 'profit' ? 'gold' : 'warning');
    }, [addLog]);

    // Cooldown Timer Effect
    useEffect(() => {
        if (!isCoolingDown || cooldownTime <= 0) return;

        const interval = setInterval(() => {
            setCooldownTime(prev => {
                if (prev <= 1) {
                    // Cooldown finished - FORCE RESUME
                    console.log('✅ COOLDOWN FINISHED: Resuming operations');

                    // CRITICAL: Reset ref FIRST for immediate synchronous unblocking
                    isCoolingDownRef.current = false;

                    // Reset cooldown state
                    setIsCoolingDown(false);
                    setCooldownReason(null);

                    // CRITICAL: Reset warmup to collect fresh data
                    setIsWarmingUp(true);
                    setWarmUpProgress(0);

                    // CRITICAL: Clear contract wait flag
                    isWaitingForContractRef.current = false;

                    addLog('🚀 Resfriamento completo! Reiniciando análise...', 'success');
                    addLog('⏳ Calibrando sistema...', 'info');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isCoolingDown, cooldownTime, addLog]);

    // Watchdog Timer (Detect Freezes)
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            if (isCoolingDownRef.current) {
                lastTickTimeRef.current = Date.now(); // Reset watchdog during cooldown
                return;
            }

            const timeSinceLastTick = Date.now() - lastTickTimeRef.current;
            if (timeSinceLastTick > 5000) {
                console.warn(`⚠️ Watchdog: No ticks for ${timeSinceLastTick}ms`);
                addLog('⚠️ Alerta: Conexión lenta o inestable...', 'warning');
                // Optional: Trigger resubscription if needed
                // socket.send(JSON.stringify({ ticks: ... }));
                lastTickTimeRef.current = Date.now(); // Reset to avoid spamming
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, addLog]);

    // Scanning Feedback Loop (Dopamine for waiting)
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            if (activeAsset) return;

            const randomSym = SCANNER_SYMBOLS[Math.floor(Math.random() * SCANNER_SYMBOLS.length)];
            const state = assetStatesRef.current[randomSym];
            const currentScore = state.score.total;
            const targetScore = configRef.current?.minScore || 75;

            if (currentScore > 30) {
                const msgs = [
                    `🔎 Escaneando ${state.displayName}... Score ${currentScore}% (Buscando >${targetScore}%)`,
                    `📊 Análisis V${state.displayName.split('V')[1]}: ${currentScore}% - Calculando entrada...`,
                    `⚡ ${state.displayName}: Volatilidad detectada. Score ${currentScore}%`,
                    `🔄 Sincronizando ${state.displayName}...`
                ];
                if (Math.random() > 0.7) {
                    addLog(msgs[Math.floor(Math.random() * msgs.length)], 'info');
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [isRunning, activeAsset, addLog]);

    // Check warmup status across all assets
    const checkWarmupStatus = useCallback(() => {
        const states = assetStatesRef.current;
        const totalTicks = SCANNER_SYMBOLS.reduce((sum, sym) => sum + states[sym].tickCount, 0);
        const minRequired = SCANNER_SYMBOLS.length * 25;

        const progress = Math.min(100, (totalTicks / minRequired) * 100);
        setWarmUpProgress(progress);

        const allReady = SCANNER_SYMBOLS.every(sym => states[sym].tickCount >= 15);

        if (totalTicks >= minRequired && isWarmingUp) {
            setIsWarmingUp(false);
            setWarmUpProgress(100);
        }

        return allReady;
    }, [isWarmingUp]);

    // Warmup Completion Effect
    const warmupLoggedRef = useRef(false);
    useEffect(() => {
        if (!isWarmingUp && !warmupLoggedRef.current && isRunning) {
            warmupLoggedRef.current = true;
            addLog('🔥 Sistema calibrado. Motor Quant Activo.', 'gold');
            console.log('✅ WARMUP COMPLETE: All assets ready');
        }
        if (isWarmingUp) {
            warmupLoggedRef.current = false;
        }
    }, [isWarmingUp, isRunning, addLog]);

    // Helper to find the current Leader Asset
    const updateLeaderAsset = useCallback(() => {
        if (!configRef.current?.autoSwitch) {
            setLeaderAsset(null);
            return;
        }

        const states = assetStatesRef.current;
        let bestSymbol: ScannerSymbol | null = null;
        let highestScore = -1;

        SCANNER_SYMBOLS.forEach(sym => {
            const score = states[sym].score.total;
            if (score > highestScore) {
                highestScore = score;
                bestSymbol = sym;
            }
        });

        if (bestSymbol && bestSymbol !== leaderAssetRef.current) {
            setLeaderAsset(bestSymbol);
        }
    }, []);

    // Stop the scanner
    const stopScanner = useCallback(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }
        setActiveBot(null);
        addLog('🛑 Scanner detenido', 'warning');
        setIsRunning(false);
        setIsWarmingUp(false);
        setActiveAsset(null);
        setLeaderAsset(null);
        setOpportunityMessage(null);
    }, [socket, addLog, setActiveBot]);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        // COOLDOWN GUARD: Use REF for synchronous check (avoids state async delay)
        if (isCoolingDownRef.current) {
            return;
        }

        try {
            const data = JSON.parse(event.data);

            // Update Watchdog on any valid message from our subscription
            if (data.msg_type === 'tick') {
                lastTickTimeRef.current = Date.now();
            }

            // Handle tick updates for any of our symbols
            if (data.msg_type === 'tick' && data.tick) {
                const tickSymbol = data.tick.symbol as ScannerSymbol;

                if (!SCANNER_SYMBOLS.includes(tickSymbol)) return;

                const price = parseFloat(data.tick.quote);
                const quote = price.toFixed(2);
                const currentDigit = parseInt(quote.charAt(quote.length - 1));

                setAssetStates(prev => {
                    const asset = prev[tickSymbol];
                    const newDigitBuffer = [...asset.digitBuffer, currentDigit].slice(-25);
                    const newPriceBuffer = [...asset.priceBuffer, price].slice(-25);

                    // --- QUANT SCORING v2.0 (LEAN) ---
                    const zScore = calculateZScore(newPriceBuffer);
                    const entropyScore = calculateEntropyScore(newDigitBuffer);
                    const autocorrScore = calculateAutocorrScore(newDigitBuffer);
                    const volatilityBonus = calculateVolatilityScore(zScore);

                    // NEW FORMULA: Entropy (60) + Autocorrelation (40) = 100
                    // Cluster Score REMOVED (irrelevant for PRNG)
                    const totalScore = entropyScore + autocorrScore;

                    const scoreObj: AssetScore = {
                        entropy: entropyScore,
                        volatility: autocorrScore, // Repurposed: now shows autocorr score
                        clusters: 0, // DEPRECATED: always 0
                        total: totalScore
                    };

                    const lastTwo = newDigitBuffer.length >= 2
                        ? [newDigitBuffer[newDigitBuffer.length - 2], newDigitBuffer[newDigitBuffer.length - 1]] as [number, number]
                        : null;
                    const shadowPattern = lastTwo !== null && lastTwo[0] === lastTwo[1];

                    // Streak analysis for anomaly detection
                    const { currentStreak, isAnomalous } = analyzeStreak(newDigitBuffer);

                    // Simplified inertia check
                    const inertiaOK = zScore < 1.5 || isAnomalous; // Allow if streak anomaly detected

                    let status: AssetState['status'] = 'scanning';

                    const isAutoSwitchOn = configRef.current?.autoSwitch;
                    const minScore = configRef.current?.minScore || 55; // Lowered default (new scale)
                    const isLeader = leaderAssetRef.current === tickSymbol;
                    const scorePass = totalScore >= minScore;

                    if (isAutoSwitchOn && (!isLeader || !scorePass)) {
                        status = 'vetoed';
                    } else if (shadowPattern || isAnomalous) {
                        status = 'forming';
                    }

                    return {
                        ...prev,
                        [tickSymbol]: {
                            ...asset,
                            digitBuffer: newDigitBuffer,
                            priceBuffer: newPriceBuffer,
                            healthScore: Math.round(totalScore), // Now reflects total score
                            score: scoreObj,
                            shadowPattern: shadowPattern || isAnomalous, // Include anomaly
                            lastTwoDigits: lastTwo,
                            inertiaOK,
                            zScore,
                            status,
                            lastPrice: price,
                            tickCount: asset.tickCount + 1,
                        }
                    };
                });

                // Check if we should trigger a trade
                if (isRunning && !isWaitingForContractRef.current && socket && configRef.current) {
                    const currentStates = assetStatesRef.current;

                    if (!checkWarmupStatus()) return;

                    const asset = currentStates[tickSymbol];
                    const newDigitBuffer = [...asset.digitBuffer, currentDigit].slice(-25);
                    const newPriceBuffer = [...asset.priceBuffer, price].slice(-25);

                    // --- QUANT SCORING v2.0 (LEAN) for trade decision ---
                    const zScore = calculateZScore(newPriceBuffer);
                    const entropyScore = calculateEntropyScore(newDigitBuffer);
                    const autocorrScore = calculateAutocorrScore(newDigitBuffer);
                    const totalScore = entropyScore + autocorrScore;

                    // Streak analysis
                    const { currentStreak, isAnomalous } = analyzeStreak(newDigitBuffer);

                    const lastTwo = newDigitBuffer.length >= 2
                        ? [newDigitBuffer[newDigitBuffer.length - 2], newDigitBuffer[newDigitBuffer.length - 1]] as [number, number]
                        : null;
                    const shadowPattern = lastTwo !== null && lastTwo[0] === lastTwo[1];

                    // SIMPLIFIED TRIGGER: Either shadow pattern OR anomalous streak
                    const shouldTrigger = (shadowPattern || isAnomalous) && newDigitBuffer.length >= 15;
                    const inertiaOK = zScore < 1.5;

                    // Fire Logic - LEAN v2.0
                    if (shouldTrigger && inertiaOK) {

                        console.log(`🛠️ [v2.0] Trigger en ${SYMBOL_NAMES[tickSymbol]}. Score: ${totalScore}. Autocorr: ${autocorrScore}. Streak: ${currentStreak}`);

                        // AUTO-SWITCH GUARD
                        if (configRef.current.autoSwitch) {
                            const minScore = configRef.current.minScore || 55; // Lowered for new scale

                            if (totalScore < minScore) {
                                setAssetStates(prev => ({
                                    ...prev,
                                    [tickSymbol]: { ...prev[tickSymbol], status: 'vetoed' }
                                }));
                                return;
                            }

                            const currentLeader = leaderAssetRef.current;
                            if (currentLeader && currentLeader !== tickSymbol) {
                                const leaderState = currentStates[currentLeader];
                                if (leaderState.status === 'forming' || leaderState.shadowPattern) {
                                    return;
                                }
                            }
                        }

                        // EXECUTION
                        const triggerDigit = lastTwo ? lastTwo[0] : newDigitBuffer[newDigitBuffer.length - 1];

                        isWaitingForContractRef.current = true;
                        setActiveAsset(tickSymbol);
                        setOpportunityMessage(`🎯 Oportunidad en ${SYMBOL_NAMES[tickSymbol]} (Score: ${totalScore})`);

                        setAssetStates(prev => ({
                            ...prev,
                            [tickSymbol]: {
                                ...prev[tickSymbol],
                                status: 'firing'
                            }
                        }));

                        const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));

                        // Enhanced logging with v2.0 metrics
                        const triggerReason = isAnomalous ? `Streak x${currentStreak}` : `Patrón ${triggerDigit}-${triggerDigit}`;
                        addLog(`🎯 SEÑAL ${SYMBOL_NAMES[tickSymbol]}: ${triggerReason} | E:${entropyScore} A:${autocorrScore} = ${totalScore}%`, 'gold', tickSymbol);

                        const buyRequest = {
                            buy: 1,
                            subscribe: 1,
                            price: 10000,
                            parameters: {
                                contract_type: 'DIGITDIFF',
                                symbol: tickSymbol,
                                currency: 'USD',
                                amount: stakeAmount,
                                basis: 'stake',
                                duration: 1,
                                duration_unit: 't',
                                barrier: triggerDigit.toString(),
                            }
                        };

                        socket.send(JSON.stringify(buyRequest));
                        addLog(`⚡ Orden enviada: DIFF ${triggerDigit} en ${SYMBOL_NAMES[tickSymbol]} | Stake: $${stakeAmount}`, 'info', tickSymbol);
                    } else if (shouldTrigger && !inertiaOK) {
                        // Log rejection (throttled)
                        if (Math.random() > 0.85) {
                            addLog(`⚠️ Señal ${SYMBOL_NAMES[tickSymbol]} ignorada: Volatilidad alta (Z:${zScore.toFixed(2)})`, 'warning');
                        }
                    }
                }
            }

            // Handle buy response
            if (data.msg_type === 'buy' && data.buy) {
                addLog(`✅ Contrato abierto: ${data.buy.contract_id}`, 'success');
            }

            // Handle proposal_open_contract (contract result)
            if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
                const contract = data.proposal_open_contract;

                if (contract.is_sold) {
                    isWaitingForContractRef.current = false;
                    const profit = parseFloat(contract.profit);
                    const isWin = profit > 0;
                    const tradedSymbol = activeAsset;

                    if (tradedSymbol) {
                        setAssetStates(prev => ({
                            ...prev,
                            [tradedSymbol]: {
                                ...prev[tradedSymbol],
                                status: 'scanning'
                            }
                        }));
                    }

                    setActiveAsset(null);
                    setOpportunityMessage(null);

                    updateStats(profit, isWin);

                    if (isWin) {
                        addLog(`💰 WIN +$${profit.toFixed(2)} en ${tradedSymbol ? SYMBOL_NAMES[tradedSymbol] : 'UNKNOWN'}`, 'gold', tradedSymbol || undefined);

                        consecutiveLossesRef.current = 0;

                        // SOROS LOGIC (Dynamic Levels)
                        const useSoros = configRef.current?.useSoros;
                        const maxSoros = configRef.current?.maxSorosLevels || 1;

                        if (useSoros) {
                            if (sorosLevelRef.current < maxSoros) {
                                sorosLevelRef.current += 1;
                                const nextStake = parseFloat((currentStakeRef.current + profit).toFixed(2));
                                currentStakeRef.current = nextStake;
                                addLog(`🚀 SOROS NIVEL ${sorosLevelRef.current}: Apostando Ganancia ($${nextStake})`, 'gold');
                            } else {
                                sorosLevelRef.current = 0;
                                currentStakeRef.current = initialStakeRef.current;
                                addLog(`🏆 CICLO SOROS COMPLETADO (${maxSoros} Niveles): Retorno a base ($${currentStakeRef.current})`, 'success');
                            }
                        } else {
                            currentStakeRef.current = initialStakeRef.current;
                        }

                        setStats(prev => ({
                            ...prev,
                            wins: prev.wins + 1,
                            totalProfit: prev.totalProfit + profit,
                            currentStake: initialStakeRef.current,
                            consecutiveLosses: 0,
                            cycleProfit: cycleProfitRef.current + profit,
                            cycleCount: cycleCountRef.current,
                        }));

                        // PROFIT TARGET CHECK: Trigger cooldown if cycle profit reached
                        cycleProfitRef.current += profit;
                        const profitTarget = configRef.current?.profitTarget || 3.0;
                        if (cycleProfitRef.current >= profitTarget) {
                            addLog(`🎯 Lucro do ciclo: $${cycleProfitRef.current.toFixed(2)} (meta: $${profitTarget})`, 'gold');
                            startCooldown('profit');
                            return; // Exit early, cooldown started
                        }
                    } else {
                        const lossAmount = Math.abs(profit);
                        addLog(`💥 LOSS -$${lossAmount.toFixed(2)} en ${tradedSymbol ? SYMBOL_NAMES[tradedSymbol] : 'UNKNOWN'}`, 'error', tradedSymbol || undefined);

                        const martingaleEnabled = configRef.current?.useMartingale !== false;
                        const maxGale = configRef.current?.maxMartingaleLevel || 3;

                        if (!martingaleEnabled) {
                            addLog('🔄 Martingale OFF: Stake fijo', 'info');
                        } else {
                            consecutiveLossesRef.current += 1;

                            if (consecutiveLossesRef.current >= maxGale) {
                                addLog(`🛑 Max Gale (${maxGale}) alcanzado. Reseteando.`, 'warning');
                                currentStakeRef.current = initialStakeRef.current;
                                consecutiveLossesRef.current = 0;
                                sorosLevelRef.current = 0;
                            } else {
                                sorosLevelRef.current = 0;
                                const factor = configRef.current?.martingaleFactor || 2.5;
                                const newStake = parseFloat((currentStakeRef.current * factor).toFixed(2));
                                currentStakeRef.current = newStake;
                                addLog(`📈 Gale Nivel ${consecutiveLossesRef.current} (x${factor}): $${newStake.toFixed(2)}`, 'warning');
                            }

                            // LOSS PROTECTION CHECK: Trigger cooldown if max consecutive losses reached
                            const maxLosses = configRef.current?.maxConsecutiveLosses || 2;
                            if (consecutiveLossesRef.current >= maxLosses) {
                                setStats(prev => ({
                                    ...prev,
                                    losses: prev.losses + 1,
                                    totalProfit: prev.totalProfit + profit,
                                    currentStake: currentStakeRef.current,
                                    consecutiveLosses: consecutiveLossesRef.current,
                                    cycleProfit: cycleProfitRef.current,
                                    cycleCount: cycleCountRef.current,
                                }));
                                startCooldown('loss');
                                return; // Exit early, cooldown started
                            }
                        }

                        setStats(prev => ({
                            ...prev,
                            losses: prev.losses + 1,
                            totalProfit: prev.totalProfit + profit,
                            currentStake: currentStakeRef.current,
                            consecutiveLosses: consecutiveLossesRef.current,
                            cycleProfit: cycleProfitRef.current,
                            cycleCount: cycleCountRef.current,
                        }));
                    }

                    totalProfitRef.current = stats.totalProfit + profit;

                    // Check TP/SL
                    if (configRef.current) {
                        if (totalProfitRef.current >= configRef.current.takeProfit) {
                            toast.success('¡Meta alcanzada!');
                            stopScanner();
                        } else if (totalProfitRef.current <= -configRef.current.stopLoss) {
                            toast.error('Stop Loss activado');
                            stopScanner();
                        }
                    }
                }
            }

            if (data.error) {
                if (data.error.code === 'AlreadySubscribed' || data.error.message?.includes('already subscribed')) {
                    return;
                }
                addLog(`❌ Error: ${data.error.message}`, 'error');
                isWaitingForContractRef.current = false;
            }

        } catch (err) {
            console.error("CRITICAL ERROR in Scanner:", err);
            addLog('❌ Error interno en scanner. Recuperando...', 'error');
        }

    }, [socket, addLog, updateStats, isRunning, activeAsset, checkWarmupStatus, stats.totalProfit, stopScanner]);

    // Update Leader Asset Effect
    useEffect(() => {
        if (!isRunning || !configRef.current?.autoSwitch) {
            if (leaderAssetRef.current !== null) setLeaderAsset(null);
            return;
        }

        let bestSym: ScannerSymbol | null = null;
        let bestScore = -1;

        SCANNER_SYMBOLS.forEach(sym => {
            const score = assetStates[sym].score.total;
            if (score > bestScore) {
                bestScore = score;
                bestSym = sym;
            }
        });

        if (bestSym !== leaderAsset) {
            setLeaderAsset(bestSym);
        }
    }, [assetStates, isRunning, leaderAsset]);

    // Start the scanner
    const startScanner = useCallback((config: ScannerConfig) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Conecte a Deriv primero');
            return false;
        }

        // Reset state
        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        isWaitingForContractRef.current = false;
        consecutiveLossesRef.current = 0;
        totalProfitRef.current = 0;
        sorosLevelRef.current = 0;

        // Reset all asset states
        const resetStates: Record<string, AssetState> = {};
        SCANNER_SYMBOLS.forEach(symbol => {
            resetStates[symbol] = createInitialAssetState(symbol);
        });
        setAssetStates(resetStates as Record<ScannerSymbol, AssetState>);

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
            consecutiveLosses: 0,
            cycleProfit: 0,
            cycleCount: 0,
        });
        setLogs([]);
        setActiveAsset(null);
        setLeaderAsset(null);
        setOpportunityMessage(null);
        setIsWarmingUp(true);
        setWarmUpProgress(0);
        // Reset cooldown states
        setIsCoolingDown(false);
        setCooldownTime(0);
        setCooldownReason(null);
        cycleProfitRef.current = 0;
        cycleCountRef.current = 0;

        setActiveBot('Bug Deriv Scanner');
        addLog('🚀 BUG DERIV SCANNER iniciado - Escaneando 5 activos', 'gold');
        if (config.autoSwitch) {
            addLog('🧠 Selección Inteligente ACTIVADA', 'info');
        }
        addLog('⏳ Calibrando sistema...', 'info');

        setIsRunning(true);
        return true;
    }, [addLog, setActiveBot, socket]);

    // Store handleMessage in ref to prevent subscription loops
    const handleMessageRef = useRef(handleMessage);
    useEffect(() => {
        handleMessageRef.current = handleMessage;
    }, [handleMessage]);

    // Socket subscription management
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        // During cooldown, unsubscribe to save resources
        if (isCoolingDown) {
            console.log('🧳 COOLDOWN: Unsubscribing from all ticks to save resources');
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
            return () => { };
        }

        console.log('🔄 SUBSCRIPTION MANAGER: Limpiando y re-suscribiendo...');

        socket.send(JSON.stringify({ forget_all: 'ticks' }));

        const onMessage = (event: MessageEvent) => handleMessageRef.current(event);
        socket.addEventListener('message', onMessage);

        // Subscribe to ALL symbols
        SCANNER_SYMBOLS.forEach(symbol => {
            socket.send(JSON.stringify({
                ticks: symbol,
                subscribe: 1,
            }));
            addLog(`📡 Suscrito a ${SYMBOL_NAMES[symbol]}`, 'info');
        });

        return () => {
            socket.removeEventListener('message', onMessage);
        };
    }, [isRunning, socket, addLog, isCoolingDown]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isRunning) {
                stopScanner();
            }
        };
    }, [isRunning, stopScanner]);

    return {
        // State
        isRunning,
        assetStates,
        activeAsset,
        leaderAsset,
        opportunityMessage,
        stats,
        logs,
        isWarmingUp,
        warmUpProgress,

        // Cooldown States
        isCoolingDown,
        cooldownTime,
        cooldownReason,

        // Actions
        startScanner,
        stopScanner,
        addLog,

        // Constants
        SCANNER_SYMBOLS,
        SYMBOL_NAMES,
    };
};
