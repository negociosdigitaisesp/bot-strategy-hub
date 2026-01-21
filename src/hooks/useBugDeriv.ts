import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { useRiskSystem } from './useRiskSystem';
import { toast } from 'sonner';

// --- TYPES ---
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    useMartingale: boolean;
    safetyFactor: number;
}

type TrendDirection = 'up' | 'down' | 'neutral';
type ContractDirection = 'HIGHER' | 'LOWER';

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    martingaleLevel: number;
    avgVolatility: number;
    barrierOffset: number;
    currentBarrier: number;
    successProbability: number;
    signalsTriggered: number;
    currentPrice: number;
    trendDirection: TrendDirection;
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'higher' | 'lower' | 'blocked' | 'volatility' | 'trend';
}

interface PricePoint {
    time: number;
    price: number;
    barrier?: number;
}

// ============================================================================
// THE FORTRESS CONFIG - VOLATILITY-BASED BARRIER STRATEGY
// ============================================================================
const FORTRESS_CONFIG = {
    SYMBOL: 'R_100',
    SYMBOL_NAME: 'Volatility 100 (1s)',

    // VOLATILITY CALCULATION
    TICK_BUFFER_SIZE: 10,           // 10 ticks for ATR calculation
    TREND_TICKS: 3,                 // 3 ticks for micro-trend detection
    CHART_BUFFER_SIZE: 50,          // 50 points for chart display

    // BARRIER CALCULATION
    DEFAULT_SAFETY_FACTOR: 1.2,     // 1.2x ATR (Reduced from 3.0 to fix "no return" error)
    MIN_SAFETY_FACTOR: 0.5,
    MAX_SAFETY_FACTOR: 3.0,

    // CONTRACT SETTINGS
    CONTRACT_DURATION: 5,           // 5 ticks duration
    CONTRACT_DURATION_UNIT: 't',

    // RISK MANAGEMENT (Higher for low payout markets)
    MARTINGALE_FACTOR: 3.5,         // 3.5x per loss (for ~25-40% payout)
    MAX_MARTINGALE_LEVELS: 4,
    CONSECUTIVE_LOSS_FOR_RESET: 3,  // Reset after 3 consecutive losses
};

