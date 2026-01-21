import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { toast } from 'sonner';

// Types
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    martingaleSize: number; // Multiplier (default 2.1)
    maxLosses: number; // Max consecutive losses before reset (default 6)
    tradesPerCycle: number; // Trades before switching OVER/UNDER (default 100)
    symbol?: string; // 1HZ75V
}

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    currentMode: 'UNDER' | 'OVER';
    tradesInCycle: number;
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

export const useBotApalancamiento = () => {
    const { socket } = useDeriv();

    // Bot State
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0,
        currentMode: 'UNDER',
        tradesInCycle: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // References
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const currentStakeRef = useRef<number>(0);
    const lossCountRef = useRef<number>(0);
    const tradingOptionRef = useRef<number>(0); // 0 = UNDER, 1 = OVER
    const tradesCounterRef = useRef<number>(0);
    const isWaitingForContractRef = useRef<boolean>(false);
    const totalProfitRef = useRef<number>(0);

    // Helper to add log
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
        };
        setLogs(prev => [...prev, newLog]);
    }, []);

    // Get prediction based on loss count and trading option (from original XML)
    const getPrediction = useCallback(() => {
        const loss = lossCountRef.current;
        const tradingOption = tradingOptionRef.current;

        if (tradingOption === 0) {
            // DIGITUNDER mode
            if (loss === 0) return 9;
            if (loss >= 1) return 5;
            return 5;
        } else {
            // DIGITOVER mode
            if (loss === 0) return 0;
            if (loss >= 1) return 5;
            return 5;
        }
    }, []);

    // Check if should enter trade based on random and loss (from original XML)
    const shouldEnterTrade = useCallback(() => {
        const random = Math.floor(Math.random() * 10); // 0-9
        const loss = lossCountRef.current;

        // Original XML logic:
        // If loss == 0 AND random >= 1: enter trade
        // If loss >= 1 AND random >= 6: enter trade
        // If loss >= 2 AND random <= 4: enter trade
        // Else: enter trade anyway

        if (loss === 0 && random >= 1) return true;
        if (loss >= 1 && random >= 6) return true;
        if (loss >= 2 && random <= 4) return true;

        // Default case from XML: still enters trade
        return true;
    }, []);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick updates
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(5); // 1HZ75V has 5 decimal places
            const lastDigit = parseInt(quote.charAt(quote.length - 1));

            // Log every 5th tick
            if (Math.random() < 0.2) {
                addLog(`📊 Tick: ${quote} | Último dígito: ${lastDigit}`, 'info');
            }

            // Check if should enter trade
            if (!isWaitingForContractRef.current && socket && configRef.current && shouldEnterTrade()) {
                isWaitingForContractRef.current = true;

                const stakeAmount = currentStakeRef.current;
                const prediction = getPrediction();
                const tradingOption = tradingOptionRef.current;
                const contractType = tradingOption === 0 ? 'DIGITUNDER' : 'DIGITOVER';

                addLog(`🎯 ${contractType} ${prediction} | Stake: $${stakeAmount.toFixed(2)}`, 'success');

                // Send buy request
                const buyRequest = {
                    buy: 1,
                    subscribe: 1,
                    price: 100,
                    parameters: {
                        contract_type: contractType,
                        symbol: configRef.current.symbol || '1HZ75V',
                        currency: 'USD',
                        amount: stakeAmount,
                        basis: 'stake',
                        duration: 1,
                        duration_unit: 't',
                        barrier: prediction.toString(),
                    }
                };

                socket.send(JSON.stringify(buyRequest));

                // Increment trades counter
                tradesCounterRef.current += 1;

                // Check if should switch OVER/UNDER
                const maxTrades = configRef.current.tradesPerCycle || 100;
                if (tradesCounterRef.current >= maxTrades) {
                    tradesCounterRef.current = 0;
                    tradingOptionRef.current = tradingOptionRef.current === 0 ? 1 : 0;
                    const newMode = tradingOptionRef.current === 0 ? 'UNDER' : 'OVER';
                    addLog(`🔄 Cambiando a DIGIT${newMode}`, 'warning');
                    setStats(prev => ({ ...prev, currentMode: newMode, tradesInCycle: 0 }));
                } else {
                    setStats(prev => ({ ...prev, tradesInCycle: tradesCounterRef.current }));
                }
            }
        }

        // Handle buy response
        if (data.msg_type === 'buy' && data.buy) {
            addLog(`✅ Contrato abierto: ID ${data.buy.contract_id}`, 'success');
        }

        // Handle proposal_open_contract (contract result)
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
            const contract = data.proposal_open_contract;

            if (contract.is_sold) {
                isWaitingForContractRef.current = false;
                const profit = parseFloat(contract.profit);
                const isWin = profit > 0;

                if (isWin) {
                    // WIN - Reset stake and loss count
                    addLog(`🎉 ¡GANAMOS! +$${profit.toFixed(2)}`, 'success');
                    lossCountRef.current = 0;
                    currentStakeRef.current = initialStakeRef.current;

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                    }));

                    totalProfitRef.current = prev.totalProfit + profit;
                } else {
                    // LOSS - Martingale
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 Perdimos: -$${lossAmount.toFixed(2)}`, 'error');

                    lossCountRef.current += 1;

                    // Check if max losses reached
                    const maxLosses = configRef.current?.maxLosses || 6;
                    if (lossCountRef.current >= maxLosses) {
                        addLog(`⚠️ Máx pérdidas alcanzadas. Reiniciando stake...`, 'warning');
                        lossCountRef.current = 0;
                        currentStakeRef.current = initialStakeRef.current;
                    } else {
                        // Martingale: stake = abs(profit) * 2.1 (from original XML)
                        const martingaleSize = configRef.current?.martingaleSize || 2.1;
                        currentStakeRef.current = parseFloat((lossAmount * martingaleSize).toFixed(2));
                        addLog(`📈 Martingale x${martingaleSize}: Próximo stake $${currentStakeRef.current.toFixed(2)}`, 'warning');
                    }

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: currentStakeRef.current,
                    }));

                    totalProfitRef.current = prev.totalProfit + profit;
                }


                // Check Stop Loss / Take Profit
                if (configRef.current) {
                    if (totalProfitRef.current >= configRef.current.takeProfit) {
                        addLog(`🏆 ¡META ALCANZADA! +$${totalProfitRef.current.toFixed(2)}`, 'success');
                        toast.success('¡Take Profit alcanzado!');
                        stopBot();
                        return;
                    }
                    if (totalProfitRef.current <= -configRef.current.stopLoss) {
                        addLog(`🛑 STOP LOSS activado. -$${Math.abs(totalProfitRef.current).toFixed(2)}`, 'error');
                        toast.error('Stop Loss activado');
                        stopBot();
                        return;
                    }
                }
            }
        }

        // Handle errors
        if (data.error) {
            addLog(`❌ Error API: ${data.error.message}`, 'error');
            console.error('Deriv API Error:', data.error);
            isWaitingForContractRef.current = false;
        }
    }, [socket, addLog, getPrediction, shouldEnterTrade]);

    // Start the bot
    const startBot = useCallback((config: BotConfig) => {
        // Check socket readyState directly to avoid stale closure issues
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Debe conectarse a Deriv primero');
            return false;
        }

        // Reset state
        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        lossCountRef.current = 0;
        tradingOptionRef.current = 0; // Start with UNDER
        tradesCounterRef.current = 0;
        isWaitingForContractRef.current = false;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
            currentMode: 'UNDER',
            tradesInCycle: 0,
        });
        setLogs([]);

        addLog(`🔄 Máx pérdidas: ${config.maxLosses} | Ciclo: ${config.tradesPerCycle} trades`, 'info');

        setIsRunning(true);
        return true;
    }, [addLog]);

    // --- SOCKET MANAGEMENT ---
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        const config = configRef.current;
        const symbol = config?.symbol || '1HZ75V';

        // Subscribe to ticks
        socket.send(JSON.stringify({
            ticks: symbol,
            subscribe: 1,
        }));

        return () => {
            socket.removeEventListener('message', onMessage);
        };
    }, [isRunning, socket, handleMessage]);

    // Stop the bot
    const stopBot = useCallback(() => {
        if (socket) {
            if (socket) {
                socket.send(JSON.stringify({ forget_all: 'ticks' }));
            }
        }

        addLog('🛑 Bot del Apalancamiento detenido', 'warning');
        setIsRunning(false);
    }, [socket, handleMessage, addLog]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isRunning) {
                stopBot();
            }
        };
    }, [isRunning, stopBot]);

    return {
        isRunning,
        stats,
        logs,
        startBot,
        stopBot,
        addLog,
    };
};
