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
type OperationMode = 'ping-pong' | 'sequencia' | 'espera';
type SnapbackPattern = 'none' | 'even' | 'odd';

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    martingaleLevel: number;
    switchRate: number;
    snapbacksTriggered: number;
    cycleResets: number;
    signalsTriggered: number;
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'even' | 'odd' | 'blocked' | 'mode' | 'snapback' | 'cycle';
}

// ============================================================================
// CHAMELEON ADAPTIVE CONFIG - CYCLE ANALYSIS MODE
// ============================================================================
const CHAMELEON_CONFIG = {
    SYMBOL: 'R_100',
    SYMBOL_NAME: 'Volatility 100 (1s)',

    // CYCLE ANALYSIS
    HISTORY_SIZE: 50,                    // 50 ticks for switch rate calculation

    // MODE THRESHOLDS
    PING_PONG_THRESHOLD: 55,             // Switch Rate > 55% = Ping-Pong Mode
    SEQUENCIA_THRESHOLD: 45,             // Switch Rate < 45% = Sequência Mode
    STRONG_SEQUENCIA_THRESHOLD: 70,      // Sequência > 70% = Override Snapback

    // RISK MANAGEMENT
    MARTINGALE_FACTOR: 2.1,              // x2.1 per loss
    MAX_MARTINGALE_LEVELS: 4,
    CONSECUTIVE_LOSS_FOR_REANALYSIS: 2,  // 2 losses = force cycle reanalysis
};

