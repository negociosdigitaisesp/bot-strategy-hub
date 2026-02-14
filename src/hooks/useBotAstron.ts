// ============================================
// useBotAstron — React Hook for Cloud-Based Signal Reception v2.0
// ============================================
// Receives signals from VPS via Supabase Realtime.
// Manages: Soros, Martingale, Bóveda Inteligente, Cooldown, TP/SL.

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { ScannerSymbol, AssetState } from '../workers/scannerWorkerTypes';
import {
    SCANNER_SYMBOLS as SYMBOLS,
    SYMBOL_NAMES as NAMES,
} from '../workers/scannerWorkerTypes';

// Re-export types for AstronPanel
export type { ScannerSymbol, AssetState };

export interface StrategyPerformance {
    id: number;
    name: string;
    wins: number;
    losses: number;
    winRate: number;
    syncScore: number; // 0-100
    status: 'OPTIMO' | 'FUERTE' | 'ESTABLE' | 'NEUTRO';
    active: boolean;
}

// ============================================
// LOG ENTRY INTERFACE
// ============================================
export interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'gold';
}

// ============================================
// STATS INTERFACE (matches AstronPanel usage)
// ============================================
export interface UITick {
    id: string;
    symbol: ScannerSymbol;
    price: string;
    isUp: boolean;
    change: string;
    signal: string;
}

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
    profitTarget: number;
    maxConsecutiveLosses: number;
    // Optional Soros
    useSoros?: boolean;
    maxSorosLevels?: number;
}

// ============================================
// SUPABASE SIGNAL INTERFACE
// ============================================
interface SupabaseSignal {
    id: number;
    asset: string;
    direction: 'CALL' | 'PUT';
    expiry_seconds: number;
    barrier_offset?: number;
    strategy?: string;
    created_at: string;
}

