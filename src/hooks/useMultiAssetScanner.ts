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
    healthScore: number;        // Legacy random score (kept for compatibility if needed, but superseded by score.total)
    score: AssetScore;          // NEW: Detailed Quant Score
    shadowPattern: boolean;     // Same digit repeated 2 times
    lastTwoDigits: [number, number] | null;
    inertiaOK: boolean;         // Z-Score velocity < 1.0 (Legacy check, now part of score)
    zScore: number;
    status: 'scanning' | 'forming' | 'firing' | 'cooldown' | 'vetoed';
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
    martingaleFactor?: number;  // NEW: Configurable Martingale multiplier (default 2.5)
    vaultEnabled?: boolean;
    vaultTarget?: number;
    autoSwitch?: boolean;       // NEW: Smart Asset Selection
    minScore?: number;          // NEW: Min score to trade (default 75)
    useSoros?: boolean;         // NEW: Turbo-Scalp Mode (Mini-Soros L2)
}

// Scanner statistics
export interface ScannerStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    consecutiveLosses: number;
    vaultAccumulated: number;
    vaultCycles: number;
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
// QUANT SCORING ALGORITHMS
// ============================================

// 1. Z-Score Calculation (Volatility)
const calculateZScore = (prices: number[]): number => {
    if (prices.length < 5) return 0;
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

// 2. Entropy Score (0-50 pts)
const calculateEntropyScore = (digits: number[]): number => {
    if (digits.length < 10) return 25;
    const counts = new Array(10).fill(0);
    digits.forEach(d => counts[d]++);

    // Chi-Square test
    const expected = digits.length / 10;
    let chiSquare = 0;
    counts.forEach(count => {
        chiSquare += Math.pow(count - expected, 2) / expected;
    });

    // Lower chi-square = Higher Entropy = Better Score
    // Critical value ~16.92. Map 0-20 ChiSquare to 50-0 pts
    const score = Math.max(0, 50 - (chiSquare * 2.5));
    return Math.min(50, Math.round(score));
};

// 3. Volatility Score (0-30 pts)
const calculateVolatilityScore = (zScore: number): number => {
    // Prefer Z-Score < 1.0 (Lateral). 
    // Map Z-Score 0-3 to 30-0 pts.
    const score = Math.max(0, 30 - (zScore * 10));
    return Math.round(score);
};

// 4. Cluster Score (0-20 pts)
const calculateClusterScore = (digits: number[]): number => {
    if (digits.length < 5) return 20;

    // Check for "High" (5-9) or "Low" (0-4) clusters
    // We want to PENALIZE long strings of Highs or Lows
    let maxClusterSize = 0;
    let currentClusterSize = 0;
    let currentType = -1; // 0=Low, 1=High

    for (let i = 0; i < digits.length; i++) {
        const type = digits[i] >= 5 ? 1 : 0;
        if (type === currentType) {
            currentClusterSize++;
        } else {
            maxClusterSize = Math.max(maxClusterSize, currentClusterSize);
            currentClusterSize = 1;
            currentType = type;
        }
    }
    maxClusterSize = Math.max(maxClusterSize, currentClusterSize);

    // If max cluster > 3, penalize.
    // 3 or less = 20 pts. 4 = 10 pts. 5+ = 0 pts.
    if (maxClusterSize <= 3) return 20;
    if (maxClusterSize === 4) return 10;
    return 0;
};


// Initialize empty asset state
const createInitialAssetState = (symbol: ScannerSymbol): AssetState => ({
    symbol,
    displayName: SYMBOL_NAMES[symbol],
    digitBuffer: [],
    priceBuffer: [],
    healthScore: 50, // Keep for legacy
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
    const [activeAsset, setActiveAsset] = useState<ScannerSymbol | null>(null); // The one currently TRADING
    const [leaderAsset, setLeaderAsset] = useState<ScannerSymbol | null>(null); // The one with HIGHEST SCORE

    const [opportunityMessage, setOpportunityMessage] = useState<string | null>(null);
    const [stats, setStats] = useState<ScannerStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0,
        consecutiveLosses: 0,
        vaultAccumulated: 0,
        vaultCycles: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isWarmingUp, setIsWarmingUp] = useState(true);
    const [warmUpProgress, setWarmUpProgress] = useState(0);

    // Refs for stable values
    const configRef = useRef<ScannerConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const currentStakeRef = useRef<number>(0);
    const isWaitingForContractRef = useRef<boolean>(false);
    const totalProfitRef = useRef<number>(0);
    const consecutiveLossesRef = useRef<number>(0);
    const assetStatesRef = useRef<Record<ScannerSymbol, AssetState>>(assetStates);
    const vaultAccumulatedRef = useRef<number>(0);
    const leaderAssetRef = useRef<ScannerSymbol | null>(null);
    const sorosLevelRef = useRef<number>(0); // 0=Base, 1=Level 2 (Stake+Profit)

    // Keep ref in sync with state
    useEffect(() => {
        assetStatesRef.current = assetStates;
    }, [assetStates]);

    useEffect(() => {
        leaderAssetRef.current = leaderAsset;
    }, [leaderAsset]);

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

    // Scanning Feedback Loop (Dopamine for waiting)
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            if (activeAsset) return; // Silent if trading

            // Pick a random asset to "scan" in logs
            const randomSym = SCANNER_SYMBOLS[Math.floor(Math.random() * SCANNER_SYMBOLS.length)];
            const state = assetStatesRef.current[randomSym];
            const currentScore = state.score.total;
            const targetScore = configRef.current?.minScore || 75;

            // Only log if it's somewhat interesting (e.g. > 30)
            if (currentScore > 30) {
                // Varying messages
                const msgs = [
                    `🔎 Escaneando ${state.displayName}... Score ${currentScore}% (Buscando >${targetScore}%)`,
                    `📊 Análisis V${state.displayName.split('V')[1]}: ${currentScore}% - Calculando entrada...`,
                    `⚡ ${state.displayName}: Volatilidad detectada. Score ${currentScore}%`,
                    `🔄 Sincronizando ${state.displayName}...`
                ];
                // 30% chance to log to avoid spamming too much
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
        const minRequired = SCANNER_SYMBOLS.length * 25; // 25 ticks per asset minimum

        const progress = Math.min(100, (totalTicks / minRequired) * 100);
        setWarmUpProgress(progress);

        // Check if all assets have at least 15 ticks (slightly lowered for faster startup)
        const allReady = SCANNER_SYMBOLS.every(sym => states[sym].tickCount >= 15);

        if (allReady && isWarmingUp) {
            setIsWarmingUp(false);
            addLog('🔥 Sistema calibrado. Motor Quant Activo.', 'gold');
        }

        return allReady;
    }, [isWarmingUp, addLog]);

    // Helper to find the current Leader Asset
    const updateLeaderAsset = useCallback(() => {
        if (!configRef.current?.autoSwitch) {
            setLeaderAsset(null);
            return;
        }

        const states = assetStatesRef.current;
        let bestSymbol: ScannerSymbol | null = null;
        // Start with -1 so any score >= 0 picks a leader, but practically scores are 0-100
        let highestScore = -1;

        SCANNER_SYMBOLS.forEach(sym => {
            const score = states[sym].score.total;
            if (score > highestScore) {
                highestScore = score;
                bestSymbol = sym;
            }
        });

        const minScore = configRef.current?.minScore || 75;

        // Only switch leader if it meets minimum threshold or if we just want to track the best one generally
        // But for TRADING we will require it to be the leader AND meet threshold.
        // For UI purposes, we always show the leader.
        if (bestSymbol && bestSymbol !== leaderAssetRef.current) {
            // Only log if the previous leader was valid
            if (leaderAssetRef.current) {
                // Optional: Log switch to prevent spam
                // addLog(`🔄 Auto-Switch: ${SYMBOL_NAMES[leaderAssetRef.current]} -> ${SYMBOL_NAMES[bestSymbol]} (Score: ${highestScore})`, 'info');
            }
            setLeaderAsset(bestSymbol);
        }
    }, [addLog]); // Removed dependency on states to avoid loop, using refs inside

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
        const data = JSON.parse(event.data);

        // Handle tick updates for any of our symbols
        if (data.msg_type === 'tick' && data.tick) {
            const tickSymbol = data.tick.symbol as ScannerSymbol;

            // Only process if it's one of our tracked symbols
            if (!SCANNER_SYMBOLS.includes(tickSymbol)) return;

            const price = parseFloat(data.tick.quote);
            const quote = price.toFixed(2);
            const currentDigit = parseInt(quote.charAt(quote.length - 1));

            setAssetStates(prev => {
                const asset = prev[tickSymbol];
                const newDigitBuffer = [...asset.digitBuffer, currentDigit].slice(-25);
                const newPriceBuffer = [...asset.priceBuffer, price].slice(-25);

                // --- QUANT SCORING ---
                const zScore = calculateZScore(newPriceBuffer);
                const entropyScore = calculateEntropyScore(newDigitBuffer);
                const volatilityScore = calculateVolatilityScore(zScore);
                const clusterScore = calculateClusterScore(newDigitBuffer);
                const totalScore = entropyScore + volatilityScore + clusterScore;

                const scoreObj: AssetScore = {
                    entropy: entropyScore,
                    volatility: volatilityScore,
                    clusters: clusterScore,
                    total: totalScore
                };

                // Check Shadow Pattern (last two digits are the same)
                const lastTwo = newDigitBuffer.length >= 2
                    ? [newDigitBuffer[newDigitBuffer.length - 2], newDigitBuffer[newDigitBuffer.length - 1]] as [number, number]
                    : null;
                const shadowPattern = lastTwo !== null && lastTwo[0] === lastTwo[1];

                // Check Inertia - Now part of Volatility Score but we keep the boolean for strict trigger
                const inertiaOK = zScore < 1.0;

                // Determine status
                let status: AssetState['status'] = 'scanning';

                // If Auto-Switch is ON, penalize non-leaders
                const isAutoSwitchOn = configRef.current?.autoSwitch;
                const minScore = configRef.current?.minScore || 75;
                const isLeader = leaderAssetRef.current === tickSymbol;
                const scorePass = totalScore >= minScore;

                if (isAutoSwitchOn && (!isLeader || !scorePass)) {
                    status = 'vetoed';
                } else if (shadowPattern && !inertiaOK) {
                    status = 'forming'; // Pattern detected but volatility too high
                } else if (shadowPattern && inertiaOK) {
                    status = 'forming'; // Ready to fire
                }

                return {
                    ...prev,
                    [tickSymbol]: {
                        ...asset,
                        digitBuffer: newDigitBuffer,
                        priceBuffer: newPriceBuffer,
                        healthScore: entropyScore * 2, // Map 0-50 to 0-100 for legacy display
                        score: scoreObj,
                        shadowPattern,
                        lastTwoDigits: lastTwo,
                        inertiaOK,
                        zScore,
                        status,
                        lastPrice: price,
                        tickCount: asset.tickCount + 1,
                    }
                };
            });

            // Update leader periodically (on every tick might be too frequent but ensures responsiveness)
            // We do it after state update in the next effect or here via ref check?
            // Since we need the NEW state to update leader, and state update is async, 
            // we'll rely on a separate effect tracking assetStates to update leader, OR do it inside the setAssetStates (risky for side effects).
            // Better: Do implicit leader check right before trading decision.

            // However, we want the UI to show the leader. 
            // We'll calculate "Leader Candidate" here for trading logic using the JUST CALCULATED values.
            // But for React State 'leaderAsset', we'll rely on the useEffect below.

            // Check if we should trigger a trade
            if (isRunning && !isWaitingForContractRef.current && socket && configRef.current) {
                const currentStates = assetStatesRef.current; // This is 'prev' state effectively + this tick update is pending...
                // Wait, we need the LATEST values we just computed for this symbol.
                // We can't access them from 'currentStates' yet.
                // So we assume the *previous* tick's leader status for other assets, but use fresh data for current asset.

                // Let's perform a "Real-Time Leader Check" just for this firing moment.

                if (!checkWarmupStatus()) return;

                // Get fresh data for this symbol from the closure variables above
                // We need to re-calculate them or grab them? We calculated them for setAssetStates.
                // Let's assume the state update is fast enough or use Refs for critical buffers?
                // Actually, inside this callback, 'assetStatesRef.current' is stale for THIS tick.
                // But typically 1 tick difference is fine for leader selection context.

                const asset = currentStates[tickSymbol];
                // We need the NEW value for shadowPattern and Scores to decide strictly.
                // Re-calculating for safety:
                const newDigitBuffer = [...asset.digitBuffer, currentDigit].slice(-25);
                const newPriceBuffer = [...asset.priceBuffer, price].slice(-25);
                const zScore = calculateZScore(newPriceBuffer);
                const entropyScore = calculateEntropyScore(newDigitBuffer);
                const volatilityScore = calculateVolatilityScore(zScore);
                const clusterScore = calculateClusterScore(newDigitBuffer);
                const totalScore = entropyScore + volatilityScore + clusterScore;

                const lastTwo = newDigitBuffer.length >= 2
                    ? [newDigitBuffer[newDigitBuffer.length - 2], newDigitBuffer[newDigitBuffer.length - 1]] as [number, number]
                    : null;
                const shadowPattern = lastTwo !== null && lastTwo[0] === lastTwo[1];
                const inertiaOK = zScore < 1.0;

                // Fire Logic
                if (shadowPattern && inertiaOK && newDigitBuffer.length >= 10) {

                    // AUTO-SWITCH GUARD
                    if (configRef.current.autoSwitch) {
                        const minScore = configRef.current.minScore || 75;

                        // 1. Check Score Threshold
                        if (totalScore < minScore) {
                            // addLog(`⚠️ Veto: ${SYMBOL_NAMES[tickSymbol]} Score ${totalScore} < ${minScore}`, 'warning');
                            setAssetStates(prev => ({
                                ...prev,
                                [tickSymbol]: { ...prev[tickSymbol], status: 'vetoed' }
                            }));
                            return;
                        }

                        // 2. Check if this is the current leader
                        // Use leaderAssetRef for leadership check
                        const currentLeader = leaderAssetRef.current;
                        if (currentLeader && currentLeader !== tickSymbol) {
                            // Another asset is the designated leader
                            // Allow trade only if leader is not actively forming
                            const leaderState = currentStates[currentLeader];
                            if (leaderState.status === 'forming' || leaderState.shadowPattern) {
                                // Leader has a better opportunity
                                return;
                            }
                        }
                    }

                    // EXECUTION
                    const repeatedDigit = lastTwo![0];

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

                    addLog(`🎯 SEÑAL ${SYMBOL_NAMES[tickSymbol]}: Patrón ${repeatedDigit}-${repeatedDigit} | Score: ${totalScore}%`, 'gold', tickSymbol);

                    // Execute DIGITDIFF trade
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
                            barrier: repeatedDigit.toString(),
                        }
                    };

                    socket.send(JSON.stringify(buyRequest));
                    addLog(`⚡ Orden enviada: DIFF ${repeatedDigit} en ${SYMBOL_NAMES[tickSymbol]}`, 'info', tickSymbol);
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

                // Reset active asset status
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

                // Update global session stats
                updateStats(profit, isWin);

                if (isWin) {
                    addLog(`💰 WIN +$${profit.toFixed(2)} en ${tradedSymbol ? SYMBOL_NAMES[tradedSymbol] : 'UNKNOWN'}`, 'gold', tradedSymbol || undefined);

                    consecutiveLossesRef.current = 0;

                    // SOROS LOGIC (Mini-Soros L2)
                    const useSoros = configRef.current?.useSoros;
                    if (useSoros) {
                        if (sorosLevelRef.current === 0) {
                            // Level 1 Win -> Go to Level 2 (Stake + Profit)
                            sorosLevelRef.current = 1;
                            const nextStake = parseFloat((initialStakeRef.current + profit).toFixed(2));
                            currentStakeRef.current = nextStake;
                            addLog(`🚀 SOROS NIVEL 2: Apostando Ganancia ($${nextStake})`, 'gold');
                        } else {
                            // Level 2 Win -> Reset to Base (Cycle Complete)
                            sorosLevelRef.current = 0;
                            currentStakeRef.current = initialStakeRef.current;
                            addLog(`🏆 CICLO SOROS COMPLETADO: Retorno a base ($${currentStakeRef.current})`, 'success');
                        }
                    } else {
                        // Standard Reset
                        currentStakeRef.current = initialStakeRef.current;
                    }

                    // Update vault
                    vaultAccumulatedRef.current += profit;
                    const vaultTarget = configRef.current?.vaultTarget || 3.0;

                    if (vaultAccumulatedRef.current >= vaultTarget) {
                        addLog(`🏦 ¡BÓVEDA LLENA! +$${vaultAccumulatedRef.current.toFixed(2)} asegurados`, 'gold');
                        setStats(prev => ({
                            ...prev,
                            vaultCycles: prev.vaultCycles + 1,
                            vaultAccumulated: 0,
                        }));
                        vaultAccumulatedRef.current = 0;
                    }

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                        consecutiveLosses: 0,
                        vaultAccumulated: vaultAccumulatedRef.current,
                    }));
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
                            addLog(`🛑 Max Gale (${maxGale}) alcanzado. Reseteando.`, 'warning');
                            currentStakeRef.current = initialStakeRef.current;
                            consecutiveLossesRef.current = 0;
                            sorosLevelRef.current = 0; // Reset Soros on Max Gale Loss
                        } else {
                            // Reset Soros on any Loss (Martingale takes over)
                            sorosLevelRef.current = 0;
                            // Configurable Martingale Factor (default 2.5)
                            const factor = configRef.current?.martingaleFactor || 2.5;
                            const newStake = parseFloat((currentStakeRef.current * factor).toFixed(2));
                            currentStakeRef.current = newStake;
                            addLog(`📈 Gale Nivel ${consecutiveLossesRef.current} (x${factor}): $${newStake.toFixed(2)}`, 'warning');
                        }
                    }

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: currentStakeRef.current,
                        consecutiveLosses: consecutiveLossesRef.current,
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
            // Ignore "already subscribed" errors to prevent log spam
            if (data.error.code === 'AlreadySubscribed' || data.error.message?.includes('already subscribed')) {
                return;
            }
            addLog(`❌ Error: ${data.error.message}`, 'error');
            isWaitingForContractRef.current = false;
        }

    }, [socket, addLog, updateStats, isRunning, activeAsset, checkWarmupStatus, stats.totalProfit, stopScanner]);

    // Update Leader Asset Effect
    useEffect(() => {
        if (!isRunning || !configRef.current?.autoSwitch) {
            if (leaderAssetRef.current !== null) setLeaderAsset(null);
            return;
        }

        // Find highest score
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
        consecutiveLossesRef.current = 0;
        totalProfitRef.current = 0;
        vaultAccumulatedRef.current = 0;
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
            vaultAccumulated: 0,
            vaultCycles: 0,
        });
        setLogs([]);
        setActiveAsset(null);
        setLeaderAsset(null);
        setOpportunityMessage(null);
        setIsWarmingUp(true);
        setWarmUpProgress(0);

        setActiveBot('Bug Deriv Scanner');
        addLog('🚀 BUG DERIV SCANNER iniciado - Escaneando 5 activos', 'gold');
        if (config.autoSwitch) {
            addLog('🧠 Selección Inteligente ACTIVADA', 'info');
        }
        addLog('⏳ Calibrando sistema...', 'info');

        setIsRunning(true);
        return true;
    }, [addLog, setActiveBot, socket]);

    // Socket subscription management
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
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
    }, [isRunning, socket, handleMessage, addLog]);



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
        leaderAsset, // Export for UI
        opportunityMessage,
        stats,
        logs,
        isWarmingUp,
        warmUpProgress,

        // Actions
        startScanner,
        stopScanner,
        addLog,

        // Constants
        SCANNER_SYMBOLS,
        SYMBOL_NAMES,
    };
};
