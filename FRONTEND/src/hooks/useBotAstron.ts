// ============================================
// useBotAstron — React Hook for Cloud-Based Signal Reception v2.0
// ============================================
// Receives signals from VPS via Supabase Realtime.
// Manages: Soros, Martingale, Bóveda Inteligente, Cooldown, TP/SL.

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient'; // ✅ Use singleton
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
    winRate: number; // Changed to number
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
    // Optional Strategy Override
    strategies?: string[];
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
    const [strategies, setStrategies] = useState<StrategyPerformance[]>([]);
    const activeStrategyNameRef = useRef<string | null>(null);

    // Fetch strategies from Supabase on mount + auto-refresh every 60s
    const lastUpdateTimeRef = useRef<number>(0);
    const MIN_UPDATE_INTERVAL = 500; // ms (rate limit)

    // ✅ IMPORTANT: activeStrategiesRef is declared at line ~380.
    // We use a separate ref here so loadStrategies can read the CURRENT active set
    // without depending on React state (which would cause stale closures).
    const activeNamesSnapshotRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const loadStrategies = async () => {
            console.log('🔄 Carregando inteligência da VPS...');

            // ✅ SNAPSHOT: Read current active strategy names BEFORE fetching
            const currentActiveNames = activeNamesSnapshotRef.current;
            console.log('🔒 Preservando estratégias ativas:', Array.from(currentActiveNames));

            // ✅ FILTRO: Apenas Volatility Barrier (Motor Adaptativo)
            const V3_STRATEGIES = [
                'Volatility Barrier',
            ];

            // ✅ STEP 1: Buscar Volatility Barrier do banco
            let { data: scoresData, error: scoresError } = await supabase
                .from('strategy_scores')
                .select('*')
                .in('strategy_name', V3_STRATEGIES)
                .order('score', { ascending: false })
                .limit(15);

            // ✅ STEP 2: Fallback to TOP 5 if empty (anti-empty protection)
            if (!scoresError && (!scoresData || scoresData.length === 0)) {
                console.warn('⚠️ Nenhuma estratégia com 45+ pts. Buscando TOP 5 sem threshold...');

                const { data: fallbackData } = await supabase
                    .from('strategy_scores')
                    .select('*')
                    .in('strategy_name', V3_STRATEGIES)
                    .order('score', { ascending: false })
                    .limit(5);

                scoresData = fallbackData || [];

                if (scoresData.length > 0) {
                    console.log(`🔄 Fallback ativado: ${scoresData.length} estratégias carregadas (melhor: ${scoresData[0].score}pts)`);
                }
            }

            if (!scoresError && scoresData && scoresData.length > 0) {
                const mappedStrategies: StrategyPerformance[] = scoresData.map((s: any) => {
                    let wins = s.wins || 0;
                    let losses = s.losses || 0;

                    // ✅ Usar wins/losses reais do banco (sem fabricação)

                    // ✅ PRESERVE ACTIVE STATE from snapshot
                    const isActive = currentActiveNames.has(s.strategy_name);

                    return {
                        id: s.id,
                        name: s.strategy_name,
                        wins: wins,
                        losses: losses,
                        winRate: (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0,
                        syncScore: parseFloat(s.score) || 0,
                        status: s.badge === 'excellent' ? 'OPTIMO' :
                            s.badge === 'good' ? 'FUERTE' :
                                s.badge === 'ok' ? 'ESTABLE' : 'NEUTRO',
                        active: isActive, // ✅ PRESERVADO!
                    };
                });

                // ✅ Volatility Barrier agora vem do banco (sem dados falsos)

                // Improved sorting
                const sortedStrategies = mappedStrategies.sort((a, b) => {
                    if (a.syncScore !== b.syncScore) return b.syncScore - a.syncScore;
                    if (a.winRate !== b.winRate) return b.winRate - a.winRate;
                    return b.wins + b.losses - (a.wins + a.losses);
                });

                // ✅ STEP 3: Auto-activate best strategy if all inactive while bot is running
                if (sortedStrategies.length > 0) {
                    const activeCount = sortedStrategies.filter(s => s.active).length;

                    if (activeCount === 0 && isRunningRef.current) {
                        sortedStrategies[0].active = true;
                        console.log(`🔄 Auto-ativando melhor estratégia: ${sortedStrategies[0].name} (${sortedStrategies[0].syncScore}pts)`);
                    }
                }

                setStrategies(sortedStrategies);

                const activeCount = sortedStrategies.filter(s => s.active).length;
                console.log(`✅ Estratégias carregadas: ${sortedStrategies.length} (${activeCount} ativas preservadas)`);
                console.log(`📊 Range: ${sortedStrategies[0]?.syncScore}pts → ${sortedStrategies[sortedStrategies.length - 1]?.syncScore}pts`);
                return;
            }

            // Fallback to strategy_performance
            const { data: perfData, error: perfError } = await supabase
                .from('strategy_performance')
                .select('*')
                .order('win_rate', { ascending: false });

            if (perfError) {
                console.error('❌ Error fetching strategies:', perfError);
                return;
            }

            if (perfData && perfData.length > 0) {
                const mappedStrategies: StrategyPerformance[] = perfData.map((s: any) => ({
                    id: s.id,
                    name: s.strategy_name,
                    wins: s.wins || 0,
                    losses: s.losses || 0,
                    winRate: parseFloat(s.win_rate) || 0,
                    syncScore: parseFloat(s.win_rate) || 0,
                    status: (parseFloat(s.win_rate) >= 80) ? 'OPTIMO' :
                        (parseFloat(s.win_rate) >= 60) ? 'FUERTE' :
                            (parseFloat(s.win_rate) >= 50) ? 'ESTABLE' : 'NEUTRO',
                    active: currentActiveNames.has(s.strategy_name), // ✅ PRESERVADO!
                }));
                setStrategies(mappedStrategies);
                console.log('✅ Estratégias carregadas (fallback):', mappedStrategies.length);
            }
        };

        // Load on mount
        loadStrategies();

        // ✅ AUTO-REFRESH: Reload every 5 minutes (preserving active state)
        const refreshInterval = setInterval(() => {
            loadStrategies(); // Removed excessive console.log
        }, 300000); // 5 minutes instead of 60 seconds

        // Subscribe to real-time updates on strategy_scores
        const strategyChannel = supabase
            .channel('strategy-scores-updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'strategy_scores' },
                (payload) => {
                    const now = Date.now();

                    if (now - lastUpdateTimeRef.current < MIN_UPDATE_INTERVAL) {
                        return;
                    }

                    lastUpdateTimeRef.current = now;

                    const updatedStrategy = payload.new as any;
                    console.log(`📊 Estratégia atualizada: ${updatedStrategy.strategy_name} → ${updatedStrategy.score}pts`);

                    // ✅ Update ONLY this strategy (preserve active state)
                    setStrategies(prevStrategies =>
                        prevStrategies.map(strategy => {
                            if (strategy.name === updatedStrategy.strategy_name) {
                                let wins = updatedStrategy.wins || 0;
                                let losses = updatedStrategy.losses || 0;

                                if (wins === 0 && losses === 0 && updatedStrategy.total_trades > 0) {
                                    const totalTrades = updatedStrategy.total_trades;
                                    const winRate = parseFloat(updatedStrategy.expected_wr) || 0;
                                    wins = Math.round((totalTrades * winRate) / 100);
                                    losses = totalTrades - wins;
                                }

                                return {
                                    ...strategy, // ✅ Keeps active state
                                    wins, losses,
                                    winRate: parseFloat(updatedStrategy.expected_wr) || 0,
                                    syncScore: parseFloat(updatedStrategy.score) || 0,
                                    status: updatedStrategy.badge === 'excellent' ? 'OPTIMO' :
                                        updatedStrategy.badge === 'good' ? 'FUERTE' :
                                            updatedStrategy.badge === 'ok' ? 'ESTABLE' : 'NEUTRO',
                                };
                            }
                            return strategy;
                        })
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(strategyChannel);
            clearInterval(refreshInterval);
        };
    }, []); // Runs ONCE on mount

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
    const lastSignalIdRef = useRef<number | null>(null); // Anti-duplicate lock

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
        // UI Update
        setStrategies(prev => {
            const newStrategies = prev.map(s => {
                // If toggling this one
                if (s.id === id) {
                    const isActive = !s.active;
                    if (isActive) {
                        activeStrategyNameRef.current = s.name; // Set ref to this name
                    }
                    return { ...s, active: isActive };
                }
                // For "Master Toggle" (multi-select), we DON'T auto-disable others here unless we want single-select mode.
                // The Panel handles the logic of disabling others if needed.
                // Here we just toggle the specific ID.
                return s;
            });

            // Update ref with ALL active names
            const activeSet = new Set(newStrategies.filter(s => s.active).map(s => s.name));
            // This is handled by the useEffect below
            return newStrategies;
        });
    }, []);

    // Effect to update refs for active strategies whenever `strategies` changes
    // This allows the Supabase callback AND loadStrategies to read the latest active list
    const activeStrategiesRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        const activeSet = new Set(strategies.filter(s => s.active).map(s => s.name));
        activeStrategiesRef.current = activeSet;
        activeNamesSnapshotRef.current = activeSet; // ✅ Sync snapshot ref for auto-refresh

        // Debug monitoring
        if (activeSet.size > 0) {
            console.log(`🟢 Estratégias ativas: [${Array.from(activeSet).join(', ')}]`);
        }

        // 🚨 ALERT: Detect if active strategies were wiped while bot is running
        if (activeSet.size === 0 && isRunningRef.current) {
            console.error('🚨 ALERTA: Bot está rodando mas activeStrategies está VAZIO!');
        }
    }, [strategies]);


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
    // Safe execution buffer
    const lastExecutionTimeRef = useRef<number>(0);
    const MIN_TRADE_INTERVAL = 2500; // 2.5s between trades to avoid Rate Limit (Deriv is strict)

    const executeTrade = useCallback(async (signal: SupabaseSignal) => {
        // 1. GLOBAL CHECKS
        if (!socket || !isConnected || isCoolingDown) {
            // addLog('⚠️ Cannot execute: Socket disconnected or in cooldown', 'warning');
            return;
        }

        // 2. RATE LIMIT CHECK (Client-side)
        const now = Date.now();
        if (now - lastExecutionTimeRef.current < MIN_TRADE_INTERVAL) {
            console.log(`⏳ Rate Limit Protection: Ignorando sinal (${now - lastExecutionTimeRef.current}ms < ${MIN_TRADE_INTERVAL}ms)`);
            return; // Silently skip to avoid log spam
        }

        const cfg = configRef.current;
        if (!cfg) return;

        // Lag protection: Check signal age
        const signalTime = new Date(signal.created_at).getTime();
        const lag = now - signalTime;
        setLatency(lag);

        if (lag > 4000) {
            addLog(`⚠️ Sinal descartado: Latência de rede excessiva (${lag}ms)`, 'error');
            return;
        }

        // Update execution timestamp immediately to block concurrent signals
        lastExecutionTimeRef.current = now;

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
                            // Smart Error Handling
                            const isRateLimit = data.error.message.includes('rate limit');

                            if (isRateLimit) {
                                addLog(`⏳ Rate Limit: Acalmando o bot (2s)...`, 'warning');
                                // Reset execution timer to force wait
                                lastExecutionTimeRef.current = Date.now() + 2000;
                            } else {
                                addLog(`❌ Erro na compra: ${data.error.message}`, 'error');
                            }

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
        console.log('🤖 startBot called with config:', startConfig);
        console.log('📊 Current state:', { isConnected, hasAccount: !!account, isRunning: isRunningRef.current });

        if (!isConnected || !account) {
            console.error('❌ Cannot start: Not connected or no account');
            toast.error('Conecte ao Deriv primeiro');
            return false;
        }

        // Check if already running
        if (isRunningRef.current) {
            console.warn('⚠️ Bot already running, ignoring start request');
            toast.warning('Bot já está rodando');
            return false;
        }

        console.log('✅ Pre-checks passed, initializing bot...');

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
        addLog('⚛️ BUG DERIV SCANNER v2.2 — STARTING', 'info');

        // Handle Strategy Override (from "Activate Best Bots")
        let activeNames = Array.from(activeStrategiesRef.current);

        if (startConfig.strategies && startConfig.strategies.length > 0) {
            console.log('⚡ Using strategy override from config:', startConfig.strategies);
            activeNames = startConfig.strategies;

            // 1. Update Ref immediately (for Realtime listener)
            activeStrategiesRef.current = new Set(activeNames);

            // 2. Update UI State (to show green toggles)
            setStrategies(prev => prev.map(s => ({
                ...s,
                active: activeNames.includes(s.name)
            })));
        }

        if (activeNames.length > 0) {
            addLog(`⚔️ ESTRATEGIAS ACTIVAS: ${activeNames.join(', ')}`, 'gold');
            console.log('🎯 Active strategies:', activeNames);
        } else {
            addLog('⚠️ MODO: Sin Estrategia (Esperando selección)', 'warning');
            console.warn('⚠️ No active strategies selected');
        }
        addLog(`💰 Stake: $${startConfig.stake} | SL: $${startConfig.stopLoss} | TP: $${startConfig.takeProfit}`, 'info');

        try {
            console.log('📡 Creating Supabase channel...');

            // Create Supabase channel
            const channel = supabase
                .channel('bot-signals')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'active_signals' },
                    (payload) => {
                        const newSignal = payload.new as SupabaseSignal;

                        // 1. DUPLICATE CHECK (Anti-Repetition Lock)
                        if (lastSignalIdRef.current === newSignal.id) {
                            return; // Ignore duplicate
                        }
                        lastSignalIdRef.current = newSignal.id;

                        // 2. STRATEGY FILTER
                        const activeStrategyNames = activeStrategiesRef.current; // Set of strings

                        if (activeStrategyNames.size === 0) {
                            console.log('Sinal ignorado: Nenhuma estratégia ativa');
                            return;
                        }

                        // Check if signal's strategy matches ANY of the active strategies
                        // If newSignal.strategy is defined, it must match one of the active names.
                        // If it's undefined, we might reject it or accept it if "Any" is active?
                        // Strict mode: Must match.
                        if (newSignal.strategy && !activeStrategyNames.has(newSignal.strategy)) {
                            // console.log(`Sinal ignorado: ${newSignal.strategy} não está ativo.`);
                            return;
                        }

                        // If verify passed, execute
                        executeTrade(newSignal);
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Supabase channel status:', status);

                    if (status === 'SUBSCRIBED') {
                        setConnectionStatus('LISTENING');
                        addLog('📡 Conectado ao Servidor Cloud VPS', 'success');
                        addLog('🔎 Escaneando mercado por oportunidades...', 'info');
                        console.log('✅ Successfully subscribed to Supabase channel');
                    } else if (status === 'CHANNEL_ERROR') {
                        addLog('❌ Erro ao conectar com Supabase', 'error');
                        setConnectionStatus('DISCONNECTED');
                        console.error('❌ Supabase channel error');
                    }
                });

            channelRef.current = channel;
            console.log('✅ Supabase channel created and stored');

        } catch (error) {
            console.error('❌ Exception while creating Supabase channel:', error);
            addLog('❌ Falha ao conectar com servidor cloud', 'error');
            toast.error('Falha ao conectar com servidor cloud');
            setIsRunning(false);
            isRunningRef.current = false;
            return false;
        }

        // Set running state
        console.log('✅ Setting bot to running state');
        setIsRunning(true);
        isRunningRef.current = true;
        setActiveBot('Bug Deriv Scanner');

        console.log('🎉 Bot started successfully!');
        return true;
    }, [isConnected, account, addLog, setActiveBot, executeTrade]);

    // ============================================
    // STOP BOT
    // ============================================
    const stopBot = useCallback(async () => {
        try {
            // 2. Limpeza de Memória
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }

            if (cooldownTimerRef.current) {
                clearInterval(cooldownTimerRef.current);
                cooldownTimerRef.current = null;
            }

            // 3. Sincronização com VPS: UPDATE assíncrono na tabela 'active_bots'
            const { data } = await supabase.auth.getSession();
            const userId = data.session?.user?.id;
            if (userId) {
                const { error } = await supabase
                    .from('active_bots')
                    .update({ is_active: false })
                    .eq('user_id', userId);

                if (error) {
                    console.error('❌ Falha ao sincronizar parada com VPS:', error);
                } else {
                    console.log('✅ VPS notificada da parada com sucesso.');
                }
            }

        } catch (error) {
            console.error('❌ Erro crítico no stopBot:', error);
        } finally {
            // 4. Forçar Estado
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
            activeStrategyNameRef.current = null;

            if (vaultAccumulatedRef.current > 0) {
                addLog(`🏦 BÓVEDA FINAL: $${vaultAccumulatedRef.current.toFixed(2)} protegidos en ${vaultCountRef.current} depósitos`, 'gold');
            }
            addLog('🛑 Bug Deriv Scanner detenido', 'warning');
        }
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
