// ============================================
// useBotAstron — React Hook for QUANT SHIELD v5.0
// ============================================
// Bridges the Web Worker (scannerWorker.ts) with AstronPanel UI.
// Manages: Soros, Martingale, Bóveda Inteligente, Cooldown, TP/SL.

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';
import type {
    WorkerEvent, ScannerConfig, ScannerSymbol, AssetState,
} from '../workers/scannerWorkerTypes';
import {
    SCANNER_SYMBOLS as SYMBOLS,
    SYMBOL_NAMES as NAMES,
} from '../workers/scannerWorkerTypes';

// Re-export types for AstronPanel
export type { ScannerSymbol, AssetState };
export type { LogEntry } from '../workers/scannerWorkerTypes';

// ============================================
// STATS INTERFACE (matches AstronPanel usage)
// ============================================
export interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    consecutiveLosses: number;
    consecutiveWins: number;
    lastProfit: number;
    // Soros
    sorosLevel: number;
    // Bóveda Inteligente
    vaultAccumulated: number;
    vaultCount: number;
}

// ============================================
// START CONFIG (from AstronPanel)
// ============================================
interface StartConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    useMartingale: boolean;
    maxMartingaleLevel: number;
    martingaleFactor: number;
    autoSwitchEnabled: boolean;
    minScore: number;
    profitTarget: number;
    maxConsecutiveLosses: number;
    anomalyOnlyMode: boolean;
    // Optional Soros
    useSoros?: boolean;
    maxSorosLevels?: number;
}

