import { useState, useCallback, useRef, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { toast } from 'sonner';

// ============================================================================
// VACUUM CRASH - Gap Analysis Strategy for CRASH 500 Accumulators
// Based on: Interval Distribution Analysis (Quantitative Approach)
// ============================================================================

interface CrashEvent {
    timestamp: number;
    tickIndex: number;
    priceChange: number;
}

interface VacuumStats {
    // Core Statistics
    lastCrashTicksAgo: number;
    percentile10: number;
    safeWindow: number;
    targetTicks: number;

    // Histogram Data (for UI)
    intervalHistogram: { interval: number; frequency: number }[];

    // Session Stats
    wins: number;
    losses: number;
    totalProfit: number;

    // Status
    isInPosition: boolean;
    ticksSinceEntry: number;
    currentZone: 'safe' | 'caution' | 'danger';
    status: 'hunting' | 'in_position' | 'waiting' | 'idle';
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'crash' | 'entry' | 'exit';
}

interface VacuumConfig {
    stake: number;
    growthRate: number; // 3 or 5 (%)
    stopLoss: number;
    stopWin: number; // Stop when profit reaches this amount
    emergencyStopLoss: number; // For black swan events
}

const CRASH_THRESHOLD = -3; // Points drop to classify as "Crash"
const HISTORY_SIZE = 50; // Number of crash events to keep
const MIN_SAFE_INTERVAL = 5; // Minimum ticks for safe window calculation

export const useVacuumCrash = () => {
    const { api, isConnected, account } = useDeriv();

    // State
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<VacuumStats>({
        lastCrashTicksAgo: 0,
        percentile10: 0,
        safeWindow: 0,
        targetTicks: 0,
        intervalHistogram: [],
        wins: 0,
        losses: 0,
        totalProfit: 0,
        isInPosition: false,
        ticksSinceEntry: 0,
        currentZone: 'safe',
        status: 'idle',
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Refs for real-time data (to avoid stale closures)
    const crashHistoryRef = useRef<CrashEvent[]>([]);
    const tickCounterRef = useRef(0);
    const lastTickPriceRef = useRef<number | null>(null);
    const entryTickRef = useRef<number>(0);
    const contractIdRef = useRef<string | null>(null);
    const configRef = useRef<VacuumConfig | null>(null);
    const subscriptionIdRef = useRef<string | null>(null);

    // Refs for avoiding stale state in callbacks
    const isRunningRef = useRef(false);
    const isInPositionRef = useRef(false);
    const targetTicksRef = useRef(0);
    const totalProfitRef = useRef(0);

    // Refs for callback functions (to avoid circular dependencies)
    const triggerEntryRef = useRef<() => void>(() => { });
    const triggerExitRef = useRef<(reason: 'target' | 'emergency' | 'manual' | 'stopwin') => void>(() => { });

    // Keep refs in sync with state
    useEffect(() => {
        isRunningRef.current = isRunning;
    }, [isRunning]);

    useEffect(() => {
        isInPositionRef.current = stats.isInPosition;
        targetTicksRef.current = stats.targetTicks;
        totalProfitRef.current = stats.totalProfit;
    }, [stats.isInPosition, stats.targetTicks, stats.totalProfit]);

    // Add log entry
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const now = new Date();
        const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newLog: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            time,
            message,
            type,
        };
        setLogs(prev => [newLog, ...prev.slice(0, 99)]);
    }, []);

    // Calculate percentile from array
    const getPercentile = useCallback((arr: number[], percentile: number): number => {
        if (arr.length === 0) return MIN_SAFE_INTERVAL;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)] || MIN_SAFE_INTERVAL;
    }, []);

    // Build histogram from intervals
    const buildHistogram = useCallback((intervals: number[]): { interval: number; frequency: number }[] => {
        if (intervals.length === 0) return [];

        const freqMap = new Map<number, number>();
        intervals.forEach(interval => {
            // Group into buckets of 5
            const bucket = Math.floor(interval / 5) * 5;
            freqMap.set(bucket, (freqMap.get(bucket) || 0) + 1);
        });

        return Array.from(freqMap.entries())
            .map(([interval, frequency]) => ({ interval, frequency }))
            .sort((a, b) => a.interval - b.interval);
    }, []);

    // Calculate intervals between crashes
    const calculateIntervals = useCallback((): number[] => {
        const crashes = crashHistoryRef.current;
        if (crashes.length < 2) return [];

        const intervals: number[] = [];
        for (let i = 1; i < crashes.length; i++) {
            const interval = crashes[i].tickIndex - crashes[i - 1].tickIndex;
            if (interval > 0) intervals.push(interval);
        }
        return intervals;
    }, []);

    // Update statistics
    const updateStats = useCallback(() => {
        const intervals = calculateIntervals();
        const p10 = getPercentile(intervals, 10);
        const safeWindow = Math.max(MIN_SAFE_INTERVAL, p10);
        const targetTicks = Math.floor(safeWindow / 2);

        const lastCrash = crashHistoryRef.current[crashHistoryRef.current.length - 1];
        const lastCrashTicksAgo = lastCrash ? tickCounterRef.current - lastCrash.tickIndex : 0;

        // Determine zone
        let currentZone: 'safe' | 'caution' | 'danger' = 'safe';
        if (lastCrashTicksAgo < safeWindow * 0.3) {
            currentZone = 'safe'; // Just after crash - safest
        } else if (lastCrashTicksAgo < safeWindow * 0.7) {
            currentZone = 'caution';
        } else {
            currentZone = 'danger'; // Approaching statistical crash zone
        }

        setStats(prev => ({
            ...prev,
            lastCrashTicksAgo,
            percentile10: p10,
            safeWindow,
            targetTicks,
            intervalHistogram: buildHistogram(intervals),
            currentZone,
        }));
    }, [calculateIntervals, getPercentile, buildHistogram]);

    // Handle tick data
    const handleTick = useCallback((tick: { quote: number; epoch: number }) => {
        // Use refs to avoid stale closures
        if (!isRunningRef.current) return;

        tickCounterRef.current++;
        const currentPrice = tick.quote;
        const prevPrice = lastTickPriceRef.current;
        lastTickPriceRef.current = currentPrice;

        if (prevPrice === null) return;

        const priceChange = currentPrice - prevPrice;

        // Detect Crash Event
        if (priceChange <= CRASH_THRESHOLD) {
            const crashEvent: CrashEvent = {
                timestamp: tick.epoch * 1000,
                tickIndex: tickCounterRef.current,
                priceChange,
            };

            crashHistoryRef.current.push(crashEvent);
            if (crashHistoryRef.current.length > HISTORY_SIZE) {
                crashHistoryRef.current.shift();
            }

            addLog(`💥 CRASH DETECTADO: ${priceChange.toFixed(2)} pts`, 'crash');

            // If not in position, this is our entry signal! (use ref to avoid circular dependency)
            if (!isInPositionRef.current && configRef.current) {
                triggerEntryRef.current();
            }
        }

        // Update position tracking
        if (isInPositionRef.current) {
            const ticksSinceEntry = tickCounterRef.current - entryTickRef.current;
            setStats(prev => ({ ...prev, ticksSinceEntry }));

            // Check if we reached target ticks for exit (use ref to avoid circular dependency)
            if (ticksSinceEntry >= targetTicksRef.current && targetTicksRef.current > 0) {
                triggerExitRef.current('target');
            }
        }

        updateStats();
    }, [addLog, updateStats]);

    // Trigger entry (buy accumulator)
    const triggerEntry = useCallback(async () => {
        if (!api || !configRef.current || stats.isInPosition) return;

        try {
            addLog(`🎯 ENTRANDO: Comprando Accumulator (${configRef.current.growthRate}%)`, 'entry');
            setStats(prev => ({ ...prev, isInPosition: true, ticksSinceEntry: 0, status: 'in_position' }));
            entryTickRef.current = tickCounterRef.current;

            // Buy Accumulator Contract
            const buyResponse = await api.send({
                buy: 1,
                price: configRef.current.stake,
                parameters: {
                    contract_type: 'ACCU',
                    symbol: 'CRASH500',
                    currency: account?.currency || 'USD',
                    growth_rate: configRef.current.growthRate / 100, // API expects decimal
                    basis: 'stake',
                    amount: configRef.current.stake,
                },
            });

            if (buyResponse.error) {
                throw new Error(buyResponse.error.message);
            }

            contractIdRef.current = buyResponse.buy?.contract_id || null;
            addLog(`✅ Contrato abierto: ID ${contractIdRef.current}`, 'success');
            toast.success('Accumulator Comprado', { description: `Objetivo: ${stats.targetTicks} ticks` });

        } catch (error: any) {
            addLog(`❌ Error al comprar: ${error.message}`, 'error');
            setStats(prev => ({ ...prev, isInPosition: false, status: 'hunting' }));
            toast.error('Error al comprar', { description: error.message });
        }
    }, [api, account, stats.isInPosition, stats.targetTicks, addLog]);

    // Keep triggerEntryRef in sync
    useEffect(() => {
        triggerEntryRef.current = triggerEntry;
    }, [triggerEntry]);

    // Check Stop Win condition
    const checkStopWin = useCallback((newTotalProfit: number) => {
        const config = configRef.current;
        if (config && config.stopWin > 0 && newTotalProfit >= config.stopWin) {
            addLog(`🏆 STOP WIN ALCANZADO: $${newTotalProfit.toFixed(2)}`, 'success');
            toast.success('¡Stop Win Alcanzado!', { description: `Lucro objetivo: $${config.stopWin.toFixed(2)}` });
            return true;
        }
        return false;
    }, [addLog]);

    // Trigger exit (sell contract)
    const triggerExit = useCallback(async (reason: 'target' | 'emergency' | 'manual' | 'stopwin') => {
        if (!api || !contractIdRef.current) {
            setStats(prev => ({ ...prev, isInPosition: false, status: 'hunting' }));
            return;
        }

        try {
            const reasonText = reason === 'target' ? 'Objetivo alcanzado' :
                reason === 'emergency' ? 'EMERGENCIA' :
                    reason === 'stopwin' ? 'STOP WIN' : 'Manual';
            addLog(`📤 SALIENDO: ${reasonText}`, 'exit');

            // Sell contract
            const sellResponse = await api.send({
                sell: contractIdRef.current,
                price: 0, // Market price
            });

            if (sellResponse.error) {
                throw new Error(sellResponse.error.message);
            }

            const profit = sellResponse.sell?.sold_for - (configRef.current?.stake || 0);
            const newTotalProfit = totalProfitRef.current + profit;

            setStats(prev => ({
                ...prev,
                isInPosition: false,
                ticksSinceEntry: 0,
                status: 'hunting',
                wins: profit > 0 ? prev.wins + 1 : prev.wins,
                losses: profit <= 0 ? prev.losses + 1 : prev.losses,
                totalProfit: newTotalProfit,
            }));

            contractIdRef.current = null;

            if (profit > 0) {
                addLog(`💰 GANANCIA: +$${profit.toFixed(2)}`, 'success');
                toast.success('¡Operación Ganadora!', { description: `+$${profit.toFixed(2)}` });
            } else {
                addLog(`📉 PÉRDIDA: -$${Math.abs(profit).toFixed(2)}`, 'error');
                toast.error('Operación Perdedora', { description: `-$${Math.abs(profit).toFixed(2)}` });
            }

            // Check if Stop Win was reached
            if (checkStopWin(newTotalProfit)) {
                // Stop the bot
                setTimeout(() => stopBot(), 100);
            }

        } catch (error: any) {
            addLog(`❌ Error al vender: ${error.message}`, 'error');
            setStats(prev => ({ ...prev, isInPosition: false, status: 'hunting' }));
        }
    }, [api, addLog, checkStopWin]);

    // Keep triggerExitRef in sync
    useEffect(() => {
        triggerExitRef.current = triggerExit;
    }, [triggerExit]);

    // Start bot
    const startBot = useCallback(async (config: VacuumConfig) => {
        if (!api || !isConnected) {
            toast.error('Conexión requerida', { description: 'Conecte su cuenta Deriv primero' });
            return;
        }

        configRef.current = config;
        crashHistoryRef.current = [];
        tickCounterRef.current = 0;
        lastTickPriceRef.current = null;
        isRunningRef.current = true;
        isInPositionRef.current = false;
        totalProfitRef.current = 0;

        setIsRunning(true);
        setStats(prev => ({ ...prev, status: 'hunting', wins: 0, losses: 0, totalProfit: 0 }));
        setLogs([]);

        addLog('🚀 VACUUM CRASH iniciado', 'info');
        addLog(`📊 Config: Stake $${config.stake}, Growth ${config.growthRate}%`, 'info');
        if (config.stopWin > 0) {
            addLog(`🏆 Stop Win: $${config.stopWin}`, 'info');
        }

        try {
            // Subscribe to CRASH 500 ticks
            const response = await api.send({
                ticks: 'CRASH500',
                subscribe: 1,
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            subscriptionIdRef.current = response.subscription?.id || null;
            addLog('📡 Conectado a CRASH 500 tick stream', 'success');

        } catch (error: any) {
            addLog(`❌ Error al suscribir: ${error.message}`, 'error');
            setIsRunning(false);
            isRunningRef.current = false;
            toast.error('Error de conexión', { description: error.message });
        }
    }, [api, isConnected, addLog]);

    // Stop bot
    const stopBot = useCallback(async () => {
        isRunningRef.current = false;
        setIsRunning(false);
        setStats(prev => ({ ...prev, status: 'idle', isInPosition: false }));

        // Unsubscribe from ticks
        if (api && subscriptionIdRef.current) {
            try {
                await api.send({ forget: subscriptionIdRef.current });
            } catch (e) {
                console.warn('Error unsubscribing:', e);
            }
            subscriptionIdRef.current = null;
        }

        // Close any open position
        if (contractIdRef.current) {
            await triggerExit('manual');
        }

        addLog('⏹️ VACUUM CRASH detenido', 'info');
        configRef.current = null;
        isInPositionRef.current = false;
    }, [api, addLog, triggerExit]);

    // Listen for tick updates from Deriv API
    useEffect(() => {
        if (!api) return;

        const handleMessage = (data: any) => {
            // Only process if bot is running (using ref to avoid stale closure)
            if (!isRunningRef.current) return;

            if (data.msg_type === 'tick' && data.tick) {
                handleTick(data.tick);
            }

            // Handle contract updates
            if (data.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract?.is_sold || contract?.is_expired) {
                    // Contract closed externally
                    if (isInPositionRef.current) {
                        const profit = (contract.sell_price || 0) - (contract.buy_price || 0);
                        const newTotalProfit = totalProfitRef.current + profit;

                        setStats(prev => ({
                            ...prev,
                            isInPosition: false,
                            ticksSinceEntry: 0,
                            status: 'hunting',
                            wins: profit > 0 ? prev.wins + 1 : prev.wins,
                            losses: profit <= 0 ? prev.losses + 1 : prev.losses,
                            totalProfit: newTotalProfit,
                        }));
                        contractIdRef.current = null;
                        isInPositionRef.current = false;

                        if (profit > 0) {
                            addLog(`💰 CONTRATO CERRADO: +$${profit.toFixed(2)}`, 'success');
                        } else {
                            addLog(`📉 CONTRATO CERRADO: -$${Math.abs(profit).toFixed(2)}`, 'error');
                        }

                        // Check Stop Win
                        if (checkStopWin(newTotalProfit)) {
                            setTimeout(() => stopBot(), 100);
                        }
                    }
                }
            }
        };

        // Subscribe to messages
        const unsubscribe = api.onMessage(handleMessage);

        return () => {
            unsubscribe();
        };
    }, [api, handleTick, addLog, checkStopWin, stopBot]);

    // Manual exit
    const manualExit = useCallback(() => {
        if (stats.isInPosition) {
            triggerExit('manual');
        }
    }, [stats.isInPosition, triggerExit]);

    return {
        isRunning,
        stats,
        logs,
        startBot,
        stopBot,
        manualExit,
    };
};
