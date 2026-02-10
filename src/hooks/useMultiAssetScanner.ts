import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// Import shared types from worker types
import type {
    ScannerSymbol, AssetState, AssetScore, ScannerConfig, ScannerStats, LogEntry,
    WorkerCommand, WorkerEvent,
} from '../workers/scannerWorkerTypes';
import { SCANNER_SYMBOLS, SYMBOL_NAMES, ANOMALY_CONFIG } from '../workers/scannerWorkerTypes';

// Re-export types and constants for consumers
export type { ScannerSymbol, AssetState, AssetScore, ScannerConfig, ScannerStats, LogEntry };
export { SCANNER_SYMBOLS };

// ============================================
// THE BUG DERIV SCANNER v4.0
// Web Worker Thin Shell — Main Thread UI Only
// ============================================

const createInitialAssetState = (symbol: ScannerSymbol): AssetState => ({
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
});

export const useMultiAssetScanner = () => {
    const { account, token } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();

    // Worker ref
    const workerRef = useRef<Worker | null>(null);

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
        wins: 0, losses: 0, totalProfit: 0, currentStake: 0,
        consecutiveLosses: 0, cycleProfit: 0, cycleCount: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isWarmingUp, setIsWarmingUp] = useState(true);
    const [warmUpProgress, setWarmUpProgress] = useState(0);

    // Cooldown & Cycle Protection
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [cooldownTime, setCooldownTime] = useState(0);
    const [cooldownReason, setCooldownReason] = useState<'profit' | 'loss' | null>(null);

    // Anomaly Detection
    const [isAnomalyDetected, setIsAnomalyDetected] = useState(false);
    const [currentAutocorr, setCurrentAutocorr] = useState<number>(0);

    // Network Diagnostics
    const [wsLatency, setWsLatency] = useState<number>(0);
    const [tradeLatency, setTradeLatency] = useState<number>(0);
    const [desyncCount, setDesyncCount] = useState<number>(0);
    const [lastDesyncInfo, setLastDesyncInfo] = useState<string | null>(null);
    const [serverDrift, setServerDrift] = useState<number>(0);
    const [staleTicks, setStaleTicks] = useState<number>(0);
    const [avgExecTime, setAvgExecTime] = useState<number>(0);

    // HFT v4.0 States
    const [isNetworkStressed, setIsNetworkStressed] = useState(false);
    const [networkJitter, setNetworkJitter] = useState(0);
    const [isOrbitMode, setIsOrbitMode] = useState(false);
    const [priorityOrder, setPriorityOrder] = useState<ScannerSymbol[]>([...SCANNER_SYMBOLS]);

    // Refs for stake management
    const configRef = useRef<ScannerConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const currentStakeRef = useRef<number>(0);
    const consecutiveLossesRef = useRef<number>(0);
    const sorosLevelRef = useRef<number>(0);
    const totalProfitRef = useRef<number>(0);
    const cycleProfitRef = useRef<number>(0);
    const cycleCountRef = useRef<number>(0);
    const isCoolingDownRef = useRef<boolean>(false);

    // Keep refs in sync
    useEffect(() => { isCoolingDownRef.current = isCoolingDown; }, [isCoolingDown]);
    const isOrbitModeRef = useRef<boolean>(false);
    useEffect(() => { isOrbitModeRef.current = isOrbitMode; }, [isOrbitMode]);

    // Helper to add log
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info', symbol?: ScannerSymbol) => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message, type, symbol,
        };
        setLogs(prev => [...prev.slice(-100), newLog]);
    }, []);

    // Send command to worker
    const sendToWorker = useCallback((cmd: WorkerCommand) => {
        if (workerRef.current) {
            workerRef.current.postMessage(cmd);
        }
    }, []);

    // ============================================
    // COOLDOWN SYSTEM (stays in main thread)
    // ============================================
    const startCooldown = useCallback((reason: 'profit' | 'loss') => {
        const baseDuration = configRef.current?.cooldownDuration || 60;
        const duration = baseDuration + Math.floor(Math.random() * 30);

        console.log(`🧊 COOLDOWN TRIGGERED: ${reason} - ${duration}s`);

        setIsCoolingDown(true);
        setCooldownTime(duration);
        setCooldownReason(reason);

        cycleProfitRef.current = 0;
        consecutiveLossesRef.current = 0;
        sorosLevelRef.current = 0;
        currentStakeRef.current = initialStakeRef.current;
        cycleCountRef.current += 1;

        // Tell worker to pause
        sendToWorker({ type: 'PAUSE' });

        const logMsg = reason === 'profit'
            ? `🏦 Meta de lucro atingida! Resfriando ${duration}s...`
            : `🛡️ Proteção ativada (${configRef.current?.maxConsecutiveLosses || 2} losses). Resfriando ${duration}s...`;
        addLog(logMsg, reason === 'profit' ? 'gold' : 'warning');
    }, [addLog, sendToWorker]);

    // Cooldown Timer
    useEffect(() => {
        if (!isCoolingDown || cooldownTime <= 0) return;

        const interval = setInterval(() => {
            setCooldownTime(prev => {
                if (prev <= 1) {
                    console.log('✅ COOLDOWN FINISHED: Resuming operations');
                    isCoolingDownRef.current = false;
                    setIsCoolingDown(false);
                    setCooldownReason(null);
                    setIsWarmingUp(true);
                    setWarmUpProgress(0);

                    // Resume worker
                    sendToWorker({ type: 'RESUME' });
                    // Update stake in worker
                    sendToWorker({ type: 'UPDATE_STAKE', stake: initialStakeRef.current });

                    addLog('🚀 Resfriamento completo! Reiniciando análise...', 'success');
                    addLog('⏳ Calibrando sistema...', 'info');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isCoolingDown, cooldownTime, addLog, sendToWorker]);

    // ============================================
    // WORKER EVENT HANDLER
    // ============================================
    const handleWorkerMessage = useCallback((event: MessageEvent<WorkerEvent>) => {
        const msg = event.data;

        switch (msg.type) {
            case 'TICK_UPDATE':
                setAssetStates(msg.states);
                setPriorityOrder(msg.priorityOrder);
                // Update leader
                if (msg.priorityOrder.length > 0) {
                    setLeaderAsset(msg.priorityOrder[0]);
                }
                break;

            case 'TRADE_OPENED':
                setActiveAsset(msg.symbol);
                setOpportunityMessage(`🎯 Oportunidad en ${SYMBOL_NAMES[msg.symbol]} (Score: ${msg.score})`);
                break;

            case 'TRADE_RESULT': {
                const { profit, isWin, symbol } = msg;

                setActiveAsset(null);
                setOpportunityMessage(null);
                updateStats(profit, isWin);

                if (isWin) {
                    consecutiveLossesRef.current = 0;

                    // Soros logic
                    const useSoros = configRef.current?.useSoros;
                    const maxSoros = configRef.current?.maxSorosLevels || 1;

                    if (useSoros) {
                        if (sorosLevelRef.current < maxSoros) {
                            sorosLevelRef.current += 1;
                            const nextStake = parseFloat((currentStakeRef.current + profit).toFixed(2));
                            currentStakeRef.current = nextStake;
                            sendToWorker({ type: 'UPDATE_STAKE', stake: nextStake });
                            addLog(`🚀 SOROS NIVEL ${sorosLevelRef.current}: Apostando Ganancia ($${nextStake})`, 'gold');
                        } else {
                            sorosLevelRef.current = 0;
                            currentStakeRef.current = initialStakeRef.current;
                            sendToWorker({ type: 'UPDATE_STAKE', stake: initialStakeRef.current });
                            addLog(`🏆 CICLO SOROS COMPLETADO (${maxSoros} Niveles): Retorno a base ($${currentStakeRef.current})`, 'success');
                        }
                    } else {
                        currentStakeRef.current = initialStakeRef.current;
                        sendToWorker({ type: 'UPDATE_STAKE', stake: initialStakeRef.current });
                    }

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: currentStakeRef.current,
                        consecutiveLosses: 0,
                        cycleProfit: cycleProfitRef.current + profit,
                        cycleCount: cycleCountRef.current,
                    }));

                    // Profit target check
                    cycleProfitRef.current += profit;
                    const profitTarget = configRef.current?.profitTarget || 3.0;
                    if (cycleProfitRef.current >= profitTarget) {
                        addLog(`🎯 Lucro do ciclo: $${cycleProfitRef.current.toFixed(2)} (meta: $${profitTarget})`, 'gold');
                        startCooldown('profit');
                        break;
                    }
                } else {
                    const lossAmount = Math.abs(profit);
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
                            sendToWorker({ type: 'UPDATE_STAKE', stake: initialStakeRef.current });
                        } else {
                            sorosLevelRef.current = 0;
                            const factor = configRef.current?.martingaleFactor || 2.5;
                            const newStake = parseFloat((currentStakeRef.current * factor).toFixed(2));
                            currentStakeRef.current = newStake;
                            sendToWorker({ type: 'UPDATE_STAKE', stake: newStake });
                            addLog(`📈 Gale Nivel ${consecutiveLossesRef.current} (x${factor}): $${newStake.toFixed(2)}`, 'warning');
                        }

                        // Loss protection check
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
                            break;
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

                // TP/SL check
                if (configRef.current) {
                    if (totalProfitRef.current >= configRef.current.takeProfit) {
                        toast.success('¡Meta alcanzada!');
                        stopScanner();
                    } else if (totalProfitRef.current <= -configRef.current.stopLoss) {
                        toast.error('Stop Loss activado');
                        stopScanner();
                    }
                }
                break;
            }

            case 'LOG':
                setLogs(prev => [...prev.slice(-100), msg.entry]);
                break;

            case 'NETWORK_STATUS':
                setWsLatency(msg.latency);
                setServerDrift(msg.drift);
                setNetworkJitter(msg.jitter);
                setIsNetworkStressed(msg.isStressed);
                setStaleTicks(msg.staleTicks);

                if (msg.isOrbitMode !== isOrbitModeRef.current) {
                    setIsOrbitMode(msg.isOrbitMode);
                    if (msg.isOrbitMode) {
                        toast.warning('⚠️ Sincronizando Órbita (Alta Latencia)');
                        addLog('🪐 MODO ÓRBITA ACTIVADO: Drift > 400ms. Ajustando disparo a T+1.', 'warning');
                    } else {
                        toast.success('✅ Órbita Estable');
                        addLog('🌍 MODO PULSO RESTAURADO: Latencia normalizada.', 'success');
                    }
                }
                break;

            case 'WARMUP_PROGRESS':
                setWarmUpProgress(msg.progress);
                if (msg.isReady && isWarmingUp) {
                    setIsWarmingUp(false);
                    setWarmUpProgress(100);
                }
                break;

            case 'ANOMALY_UPDATE':
                setIsAnomalyDetected(msg.isDetected);
                setCurrentAutocorr(msg.autocorr);
                break;

            case 'DESYNC':
                setDesyncCount(prev => prev + 1);
                setLastDesyncInfo(`Señal: ${msg.signalDigit} → Ejecución: ${msg.executionDigit} (${msg.symbol})`);
                break;

            case 'TRADE_LATENCY':
                setTradeLatency(msg.latencyMs);
                break;

            case 'EXEC_TIME':
                setAvgExecTime(msg.avgMs);
                break;

            case 'ERROR':
                console.error('[WORKER ERROR]', msg.message, msg.code);
                break;

            case 'WS_CONNECTED':
                console.log('✅ [MAIN] Worker WebSocket connected');
                break;

            case 'WS_DISCONNECTED':
                console.warn('⚠️ [MAIN] Worker WebSocket disconnected');
                break;

            case 'SYMBOL_RECONNECTED':
                console.log(`🔄 [MAIN] ${msg.symbol} re-subscribed by worker`);
                break;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addLog, sendToWorker, startCooldown, updateStats, isWarmingUp, stats.totalProfit]);

    // stopScanner needs to be defined for use in handleWorkerMessage
    const stopScanner = useCallback(() => {
        sendToWorker({ type: 'STOP' });

        // Terminate worker
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }

        setActiveBot(null);
        addLog('🛑 Scanner detenido', 'warning');
        setIsRunning(false);
        setIsWarmingUp(false);
        setActiveAsset(null);
        setLeaderAsset(null);
        setOpportunityMessage(null);
    }, [addLog, setActiveBot, sendToWorker]);

    // ============================================
    // BUFFER FLUSH (for external use)
    // ============================================
    const flushBuffers = useCallback((reason: string) => {
        // Reset local UI state
        setAssetStates(() => {
            const cleared: Record<string, AssetState> = {};
            SCANNER_SYMBOLS.forEach(sym => {
                cleared[sym] = createInitialAssetState(sym);
            });
            return cleared as Record<ScannerSymbol, AssetState>;
        });
        setIsAnomalyDetected(false);
        addLog(`🧹 Buffers limpiados: ${reason}`, 'warning');
    }, [addLog]);

    // ============================================
    // START SCANNER
    // ============================================
    const startScanner = useCallback((config: ScannerConfig) => {
        if (!account?.loginid) {
            toast.error('Conecte a Deriv primero');
            return false;
        }

        // Get token: prefer context token, fallback to localStorage
        const storedToken = token || localStorage.getItem('deriv_active_token');
        if (!storedToken) {
            toast.error('Token de Deriv no encontrado. Reconecte.');
            return false;
        }

        // Reset state
        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        consecutiveLossesRef.current = 0;
        totalProfitRef.current = 0;
        sorosLevelRef.current = 0;
        cycleProfitRef.current = 0;
        cycleCountRef.current = 0;

        // Reset asset states
        const resetStates: Record<string, AssetState> = {};
        SCANNER_SYMBOLS.forEach(symbol => {
            resetStates[symbol] = createInitialAssetState(symbol);
        });
        setAssetStates(resetStates as Record<ScannerSymbol, AssetState>);

        setStats({
            wins: 0, losses: 0, totalProfit: 0, currentStake: config.stake,
            consecutiveLosses: 0, cycleProfit: 0, cycleCount: 0,
        });
        setLogs([]);
        setActiveAsset(null);
        setLeaderAsset(null);
        setOpportunityMessage(null);
        setIsWarmingUp(true);
        setWarmUpProgress(0);
        setIsCoolingDown(false);
        setCooldownTime(0);
        setCooldownReason(null);
        setIsNetworkStressed(false);
        setNetworkJitter(0);
        setStaleTicks(0);
        setServerDrift(0);

        // Terminate any existing worker
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }

        // Create Web Worker
        const worker = new Worker(
            new URL('../workers/scannerWorker.ts', import.meta.url),
            { type: 'module' }
        );
        workerRef.current = worker;

        // Listen to worker messages
        worker.onmessage = handleWorkerMessage;
        worker.onerror = (err) => {
            console.error('❌ [WORKER ERROR]', err);
            addLog('❌ Error crítico en Worker. Deteniendo...', 'error');
            stopScanner();
        };

        setActiveBot('Bug Deriv Scanner');
        setIsRunning(true);

        // Derive WebSocket URL and currency
        const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=1089`;
        const rawCurrency = account?.currency;
        const cur = (rawCurrency && rawCurrency !== '...' && rawCurrency !== '') ? rawCurrency : 'USD';

        // Send START command to worker
        const startCmd: WorkerCommand = {
            type: 'START',
            config,
            wsUrl,
            authToken: storedToken,
            currency: cur,
        };
        worker.postMessage(startCmd);

        return true;
    }, [account, addLog, handleWorkerMessage, setActiveBot, stopScanner]);

    // Scanning Feedback Loop (Dopamine for waiting)
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            if (activeAsset) return;

            const randomSym = SCANNER_SYMBOLS[Math.floor(Math.random() * SCANNER_SYMBOLS.length)];
            const state = assetStates[randomSym];
            const currentScore = state?.score?.total || 0;
            const targetScore = configRef.current?.minScore || 75;

            if (currentScore > 30) {
                const msgs = [
                    `🔎 Escaneando ${state.displayName}... Score ${currentScore}% (Buscando >${targetScore}%)`,
                    `📊 Análisis V${state.displayName.split('V')[1]}: ${currentScore}% - Calculando entrada...`,
                    `⚡ ${state.displayName}: Volatilidad detectada. Score ${currentScore}%`,
                    `🔄 Sincronizando ${state.displayName}...`,
                ];
                if (Math.random() > 0.7) {
                    addLog(msgs[Math.floor(Math.random() * msgs.length)], 'info');
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [isRunning, activeAsset, addLog, assetStates]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'STOP' });
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

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

        // Anomaly Detection States v3.0
        isAnomalyDetected,
        currentAutocorr,

        // DIAGNOSTIC States v1.0
        wsLatency,
        tradeLatency,
        desyncCount,
        lastDesyncInfo,

        // ATOMIC SYNC States v1.0
        serverDrift,
        staleTicks,

        // ATOMIC PULSE States v2.0
        avgExecTime,

        // HFT v4.0 States
        isNetworkStressed,
        networkJitter,
        isOrbitMode,
        priorityOrder,

        // Actions
        startScanner,
        stopScanner,
        addLog,
        flushBuffers,

        // Constants
        SCANNER_SYMBOLS,
        SYMBOL_NAMES,
        ANOMALY_CONFIG,
    };
};
