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
}

type Parity = 'even' | 'odd';
type SemaphoreStatus = 'neutral' | 'yellow' | 'green' | 'red';

interface FilterResult {
    passed: boolean;
    reason?: string;
}

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    martingaleLevel: number;
    saturationPercent: number;
    dominantSide: Parity | null;
    consecutiveCount: number;
    signalsTriggered: number;
    signalsBlocked: number;
}

interface FilterStatus {
    edge: FilterResult;
    hft: FilterResult;
    friction: FilterResult;
    trend: FilterResult;
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'even' | 'odd' | 'blocked' | 'filter';
}

// ============================================================================
// BOT SIGMA CONFIG - LEY DE LOS GRANDES NÚMEROS
// ============================================================================
const SIGMA_CONFIG = {
    SYMBOL: '1HZ10V',
    SYMBOL_NAME: 'Volatility 10 (1s)',

    // ANÁLISIS DE SATURACIÓN
    HISTORY_SIZE: 100,                // 100 ticks para calcular saturación
    SATURATION_THRESHOLD: 55,         // >55% = Saturación detectada
    STRONG_SATURATION_THRESHOLD: 60,  // >60% = Saturación fuerte

    // TRIGGER DE EXAUSTÃO
    EXHAUSTION_SEQUENCE: 4,           // 4 dígitos iguales = trigger

    // FILTROS
    HFT_THRESHOLD: 0.7,               // >70% trocas = alta frequência
    HFT_WINDOW: 20,                   // Janela para calcular HFT
    TREND_MAX_SATURATION: 70,         // >70% = trend muito forte
    MAX_CONSECUTIVE: 5,               // >5 = sequência muito longa

    // RISK
    MARTINGALE_FACTOR: 2.1,
    MAX_MARTINGALE_LEVELS: 4,
};

