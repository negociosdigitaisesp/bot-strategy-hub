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
type ContractDirection = 'CALL' | 'PUT';

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
// THE SHIELD CONFIG - VOLATILITY-BASED BARRIER STRATEGY
// ============================================================================
const SHIELD_CONFIG = {
    SYMBOL: 'R_100',
    SYMBOL_NAME: 'Volatility 100 (1s)',

    // VOLATILITY CALCULATION
    TICK_BUFFER_SIZE: 10,           // 10 ticks for ATR
    TREND_TICKS: 3,                 // 3 ticks for trend

    // BARRIER CALCULATION
    DEFAULT_SAFETY_FACTOR: 2.5,     // 2.5x ATR (Aggressive Barrier)
    MIN_SAFETY_FACTOR: 1.0,
    MAX_SAFETY_FACTOR: 5.0,

    // CONTRACT SETTINGS
    CONTRACT_DURATION: 5,           // 5 ticks duration
    CONTRACT_DURATION_UNIT: 't',
    MIN_PAYOUT_PERCENT: 25,         // Minimum Payout accepted (25%)

    // RISK MANAGEMENT
    MARTINGALE_FACTOR: 2.1,         // Conservative Martingale
    MAX_MARTINGALE_LEVELS: 8,
    CONSECUTIVE_LOSS_FOR_RESET: 4,
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
    const [safetyFactor, setSafetyFactor] = useState<number>(SHIELD_CONFIG.DEFAULT_SAFETY_FACTOR);

    // Refs
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0.35);
    const currentStakeRef = useRef<number>(0.35);
    const isWaitingForContractRef = useRef<boolean>(false);
    const isRunningRef = useRef<boolean>(false);

    // Proposal Ref to avoid stale closure during proposal verification
    const pendingProposalRef = useRef<{
        direction: ContractDirection;
        offset: number;
        reason: string;
        stake: number;
    } | null>(null);

    // Data Buffers
    const tickPricesRef = useRef<number[]>([]);
    const trendPricesRef = useRef<number[]>([]);
    const chartDataRef = useRef<PricePoint[]>([]);

    // Risk Management Refs
    const martingaleLevelRef = useRef<number>(0);
    const consecutiveLossesRef = useRef<number>(0);
    const safetyFactorRef = useRef<number>(SHIELD_CONFIG.DEFAULT_SAFETY_FACTOR);
    const totalProfitRef = useRef<number>(0);

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

        // Classic Higher Highs / Lower Lows on 3 ticks often works for 1s index
        if (c > b && b > a) return 'up';
        if (c < b && b < a) return 'down';
        return 'neutral';
    }, []);

    // --- CORE: Calculate Barrier ---
    const calculateBarrier = useCallback((
        currentPrice: number,
        avgVol: number,
        direction: TrendDirection,
        factor: number
    ): { barrier: number; offset: number } | null => {
        let rawOffset = avgVol * factor;
        const minOffset = 0.10; // Minimum practical offset to engage API
        if (rawOffset < minOffset) rawOffset = minOffset;

        if (direction === 'up') {
            // Signal UP -> CALL -> Barrier BELOW Price
            return { barrier: currentPrice - rawOffset, offset: -rawOffset };
        } else if (direction === 'down') {
            // Signal DOWN -> PUT -> Barrier ABOVE Price
            return { barrier: currentPrice + rawOffset, offset: rawOffset };
        }
        return null; // Neutral
    }, []);

    // --- STEP 1: REQUEST PROPOSAL (CHECK PAYOUT) ---
    const requestProposal = useCallback((
        direction: ContractDirection,
        offset: number,
        reason: string
    ) => {
        if (!socket || !isRunningRef.current) return;

        const stake = Math.round(currentStakeRef.current * 100) / 100;

        // Store pending proposal details
        pendingProposalRef.current = { direction, offset, reason, stake };

        // Send Proposal Request
        // offset is e.g. -1.23 or +1.23. The API expects signed string like "+1.23", "-1.23"
        const barrierString = offset > 0 ? `+${offset.toFixed(2)}` : offset.toFixed(2);

        const proposalRequest = {
            proposal: 1,
            amount: stake,
            basis: 'stake',
            contract_type: direction,
            currency: 'USD',
            duration: SHIELD_CONFIG.CONTRACT_DURATION,
            duration_unit: SHIELD_CONFIG.CONTRACT_DURATION_UNIT,
            symbol: SHIELD_CONFIG.SYMBOL,
            barrier: barrierString,
        };

        socket.send(JSON.stringify(proposalRequest));
    }, [socket]);

    // --- PROCESS TICK ---
    const processTick = useCallback((quote: number) => {
        if (!isRunningRef.current || isWaitingForContractRef.current) return;

        const currentTime = Date.now();

        // Update buffers
        tickPricesRef.current = [...tickPricesRef.current, quote].slice(-SHIELD_CONFIG.TICK_BUFFER_SIZE);
        trendPricesRef.current = [...trendPricesRef.current, quote].slice(-SHIELD_CONFIG.TREND_TICKS);

        // Core Calculations
        const avgVol = calculateVolatility(tickPricesRef.current);
        const trend = detectTrend(trendPricesRef.current);

        // Calculate Barrier Target
        const barrierInfo = calculateBarrier(quote, avgVol, trend, safetyFactorRef.current);

        // Update UI (Charts & Stats)
        const barrierDisplay = barrierInfo ? barrierInfo.barrier : quote;
        const newPoint: PricePoint = { time: currentTime, price: quote, barrier: barrierDisplay };

        setPriceHistory(prev => [...prev.slice(-49), newPoint]);

        setStats(prev => ({
            ...prev,
            avgVolatility: avgVol,
            currentPrice: quote,
            trendDirection: trend,
            currentBarrier: barrierDisplay
        }));

        // Not valid analysis yet
        if (tickPricesRef.current.length < SHIELD_CONFIG.TICK_BUFFER_SIZE) return;

        // Skip if neutral
        if (!barrierInfo) {
            if (Math.random() < 0.1) addLog('⏳ Esperando tendencia...', 'info');
            return;
        }

        // RISK SYSTEM CHECK
        if (riskEnabled) {
            const safetyCheck = checkSafetyLock(totalProfitRef.current);
            if (!safetyCheck.allowed) {
                addLog(`🛑 ${safetyCheck.reason}`, 'warning');
                isRunningRef.current = false;
                setIsRunning(false);
                toast.warning(safetyCheck.reason);
                return;
            }
        }

        // --- TRIGGER LOGIC ---
        // Trend UP -> CALL
        if (trend === 'up') {
            isWaitingForContractRef.current = true;
            requestProposal('CALL', barrierInfo.offset, `📈 TENDENCIA ALTA DETECTADA`);
        }
        // Trend DOWN -> PUT
        else if (trend === 'down') {
            isWaitingForContractRef.current = true;
            requestProposal('PUT', barrierInfo.offset, `📉 TENDENCIA BAJA DETECTADA`);
        }

    }, [calculateVolatility, detectTrend, calculateBarrier, requestProposal, addLog, riskEnabled, checkSafetyLock]);

    // --- STEP 2: HANDLE PROPOSAL RESPONSE ---
    const handleProposalResponse = useCallback((proposal: any) => {
        if (!isRunningRef.current || !pendingProposalRef.current) {
            isWaitingForContractRef.current = false;
            return;
        }

        const payout = proposal.payout;
        const stake = proposal.ask_price;
        const netProfit = payout - stake;
        const profitPercent = (netProfit / stake) * 100;

        // --- FILTER PAYOUT (Anti-Death) ---
        if (profitPercent < SHIELD_CONFIG.MIN_PAYOUT_PERCENT) {
            addLog(`⚠️ Payout muy bajo (${profitPercent.toFixed(1)}%). Reajustando...`, 'warning');

            // Reduce safety factor to get closer to price (higher risk/reward)
            const newFactor = Math.max(SHIELD_CONFIG.MIN_SAFETY_FACTOR, safetyFactorRef.current - 0.2);
            safetyFactorRef.current = newFactor;
            setSafetyFactor(newFactor);

            // Cancel this trade entry
            isWaitingForContractRef.current = false;
            pendingProposalRef.current = null;
            return;
        }

        // --- ACCEPTABLE PAYOUT -> EXECUTE BUY ---
        if (socket) {
            // Note: Proposal ID is only valid for a few seconds.
            // If we subscribed, we would use buy=1, price=stake, parameters=...
            // But since we got a proposal id, we can buy it directly.
            socket.send(JSON.stringify({
                buy: proposal.id,
                price: stake // Safety check price
            }));

            addLog(`${pendingProposalRef.current.reason} | Payout: ${profitPercent.toFixed(1)}%`,
                pendingProposalRef.current.direction === 'CALL' ? 'higher' : 'lower');

            setStats(prev => ({
                ...prev,
                signalsTriggered: prev.signalsTriggered + 1
            }));
        }

        pendingProposalRef.current = null; // Clear pending
    }, [socket, addLog]);

    // --- PROCESS CONTRACT RESULT ---
    const processContractResult = useCallback((result: { profit: number; status: string }) => {
        if (!configRef.current) return;

        const config = configRef.current;
        const isWin = result.profit > 0;

        // Update Refs
        if (isWin) {
            totalProfitRef.current += result.profit;
            currentStakeRef.current = initialStakeRef.current;
            martingaleLevelRef.current = 0;
            consecutiveLossesRef.current = 0;

            // Restore Safety Factor slowly on win
            const newFactor = Math.min(SHIELD_CONFIG.MAX_SAFETY_FACTOR, safetyFactorRef.current + 0.1);
            safetyFactorRef.current = newFactor;
            setSafetyFactor(newFactor);

            addLog(`✅ VICTORIA +$${result.profit.toFixed(2)}`, 'success');
        } else {
            totalProfitRef.current += result.profit;
            consecutiveLossesRef.current += 1;

            // Martingale Logic
            if (consecutiveLossesRef.current >= SHIELD_CONFIG.CONSECUTIVE_LOSS_FOR_RESET) {
                addLog(`🛑 MAX LOSSES (${consecutiveLossesRef.current}) - Reset`, 'error');
                currentStakeRef.current = initialStakeRef.current;
                martingaleLevelRef.current = 0;
                consecutiveLossesRef.current = 0;
            } else if (config.useMartingale && martingaleLevelRef.current < SHIELD_CONFIG.MAX_MARTINGALE_LEVELS) {
                martingaleLevelRef.current += 1;
                currentStakeRef.current = parseFloat((currentStakeRef.current * SHIELD_CONFIG.MARTINGALE_FACTOR).toFixed(2));
                addLog(`🔥 MARTINGALE Nível ${martingaleLevelRef.current} -> $${currentStakeRef.current}`, 'warning');
            } else {
                currentStakeRef.current = initialStakeRef.current;
                martingaleLevelRef.current = 0;
                addLog(`🔁 Reset de Ciclo`, 'info');
            }

            addLog(`❌ DERROTA ${result.profit.toFixed(2)}`, 'error');
        }

        updateStats(result.profit, isWin);

        // Update UI Stats
        setStats(prev => ({
            ...prev,
            wins: isWin ? prev.wins + 1 : prev.wins,
            losses: !isWin ? prev.losses + 1 : prev.losses,
            totalProfit: totalProfitRef.current,
            currentStake: currentStakeRef.current,
            martingaleLevel: martingaleLevelRef.current
        }));

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

            if (data.msg_type === 'proposal' && data.proposal) {
                handleProposalResponse(data.proposal);
            }

            if (data.msg_type === 'buy' && data.buy) {
                // Subscribe to contract updates
                socket?.send(JSON.stringify({
                    proposal_open_contract: 1,
                    contract_id: data.buy.contract_id,
                    subscribe: 1
                }));
            }

            if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
                const contract = data.proposal_open_contract;
                if (contract.is_sold) {
                    processContractResult({
                        profit: parseFloat(contract.profit),
                        status: contract.status
                    });
                    // Forget this contract
                    if (socket) socket.send(JSON.stringify({ forget: contract.id }));
                }
            }

            if (data.error) {
                // If proposal error (e.g. payout too low or invalid barrier), cancel wait
                if (data.msg_type === 'proposal' || data.msg_type === 'buy') {
                    addLog(`Error Deriv: ${data.error.message}`, 'error');
                    isWaitingForContractRef.current = false;
                    pendingProposalRef.current = null;
                }
            }

        } catch (error) {
            console.error('Error handling message:', error);
        }
    }, [processTick, handleProposalResponse, processContractResult, addLog, socket]);

    // --- SOCKET MANAGEMENT ---
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        // Subscribe to ticks
        socket.send(JSON.stringify({ ticks: SHIELD_CONFIG.SYMBOL, subscribe: 1 }));

        return () => {
            socket.removeEventListener('message', onMessage);
        };
    }, [isRunning, socket, handleMessage]);

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
        totalProfitRef.current = 0;

        // Clear history
        tickPricesRef.current = [];
        trendPricesRef.current = [];
        chartDataRef.current = [];
        pendingProposalRef.current = null;

        isRunningRef.current = true;
        isWaitingForContractRef.current = false;

        setIsRunning(true);
        setPriceHistory([]);
        setStats({
            wins: 0, losses: 0, totalProfit: 0,
            currentStake: config.stake, martingaleLevel: 0,
            avgVolatility: 0, barrierOffset: 0, currentBarrier: 0,
            successProbability: 0, signalsTriggered: 0,
            currentPrice: 0, trendDirection: 'neutral',
        });
        setLogs([]);
        setSafetyFactor(config.safetyFactor);

        setActiveBot('Bug Deriv');
        addLog(`🛡️ ESCUDO ACTIVADO`, 'success');
        addLog(`🎯 Config: ${SHIELD_CONFIG.SYMBOL_NAME}`, 'info');

        return true;
    }, [isConnected, socket, addLog, setActiveBot]);

    // --- STOP BOT ---
    const stopBot = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);
        if (socket) socket.send(JSON.stringify({ forget_all: 'ticks' }));
        setActiveBot(null);
        addLog(`⏹️ Protocolo detenido`, 'warning');
    }, [socket, addLog, setActiveBot]);

    // Cleanup
    useEffect(() => {
        return () => { if (isRunningRef.current) stopBot(); };
    }, []);

    // Helper for updating factor manually if needed (though now automatic)
    const updateSafetyFactor = useCallback((factor: number) => {
        const clamped = Math.max(SHIELD_CONFIG.MIN_SAFETY_FACTOR, Math.min(SHIELD_CONFIG.MAX_SAFETY_FACTOR, factor));
        safetyFactorRef.current = clamped;
        setSafetyFactor(clamped);
    }, []);

    return {
        isRunning,
        stats,
        logs,
        priceHistory,
        safetyFactor,
        fortressConfig: SHIELD_CONFIG,
        startBot,
        stopBot,
        updateSafetyFactor
    };
};
