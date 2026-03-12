import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// Config simple (Mean Reversion)
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    symbol?: string;
    useMartingale?: boolean; // Martingale opcional mas sem configurações complexas
    // Legacy props for UI compatibility (ignored by logic)
    maxConsecutiveLosses?: number;
    martingaleMultiplier?: number;
    vaultEnabled?: boolean;
    vaultTarget?: number;
}

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    consecutiveLosses: number; // Mantido para contabilidade visual se necessario
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'gold';
}

interface DigitFrequency {
    digit: number;
    count: number;
}

export const useEfectoMidas = () => {
    const { socket, isConnected, account } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();

    // Bot State
    const [isRunning, setIsRunning] = useState(false);
    const [isShadowMode, setIsShadowMode] = useState(true); // Mantido apenas para compatibilidade de UI se necessário, mas lógica será direta
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0,
        consecutiveLosses: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // UI Helpers (Mantidos para não quebrar UI visualmente se ela depender disso)
    const [lastDigits, setLastDigits] = useState<number[]>([]);
    const [digitFrequencies, setDigitFrequencies] = useState<DigitFrequency[]>([]);
    const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
    const [anomalyDetected, setAnomalyDetected] = useState(false); // Não usado na lógica nova, mas mantido p/ evitar erro de UI
    const [repeatedDigit, setRepeatedDigit] = useState<number | null>(null); // Idem
    const [trendStatus, setTrendStatus] = useState<'neutral' | 'bullish' | 'bearish'>('neutral'); // Idem

    // Compatibility states (so UI doesn't crash accessing them)
    const [vaultAccumulated] = useState(0);
    const [isVaultCooldown] = useState(false);
    const [cooldownRemaining] = useState(0);
    const [sessionData] = useState({ totalProfit: 0, vaultCount: 0, totalWins: 0, lastUpdated: '' });
    const [isWarmingUp, setIsWarmingUp] = useState(false); // Agora controlado pela lógica da estratégia
    const [warmUpRemaining, setWarmUpRemaining] = useState(0);
    const [warmUpTicks, setWarmUpTicks] = useState(0);
    const [lastEntryScore] = useState(0);

    // References
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const currentStakeRef = useRef<number>(0);
    const isWaitingForContractRef = useRef<boolean>(false);
    const totalProfitRef = useRef<number>(0);

    // Rate Limit Protection
    const lastBuyTimestampRef = useRef<number>(0);
    const MIN_BUY_INTERVAL_MS = 2000; // 2 seconds minimum between orders

    // STRATEGY REFS
    const historyRef = useRef<number[]>([]); // Rolling window of last 100 ticks
    const consecutiveLossesRef = useRef<number>(0);
    const MAX_GALE = 5; // Limite interno de segurança

    // Helper to add log
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
        };
        setLogs(prev => [...prev.slice(-100), newLog]);
    }, []);

    const resetSession = useCallback(() => {
        // Stub function to satisfy UI requirement
    }, []);

    // Helper p/ UI Frequency
    const calculateDigitFrequencies = useCallback((digits: number[]): DigitFrequency[] => {
        const counts: Record<number, number> = {};
        for (let i = 0; i <= 9; i++) counts[i] = 0;
        digits.forEach(d => counts[d] = (counts[d] || 0) + 1);
        return Object.entries(counts)
            .map(([digit, count]) => ({ digit: parseInt(digit), count }))
            .sort((a, b) => a.count - b.count);
    }, []);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick updates
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(2);
            const currentDigit = parseInt(quote.charAt(quote.length - 1));

            // Update Histories
            if (historyRef.current.length >= 100) {
                historyRef.current.shift();
            }
            historyRef.current.push(currentDigit);

            // Update UI State (Last 25 for visual)
            setLastDigits(historyRef.current.slice(-25));
            setDigitFrequencies(calculateDigitFrequencies(historyRef.current.slice(-25)));

            // Warm-up Progress UI
            if (historyRef.current.length < 100) {
                if (!isWarmingUp) setIsWarmingUp(true);
                setWarmUpTicks(historyRef.current.length);
                setWarmUpRemaining(100 - historyRef.current.length); // Usando 'ticks restantes' como proxy de tempo visual

                if (historyRef.current.length % 25 === 0) {
                    addLog(`⏳ Calentamiento: ${historyRef.current.length}/100 ticks recolectados`, 'gold');
                }
                return; // Wait for full history
            } else {
                if (isWarmingUp) {
                    setIsWarmingUp(false);
                    addLog(`🔥 Sistema Calibrado. Iniciando análise estatística.`, 'success');
                }
            }

            // STRATEGY: Statistical Mean Reversion (R_10)
            if (!isWaitingForContractRef.current && socket && configRef.current) {

                // 1. Calculate Frequencies (Full 100 ticks)
                const counts = new Array(10).fill(0);
                historyRef.current.forEach(d => counts[d]++);

                // 2. Find "Coldest" Digit
                let minFreq = 1.0;
                let coldDigit = -1;

                for (let i = 0; i < 10; i++) {
                    const freq = counts[i] / 100;
                    if (freq < minFreq) {
                        minFreq = freq;
                        coldDigit = i;
                    }
                }

                // 3. Statistical Deviation
                const expectedFreq = 0.10;
                const deviation = expectedFreq - minFreq;
                const confidence = Math.min(1.0, deviation / 0.08); // 4% dev = 50% conf

                // 4. Entry Trigger
                if (deviation >= 0.04) {
                    // Rate limit guard - prevent spam
                    const now = Date.now();
                    if (now - lastBuyTimestampRef.current < MIN_BUY_INTERVAL_MS) {
                        addLog(`⏳ Esperando cooldown (anti-spam)...`, 'warning');
                        return;
                    }
                    lastBuyTimestampRef.current = now;

                    isWaitingForContractRef.current = true;
                    setIsShadowMode(false); // UI update

                    const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));
                    const percentageConfidence = (confidence * 100).toFixed(1);
                    // CRITICAL: Ensure currency is valid (not '...' loading state)
                    const rawCurrency = account?.currency;
                    const currency = (rawCurrency && rawCurrency !== '...' && rawCurrency !== '') ? rawCurrency : 'USD';

                    setSelectedDigit(coldDigit);
                    addLog(`🎯 SINAL: Dígito ${coldDigit} Frio (${(minFreq * 100).toFixed(0)}%). Desvio: ${(deviation * 100).toFixed(1)}%`, 'gold');

                    // 5. Execute Trade: DIGITDIFF vs Cold Digit
                    const buyRequest = {
                        buy: 1,
                        price: currentStakeRef.current,
                        parameters: {
                            contract_type: 'DIGITDIFF',
                            symbol: configRef.current.symbol || 'R_10', // Default R_10
                            currency: currency,
                            amount: stakeAmount,
                            basis: 'stake',
                            duration: 1,
                            duration_unit: 't',
                            barrier: coldDigit.toString(),
                        }
                    };

                    socket.send(JSON.stringify(buyRequest));
                    addLog(`⚡ Ordem Enviada: DIFF ${coldDigit} | Confiança: ${percentageConfidence}%`, 'info');
                }
            }
        }

        // Handle buy response
        if (data.msg_type === 'buy' && data.buy) {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    proposal_open_contract: 1,
                    contract_id: data.buy.contract_id,
                    subscribe: 1
                }));
            }
            addLog(`✅ Contrato aberto: ID ${data.buy.contract_id}`, 'success');
        }

        // Handle proposal_open_contract
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
            const contract = data.proposal_open_contract;

            if (contract.is_sold) {
                isWaitingForContractRef.current = false;
                setIsShadowMode(true);
                const profit = parseFloat(contract.profit);
                const isWin = profit > 0;

                updateStats(profit, isWin);

                if (isWin) {
                    addLog(`💰 WIN +$${profit.toFixed(2)}`, 'gold');
                    currentStakeRef.current = initialStakeRef.current; // Reset
                    consecutiveLossesRef.current = 0;

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                        consecutiveLosses: 0
                    }));
                } else {
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 LOSS -$${lossAmount.toFixed(2)}`, 'error');

                    const martingaleEnabled = configRef.current?.useMartingale !== false; // Default true

                    if (!martingaleEnabled) {
                        addLog(`🔄 Martingale OFF: Stake fixo`, 'info');
                    } else {
                        consecutiveLossesRef.current += 1;
                        if (consecutiveLossesRef.current >= MAX_GALE) {
                            addLog(`🛑 Max Gale (${MAX_GALE}) atingido. Resetando stake.`, 'warning');
                            currentStakeRef.current = initialStakeRef.current;
                            consecutiveLossesRef.current = 0;
                        } else {
                            // Martingale logic for DIGITDIFF (Require High Multiplier ~11x)
                            // User asked to maintain "Mathematical Edge". 
                            // Default to ~11x for Differs to recover.
                            const newStake = parseFloat((currentStakeRef.current * 11).toFixed(2));
                            currentStakeRef.current = newStake;
                            addLog(`📈 Martingale x11: Subindo stake para $${newStake.toFixed(2)}`, 'warning');
                        }
                    }

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: currentStakeRef.current,
                        consecutiveLosses: prev.consecutiveLosses + 1
                    }));
                }

                totalProfitRef.current = stats.totalProfit + profit;

                // TP / SL Checks
                if (configRef.current) {
                    if (totalProfitRef.current >= configRef.current.takeProfit) {
                        toast.success('¡Meta Batida!');
                        stopBot();
                    } else if (totalProfitRef.current <= -configRef.current.stopLoss) {
                        toast.error('Stop Loss Atingido');
                        stopBot();
                    }
                }
            }
        }

        if (data.error) {
            const errorMsg = data.error.message || 'Error desconocido';
            const errorCode = data.error.code || 'UNKNOWN';
            addLog(`⚠️ Error de Bróker [${errorCode}]: ${errorMsg}`, 'error');
            console.error('[DERIV API ERROR]', data.error);
            isWaitingForContractRef.current = false;
        }

    }, [socket, addLog, updateStats, isWarmingUp, calculateDigitFrequencies]);

    // Start Bot Logic
    const startBot = useCallback((config: BotConfig) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Conecte ao Deriv primeiro');
            return false;
        }

        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        isWaitingForContractRef.current = false;
        historyRef.current = []; // Clear history for warmup
        consecutiveLossesRef.current = 0;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
            consecutiveLosses: 0
        });
        setLogs([]);
        setLastDigits([]);

        setActiveBot('Efecto Midas');
        addLog(`🧠 DÉBUT EFECTO MIDAS (Mean Reversion)...`, 'gold');
        addLog(`⏳ Coletando 100 ticks (Symbol: ${config.symbol || 'R_25'})...`, 'info');

        setIsRunning(true);
        setIsWarmingUp(true);
        setWarmUpTicks(0);

        return true;
    }, [addLog, setActiveBot]);

    // Socket Subscription Management
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        const config = configRef.current;
        const symbol = config?.symbol || 'R_25'; // Default R_25 per request

        socket.send(JSON.stringify({
            ticks: symbol,
            subscribe: 1,
        }));

        return () => {
            socket.removeEventListener('message', onMessage);
        };
    }, [isRunning, socket, handleMessage]);

    const stopBot = useCallback(() => {
        if (socket) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }
        setActiveBot(null);
        addLog('🛑 Midas Parado', 'warning');
        setIsRunning(false);
        setIsWarmingUp(false);
    }, [socket, addLog, setActiveBot]);

    useEffect(() => {
        return () => {
            if (isRunning) stopBot();
        };
    }, [isRunning, stopBot]);

    return {
        isRunning,
        isShadowMode,
        stats,
        logs,
        lastDigits,
        digitFrequencies,
        selectedDigit,
        anomalyDetected,
        repeatedDigit,
        startBot,
        stopBot,
        trendStatus,
        // Mocked props for UI compatibility
        vaultAccumulated,
        isVaultCooldown,
        cooldownRemaining,
        sessionData,
        resetSession,
        isWarmingUp,
        warmUpRemaining,
        warmUpTicks,
        lastEntryScore
    };
};