export const useBotSigma = () => {
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
        saturationPercent: 50,
        dominantSide: null,
        consecutiveCount: 0,
        signalsTriggered: 0,
        signalsBlocked: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Analysis State
    const [saturationPercent, setSaturationPercent] = useState(50);
    const [dominantSide, setDominantSide] = useState<Parity | null>(null);
    const [semaphore, setSemaphore] = useState<SemaphoreStatus>('neutral');
    const [consecutiveCount, setConsecutiveCount] = useState(0);
    const [lastSequence, setLastSequence] = useState<Parity[]>([]);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>({
        edge: { passed: true },
        hft: { passed: true },
        friction: { passed: true },
        trend: { passed: true },
    });

    // Refs
    const isRunningRef = useRef(false);
    const isWaitingForContractRef = useRef(false);
    const tickHistoryRef = useRef<number[]>([]);
    const parityHistoryRef = useRef<Parity[]>([]);
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef(0.35);
    const currentStakeRef = useRef(0.35);
    const martingaleLevelRef = useRef(0);

    // --- ADD LOG ---
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            time: new Date().toLocaleTimeString('es-CL'),
            message,
            type,
        };
        setLogs(prev => [entry, ...prev].slice(0, 100));
    }, []);

    // --- GET PARITY ---
    const getParityFromTick = useCallback((quote: number): Parity => {
        const lastDigit = Math.floor(quote * 100) % 10;
        return lastDigit % 2 === 0 ? 'even' : 'odd';
    }, []);

    // --- GET LAST DIGIT ---
    const getLastDigit = useCallback((quote: number): number => {
        return Math.floor(quote * 100) % 10;
    }, []);

    // --- CALCULATE SATURATION ---
    const calculateSaturation = useCallback((history: Parity[]): { percent: number; dominant: Parity | null } => {
        if (history.length < 10) return { percent: 50, dominant: null };

        const evenCount = history.filter(p => p === 'even').length;
        const evenPercent = (evenCount / history.length) * 100;
        const oddPercent = 100 - evenPercent;

        if (evenPercent > oddPercent) {
            return { percent: evenPercent, dominant: 'even' };
        } else if (oddPercent > evenPercent) {
            return { percent: oddPercent, dominant: 'odd' };
        }
        return { percent: 50, dominant: null };
    }, []);

    // --- COUNT CONSECUTIVE ---
    const countConsecutive = useCallback((history: Parity[]): { count: number; parity: Parity | null } => {
        if (history.length === 0) return { count: 0, parity: null };

        const lastParity = history[history.length - 1];
        let count = 0;

        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i] === lastParity) {
                count++;
            } else {
                break;
            }
        }

        return { count, parity: lastParity };
    }, []);

    // --- DETERMINE SEMAPHORE ---
    const determineSemaphore = useCallback((consecutive: number): SemaphoreStatus => {
        if (consecutive >= 5) return 'red';
        if (consecutive >= 4) return 'green';
        if (consecutive >= 3) return 'yellow';
        return 'neutral';
    }, []);

    // --- FILTER: EDGE (0 or 9) ---
    const checkEdgeFilter = useCallback((lastDigit: number): FilterResult => {
        if (lastDigit === 0 || lastDigit === 9) {
            return { passed: false, reason: 'BORDA: Dígito de borda detectado (0/9)' };
        }
        return { passed: true };
    }, []);

    // --- FILTER: HFT (High Frequency Trading) ---
    const checkHFTFilter = useCallback((history: Parity[]): FilterResult => {
        const window = history.slice(-SIGMA_CONFIG.HFT_WINDOW);
        if (window.length < SIGMA_CONFIG.HFT_WINDOW) return { passed: true };

        let switches = 0;
        for (let i = 1; i < window.length; i++) {
            if (window[i] !== window[i - 1]) switches++;
        }

        const switchRate = switches / (window.length - 1);
        if (switchRate > SIGMA_CONFIG.HFT_THRESHOLD) {
            return { passed: false, reason: `HFT: Alta frecuencia (${(switchRate * 100).toFixed(0)}%)` };
        }
        return { passed: true };
    }, []);

    // --- FILTER: FRICTION ---
    const checkFrictionFilter = useCallback((history: Parity[]): FilterResult => {
        const last4 = history.slice(-4);
        if (last4.length < 4) return { passed: true };

        const isClean = last4.every(p => p === last4[0]);
        if (!isClean) {
            return { passed: false, reason: 'FRICCIÓN: Secuencia no homogénea' };
        }
        return { passed: true };
    }, []);

    // --- FILTER: TREND FLOW ---
    const checkTrendFilter = useCallback((saturation: number, consecutive: number): FilterResult => {
        if (saturation > SIGMA_CONFIG.TREND_MAX_SATURATION) {
            return { passed: false, reason: `TREND: Saturación muy alta (${saturation.toFixed(0)}%)` };
        }
        if (consecutive >= SIGMA_CONFIG.MAX_CONSECUTIVE + 1) {
            return { passed: false, reason: `TREND: Secuencia muy larga (${consecutive})` };
        }
        return { passed: true };
    }, []);

    // --- EXECUTE TRADE ---
    const executeTrade = useCallback((betOn: Parity, reason: string) => {
        if (!socket || !isRunningRef.current) return;

        const stake = Math.round(currentStakeRef.current * 100) / 100;
        const contractType = betOn === 'even' ? 'DIGITEVEN' : 'DIGITODD';

        const request = {
            buy: 1,
            price: stake,
            parameters: {
                contract_type: contractType,
                symbol: SIGMA_CONFIG.SYMBOL,
                duration: 1,
                duration_unit: 't',
                basis: 'stake',
                amount: stake,
                currency: 'USD',
            },
        };

        socket.send(JSON.stringify(request));

        setStats(prev => ({
            ...prev,
            signalsTriggered: prev.signalsTriggered + 1,
        }));

        addLog(reason, betOn === 'even' ? 'even' : 'odd');
    }, [socket, addLog]);

    // --- PROCESS TICK ---
    const processTick = useCallback((quote: number) => {
        if (!isRunningRef.current || isWaitingForContractRef.current) return;

        const parity = getParityFromTick(quote);
        const lastDigit = getLastDigit(quote);

        // Update histories
        tickHistoryRef.current = [...tickHistoryRef.current, quote].slice(-SIGMA_CONFIG.HISTORY_SIZE);
        parityHistoryRef.current = [...parityHistoryRef.current, parity].slice(-SIGMA_CONFIG.HISTORY_SIZE);

        // Need minimum data
        if (parityHistoryRef.current.length < 20) {
            addLog(`📊 Recolectando datos... ${parityHistoryRef.current.length}/${SIGMA_CONFIG.HISTORY_SIZE}`, 'info');
            return;
        }

        // Calculate saturation
        const { percent, dominant } = calculateSaturation(parityHistoryRef.current);
        setSaturationPercent(percent);
        setDominantSide(dominant);
        setStats(prev => ({ ...prev, saturationPercent: percent, dominantSide: dominant }));

        // Count consecutive
        const { count: consecutive, parity: consecutiveParity } = countConsecutive(parityHistoryRef.current);
        setConsecutiveCount(consecutive);
        setLastSequence(parityHistoryRef.current.slice(-4));
        setStats(prev => ({ ...prev, consecutiveCount: consecutive }));

        // Determine semaphore
        const semaphoreStatus = determineSemaphore(consecutive);
        setSemaphore(semaphoreStatus);

        // Check conditions for entry
        const isSaturated = percent >= SIGMA_CONFIG.SATURATION_THRESHOLD;
        const isExhausted = consecutive >= SIGMA_CONFIG.EXHAUSTION_SEQUENCE;

        if (!isSaturated || !isExhausted) {
            // Not ready yet
            if (semaphoreStatus === 'yellow') {
                addLog(`🟡 Preparando... Secuencia: ${consecutive}/4`, 'info');
            }
            return;
        }

        // Apply filters
        const edgeResult = checkEdgeFilter(lastDigit);
        const hftResult = checkHFTFilter(parityHistoryRef.current);
        const frictionResult = checkFrictionFilter(parityHistoryRef.current);
        const trendResult = checkTrendFilter(percent, consecutive);

        setFilterStatus({
            edge: edgeResult,
            hft: hftResult,
            friction: frictionResult,
            trend: trendResult,
        });

        // Check if any filter failed
        const allFilters = [edgeResult, hftResult, frictionResult, trendResult];
        const failedFilter = allFilters.find(f => !f.passed);

        if (failedFilter) {
            addLog(`🚫 ${failedFilter.reason}`, 'filter');
            setStats(prev => ({ ...prev, signalsBlocked: prev.signalsBlocked + 1 }));
            return;
        }

        // Check risk system
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

        // ENTRY: Bet on REVERSAL
        const betOn: Parity = dominant === 'even' ? 'odd' : 'even';
        const betName = betOn === 'even' ? 'PAR' : 'IMPAR';

        isWaitingForContractRef.current = true;
        executeTrade(betOn, `🎯 REVERSIÓN >> ${betName} (Sat: ${percent.toFixed(0)}%, Seq: ${consecutive})`);

    }, [getParityFromTick, getLastDigit, calculateSaturation, countConsecutive, determineSemaphore,
        checkEdgeFilter, checkHFTFilter, checkFrictionFilter, checkTrendFilter, executeTrade,
        addLog, riskEnabled, checkSafetyLock, stats.totalProfit]);

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

            if (isWin) {
                currentStakeRef.current = initialStakeRef.current;
                martingaleLevelRef.current = 0;
                addLog(`✅ VICTORIA +$${result.profit.toFixed(2)} | Reset`, 'success');

                if ((window as any).showProfitNotification) {
                    (window as any).showProfitNotification('Bot Sigma', result.profit);
                }
            } else {
                if (config.useMartingale && martingaleLevelRef.current < SIGMA_CONFIG.MAX_MARTINGALE_LEVELS) {
                    martingaleLevelRef.current += 1;
                    currentStakeRef.current = Math.round(initialStakeRef.current * Math.pow(SIGMA_CONFIG.MARTINGALE_FACTOR, martingaleLevelRef.current) * 100) / 100;
                    addLog(`❌ PÉRDIDA | Gale ${martingaleLevelRef.current}: $${currentStakeRef.current.toFixed(2)}`, 'error');
                } else {
                    currentStakeRef.current = initialStakeRef.current;
                    martingaleLevelRef.current = 0;
                    addLog(`❌ PÉRDIDA | Reset`, 'error');
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
                }
            }
        } catch (error) {
            console.error('[BotSigma] Error parsing message:', error);
        }
    }, [socket, processTick, processContractResult, addLog]);

    // --- START BOT ---
    const startBot = useCallback((config: BotConfig) => {
        if (!socket || !isConnected) {
            toast.error('Conexión requerida', {
                description: 'Conecte su cuenta Deriv primero.',
            });
            return;
        }

        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        martingaleLevelRef.current = 0;
        isRunningRef.current = true;
        isWaitingForContractRef.current = false;
        tickHistoryRef.current = [];
        parityHistoryRef.current = [];

        setIsRunning(true);
        setActiveBot('Bot Sigma');
        setStats(prev => ({
            ...prev,
            currentStake: config.stake,
            martingaleLevel: 0,
        }));

        // Subscribe to ticks
        socket.send(JSON.stringify({
            ticks: SIGMA_CONFIG.SYMBOL,
            subscribe: 1,
        }));

        addLog(`🎰 BOT SIGMA ACTIVADO - Ley de los Grandes Números`, 'success');
        addLog(`📊 Analizando ${SIGMA_CONFIG.HISTORY_SIZE} ticks...`, 'info');
        addLog(`🎯 Saturación > ${SIGMA_CONFIG.SATURATION_THRESHOLD}% + Secuencia de ${SIGMA_CONFIG.EXHAUSTION_SEQUENCE}`, 'info');

        toast.success('Bot Sigma Activado', {
            description: `Operando en ${SIGMA_CONFIG.SYMBOL_NAME}`,
        });
    }, [socket, isConnected, setActiveBot, addLog]);

    // --- STOP BOT ---
    const stopBot = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);
        setActiveBot(null);

        if (socket) {
            socket.send(JSON.stringify({
                forget_all: 'ticks',
            }));
        }

        addLog(`⏹️ BOT SIGMA DETENIDO`, 'warning');
        toast.info('Bot Sigma Detenido');
    }, [socket, setActiveBot, addLog]);

    // Effect: Message listener
    useEffect(() => {
        if (!socket) return;

        socket.addEventListener('message', handleMessage);
        return () => socket.removeEventListener('message', handleMessage);
    }, [socket, handleMessage]);

    return {
        isRunning,
        isConnected,
        stats,
        logs,
        saturationPercent,
        dominantSide,
        semaphore,
        consecutiveCount,
        lastSequence,
        filterStatus,
        startBot,
        stopBot,
    };
};