// ============================================
// INITIALIZE SUPABASE CLIENT
// ============================================
const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjY0NTQsImV4cCI6MjA2ODEwMjQ1NH0.lB4EBPozpPUJS0oI5wpatJdo_HCTcuDRFmd42b_7i9U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// HOOK
// ============================================
export const useBotAstron = () => {
    const { socket, isConnected, account, token } = useDeriv();
    const { updateStats: updateSessionStats, setActiveBot } = useTradingSession();

    // Supabase channel ref
    const channelRef = useRef<RealtimeChannel | null>(null);
    const activeContractRef = useRef<string | null>(null);

    // Bot state
    const [isRunning, setIsRunning] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'LISTENING' | 'EXECUTING'>('DISCONNECTED');
    const [latency, setLatency] = useState<number>(0);

    // STRATEGY STATE
    const [strategies, setStrategies] = useState<StrategyPerformance[]>([
        { id: 1, name: 'Quantum Shield V10', wins: 182, losses: 49, winRate: 79, syncScore: 94, status: 'OPTIMO', active: false },
        { id: 2, name: 'V75 Flow Sniper', wins: 89, losses: 18, winRate: 83, syncScore: 86, status: 'FUERTE', active: false },
        { id: 3, name: 'Asian Dragon AI', wins: 45, losses: 12, winRate: 79, syncScore: 72, status: 'ESTABLE', active: false },
        { id: 4, name: 'Digit Weaver Pro', wins: 32, losses: 15, winRate: 68, syncScore: 68, status: 'NEUTRO', active: false },
        { id: 5, name: 'Micro-Scalper Alpha', wins: 12, losses: 11, winRate: 52, syncScore: 58, status: 'NEUTRO', active: false },
    ]);
    const activeStrategyNameRef = useRef<string | null>(null);


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
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [recentTicks, setRecentTicks] = useState<UITick[]>([]);

    // Multi-asset state (for UI compatibility)
    const [assetStates, setAssetStates] = useState<Record<ScannerSymbol, AssetState>>({} as any);
    const [activeAsset, setActiveAsset] = useState<ScannerSymbol | null>(null);
    const [leaderAsset, setLeaderAsset] = useState<ScannerSymbol | null>(null);
    const [opportunityMessage, setOpportunityMessage] = useState<string>('');

    // Warmup (simulated for UI)
    const [isWarmingUp, setIsWarmingUp] = useState(false);
    const [warmUpProgress, setWarmUpProgress] = useState(0);

    // Cooldown
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [cooldownTime, setCooldownTime] = useState(0);
    const [cooldownReason, setCooldownReason] = useState<string>('');
    const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Anomaly (for UI compatibility)
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
    // TOGGLE STRATEGY
    // ============================================
    const toggleStrategy = useCallback((id: number) => {
        const strategy = strategies.find(s => s.id === id);
        if (!strategy) return;

        const willBeActive = !strategy.active;

        // Sync Ref immediately
        activeStrategyNameRef.current = willBeActive ? strategy.name : null;

        // UI Update
        setStrategies(prev => prev.map(s => {
            if (s.id === id) return { ...s, active: willBeActive };
            return { ...s, active: false };
        }));

        if (willBeActive) {
            addLog(`⚡ Estrategia Seleccionada: ${strategy.name}`, 'gold');
        } else {
            addLog('⚪ Ninguna estrategia seleccionada', 'info');
        }
    }, [strategies, addLog]);

    // ============================================
    // COOLDOWN SYSTEM
    // ============================================
    const startCooldown = useCallback((reason: string, durationMs: number = 60000) => {
        if (!isRunningRef.current) return;

        setIsCoolingDown(true);
        setCooldownReason(reason);
        setCooldownTime(Math.ceil(durationMs / 1000));

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

                addLog('✅ Cooldown completado. Reiniciando...', 'success');

                // Reset consecutive losses
                consecutiveLossesRef.current = 0;
                sorosLevelRef.current = 0;
            }
        }, 1000);
    }, [addLog]);

    // ============================================
    // BÓVEDA INTELIGENTE
    // ============================================
    const processVault = useCallback((profit: number): number => {
        // Accumulate 30% of each win in the vault, return net profit (70%)
        if (profit > 0) {
            const vaultDeposit = profit * 0.30;
            const netProfit = profit * 0.70;  // 70% goes to totalProfit
            vaultAccumulatedRef.current += vaultDeposit;
            vaultCountRef.current += 1;
            addLog(`🏦 BÓVEDA: +$${vaultDeposit.toFixed(2)} guardado (Total: $${vaultAccumulatedRef.current.toFixed(2)})`, 'gold');
            return netProfit;
        }
        return profit;  // If loss, return full negative amount
    }, [addLog]);

    // ============================================
    // HANDLE TRADE RESULT (Soros + Martingale + Bóveda + Cooldown)
    // ============================================
    const handleTradeResult = useCallback((profit: number, isWin: boolean, symbol: ScannerSymbol) => {
        const cfg = configRef.current;
        if (!cfg) return;

        // Update session stats
        updateSessionStats(profit, isWin);

        if (isWin) {
            consecutiveLossesRef.current = 0;
            consecutiveWinsRef.current += 1;

            // === BÓVEDA INTELIGENTE ===
            const netProfit = processVault(profit);  // Returns net profit (70%)
            totalProfitRef.current += netProfit;     // Add only net profit to total

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
                totalProfit: prev.totalProfit + netProfit,  // Use net profit (70%)
                currentStake: currentStakeRef.current,
                consecutiveLosses: 0,
                consecutiveWins: consecutiveWinsRef.current,
                lastProfit: netProfit,  // Show net profit in stats
                sorosLevel: sorosLevelRef.current,
                vaultAccumulated: vaultAccumulatedRef.current,
                vaultCount: vaultCountRef.current,
            }));

        } else {
            // LOSS - no vault deposit, use full loss amount
            totalProfitRef.current += profit;  // Add full loss (negative value)
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
    }, [addLog, updateSessionStats, startCooldown, processVault]);

    // ============================================
    // EXECUTE TRADE FROM SIGNAL
    // ============================================
    const executeTrade = useCallback(async (signal: SupabaseSignal) => {
        if (!socket || !isConnected || isCoolingDown) {
            addLog('⚠️ Cannot execute: Socket disconnected or in cooldown', 'warning');
            return;
        }

        const cfg = configRef.current;
        if (!cfg) return;



        // Lag protection: Check signal age
        const now = Date.now();
        const signalTime = new Date(signal.created_at).getTime();
        const lag = now - signalTime;
        setLatency(lag);

        if (lag > 4000) {
            addLog(`⚠️ Sinal descartado: Latência de rede excessiva (${lag}ms)`, 'error');
            return;
        }

        addLog(`📡 Sinal recebido: ${signal.direction} ${signal.asset} | Latência: ${lag}ms`, 'info');

        // Log strategy if available
        if (signal.strategy) {
            addLog(`🎯 Estratégia detectada: ${signal.strategy}`, 'gold');
        }

        setConnectionStatus('EXECUTING');
        setActiveAsset(signal.asset as ScannerSymbol);
        setOpportunityMessage(`🛡️ ${signal.direction} ${signal.asset} | Barrier: ${signal.barrier_offset || 0}`);

        try {
            // Send buy order
            const buyRequest = {
                buy: 1,
                price: currentStakeRef.current,
                parameters: {
                    contract_type: signal.direction === 'CALL' ? 'CALL' : 'PUT',
                    symbol: signal.asset,
                    duration: signal.expiry_seconds,
                    duration_unit: 's',
                    basis: 'stake',
                    amount: currentStakeRef.current,
                    currency: account?.currency || 'USD',
                },
            };

            socket.send(JSON.stringify(buyRequest));
            addLog(`🚀 Ordem enviada: ${signal.direction} ${signal.asset} @ $${currentStakeRef.current}`, 'info');

            // Listen for buy response
            const handleBuyResponse = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle Buy Confirmation
                    if (data.msg_type === 'buy') {
                        if (data.buy) {
                            const contractId = data.buy.contract_id;
                            activeContractRef.current = contractId;
                            addLog(`✅ Contrato aberto: ${contractId}`, 'success');

                            // Subscribe to contract updates
                            socket.send(JSON.stringify({
                                proposal_open_contract: 1,
                                contract_id: contractId,
                                subscribe: 1,
                            }));
                        } else if (data.error) {
                            addLog(`❌ Erro na compra: ${data.error.message}`, 'error');
                            setConnectionStatus('LISTENING');
                            setActiveAsset(null);
                            socket.removeEventListener('message', handleBuyResponse);
                        }
                    }

                    // Handle Contract Updates (Result)
                    if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
                        const contract = data.proposal_open_contract;

                        // Only process the contract we just opened
                        if (contract.contract_id === activeContractRef.current && contract.is_sold) {
                            const profit = parseFloat(contract.profit || '0');
                            const isWin = profit > 0;

                            handleTradeResult(profit, isWin, signal.asset as ScannerSymbol);
                            setActiveAsset(null);
                            setConnectionStatus('LISTENING');
                            activeContractRef.current = null;

                            // Unsubscribe & Cleanup
                            socket.send(JSON.stringify({
                                forget: contract.id,
                            }));

                            socket.removeEventListener('message', handleBuyResponse);
                        }
                    }
                } catch (error) {
                    addLog('❌ Error al procesar datos del servidor', 'error');
                }
            };

            socket.addEventListener('message', handleBuyResponse);

        } catch (error) {
            addLog(`❌ Erro ao executar trade: ${error}`, 'error');
            setConnectionStatus('LISTENING');
            setActiveAsset(null);
        }
    }, [socket, isConnected, account, isCoolingDown, addLog, handleTradeResult]);

    // ============================================
    // START BOT
    // ============================================
    const startBot = useCallback((startConfig: StartConfig): boolean => {
        if (!isConnected || !account) {
            toast.error('Conecte ao Deriv primeiro');
            return false;
        }

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

        // Reset UI state (KEEP LOGS if strategy was selected recently)
        // setLogs([]); // <--- REMOVED TO PRESERVE STRATEGY LOG
        setRecentTicks([]);
        setIsWarmingUp(false);
        setWarmUpProgress(0);
        setIsCoolingDown(false);
        setCooldownTime(0);
        setIsAnomalyDetected(false);
        setActiveAsset(null);
        setLeaderAsset(null);
        setOpportunityMessage('');

        // Initialize asset states for UI
        const initialStates: Record<ScannerSymbol, AssetState> = {} as any;
        SYMBOLS.forEach(symbol => {
            initialStates[symbol] = {
                symbol,
                displayName: NAMES[symbol],
                lastPrice: 0,
                score: { volatility: 0, calm: 0, clusters: 0, total: 0 },
                status: 'scanning',
            };
        });
        setAssetStates(initialStates);

        // Verification Log
        addLog('=================================', 'info');
        addLog('⚛️ BUG DERIV SCANNER v2.2 — STARTING', 'info');
        if (activeStrategyNameRef.current) {
            addLog(`⚔️ MODE: ${activeStrategyNameRef.current}`, 'gold');
        } else {
            addLog('⚠️ MODO: Sin Estrategia (Esperando selección)', 'warning');
        }
        addLog(`💰 Stake: $${startConfig.stake} | SL: $${startConfig.stopLoss} | TP: $${startConfig.takeProfit}`, 'info');

        try {
            // Create Supabase channel
            const channel = supabase
                .channel('bot-signals')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'active_signals' },
                    (payload) => {
                        executeTrade(payload.new as SupabaseSignal);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        setConnectionStatus('LISTENING');
                        addLog('📡 Conectado ao Servidor Cloud VPS', 'success');
                        addLog('🔎 Escaneando mercado por oportunidades...', 'info');
                    } else if (status === 'CHANNEL_ERROR') {
                        addLog('❌ Erro ao conectar com Supabase', 'error');
                        setConnectionStatus('DISCONNECTED');
                    }
                });

            channelRef.current = channel;

        } catch (error) {
            addLog('❌ Falha ao conectar com servidor cloud', 'error');
            toast.error('Falha ao conectar com servidor cloud');
            setIsRunning(false);
            isRunningRef.current = false;
            return false;
        }

        setIsRunning(true);
        isRunningRef.current = true;
        setActiveBot('Bug Deriv Scanner');

        return true;
    }, [isConnected, account, addLog, setActiveBot, executeTrade]);

    // ============================================
    // STOP BOT
    // ============================================
    const stopBot = useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
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
        setConnectionStatus('DISCONNECTED');

        // Deactivate all strategies visually when stopping
        setStrategies(prev => prev.map(s => ({ ...s, active: false })));
        // activeStrategyNameRef.current = null; // Don't clear ref immediately if we want to remember selection on restart? 
        // No, UI clears active state, so logic should too.
        activeStrategyNameRef.current = null;

        if (vaultAccumulatedRef.current > 0) {
            addLog(`🏦 BÓVEDA FINAL: $${vaultAccumulatedRef.current.toFixed(2)} protegidos en ${vaultCountRef.current} depósitos`, 'gold');
        }
        addLog('🛑 Bug Deriv Scanner detenido', 'warning');
    }, [addLog, setActiveBot]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
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

        // Cloud-specific
        connectionStatus,
        latency,

        // Strategy
        strategies,
        toggleStrategy,
    };
};