export const useBugDeriv = () => {
    const { socket, isConnected } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();
    const { isEnabled: riskEnabled, checkSafetyLock, settings: riskSettings } = useRiskSystem();

    // Bot State
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0.35,
        martingaleLevel: 0,
        switchRate: 50,
        snapbacksTriggered: 0,
        cycleResets: 0,
        signalsTriggered: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Cycle Analysis State
    const [switchRate, setSwitchRate] = useState<number>(50);
    const [currentMode, setCurrentMode] = useState<OperationMode>('espera');
    const [snapbackPattern, setSnapbackPattern] = useState<SnapbackPattern>('none');
    const [lastParity, setLastParity] = useState<Parity | null>(null);
    const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);

    // Refs
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0.35);
    const currentStakeRef = useRef<number>(0.35);
    const isWaitingForContractRef = useRef<boolean>(false);
    const isRunningRef = useRef<boolean>(false);

    // Data Buffers
    const parityHistoryRef = useRef<Parity[]>([]);      // 50 tick parity history
    const last3ParitiesRef = useRef<Parity[]>([]);      // Last 3 for snapback detection

    // Risk Management Refs
    const martingaleLevelRef = useRef<number>(0);
    const consecutiveLossesRef = useRef<number>(0);

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

    // --- CORE: Get Parity from Tick ---
    const getParityFromTick = useCallback((quote: number): Parity => {
        const lastDigit = Math.floor(quote * 100) % 10;
        return lastDigit % 2 === 0 ? 'even' : 'odd';
    }, []);

    // --- CORE: Calculate Switch Rate ---
    const calculateSwitchRate = useCallback((history: Parity[]): number => {
        if (history.length < 2) return 50;

        let switches = 0;
        for (let i = 1; i < history.length; i++) {
            if (history[i] !== history[i - 1]) {
                switches++;
            }
        }

        return (switches / (history.length - 1)) * 100;
    }, []);

    // --- CORE: Determine Mode ---
    const determineMode = useCallback((rate: number): OperationMode => {
        if (rate > CHAMELEON_CONFIG.PING_PONG_THRESHOLD) {
            return 'ping-pong';
        } else if (rate < CHAMELEON_CONFIG.SEQUENCIA_THRESHOLD) {
            return 'sequencia';
        }
        return 'espera';
    }, []);

    // --- CORE: Detect Snapback Pattern (2-1) ---
    const detectSnapback = useCallback((last3: Parity[]): SnapbackPattern => {
        if (last3.length < 3) return 'none';

        const [first, second, third] = last3;

        // [PAR] -> [PAR] -> [ÍMPAR] = Apostar PAR
        if (first === 'even' && second === 'even' && third === 'odd') {
            return 'even';
        }

        // [ÍMPAR] -> [ÍMPAR] -> [PAR] = Apostar ÍMPAR
        if (first === 'odd' && second === 'odd' && third === 'even') {
            return 'odd';
        }

        return 'none';
    }, []);

    // --- CORE: Determine Entry ---
    const determineEntry = useCallback((
        mode: OperationMode,
        rate: number,
        snapback: SnapbackPattern,
        currentParity: Parity
    ): { shouldEnter: boolean; betOn: Parity | null; reason: string } => {

        // ESPERA Mode - Block entries
        if (mode === 'espera') {
            return { shouldEnter: false, betOn: null, reason: 'Analisando Definição de Ciclo...' };
        }

        // SEQUÊNCIA Mode - Strong trend override snapback
        if (mode === 'sequencia') {
            const repetitionRate = 100 - rate; // Inverse of switch rate

            // Strong Sequência (> 70% repetition) - Ignore snapback, follow trend
            if (repetitionRate > CHAMELEON_CONFIG.STRONG_SEQUENCIA_THRESHOLD) {
                return {
                    shouldEnter: true,
                    betOn: currentParity,
                    reason: `🚂 SEQUÊNCIA FORTE (${repetitionRate.toFixed(0)}%) >> ${currentParity === 'even' ? 'PAR' : 'ÍMPAR'}`
                };
            }

            // Normal Sequência - Check snapback first
            if (snapback !== 'none') {
                return {
                    shouldEnter: true,
                    betOn: snapback,
                    reason: `🎯 SNAPBACK >> ${snapback === 'even' ? 'PAR' : 'ÍMPAR'}`
                };
            }

            // No snapback - follow repetition
            return {
                shouldEnter: true,
                betOn: currentParity,
                reason: `🚂 SEQUÊNCIA >> ${currentParity === 'even' ? 'PAR' : 'ÍMPAR'}`
            };
        }

        // PING-PONG Mode - Bet on inversion
        if (mode === 'ping-pong') {
            // Check snapback first (has priority in non-strong modes)
            if (snapback !== 'none') {
                return {
                    shouldEnter: true,
                    betOn: snapback,
                    reason: `🎯 SNAPBACK >> ${snapback === 'even' ? 'PAR' : 'ÍMPAR'}`
                };
            }

            // Ping-pong logic: bet on opposite
            const betOn: Parity = currentParity === 'even' ? 'odd' : 'even';
            return {
                shouldEnter: true,
                betOn,
                reason: `🏓 PING-PONG >> ${betOn === 'even' ? 'PAR' : 'ÍMPAR'}`
            };
        }

        return { shouldEnter: false, betOn: null, reason: 'No signal' };
    }, []);

    // --- EXECUTE TRADE ---
    const executeTrade = useCallback((betOn: Parity, reason: string) => {
        if (!socket || !isRunningRef.current) return;
        // Note: isWaitingForContractRef is now set in processTick BEFORE calling this function

        // Round stake to 2 decimal places to satisfy Deriv API requirements
        const stake = Math.round(currentStakeRef.current * 100) / 100;
        const contractType = betOn === 'even' ? 'DIGITEVEN' : 'DIGITODD';

        const request = {
            buy: 1,
            price: stake,
            parameters: {
                contract_type: contractType,
                symbol: CHAMELEON_CONFIG.SYMBOL,
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

    // --- FORCE CYCLE REANALYSIS ---
    const forceCycleReanalysis = useCallback(() => {
        setIsReanalyzing(true);
        parityHistoryRef.current = [];
        last3ParitiesRef.current = [];
        setSwitchRate(50);
        setCurrentMode('espera');
        setSnapbackPattern('none');

        setStats(prev => ({ ...prev, cycleResets: prev.cycleResets + 1 }));
        addLog(`🔄 CICLO REINICIADO - Reanalisando 50 ticks...`, 'cycle');

        setTimeout(() => setIsReanalyzing(false), 100);
    }, [addLog]);

    // --- PROCESS TICK ---
    const processTick = useCallback((quote: number) => {
        if (!isRunningRef.current || isWaitingForContractRef.current) return;

        // Get parity from tick
        const parity = getParityFromTick(quote);
        setLastParity(parity);

        // Update history buffers
        parityHistoryRef.current = [...parityHistoryRef.current, parity].slice(-CHAMELEON_CONFIG.HISTORY_SIZE);
        last3ParitiesRef.current = [...last3ParitiesRef.current, parity].slice(-3);

        // Need minimum data for analysis
        if (parityHistoryRef.current.length < 10) {
            addLog(`📊 Coletando dados... ${parityHistoryRef.current.length}/${CHAMELEON_CONFIG.HISTORY_SIZE}`, 'info');
            return;
        }

        // Calculate Switch Rate
        const rate = calculateSwitchRate(parityHistoryRef.current);
        setSwitchRate(rate);
        setStats(prev => ({ ...prev, switchRate: rate }));

        // Determine Mode
        const mode = determineMode(rate);
        if (mode !== currentMode) {
            setCurrentMode(mode);
            const modeNames = {
                'ping-pong': '🏓 PING-PONG',
                'sequencia': '🚂 SEQUÊNCIA',
                'espera': '✋ ESPERA'
            };
            addLog(`Modo: ${modeNames[mode]} (Switch: ${rate.toFixed(1)}%)`, 'mode');
        }

        // Detect Snapback
        const snapback = detectSnapback(last3ParitiesRef.current);
        if (snapback !== snapbackPattern) {
            setSnapbackPattern(snapback);
            if (snapback !== 'none') {
                setStats(prev => ({ ...prev, snapbacksTriggered: prev.snapbacksTriggered + 1 }));
                addLog(`🎯 Snapback detectado: ${snapback === 'even' ? 'PAR' : 'ÍMPAR'}`, 'snapback');
            }
        }

        // Determine entry
        const { shouldEnter, betOn, reason } = determineEntry(mode, rate, snapback, parity);

        if (shouldEnter && betOn) {
            // RISK SYSTEM CHECK: Verify safety locks before trading
            if (riskEnabled) {
                const safetyCheck = checkSafetyLock(stats.totalProfit);
                if (!safetyCheck.allowed) {
                    addLog(`🛑 ${safetyCheck.reason}`, 'warning');
                    // Stop the bot when limit reached
                    isRunningRef.current = false;
                    setIsRunning(false);
                    toast.warning(safetyCheck.reason);
                    return;
                }
            }

            // CRITICAL FIX: Set waiting flag IMMEDIATELY to prevent double entries
            isWaitingForContractRef.current = true;
            executeTrade(betOn, reason);
        } else if (mode === 'espera') {
            // Log blocked entry occasionally
            if (Math.random() < 0.1) {
                addLog(`✋ Bloqueado: ${reason}`, 'blocked');
            }
        }
    }, [getParityFromTick, calculateSwitchRate, determineMode, detectSnapback, determineEntry, executeTrade, addLog, currentMode, snapbackPattern, riskEnabled, checkSafetyLock, stats.totalProfit]);

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
                addLog(`✅ WIN +$${result.profit.toFixed(2)} | Reset`, 'success');

                // Trigger Profit Notification
                if ((window as any).showProfitNotification) {
                    (window as any).showProfitNotification('Bug Deriv', result.profit);
                }
            } else {
                consecutiveLossesRef.current += 1;

                // Check for Cycle Reanalysis Trigger (2 consecutive losses)
                if (consecutiveLossesRef.current >= CHAMELEON_CONFIG.CONSECUTIVE_LOSS_FOR_REANALYSIS) {
                    addLog(`⚠️ 2 LOSSES CONSECUTIVOS - Forçando reanálise!`, 'warning');
                    forceCycleReanalysis();
                    currentStakeRef.current = initialStakeRef.current;
                    martingaleLevelRef.current = 0;
                    consecutiveLossesRef.current = 0;
                } else if (config.useMartingale && martingaleLevelRef.current < CHAMELEON_CONFIG.MAX_MARTINGALE_LEVELS) {
                    martingaleLevelRef.current += 1;
                    // Round to 2 decimal places to satisfy Deriv API requirements
                    currentStakeRef.current = Math.round(initialStakeRef.current * Math.pow(CHAMELEON_CONFIG.MARTINGALE_FACTOR, martingaleLevelRef.current) * 100) / 100;
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
    }, [updateStats, addLog, forceCycleReanalysis]);

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

    // --- START BOT ---
    const startBot = useCallback((config: BotConfig) => {
        if (!isConnected || !socket) {
            toast.error('Connect Deriv first');
            return false;
        }

        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        martingaleLevelRef.current = 0;
        consecutiveLossesRef.current = 0;
        isWaitingForContractRef.current = false;
        parityHistoryRef.current = [];
        last3ParitiesRef.current = [];
        isRunningRef.current = true;

        setIsRunning(true);
        setSwitchRate(50);
        setCurrentMode('espera');
        setSnapbackPattern('none');
        setIsReanalyzing(false);
        setStats({
            wins: 0, losses: 0, totalProfit: 0,
            currentStake: config.stake, martingaleLevel: 0,
            switchRate: 50, snapbacksTriggered: 0,
            cycleResets: 0, signalsTriggered: 0,
        });
        setLogs([]);

        setActiveBot('Bug Deriv [Chameleon]');

        addLog(`🦎 CHAMELEON ADAPTIVE MODE ATIVADO`, 'mode');
        addLog(`📊 Análise de Ciclo: ${CHAMELEON_CONFIG.HISTORY_SIZE} ticks`, 'info');
        addLog(`🏓 Ping-Pong: >${CHAMELEON_CONFIG.PING_PONG_THRESHOLD}% | 🚂 Sequência: <${CHAMELEON_CONFIG.SEQUENCIA_THRESHOLD}%`, 'info');
        addLog(`🛡️ Martingale: x${CHAMELEON_CONFIG.MARTINGALE_FACTOR} | Reanálise: ${CHAMELEON_CONFIG.CONSECUTIVE_LOSS_FOR_REANALYSIS} losses`, 'info');

        socket.send(JSON.stringify({ ticks: CHAMELEON_CONFIG.SYMBOL, subscribe: 1 }));
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
        switchRate,
        currentMode,
        snapbackPattern,
        lastParity,
        isReanalyzing,
        chameleonConfig: CHAMELEON_CONFIG,
        startBot,
        stopBot,
    };
};