export const useBugDeriv = () => {
    const { socket, isConnected } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();
    const { isEnabled: riskEnabled, checkSafetyLock } = useRiskSystem();

    // Bot State
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0.35,
        martingaleLevel: 0,
        avgVolatility: 0,
        barrierOffset: 0,
        currentBarrier: 0,
        successProbability: 0,
        signalsTriggered: 0,
        currentPrice: 0,
        trendDirection: 'neutral',
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Chart Data
    const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
    const [safetyFactor, setSafetyFactor] = useState<number>(FORTRESS_CONFIG.DEFAULT_SAFETY_FACTOR);

    // Refs
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0.35);
    const currentStakeRef = useRef<number>(0.35);
    const isWaitingForContractRef = useRef<boolean>(false);
    const isRunningRef = useRef<boolean>(false);

    // Data Buffers
    const tickPricesRef = useRef<number[]>([]);           // Last 10 prices for volatility
    const trendPricesRef = useRef<number[]>([]);          // Last 3 prices for trend
    const chartDataRef = useRef<PricePoint[]>([]);        // Last 50 for chart

    // Risk Management Refs
    const martingaleLevelRef = useRef<number>(0);
    const consecutiveLossesRef = useRef<number>(0);
    const safetyFactorRef = useRef<number>(FORTRESS_CONFIG.DEFAULT_SAFETY_FACTOR);

    // --- HELPERS ---
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
        };
        setLogs(prev => [...prev.slice(-80), newLog]);
    }, []);

    // --- CORE: Calculate Average Volatility (Simple ATR) ---
    const calculateVolatility = useCallback((prices: number[]): number => {
        if (prices.length < 2) return 0;

        let totalDiff = 0;
        for (let i = 1; i < prices.length; i++) {
            totalDiff += Math.abs(prices[i] - prices[i - 1]);
        }

        return totalDiff / (prices.length - 1);
    }, []);

    // --- CORE: Detect Micro-Trend ---
    const detectTrend = useCallback((prices: number[]): TrendDirection => {
        if (prices.length < 3) return 'neutral';

        const [a, b, c] = prices.slice(-3);

        // Uptrend: each tick higher than previous
        if (c > b && b > a) return 'up';

        // Downtrend: each tick lower than previous
        if (c < b && b < a) return 'down';

        return 'neutral';
    }, []);

    // --- CORE: Calculate Barrier ---
    const calculateBarrier = useCallback((
        currentPrice: number,
        avgVol: number,
        direction: TrendDirection,
        factor: number
    ): { barrier: number; offset: number } => {
        // Calculate raw offset
        let rawOffset = avgVol * factor;

        // Ensure minimum offset to avoid "Invalid barrier" (too close)
        // And maximum offset to avoid "No return" (too far)
        // Volatility 100 1s price is approx 1000-1200.
        // Min offset should be at least ~0.05
        const minOffset = 0.15;
        if (rawOffset < minOffset) rawOffset = minOffset;

        const offset = rawOffset;

        if (direction === 'up') {
            // Price going UP → barrier BELOW → bet HIGHER (CALL)
            return { barrier: currentPrice - offset, offset: -offset };
        } else if (direction === 'down') {
            // Price going DOWN → barrier ABOVE → bet LOWER (PUT)
            return { barrier: currentPrice + offset, offset: offset };
        }

        // Neutral - no trade
        return { barrier: currentPrice, offset: 0 };
    }, []);

    // --- CORE: Calculate Success Probability ---
    const calculateProbability = useCallback((offset: number, avgVol: number): number => {
        if (avgVol === 0) return 50;

        // The further the barrier, the higher the probability
        // Simple model: prob = 50 + (offset/avgVol) * 10
        const distanceRatio = Math.abs(offset) / avgVol;
        const probability = Math.min(95, Math.max(50, 50 + distanceRatio * 15));

        return probability;
    }, []);

    // --- EXECUTE TRADE ---
    const executeTrade = useCallback((
        direction: ContractDirection,
        offset: number, // Changed from barrier (absolute) to offset (relative)
        reason: string
    ) => {
        if (!socket || !isRunningRef.current) return;

        // Round stake to 2 decimal places
        const stake = Math.round(currentStakeRef.current * 100) / 100;

        // Barrier logic: Deriv API requires signed string for relative barrier (e.g., "+1.23", "-0.45")
        // LOWEST VALID BARRIER IS USUALLY AROUND 0.3-0.5 DEPENDING ON VOLATILITY, BUT API EXPECTS STRING
        const barrierString = offset > 0 ? `+${offset.toFixed(2)}` : offset.toFixed(2);

        const request = {
            buy: 1,
            price: stake,
            parameters: {
                contract_type: direction === 'HIGHER' ? 'CALL' : 'PUT',
                symbol: FORTRESS_CONFIG.SYMBOL,
                duration: FORTRESS_CONFIG.CONTRACT_DURATION,
                duration_unit: FORTRESS_CONFIG.CONTRACT_DURATION_UNIT,
                basis: 'stake',
                amount: stake,
                currency: 'USD',
                barrier: barrierString,
            },
        };

        socket.send(JSON.stringify(request));

        setStats(prev => ({
            ...prev,
            signalsTriggered: prev.signalsTriggered + 1,
        }));

        addLog(reason, direction === 'HIGHER' ? 'higher' : 'lower');
    }, [socket, addLog]);

    // --- PROCESS TICK ---
    const processTick = useCallback((quote: number) => {
        if (!isRunningRef.current || isWaitingForContractRef.current) return;

        const currentTime = Date.now();

        // Update price buffers
        tickPricesRef.current = [...tickPricesRef.current, quote].slice(-FORTRESS_CONFIG.TICK_BUFFER_SIZE);
        trendPricesRef.current = [...trendPricesRef.current, quote].slice(-FORTRESS_CONFIG.TREND_TICKS);

        // Calculate volatility
        const avgVol = calculateVolatility(tickPricesRef.current);

        // Detect trend
        const trend = detectTrend(trendPricesRef.current);

        // --- BUG REVERSE (DOPPLER) LOGIC ---
        let finalSafetyFactor = safetyFactorRef.current;
        let isDoppler = false;

        if (trendPricesRef.current.length >= 3) {
            const [t1, t2, t3] = trendPricesRef.current.slice(-3);
            const v1 = t2 - t1;
            const v2 = t3 - t2;
            const acceleration = v2 - v1;

            if (trend === 'up') {
                // CALL: Rising Velocity (v2 > 0) AND Positive Acceleration (acc > 0)
                if (v2 > 0 && acceleration > 0) {
                    isDoppler = true;
                    // Reduce safety factor to capture higher payout
                    // We reduce it by 20% but keep above min
                    finalSafetyFactor = Math.max(0.8, safetyFactorRef.current * 0.8);
                }
            } else if (trend === 'down') {
                // PUT: Falling Velocity (v2 < 0) AND Negative Acceleration (acc < 0)
                // Note: acceleration < 0 means it's falling FASTER (more negative)
                if (v2 < 0 && acceleration < 0) {
                    isDoppler = true;
                    finalSafetyFactor = Math.max(0.8, safetyFactorRef.current * 0.8);
                }
            }
        }

        // Calculate barrier with potentially modified safety factor
        const { barrier, offset } = calculateBarrier(quote, avgVol, trend, finalSafetyFactor);

        // Calculate probability
        const probability = calculateProbability(offset, avgVol);

        // Update chart data
        const newPoint: PricePoint = { time: currentTime, price: quote, barrier };
        chartDataRef.current = [...chartDataRef.current, newPoint].slice(-FORTRESS_CONFIG.CHART_BUFFER_SIZE);
        setPriceHistory([...chartDataRef.current]);

        // Update stats
        setStats(prev => ({
            ...prev,
            avgVolatility: avgVol,
            barrierOffset: offset,
            currentBarrier: barrier,
            successProbability: probability,
            currentPrice: quote,
            trendDirection: trend,
        }));

        // Need minimum data for analysis
        if (tickPricesRef.current.length < FORTRESS_CONFIG.TICK_BUFFER_SIZE) {
            addLog(`🔬 Coletando dados... ${tickPricesRef.current.length}/${FORTRESS_CONFIG.TICK_BUFFER_SIZE}`, 'info');
            return;
        }

        // Only trade on clear trend
        if (trend === 'neutral') {
            if (Math.random() < 0.05) {
                addLog(`⏸️ Aguardando tendência clara...`, 'blocked');
            }
            return;
        }

        // RISK SYSTEM CHECK
        if (riskEnabled) {
            const safetyCheck = checkSafetyLock(stats.totalProfit);
            if (!safetyCheck.allowed) {
                addLog(`🛑 ${safetyCheck.reason}`, 'warning');
                isRunningRef.current = false;
                setIsRunning(false);
                toast.warning(safetyCheck.reason);
                return;
            }
        }

        // EXECUTE TRADE
        isWaitingForContractRef.current = true;

        const direction: ContractDirection = trend === 'up' ? 'HIGHER' : 'LOWER';
        const emoji = direction === 'HIGHER' ? '🔼' : '🔽';

        // Doppler Log
        if (isDoppler) {
            addLog(`⚡ DOPPLER ATIVADO! Aceleração detectada. Fator: ${finalSafetyFactor.toFixed(1)}x`, 'warning');
        }

        const reason = `${emoji} ${direction} | Barrier: ${barrier.toFixed(2)} | Prob: ${probability.toFixed(0)}%`;

        executeTrade(direction, offset, reason);

    }, [calculateVolatility, detectTrend, calculateBarrier, calculateProbability, executeTrade, addLog, riskEnabled, checkSafetyLock, stats.totalProfit]);

    // --- PROCESS CONTRACT RESULT ---
    const processContractResult = useCallback((result: { profit: number; status: string }) => {
        if (!configRef.current) return;

        const config = configRef.current;
        const isWin = result.profit > 0;

        setStats(prev => {
            const newStats = {
                ...prev,
                wins: isWin ? prev.wins + 1 : prev.wins,
                losses: !isWin ? prev.losses + 1 : prev.losses,
                totalProfit: prev.totalProfit + result.profit,
            };

            updateStats(result.profit, isWin);

            // Risk Management
            if (isWin) {
                currentStakeRef.current = initialStakeRef.current;
                martingaleLevelRef.current = 0;
                consecutiveLossesRef.current = 0;
                addLog(`✅ WIN +$${result.profit.toFixed(2)} | 🛡️ Escudo Protegeu!`, 'success');

                // Trigger Profit Notification
                if ((window as any).showProfitNotification) {
                    (window as any).showProfitNotification('Bug Deriv', result.profit);
                }
            } else {
                consecutiveLossesRef.current += 1;

                // Check for reset trigger
                if (consecutiveLossesRef.current >= FORTRESS_CONFIG.CONSECUTIVE_LOSS_FOR_RESET) {
                    addLog(`⚠️ ${consecutiveLossesRef.current} LOSSES - Resetando ciclo...`, 'warning');
                    currentStakeRef.current = initialStakeRef.current;
                    martingaleLevelRef.current = 0;
                    consecutiveLossesRef.current = 0;
                } else if (config.useMartingale && martingaleLevelRef.current < FORTRESS_CONFIG.MAX_MARTINGALE_LEVELS) {
                    martingaleLevelRef.current += 1;
                    currentStakeRef.current = Math.round(initialStakeRef.current * Math.pow(FORTRESS_CONFIG.MARTINGALE_FACTOR, martingaleLevelRef.current) * 100) / 100;
                    addLog(`❌ LOSS | Gale ${martingaleLevelRef.current}: $${currentStakeRef.current.toFixed(2)}`, 'error');
                } else {
                    currentStakeRef.current = initialStakeRef.current;
                    martingaleLevelRef.current = 0;
                    addLog(`❌ LOSS | Max Gale - Reset`, 'error');
                }
            }

            return {
                ...newStats,
                currentStake: currentStakeRef.current,
                martingaleLevel: martingaleLevelRef.current,
            };
        });

        isWaitingForContractRef.current = false;
    }, [updateStats, addLog]);

    // --- MESSAGE HANDLER ---
    const handleMessage = useCallback((event: MessageEvent) => {
        if (!isRunningRef.current) return;

        try {
            const data = JSON.parse(event.data);

            if (data.msg_type === 'tick' && data.tick) {
                processTick(data.tick.quote);
            }

            if (data.msg_type === 'buy' && data.buy) {
                socket?.send(JSON.stringify({
                    proposal_open_contract: 1,
                    contract_id: data.buy.contract_id,
                    subscribe: 1,
                }));
            }

            if (data.msg_type === 'buy' && data.error) {
                addLog(`ERROR: ${data.error.message}`, 'error');
                isWaitingForContractRef.current = false;
            }

            if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
                const contract = data.proposal_open_contract;
                if (contract.is_sold) {
                    processContractResult({ profit: parseFloat(contract.profit), status: contract.status });
                    if (contract.id) socket?.send(JSON.stringify({ forget: contract.id }));
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }, [socket, processTick, processContractResult, addLog]);

    // --- UPDATE SAFETY FACTOR ---
    const updateSafetyFactor = useCallback((factor: number) => {
        const clampedFactor = Math.max(
            FORTRESS_CONFIG.MIN_SAFETY_FACTOR,
            Math.min(FORTRESS_CONFIG.MAX_SAFETY_FACTOR, factor)
        );
        safetyFactorRef.current = clampedFactor;
        setSafetyFactor(clampedFactor);
    }, []);

    // --- START BOT ---
    const startBot = useCallback((config: BotConfig) => {
        if (!isConnected || !socket) {
            toast.error('Connect Deriv first');
            return false;
        }

        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        safetyFactorRef.current = config.safetyFactor;
        martingaleLevelRef.current = 0;
        consecutiveLossesRef.current = 0;
        isWaitingForContractRef.current = false;
        tickPricesRef.current = [];
        trendPricesRef.current = [];
        chartDataRef.current = [];
        isRunningRef.current = true;

        setIsRunning(true);
        setSafetyFactor(config.safetyFactor);
        setPriceHistory([]);
        setStats({
            wins: 0, losses: 0, totalProfit: 0,
            currentStake: config.stake, martingaleLevel: 0,
            avgVolatility: 0, barrierOffset: 0, currentBarrier: 0,
            successProbability: 0, signalsTriggered: 0,
            currentPrice: 0, trendDirection: 'neutral',
        });
        setLogs([]);

        setActiveBot('Bug Deriv');

        addLog(`🛡️ BUG DERIV ATIVADO`, 'volatility');
        addLog(`🔬 Volatilidade: ATR ${FORTRESS_CONFIG.TICK_BUFFER_SIZE} ticks`, 'info');
        addLog(`🎯 Safety Factor: ${config.safetyFactor}x`, 'info');
        addLog(`📊 Martingale: ${FORTRESS_CONFIG.MARTINGALE_FACTOR}x | Max ${FORTRESS_CONFIG.MAX_MARTINGALE_LEVELS}`, 'info');

        socket.send(JSON.stringify({ ticks: FORTRESS_CONFIG.SYMBOL, subscribe: 1 }));
        socket.addEventListener('message', handleMessage);
        return true;
    }, [isConnected, socket, handleMessage, addLog, setActiveBot]);

    // --- STOP BOT ---
    const stopBot = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);

        if (socket) {
            socket.removeEventListener('message', handleMessage);
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        setActiveBot(null);
        addLog(`⏹️ Protocolo encerrado`, 'warning');
    }, [socket, handleMessage, addLog, setActiveBot]);

    useEffect(() => {
        return () => { if (isRunningRef.current) stopBot(); };
    }, []);

    return {
        isRunning,
        stats,
        logs,
        priceHistory,
        safetyFactor,
        fortressConfig: FORTRESS_CONFIG,
        startBot,
        stopBot,
        updateSafetyFactor,
    };
};
