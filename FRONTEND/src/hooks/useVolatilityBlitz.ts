import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// ============================================
// 🎯 ESTRATEGIA TITÁN HÍBRIDA
// 100% Accumulators con Filtro de Volatilidad
// Modo Dual: SNIPER (3% Growth) + ESTABLE (2% Growth)
// Target: 80 trades/day | Win Rate: 65-70%
// ============================================

export interface RiskConfig {
    accountBalance: number; // AMOUNT ($) - Valor da conta
    sniperStake: number;
    sniperTakeProfit: number; // PERCENTAGE (e.g., 5 for 5%)
    stableStake: number;
    stableTakeProfit: number; // PERCENTAGE (e.g., 3 for 3%)
    globalStopLoss: number; // AMOUNT ($)
}

// Default configuration
const DEFAULT_CONFIG = {
    capital_total: 1000,

    accu_sniper: {
        symbol: 'R_10',
    },

    volatility_filter: {
        bollinger_period: 20,
        bollinger_std: 2,
        squeeze_threshold_pct: 0.0001, // 0.01% of price - OPTIMIZED for R_10 low volatility
    },

    spike_detection: {
        lookback_ticks: 10,
        spike_multiplier: 3, // 3x average movement
        spike_timeout: 180, // 3 minutes in seconds - OPTIMIZED for R_10 faster entry
    },

    quick_reentry: {
        enabled: true,
        max_consecutive_wins: 3, // Até 3 wins consecutivos antes de pausar
        cooldown_after_streak: 30, // 30 segundos de pausa após streak
    },

    risk: {
        max_daily_trades: 80,
        cool_down_after_loss: 300, // 5 minutes in seconds
    }
};

// Default risk configuration
export const DEFAULT_RISK_CONFIG: RiskConfig = {
    accountBalance: 1000.00, // $1000 default
    sniperStake: 5.00,
    sniperTakeProfit: 5, // 5% do stake
    stableStake: 5.00,
    stableTakeProfit: 3, // 3% do stake
    globalStopLoss: -50.00, // -$50 (absolute value)
};

type TradingMode = 'SHADOW' | 'SNIPER' | 'ESTABLE';

interface AccuContract {
    id: string;
    mode: 'SNIPER' | 'ESTABLE';
    stake: number;
    openTime: number;
    targetProfit: number;       // Target profit in USD
    stopLossAmount: number;     // Per-contract SL in USD (= stake for ACCU)
    growthRate: number;
    buyPrice: number;           // Original buy price
    currentProfit: number;      // Live profit tracking
    currentSpot: number;        // Current market price
    status: 'open' | 'pending_sell' | 'sold';
}

interface BlitzStats {
    totalTrades: number;
    totalWins: number;
    totalLosses: number;
    globalPnl: number;
    winRate: number;
    isRunning: boolean;
    dailyTradeCount: number;
    sniperTrades: number;
    sniperWins: number;
    stableTrades: number;
    stableWins: number;
}

interface LogEntry {
    id: string;
    time: string;
    type: 'SNIPER' | 'ESTABLE' | 'SHADOW' | 'GLOBAL';
    message: string;
    logType: 'info' | 'success' | 'error' | 'warning' | 'signal';
}