// ============================================
// HOOK
// ============================================
export const useBotAstron = () => {
    const { socket, isConnected, account } = useDeriv();
    const { updateStats: updateSessionStats, setActiveBot } = useTradingSession();

    // Worker ref
    const workerRef = useRef<Worker | null>(null);

    // Bot state
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0,
        consecutiveLosses: 0,
        consecutiveWins: 0,
        lastProfit: 0,
        sorosLevel: 0,
        vaultAccumulated: 0,
        vaultCount: 0,
    });
    const [logs, setLogs] = useState<WorkerEvent extends { type: 'LOG'; entry: infer E } ? E[] : never[]>([]);
    const [recentTicks, setRecentTicks] = useState<number[]>([]);

    // Multi-asset state
    const [assetStates, setAssetStates] = useState<Record<ScannerSymbol, AssetState>>({} as any);
    const [activeAsset, setActiveAsset] = useState<ScannerSymbol | null>(null);
    const [leaderAsset, setLeaderAsset] = useState<ScannerSymbol | null>(null);
    const [opportunityMessage, setOpportunityMessage] = useState<string>('');

    // Warmup
    const [isWarmingUp, setIsWarmingUp] = useState(false);
    const [warmUpProgress, setWarmUpProgress] = useState(0);

    // Cooldown
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [cooldownTime, setCooldownTime] = useState(0);
    const [cooldownReason, setCooldownReason] = useState<string>('');
    const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Anomaly (calm regime detection)
    const [isAnomalyDetected, setIsAnomalyDetected] = useState(false);
    const [currentAutocorr, setCurrentAutocorr] = useState(0);

    // Refs for risk management (mutable without re-render)
    const configRef = useRef<StartConfig | null>(null);
    const initialStakeRef = useRef(0);
    const currentStakeRef = useRef(0);
    const totalProfitRef = useRef(0);
    const consecutiveLossesRef = useRef(0);
    const consecutiveWinsRef = useRef(0);
    const sorosLevelRef = useRef(0);
    const vaultAccumulatedRef = useRef(0);
    const vaultCountRef = useRef(0);
    const isRunningRef = useRef(false);

    // ============================================
    // ADD LOG
    // ============================================
    const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' | 'gold' = 'info') => {
        setLogs(prev => [...prev.slice(-150), {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
        }]);
    }, []);

    // ============================================
    // STOP BOT
    // ============================================
    const stopBot = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'STOP' });
            workerRef.current.terminate();
            workerRef.current = null;
        }

        if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
        }

        setIsRunning(false);
        isRunningRef.current = false;
        setIsCoolingDown(false);
        setCooldownTime(0);
        setIsWarmingUp(false);
        setActiveAsset(null);
        setActiveBot(null);

        if (vaultAccumulatedRef.current > 0) {
            addLog(`🏦 BÓVEDA FINAL: $${vaultAccumulatedRef.current.toFixed(2)} protegidos en ${vaultCountRef.current} depósitos`, 'gold');
        }
        addLog('🛑 Quant Shield detenido', 'warning');
    }, [addLog, setActiveBot]);

    // ============================================
    // COOLDOWN SYSTEM
    // ============================================
    const startCooldown = useCallback((reason: string, durationMs: number = 60000) => {
        if (!workerRef.current || !isRunningRef.current) return;

        setIsCoolingDown(true);
        setCooldownReason(reason);
        setCooldownTime(Math.ceil(durationMs / 1000));

        // Pause worker
        workerRef.current.postMessage({ type: 'PAUSE' });
        addLog(`🧊 COOLDOWN: ${reason} — ${Math.ceil(durationMs / 1000)}s`, 'warning');

        // Countdown timer
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
        const startTime = Date.now();
        cooldownTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
            setCooldownTime(remaining);

            if (remaining <= 0) {
                if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
                setIsCoolingDown(false);
                setCooldownReason('');
                setCooldownTime(0);

                // Resume worker
                if (workerRef.current && isRunningRef.current) {
                    workerRef.current.postMessage({ type: 'RESUME' });
                    addLog('✅ Cooldown completado. Reiniciando...', 'success');

                    // Reset consecutive losses
                    consecutiveLossesRef.current = 0;
                    sorosLevelRef.current = 0;
                }
            }
        }, 1000);
    }, [addLog]);

    // ============================================
    // BÓVEDA INTELIGENTE
    // ============================================
    const processVault = useCallback((profit: number) => {
        // Accumulate 30% of each win in the vault
        if (profit > 0) {
            const vaultDeposit = profit * 0.30;
            vaultAccumulatedRef.current += vaultDeposit;
            vaultCountRef.current += 1;
            addLog(`🏦 BÓVEDA: +$${vaultDeposit.toFixed(2)} guardado (Total: $${vaultAccumulatedRef.current.toFixed(2)})`, 'gold');
        }
    }, [addLog]);

    // ============================================
    // HANDLE TRADE RESULT (Soros + Martingale + Bóveda + Cooldown)
    // ============================================
    const handleTradeResult = useCallback((profit: number, isWin: boolean, symbol: ScannerSymbol) => {
        const cfg = configRef.current;
        if (!cfg) return;

        // Update session stats
        updateSessionStats(profit, isWin);

        totalProfitRef.current += profit;

        if (isWin) {
            consecutiveLossesRef.current = 0;
            consecutiveWinsRef.current += 1;

            // === BÓVEDA INTELIGENTE ===
            processVault(profit);

            // === SOROS SYSTEM ===
            if (cfg.useSoros && sorosLevelRef.current < (cfg.maxSorosLevels || 3)) {
                // Progressive stake increase on wins
                sorosLevelRef.current += 1;
                const newStake = initialStakeRef.current * (1 + sorosLevelRef.current * 0.5);
                currentStakeRef.current = parseFloat(newStake.toFixed(2));
                addLog(`🔥 SOROS L${sorosLevelRef.current}: Stake → $${currentStakeRef.current.toFixed(2)}`, 'gold');
            } else if (cfg.useSoros && sorosLevelRef.current >= (cfg.maxSorosLevels || 3)) {
                // Max Soros reached — reset and bank profit
                sorosLevelRef.current = 0;
                currentStakeRef.current = initialStakeRef.current;
                addLog(`💰 SOROS MAX: Lucro assegurado. Reset stake → $${initialStakeRef.current.toFixed(2)}`, 'success');
            } else {
                // No Soros — reset stake on win
                currentStakeRef.current = initialStakeRef.current;
                sorosLevelRef.current = 0;
            }

            // === PROFIT TARGET COOLDOWN ===
            if (cfg.profitTarget > 0 && totalProfitRef.current >= cfg.profitTarget) {
                addLog(`🎯 META DE LUCRO atingida: $${totalProfitRef.current.toFixed(2)}`, 'gold');
                startCooldown(`Meta $${cfg.profitTarget.toFixed(2)} atingida`, 30000);
                // Reset profit tracking for next session
                totalProfitRef.current = 0;
            }

            setStats(prev => ({
                ...prev,
                wins: prev.wins + 1,
                totalProfit: prev.totalProfit + profit,
                currentStake: currentStakeRef.current,
                consecutiveLosses: 0,
                consecutiveWins: consecutiveWinsRef.current,
                lastProfit: profit,
                sorosLevel: sorosLevelRef.current,
                vaultAccumulated: vaultAccumulatedRef.current,
                vaultCount: vaultCountRef.current,
            }));

        } else {
            // LOSS
            consecutiveWinsRef.current = 0;
            consecutiveLossesRef.current += 1;
            sorosLevelRef.current = 0; // Reset Soros on loss

            // === MARTINGALE ===
            if (cfg.useMartingale && consecutiveLossesRef.current <= cfg.maxMartingaleLevel) {
                const factor = cfg.martingaleFactor || 2.0;
                const newStake = parseFloat((currentStakeRef.current * factor).toFixed(2));
                currentStakeRef.current = newStake;
                addLog(`📈 MARTINGALE x${factor}: Stake → $${newStake.toFixed(2)} (Gale ${consecutiveLossesRef.current}/${cfg.maxMartingaleLevel})`, 'warning');
            } else if (cfg.useMartingale && consecutiveLossesRef.current > cfg.maxMartingaleLevel) {
                // Max Martingale reached — reset
                currentStakeRef.current = initialStakeRef.current;
                addLog(`🛑 Max Martingale (${cfg.maxMartingaleLevel}) — Reset stake $${initialStakeRef.current.toFixed(2)}`, 'error');
            } else {
                // No Martingale — fixed stake
                currentStakeRef.current = initialStakeRef.current;
            }

            // === CONSECUTIVE LOSSES COOLDOWN ===
            if (cfg.maxConsecutiveLosses > 0 && consecutiveLossesRef.current >= cfg.maxConsecutiveLosses) {
                addLog(`💥 ${consecutiveLossesRef.current} losses consecutivas — enfriando...`, 'error');
                startCooldown(`${consecutiveLossesRef.current} losses consecutivas`, 45000);
            }

            setStats(prev => ({
                ...prev,
                losses: prev.losses + 1,
                totalProfit: prev.totalProfit + profit,
                currentStake: currentStakeRef.current,
                consecutiveLosses: consecutiveLossesRef.current,
                consecutiveWins: 0,
                lastProfit: profit,
                sorosLevel: 0,
                vaultAccumulated: vaultAccumulatedRef.current,
                vaultCount: vaultCountRef.current,
            }));
        }

        // Update worker stake
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'UPDATE_STAKE', stake: currentStakeRef.current });
        }

        // === STOP LOSS / TAKE PROFIT (absolute) ===
        const currentTotalProfit = totalProfitRef.current;
        if (cfg.takeProfit > 0 && currentTotalProfit >= cfg.takeProfit) {
            toast.success('🎉 ¡Take Profit Alcanzado!');
            addLog(`🏆 TAKE PROFIT: $${currentTotalProfit.toFixed(2)}`, 'gold');
            stopBot();
        } else if (cfg.stopLoss > 0 && currentTotalProfit <= -cfg.stopLoss) {
            toast.error('🛑 Stop Loss Atingido');
            addLog(`💀 STOP LOSS: -$${Math.abs(currentTotalProfit).toFixed(2)}`, 'error');
            stopBot();
        }
    }, [addLog, updateSessionStats, startCooldown, processVault, stopBot]);

    // ============================================
    // WORKER MESSAGE HANDLER
    // ============================================
    const handleWorkerMessage = useCallback((event: MessageEvent<WorkerEvent>) => {
        const msg = event.data;

        switch (msg.type) {
            case 'LOG':
                setLogs(prev => [...prev.slice(-150), msg.entry]);
                break;

            case 'TICK_UPDATE':
                setAssetStates(msg.states);
                if (msg.priorityOrder && msg.priorityOrder.length > 0) {
                    setLeaderAsset(msg.priorityOrder[0]);
                }

                // Track recent prices from leader for chart
                const leader = msg.priorityOrder?.[0];
                if (leader && msg.states[leader]) {
                    const price = msg.states[leader].lastPrice;
                    if (price > 0) {
                        setRecentTicks(prev => [...prev.slice(-50), price]);
                    }
                }
                break;

            case 'WARMUP_PROGRESS':
                setIsWarmingUp(!msg.isReady);
                setWarmUpProgress(msg.progress);
                break;

            case 'TRADE_OPENED':
                setActiveAsset(msg.symbol);
                setOpportunityMessage(`🛡️ ${msg.direction} ${NAMES[msg.symbol]} | Barrier: ${msg.barrierOffset}`);
                break;

            case 'TRADE_RESULT':
                handleTradeResult(msg.profit, msg.isWin, msg.symbol);
                setActiveAsset(null);
                if (msg.isWin) {
                    addLog(`💰 WIN +$${msg.profit.toFixed(2)} | ${NAMES[msg.symbol]}`, 'gold');
                } else {
                    addLog(`💥 LOSS -$${Math.abs(msg.profit).toFixed(2)} | ${NAMES[msg.symbol]}`, 'error');
                }
                break;

            case 'ANOMALY_UPDATE':
                setIsAnomalyDetected(msg.isDetected);
                setCurrentAutocorr(msg.calmScore);
                break;

            case 'TRADE_LATENCY':
                // Track for UI display if needed
                break;

            case 'WS_CONNECTED':
                addLog('🔌 Worker WebSocket conectado', 'success');
                break;

            case 'WS_DISCONNECTED':
                addLog('⚠️ Worker WebSocket desconectado', 'warning');
                break;

            case 'ERROR':
                addLog(`⚠️ Error: ${msg.message}`, 'error');
                break;
        }
    }, [handleTradeResult, addLog]);

    // ============================================
    // START BOT
    // ============================================
    const startBot = useCallback((startConfig: StartConfig): boolean => {
        console.log('🚀 Tentando iniciar Quant Shield...');

        if (!isConnected || !account) {
            console.error('❌ Falha ao iniciar: Deriv não conectado');
            toast.error('Conecte ao Deriv primeiro');
            return false;
        }

        // Get token from localStorage (same pattern as DerivContext)
        const token = localStorage.getItem('deriv_active_token');
        if (!token) {
            console.error('❌ Falha ao iniciar: Token não encontrado');
            toast.error('Token de autenticación no encontrado');
            return false;
        }

        // Validate currency
        const rawCurrency = account?.currency;
        const validCurrency = (rawCurrency && rawCurrency !== '...' && rawCurrency !== '') ? rawCurrency : 'USD';

        // Store config
        configRef.current = startConfig;
        initialStakeRef.current = startConfig.stake;
        currentStakeRef.current = startConfig.stake;
        totalProfitRef.current = 0;
        consecutiveLossesRef.current = 0;
        consecutiveWinsRef.current = 0;
        sorosLevelRef.current = 0;
        vaultAccumulatedRef.current = 0;
        vaultCountRef.current = 0;

        // Reset UI state
        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: startConfig.stake,
            consecutiveLosses: 0,
            consecutiveWins: 0,
            lastProfit: 0,
            sorosLevel: 0,
            vaultAccumulated: 0,
            vaultCount: 0,
        });
        setLogs([]);
        setRecentTicks([]);
        setIsWarmingUp(true);
        setWarmUpProgress(0);
        setIsCoolingDown(false);
        setCooldownTime(0);
        setIsAnomalyDetected(false);
        setActiveAsset(null);
        setLeaderAsset(null);
        setOpportunityMessage('');

        // Create worker
        if (workerRef.current) {
            workerRef.current.terminate();
        }

        try {
            const workerUrl = new URL('../workers/scannerWorker.ts', import.meta.url);
            console.log('🔧 Criando Worker em:', workerUrl.href);

            const worker = new Worker(workerUrl, { type: 'module' });
            workerRef.current = worker;

            worker.onmessage = handleWorkerMessage;

            worker.onerror = (e) => {
                console.error('🔥 CRITICAL WORKER ERROR:', e);
                addLog(`🔥 ERRO CRÍTICO NO WORKER: ${e.message}`, 'error');
                toast.error('Erro interno no Worker. Verifique o console.');
                stopBot();
            };

            // Map config to worker format
            const workerConfig: ScannerConfig = {
                stake: startConfig.stake,
                stopLoss: startConfig.stopLoss,
                takeProfit: startConfig.takeProfit,
                useMartingale: startConfig.useMartingale,
                maxMartingaleLevel: startConfig.maxMartingaleLevel,
                martingaleFactor: startConfig.martingaleFactor,
                autoSwitch: startConfig.autoSwitchEnabled,
                minScore: startConfig.minScore,
                profitTarget: startConfig.profitTarget,
                maxConsecutiveLosses: startConfig.maxConsecutiveLosses,
                anomalyOnlyMode: startConfig.anomalyOnlyMode,
                useSoros: startConfig.useSoros,
                maxSorosLevels: startConfig.maxSorosLevels,
            };

            // Start worker
            console.log('📤 Enviando comando START para o worker...');
            worker.postMessage({
                type: 'START',
                config: workerConfig,
                authToken: token,
                currency: validCurrency,
                wsUrl: `wss://ws.derivws.com/websockets/v3?app_id=1089`,
            });

            setIsRunning(true);
            isRunningRef.current = true;
            setActiveBot('Quant Shield');

            addLog('🛡️ QUANT SHIELD v5.0 — Higher/Lower Barrier Strategy', 'gold');
            addLog(`💰 Stake: $${startConfig.stake} | SL: $${startConfig.stopLoss} | TP: $${startConfig.takeProfit}`, 'info');
            if (startConfig.useMartingale) {
                addLog(`📈 Martingale: ON (Max: ${startConfig.maxMartingaleLevel}, Factor: ${startConfig.martingaleFactor}x)`, 'info');
            }
            if (startConfig.useSoros) {
                addLog(`🔥 Soros: ON (Max: ${startConfig.maxSorosLevels || 3} levels)`, 'info');
            }
            addLog('⏳ Calibrando volatilidad...', 'info');

            return true;
        } catch (err) {
            console.error('❌ FATAL ERROR creating worker:', err);
            toast.error('Falha ao iniciar motor de trading.');
            return false;
        }
    }, [isConnected, account, handleWorkerMessage, addLog, setActiveBot, stopBot]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'STOP' });
                workerRef.current.terminate();
            }
            if (cooldownTimerRef.current) {
                clearInterval(cooldownTimerRef.current);
            }
        };
    }, []);

    // ============================================
    // RETURN (matches AstronPanel interface exactly)
    // ============================================
    return {
        isRunning,
        stats,
        logs,
        recentTicks,
        startBot,
        stopBot,

        // Multi-asset
        assetStates,
        activeAsset,
        leaderAsset,
        opportunityMessage,
        isWarmingUp,
        warmUpProgress,
        SCANNER_SYMBOLS: SYMBOLS,
        SYMBOL_NAMES: NAMES,

        // Cooldown
        isCoolingDown,
        cooldownTime,
        cooldownReason,

        // Anomaly / Calm regime
        isAnomalyDetected,
        currentAutocorr,
    };
};