export const useVolatilityBlitz = () => {
    const { socket, isConnected, account } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();

    // State
    const [isRunning, setIsRunning] = useState(false);
    const [currentMode, setCurrentMode] = useState<TradingMode>('SHADOW');
    const [riskConfig, setRiskConfig] = useState<RiskConfig>(DEFAULT_RISK_CONFIG);
    const [stats, setStats] = useState<BlitzStats>({
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        globalPnl: 0,
        winRate: 0,
        isRunning: false,
        dailyTradeCount: 0,
        sniperTrades: 0,
        sniperWins: 0,
        stableTrades: 0,
        stableWins: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeContracts, setActiveContracts] = useState<AccuContract[]>([]);

    // Load saved configuration from localStorage on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('accublitz_risk_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);

                // Validate: Check if values are in the new format (percentage)
                // Old format had TP values like 0.25, 0.15 (absolute dollars)
                // New format has TP values like 5, 3 (percentages)
                const isOldFormat = (
                    parsed.sniperTakeProfit < 1 ||
                    parsed.stableTakeProfit < 1
                );

                if (isOldFormat) {
                    console.warn('Detected old config format, resetting to defaults');
                    localStorage.removeItem('accublitz_risk_config');
                    setRiskConfig(DEFAULT_RISK_CONFIG);
                } else {
                    setRiskConfig(parsed);
                }
            } catch (error) {
                console.error('Failed to load saved config:', error);
                localStorage.removeItem('accublitz_risk_config');
                setRiskConfig(DEFAULT_RISK_CONFIG);
            }
        }
    }, []);

    // Refs
    const tickBufferRef = useRef<number[]>([]);
    const lastSpikeTimeRef = useRef<number>(0);
    const coolDownUntilRef = useRef<number>(0);
    const initialCapitalRef = useRef<number>(DEFAULT_CONFIG.capital_total);
    const sessionStartRef = useRef<number>(0);
    const consecutiveWinsRef = useRef<number>(0); // Para quick re-entry
    const isAlreadyInTrade = useRef<boolean>(false); // Trade state control
    const lastLogTimeRef = useRef<number>(0); // Log throttling
    const activeContractsRef = useRef<AccuContract[]>([]); // Ref for reliable lookup in callbacks
    const isProcessing = useRef<boolean>(false); // ELITE SNIPER: Processing lock
    const contractSubscriptions = useRef<Map<string, string>>(new Map()); // Map<contract_id, subscription_id>
    const processingStartTime = useRef<number>(0); // EMERGENCY TIMEOUT: Track processing start

    // Helper: Add Log
    const addLog = useCallback((type: LogEntry['type'], message: string, logType: LogEntry['logType'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            type,
            message,
            logType,
        };
        setLogs(prev => [...prev, newLog]);
    }, []);

    // ═══════════════════════════════════════════════════════════
    // SELL CONTRACT: Vende contrato por TP ou SL
    // ═══════════════════════════════════════════════════════════
    const sellContract = useCallback((contractId: string, reason: 'TAKE_PROFIT' | 'STOP_LOSS') => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            addLog('GLOBAL', `❌ WebSocket não conectado para vender contrato ${contractId}`, 'error');
            return;
        }

        const contract = activeContractsRef.current.find(c => c.id === contractId);
        if (!contract) {
            addLog('GLOBAL', `⚠️ Contrato ${contractId} não encontrado`, 'warning');
            return;
        }

        if (contract.status === 'pending_sell' || contract.status === 'sold') {
            return; // Já está vendendo ou vendido
        }

        // Mark as pending to prevent duplicate sells
        setActiveContracts(prev => {
            const updated = prev.map(c =>
                c.id === contractId ? { ...c, status: 'pending_sell' as const } : c
            );
            activeContractsRef.current = updated;
            return updated;
        });

        const emoji = reason === 'TAKE_PROFIT' ? '🎯' : '🛑';
        const modeEmoji = contract.mode === 'SNIPER' ? '⚡' : '🛡️';

        addLog(contract.mode, `${modeEmoji} ${emoji} ${reason} ATINGIDO! Vendendo contrato ${contractId}...`, 'signal');

        socket.send(JSON.stringify({
            sell: contractId,
            price: 0 // Sell at market price
        }));
    }, [socket, addLog]);

    // ═══════════════════════════════════════════════════════════
    // MONITOR CONTRACT: Monitora e fecha contrato automaticamente
    // ═══════════════════════════════════════════════════════════
    const monitorAndAutoCloseContract = useCallback((contractData: any) => {
        const { contract_id, status, is_sold, profit, buy_price, current_spot } = contractData;
        const profitNum = parseFloat(profit || '0');
        const buyPriceNum = parseFloat(buy_price || '0');
        const currentSpotNum = parseFloat(current_spot || '0');

        const contract = activeContractsRef.current.find(c => c.id === contract_id);
        if (!contract) return;

        // Update contract state with live data
        setActiveContracts(prev => {
            return prev.map(c => {
                if (c.id !== contract_id) return c;
                return { ...c, currentProfit: profitNum, currentSpot: currentSpotNum };
            });
        });

        // Only check TP/SL if contract is open and not pending sell
        if (is_sold === 0 && status === 'open' && contract.status === 'open') {
            const profitPercent = buyPriceNum > 0 ? (profitNum / buyPriceNum) * 100 : 0;
            const takeProfitPct = contract.stake > 0 ? (contract.targetProfit / contract.stake) * 100 : 0;

            // Check Take Profit (using dollar amount comparison)
            if (profitNum >= contract.targetProfit) {
                addLog(contract.mode,
                    `🎯 TAKE PROFIT: +$${profitNum.toFixed(2)} (${profitPercent.toFixed(1)}% >= ${takeProfitPct.toFixed(1)}%)`,
                    'success'
                );
                sellContract(contract_id, 'TAKE_PROFIT');
                return;
            }

            // Check Stop Loss (per-contract: if profit goes below negative of stopLossAmount)
            // For Accumulators, stopLossAmount = stake (you lose the stake if it explodes)
            if (profitNum <= -contract.stopLossAmount) {
                addLog(contract.mode,
                    `🛑 STOP LOSS: $${profitNum.toFixed(2)} <= -$${contract.stopLossAmount.toFixed(2)}`,
                    'error'
                );
                sellContract(contract_id, 'STOP_LOSS');
                return;
            }

            // Log progress periodically (throttled)
            const now = Date.now();
            if (profitNum > 0.01 && (now - lastLogTimeRef.current > 2000)) {
                const modeEmoji = contract.mode === 'SNIPER' ? '⚡' : '🛡️';
                addLog(
                    contract.mode,
                    `${modeEmoji} 📈 Profit: +$${profitNum.toFixed(2)} (${profitPercent.toFixed(1)}%)... Meta: $${contract.targetProfit.toFixed(2)}`,
                    'info'
                );
                lastLogTimeRef.current = now;
            }
        }
    }, [addLog, sellContract]);

    // Calculate Bollinger Bands for Volatility Filter (DYNAMIC THRESHOLD)
    const calculateBollingerBands = useCallback((buffer: number[], currentPrice: number) => {
        if (buffer.length < DEFAULT_CONFIG.volatility_filter.bollinger_period) return null;

        const slice = buffer.slice(-DEFAULT_CONFIG.volatility_filter.bollinger_period);
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length;
        const std = Math.sqrt(variance);

        const upperBand = mean + (DEFAULT_CONFIG.volatility_filter.bollinger_std * std);
        const lowerBand = mean - (DEFAULT_CONFIG.volatility_filter.bollinger_std * std);
        const bandWidth = (upperBand - lowerBand) / mean;

        // Dynamic squeeze threshold based on current price (0.01% of price)
        const dynamicThreshold = currentPrice * DEFAULT_CONFIG.volatility_filter.squeeze_threshold_pct;
        const absoluteBandWidth = upperBand - lowerBand;

        return {
            mean,
            upperBand,
            lowerBand,
            bandWidth,
            absoluteBandWidth,
            isInSqueeze: absoluteBandWidth < dynamicThreshold,
        };
    }, []);

    // Detect Spike (Trigger A - SNIPER)
    const detectSpike = useCallback((buffer: number[]) => {
        if (buffer.length < DEFAULT_CONFIG.spike_detection.lookback_ticks) return false;

        const recent = buffer.slice(-DEFAULT_CONFIG.spike_detection.lookback_ticks);

        // Calculate average movement
        let totalMovement = 0;
        for (let i = 1; i < recent.length; i++) {
            totalMovement += Math.abs(recent[i] - recent[i - 1]);
        }
        const avgMovement = totalMovement / (recent.length - 1);

        // Check last 2 ticks for spike (sudden drop)
        const lastDrop = recent[recent.length - 2] - recent[recent.length - 1];

        if (lastDrop > avgMovement * DEFAULT_CONFIG.spike_detection.spike_multiplier) {
            return true;
        }

        return false;
    }, []);

    // Detect Range Expansion (Z-Score > 2 StdDev) - NEW TRIGGER
    const detectRangeExpansion = useCallback((buffer: number[]) => {
        if (buffer.length < 20) return { isExpanding: false, zScore: 0 };

        const recent = buffer.slice(-20);
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
        const std = Math.sqrt(variance);

        const currentTick = recent[recent.length - 1];
        const zScore = Math.abs((currentTick - mean) / std);

        return {
            isExpanding: zScore > 2.0, // 2 Standard Deviations
            zScore: zScore,
        };
    }, []);

    // Check if Stable Mode conditions are met (Trigger B)
    const isStableModeReady = useCallback((bollingerData: any) => {
        const now = Date.now() / 1000;
        const timeSinceSpike = now - lastSpikeTimeRef.current;

        // If lastSpikeTime was never set (0), allow stable mode immediately
        if (lastSpikeTimeRef.current === 0) {
            return !bollingerData.isInSqueeze;
        }

        // 3 minutes without spike + no squeeze
        const isReady = timeSinceSpike >= CONFIG.spike_detection.spike_timeout && !bollingerData.isInSqueeze;

        // Log countdown if not ready (every 30 seconds)
        if (!isReady && !bollingerData.isInSqueeze) {
            const remaining = Math.ceil(DEFAULT_CONFIG.spike_detection.spike_timeout - timeSinceSpike);
            if (remaining > 0 && remaining % 30 === 0) {
                addLog('ESTABLE', `⏳ Aguardando estabilidad (Faltan ${remaining}s)`, 'info');
            }
        }

        return isReady;
    }, [addLog]);

    // Open Accumulator
    const openAccumulator = useCallback((mode: 'SNIPER' | 'ESTABLE') => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        // ═══════════════════════════════════════════════════════════
        // ELITE SNIPER: BLOQUEIO RIGOROSO (Double Lock)
        // ═══════════════════════════════════════════════════════════
        if (isProcessing.current || activeContractsRef.current.length > 0) {
            const reason = isProcessing.current ? 'Processando operação' : 'Contrato ativo';
            addLog('GLOBAL', `🚫 BLOQUEADO: ${reason}`, 'warning');
            return;
        }

        // LOCK: Bloquear novas operações
        isProcessing.current = true;
        isAlreadyInTrade.current = true;

        // Check cool-down
        const now = Date.now() / 1000;
        if (now < coolDownUntilRef.current) {
            const remaining = Math.ceil(coolDownUntilRef.current - now);
            if (remaining % 30 === 0) {
                addLog('GLOBAL', `⏸️ Bóveda Inteligente activa: ${remaining}s restantes`, 'warning');
            }
            isProcessing.current = false; // Unlock
            isAlreadyInTrade.current = false;
            return;
        }

        // Check daily limit
        if (stats.dailyTradeCount >= DEFAULT_CONFIG.risk.max_daily_trades) {
            addLog('GLOBAL', `🛑 Limite diário atingido: ${DEFAULT_CONFIG.risk.max_daily_trades} trades`, 'error');
            isProcessing.current = false;
            isAlreadyInTrade.current = false;
            return;
        }

        // Check global stop loss (using dynamic config - ABSOLUTE VALUE)
        // riskConfig.globalStopLoss is now a negative dollar amount (e.g. -50)
        // stats.globalPnl is profit/loss in dollars
        if (stats.globalPnl <= riskConfig.globalStopLoss) {
            addLog('GLOBAL', `🛑 Stop Loss Global atingido: $${riskConfig.globalStopLoss.toFixed(2)}`, 'error');
            isProcessing.current = false;
            isAlreadyInTrade.current = false;
            return;
        }

        // Get configuration based on mode
        const stake = mode === 'SNIPER' ? riskConfig.sniperStake : riskConfig.stableStake;
        const growthRate = mode === 'SNIPER' ? 0.03 : 0.02; // 3% or 2%
        const takeProfit = mode === 'SNIPER' ? riskConfig.sniperTakeProfit : riskConfig.stableTakeProfit;
        const symbol = 'R_10';
        const currency = account?.currency || 'USD';

        const buyRequest = {
            buy: 1,
            price: stake,
            parameters: {
                contract_type: 'ACCU',
                symbol: symbol,
                growth_rate: growthRate,
                amount: stake,
                basis: 'stake',
                currency: currency,
            },
            passthrough: {
                mode: mode,
                targetProfit: takeProfit, // IS NOW AMOUNT
            }
        };

        socket.send(JSON.stringify(buyRequest));

        // EMERGENCY TIMEOUT: Registrar timestamp do início do processamento
        processingStartTime.current = Date.now();

        const emoji = mode === 'SNIPER' ? '⚡' : '🛡️';
        addLog(
            mode,
            `${emoji} DISPARO ${mode} | Growth: ${(growthRate * 100).toFixed(0)}% | TP: ${takeProfit}% | Stake: $${stake.toFixed(2)}`,
            'signal'
        );
    }, [socket, stats, riskConfig, account, addLog]);

    // Handle incoming ticks
    const handleTick = useCallback((tick: number) => {
        tickBufferRef.current.push(tick);

        // Keep buffer at reasonable size
        if (tickBufferRef.current.length > 50) {
            tickBufferRef.current.shift();
        }

        // Debug: log tick count periodically (ONLY IF NOT IN TRADE)
        if (!isAlreadyInTrade.current && tickBufferRef.current.length % 5 === 0) {
            addLog('GLOBAL', `📊 Buffer: ${tickBufferRef.current.length} ticks | Último: ${tick.toFixed(2)}`, 'info');
        }

        // Calculate Bollinger Bands (with current price for dynamic threshold)
        const bollingerData = calculateBollingerBands(tickBufferRef.current, tick);

        // If we don't have enough data yet, wait for more ticks
        if (!bollingerData) {
            if (tickBufferRef.current.length === 10) {
                addLog('GLOBAL', '⏳ Acumulando datos... necesario 20 ticks para análisis completa', 'info');
            }
            return;
        }

        // Check for Range Expansion (Z-Score trigger - NEW)
        const expansionData = detectRangeExpansion(tickBufferRef.current);

        // Log Z-Score periodically for visibility
        if (tickBufferRef.current.length % 10 === 0 && expansionData.zScore > 0) {
            addLog('GLOBAL', `📈 Z-Score: ${expansionData.zScore.toFixed(2)} | BW: ${(bollingerData.bandWidth * 100).toFixed(3)}%`, 'info');
        }

        // Update mode based on conditions
        if (bollingerData.isInSqueeze) {
            if (currentMode !== 'SHADOW') {
                setCurrentMode('SHADOW');
                addLog('SHADOW', `🌑 SHADOW MODE: Squeeze detectado (BW: ${bollingerData.absoluteBandWidth.toFixed(4)} < ${(tick * DEFAULT_CONFIG.volatility_filter.squeeze_threshold_pct).toFixed(4)})`, 'warning');
            }
            // Log rejection reason
            if (tickBufferRef.current.length % 20 === 0) {
                addLog('SHADOW', `[FILTRO] Entrada bloqueada: Bandas demasiado estrechas (Squeeze activo)`, 'warning');
            }
            return; // Don't trade during squeeze
        }

        // TRIGGER 1: Range Expansion (Z-Score > 2 StdDev) - SNIPER MODE
        if (expansionData.isExpanding) {
            setCurrentMode('SNIPER');
            addLog('SNIPER', `⚡ EXPANSIÓN DETECTADA! Z-Score: ${expansionData.zScore.toFixed(2)} > 2.0 - Activando MODO SNIPER`, 'signal');
            openAccumulator('SNIPER');
            return;
        }

        // TRIGGER 2: Spike Detection (Trigger A - SNIPER)
        const spikeDetected = detectSpike(tickBufferRef.current);
        if (spikeDetected) {
            lastSpikeTimeRef.current = Date.now() / 1000;
            setCurrentMode('SNIPER');
            addLog('SNIPER', '⚡ SPIKE DETECTADO! Activando MODO SNIPER', 'signal');
            openAccumulator('SNIPER');
            return;
        }

        // TRIGGER 3: Stable conditions (Trigger B - ESTABLE)
        if (isStableModeReady(bollingerData)) {
            if (currentMode !== 'ESTABLE') {
                setCurrentMode('ESTABLE');
                addLog('ESTABLE', `🛡️ Mercado calmo - Activando MODO ESTABLE (BW: ${(bollingerData.bandWidth * 100).toFixed(3)}%)`, 'info');
            }
            openAccumulator('ESTABLE');
        } else {
            // Log why stable mode is not ready
            const now = Date.now() / 1000;
            const timeSinceSpike = now - lastSpikeTimeRef.current;
            if (lastSpikeTimeRef.current > 0 && timeSinceSpike < DEFAULT_CONFIG.spike_detection.spike_timeout) {
                const remaining = Math.ceil(DEFAULT_CONFIG.spike_detection.spike_timeout - timeSinceSpike);
                if (remaining % 45 === 0) { // Log every 45 seconds
                    addLog('ESTABLE', `[SISTEMA] Aguardando ${DEFAULT_CONFIG.spike_detection.spike_timeout}s de estabilidad (Faltan ${remaining}s)`, 'info');
                }
            }
        }
    }, [calculateBollingerBands, detectSpike, detectRangeExpansion, isStableModeReady, openAccumulator, currentMode, addLog]);

    // ═══════════════════════════════════════════════════════════
    // ELITE SNIPER: Handle Contract Close
    // ═══════════════════════════════════════════════════════════
    const handleContractClose = useCallback((contract: any) => {
        const profit = parseFloat(contract.profit || '0');
        const buyPrice = parseFloat(contract.buy_price || '0');
        const isWin = profit > 0;

        const closedContract = activeContractsRef.current.find(c => c.id === contract.contract_id);
        const mode = closedContract?.mode || 'ESTABLE';
        const duration = closedContract ? Math.floor((Date.now() - closedContract.openTime) / 1000) : 0;
        const profitPct = buyPrice > 0 ? (profit / buyPrice) * 100 : 0;

        // Cleanup subscription
        contractSubscriptions.current.delete(contract.contract_id);

        // Limpar contrato
        setActiveContracts(prev => {
            const updated = prev.filter(c => c.id !== contract.contract_id);
            activeContractsRef.current = updated;
            return updated;
        });

        // Atualizar stats
        setStats(prev => {
            const isSniper = mode === 'SNIPER';
            return {
                ...prev,
                totalTrades: prev.totalTrades + 1,
                totalWins: prev.totalWins + (isWin ? 1 : 0),
                totalLosses: prev.totalLosses + (isWin ? 0 : 1),
                globalPnl: prev.globalPnl + profit,
                winRate: ((prev.totalWins + (isWin ? 1 : 0)) / (prev.totalTrades + 1)) * 100,
                sniperTrades: isSniper ? prev.sniperTrades + 1 : prev.sniperTrades,
                sniperWins: isSniper && isWin ? prev.sniperWins + 1 : prev.sniperWins,
                stableTrades: !isSniper ? prev.stableTrades + 1 : prev.stableTrades,
                stableWins: !isSniper && isWin ? prev.stableWins + 1 : prev.stableWins,
            };
        });

        updateStats(profit, isWin);

        // Log resultado DETALHADO
        const modeEmoji = mode === 'SNIPER' ? '⚡' : '🛡️';
        if (isWin) {
            addLog(mode,
                `${modeEmoji} ✅ WIN | Profit: +$${profit.toFixed(2)} (${profitPct.toFixed(1)}%) | Duración: ${duration}s`,
                'success'
            );
        } else {
            addLog(mode,
                `${modeEmoji} ❌ LOSS | Prejuízo: -$${Math.abs(profit).toFixed(2)} (${Math.abs(profitPct).toFixed(1)}%) | Duración: ${duration}s`,
                'error'
            );
        }

        // DESINSCREVER do contrato
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                forget: contract.contract_id
            }));
        }

        // Quick re-entry logic
        if (isWin) {
            consecutiveWinsRef.current += 1;
            if (DEFAULT_CONFIG.quick_reentry.enabled &&
                consecutiveWinsRef.current >= DEFAULT_CONFIG.quick_reentry.max_consecutive_wins) {
                const cooldown = DEFAULT_CONFIG.quick_reentry.cooldown_after_streak;
                coolDownUntilRef.current = Date.now() / 1000 + cooldown;
                consecutiveWinsRef.current = 0;
                addLog('GLOBAL', `🔥 ${DEFAULT_CONFIG.quick_reentry.max_consecutive_wins} wins! Bóveda Inteligente: ${cooldown}s`, 'warning');
            }
        } else {
            consecutiveWinsRef.current = 0;
            const cooldown = DEFAULT_CONFIG.risk.cool_down_after_loss;
            coolDownUntilRef.current = Date.now() / 1000 + cooldown;
            addLog('GLOBAL', `⏸️ Bóveda Inteligente activada: ${cooldown}s`, 'warning');
        }

        // COOLDOWN DE 1s antes de liberar (Elite Sniper)
        setTimeout(() => {
            isProcessing.current = false;
            isAlreadyInTrade.current = false;
            processingStartTime.current = 0; // Reset timeout tracker
            addLog('GLOBAL', '🔓 Sistema pronto para nova operação', 'info');
        }, 1000);
    }, [socket, updateStats, addLog]);

    // Handle WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick
        if (data.msg_type === 'tick' && data.tick) {
            const tick = parseFloat(data.tick.quote);
            handleTick(tick);
        }

        // ═══════════════════════════════════════════════════════════
        // ELITE SNIPER: Handle buy confirmation + SUBSCRIÇÃO IMEDIATA
        // ═══════════════════════════════════════════════════════════
        if (data.msg_type === 'buy' && data.buy && data.buy.contract_type === 'ACCU') {
            const contractId = data.buy.contract_id;
            const mode = data.passthrough?.mode || 'ESTABLE';
            const takeProfitPct = mode === 'SNIPER' ? riskConfig.sniperTakeProfit : riskConfig.stableTakeProfit;
            const stake = parseFloat(data.buy.buy_price);

            // Calcular target profit em $ baseado na porcentagem
            const targetProfitAmount = stake * (takeProfitPct / 100);
            // Stop loss para Accumulators = stake (você perde o stake se explodir)
            const stopLossAmount = stake;

            const newContract: AccuContract = {
                id: contractId,
                mode: mode,
                stake: stake,
                openTime: Date.now(),
                targetProfit: targetProfitAmount,
                stopLossAmount: stopLossAmount,
                growthRate: mode === 'SNIPER' ? 0.03 : 0.02,
                buyPrice: stake,
                currentProfit: 0,
                currentSpot: 0,
                status: 'open',
            };

            setActiveContracts(prev => {
                const updated = [...prev, newContract];
                activeContractsRef.current = updated;
                return updated;
            });
            setStats(prev => ({ ...prev, dailyTradeCount: prev.dailyTradeCount + 1 }));

            const emoji = mode === 'SNIPER' ? '⚡' : '🛡️';
            addLog('GLOBAL', `${emoji} ✅ Contrato ${contractId} comprado por $${stake.toFixed(2)}`, 'success');
            addLog('GLOBAL', `🎯 TP: $${targetProfitAmount.toFixed(2)} (${takeProfitPct}%) | SL: -$${stopLossAmount.toFixed(2)} configurados`, 'info');

            // SUBSCREVER IMEDIATAMENTE ao proposal_open_contract
            socket.send(JSON.stringify({
                proposal_open_contract: 1,
                contract_id: contractId,
                subscribe: 1
            }));

            // Save subscription for cleanup
            contractSubscriptions.current.set(contractId, contractId);
            addLog('GLOBAL', `👁️ VIGIANDO contrato ${contractId}...`, 'info');

            // ═══════════════════════════════════════════════════════════
            // FIX CRÍTICO: Usar contract_update com limit_order.take_profit
            // Esta é a maneira correta de configurar TP automático para Accumulators
            // A Deriv encerrará automaticamente quando o TP for atingido
            // ═══════════════════════════════════════════════════════════
            setTimeout(() => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    addLog('GLOBAL', `🔧 Configurando Take Profit via contract_update...`, 'info');

                    socket.send(JSON.stringify({
                        contract_update: 1,
                        contract_id: contractId,
                        limit_order: {
                            take_profit: targetProfitAmount // Valor em USD
                        }
                    }));

                    addLog('GLOBAL', `✅ TP de $${targetProfitAmount.toFixed(2)} definido no servidor Deriv`, 'success');
                }
            }, 500); // Pequeno delay para garantir que o contrato foi processado
        }

        // Handle contract updates - use new monitoring function
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
            const contract = data.proposal_open_contract;

            // ═══════════════════════════════════════════════════════════
            // FIX: Detectar e rastrear contratos ACCU externos (não abertos pelo bot)
            // ═══════════════════════════════════════════════════════════
            if (contract.contract_type === 'ACCU' && !contract.is_sold) {
                const contractId = String(contract.contract_id);
                const existingContract = activeContractsRef.current.find(c => c.id === contractId);

                if (!existingContract) {
                    // Contrato externo detectado! Adicionar ao tracking
                    const stake = parseFloat(contract.buy_price || '1');
                    const takeProfit = riskConfig.stableTakeProfit;
                    const targetProfitAmount = stake * (takeProfit / 100);

                    const externalContract: AccuContract = {
                        id: contractId,
                        mode: 'ESTABLE', // Assume estable for external
                        stake: stake,
                        openTime: Date.now(),
                        targetProfit: targetProfitAmount,
                        stopLossAmount: stake,
                        growthRate: parseFloat(contract.growth_rate || '0.02'),
                        buyPrice: stake,
                        currentProfit: parseFloat(contract.profit || '0'),
                        currentSpot: parseFloat(contract.current_spot || '0'),
                        status: 'open',
                    };

                    setActiveContracts(prev => {
                        const updated = [...prev, externalContract];
                        activeContractsRef.current = updated;
                        return updated;
                    });

                    addLog('GLOBAL', `🔍 CONTRATO EXTERNO DETECTADO: ${contractId}`, 'warning');
                    addLog('GLOBAL', `💰 Stake: $${stake.toFixed(2)} | Profit atual: $${externalContract.currentProfit.toFixed(2)}`, 'info');

                    // Configurar TP via contract_update
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        addLog('GLOBAL', `🔧 Configurando Take Profit $${targetProfitAmount.toFixed(2)} via contract_update...`, 'info');

                        socket.send(JSON.stringify({
                            contract_update: 1,
                            contract_id: parseInt(contractId),
                            limit_order: {
                                take_profit: targetProfitAmount
                            }
                        }));
                    }

                    // Subscrever para atualizações
                    contractSubscriptions.current.set(contractId, contractId);
                }

                // Monitor and auto-close if TP/SL reached
                monitorAndAutoCloseContract(contract);
            }

            // ═══════════════════════════════════════════════════════════
            // Handle contract closure (sold, lost, or won)
            // ═══════════════════════════════════════════════════════════
            if (contract.is_sold || contract.status === 'lost' || contract.status === 'won') {
                handleContractClose(contract);
            }
        }

        // Handle errors
        if (data.error) {
            if (data.error.code === 'AlreadySubscribed') {
                return;
            }
            addLog('GLOBAL', `❌ Error: ${data.error.message}`, 'error');

            // ═══════════════════════════════════════════════════════════
            // FIX CRÍTICO: Se erro de compra, liberar lock para permitir retry
            // ═══════════════════════════════════════════════════════════
            if (data.echo_req?.buy || data.error.code === 'InvalidContractProposal') {
                addLog('GLOBAL', '🔓 Liberando lock após erro de compra...', 'warning');
                isProcessing.current = false;
                isAlreadyInTrade.current = false;
                processingStartTime.current = 0;
            }

            // Se "too many open positions", verificar posições abertas e monitorar
            if (data.error.message?.includes('too many open positions')) {
                addLog('GLOBAL', '⚠️ Posição ACCU já aberta! Solicitando status...', 'warning');

                // Solicitar lista de contratos abertos para monitorar
                socket.send(JSON.stringify({
                    proposal_open_contract: 1,
                    subscribe: 1
                }));

                // Liberar lock mas marcar que há posição
                isProcessing.current = false;
                isAlreadyInTrade.current = true; // Manter este flag ativo
            }
        }

        // Handle contract_update response
        if (data.msg_type === 'contract_update') {
            if (data.contract_update) {
                const tp = data.contract_update.take_profit;
                if (tp && tp.order_amount) {
                    addLog('GLOBAL', `🎯 Take Profit CONFIRMADO: $${parseFloat(tp.order_amount).toFixed(2)}`, 'success');
                }
            }
            if (data.error) {
                addLog('GLOBAL', `❌ Erro ao configurar TP: ${data.error.message}`, 'error');
            }
        }
    }, [handleTick, socket, riskConfig, addLog, handleContractClose, monitorAndAutoCloseContract]);

    // Start bot
    const startBot = useCallback((customConfig?: RiskConfig) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Conecte a Deriv primeiro');
            return false;
        }

        // Use custom config if provided, otherwise use current state
        const configToUse = customConfig || riskConfig;
        setRiskConfig(configToUse);

        // Persist configuration to localStorage
        localStorage.setItem('accublitz_risk_config', JSON.stringify(configToUse));

        setStats({
            totalTrades: 0,
            totalWins: 0,
            totalLosses: 0,
            globalPnl: 0,
            winRate: 0,
            isRunning: true,
            dailyTradeCount: 0,
            sniperTrades: 0,
            sniperWins: 0,
            stableTrades: 0,
            stableWins: 0,
        });
        setLogs([]);
        setActiveContracts([]);
        setCurrentMode('SHADOW');

        tickBufferRef.current = [];
        lastSpikeTimeRef.current = 0;
        coolDownUntilRef.current = 0;
        sessionStartRef.current = Date.now() / 1000;
        initialCapitalRef.current = DEFAULT_CONFIG.capital_total;
        consecutiveWinsRef.current = 0; // Reset win streak

        setActiveBot('ACCU BLITZ - TITÁN');
        addLog('GLOBAL', '🚀 ESTRATEGIA TITÁN HÍBRIDA INICIADA', 'success');
        addLog('GLOBAL', `💰 Capital: $${configToUse.accountBalance.toFixed(2)}`, 'info');
        addLog('GLOBAL', `⚡ SNIPER: 3% Growth | TP: ${configToUse.sniperTakeProfit}% | Stake: $${configToUse.sniperStake.toFixed(2)}`, 'info');
        addLog('GLOBAL', `🛡️ ESTABLE: 2% Growth | TP: ${configToUse.stableTakeProfit}% | Stake: $${configToUse.stableStake.toFixed(2)}`, 'info');
        addLog('GLOBAL', `🎯 Límite diário: ${DEFAULT_CONFIG.risk.max_daily_trades} trades`, 'info');
        addLog('GLOBAL', `🛑 Stop Loss Global: $${configToUse.globalStopLoss.toFixed(2)}`, 'info');

        setIsRunning(true);
        return true;
    }, [socket, addLog, setActiveBot, riskConfig]);

    // Subscribe to ticks
    // 1. Subscribe to ticks (Runs ONCE when bot starts)
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        socket.send(JSON.stringify({
            ticks: DEFAULT_CONFIG.accu_sniper.symbol,
            subscribe: 1,
        }));

        addLog('GLOBAL', `📡 Conectando a ${DEFAULT_CONFIG.accu_sniper.symbol}...`, 'info');

        // Cleanup: handled by stopBot usually, but we can't really unsubscribe cleanly here without breaking the listener if rapid toggling.
        // Let's rely on stopBot to send forget_all.
    }, [isRunning, socket, addLog]);

    // 2. Handle Message Listener (Updates when handleMessage dependencies change)
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        return () => {
            socket.removeEventListener('message', onMessage);
        };
    }, [isRunning, socket, handleMessage]);

    // ═══════════════════════════════════════════════════════════
    // 3. EMERGENCY TIMEOUT: Reset processing lock after 10s
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!isRunning) return;

        const timeoutChecker = setInterval(() => {
            // Se está processando MAS não tem contrato ativo há mais de 10s
            if (isProcessing.current &&
                activeContractsRef.current.length === 0 &&
                processingStartTime.current > 0) {

                const elapsedTime = Date.now() - processingStartTime.current;

                if (elapsedTime > 10000) { // 10 segundos
                    addLog('GLOBAL', '⚠️ Tempo de espera de compra agotado. Reiniciando escâner.', 'warning');
                    isProcessing.current = false;
                    isAlreadyInTrade.current = false;
                    processingStartTime.current = 0;
                }
            }
        }, 1000); // Verificar a cada 1 segundo

        return () => clearInterval(timeoutChecker);
    }, [isRunning, addLog]);

    // Stop bot
    const stopBot = useCallback(() => {
        if (socket) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));

            // Forget all contract subscriptions
            contractSubscriptions.current.forEach((_, contractId) => {
                socket.send(JSON.stringify({ forget: contractId }));
            });
        }

        // Clear subscriptions map
        contractSubscriptions.current.clear();

        setActiveBot(null);
        addLog('GLOBAL', '🛑 Bot detenido', 'warning');
        setIsRunning(false);
        setStats(prev => ({ ...prev, isRunning: false }));
        setCurrentMode('SHADOW');

        // ELITE SNIPER: Limpar todos os refs
        isAlreadyInTrade.current = false;
        isProcessing.current = false;
        processingStartTime.current = 0; // Reset timeout tracker
        activeContractsRef.current = [];
    }, [socket, addLog, setActiveBot]);

    return {
        isRunning,
        currentMode,
        stats,
        logs,
        activeContracts,
        riskConfig,
        setRiskConfig,
        startBot,
        stopBot,
    };
};
