import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { toast } from 'sonner';

// Types
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    martingaleFactor: number;
    symbol?: string; // R_75
    prediction?: number; // 3
}

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

export const useBotDoubleCuentas = () => {
    const { socket, isConnected, account } = useDeriv();

    // Bot State
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // References
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const currentStakeRef = useRef<number>(0);
    const isWaitingForContractRef = useRef<boolean>(false);
    const subscriptionIdRef = useRef<string | null>(null);
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

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick updates - check for entry condition
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(4); // R_75 has 4 decimal places
            const lastDigit = parseInt(quote.charAt(quote.length - 1));

            // Log every 5th tick
            if (Math.random() < 0.2) {
                addLog(`📊 Último dígito: ${lastDigit}`, 'info');
            }

            // Entry condition: LAST DIGIT == 0
            // Strategy: DIGITOVER
            if (!isWaitingForContractRef.current && lastDigit === 0 && socket && configRef.current) {
                isWaitingForContractRef.current = true;
                addLog(`🎯 ¡Dígito 0 detectado! Ejecutando DIGITOVER...`, 'success');

                const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));
                const prediction = configRef.current.prediction ?? 3; // Default 3 based on XML
                const currency = account?.currency || 'USD';

                // Send buy request for Digit Over
                const buyRequest = {
                    buy: 1,
                    price: 100,
                    parameters: {
                        contract_type: 'DIGITOVER',
                        symbol: configRef.current.symbol || 'R_75',
                        currency: currency,
                        amount: stakeAmount,
                        basis: 'stake',
                        duration: 1,
                        duration_unit: 't',
                        barrier: prediction.toString(),
                    }
                };

                socket.send(JSON.stringify(buyRequest));
                addLog(`🛒 Orden: SUPERIOR A ${prediction} | Stake: $${stakeAmount.toFixed(2)}`, 'info');
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
                    // WIN - Reset stake
                    addLog(`🎉 ¡GANAMOS! +$${profit.toFixed(2)}`, 'success');
                    currentStakeRef.current = initialStakeRef.current; // Reset stake ref

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                    }));

                    totalProfitRef.current = prev.totalProfit + profit;
                } else {
                    // LOSS - Apply Martingale
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 Perdimos: -$${lossAmount.toFixed(2)}`, 'error');

                    // XML Logic: Stake = Stake * 1.8 (approx from XML logic of multiply * 1.8)
                    // The XML says: Change 'Initial Stake' by (ABS(Read Details) * Martingale)
                    // Wait, the XML logic was: `Change Initial Stake by ABS(Loss) * Martingale`
                    // So New Stake = Old Stake + (Loss * Martingale) ?? Or just Stake * Martingale?
                    // XML block: "math_change" adds to the variable.
                    // Value: ABS(Detail 4) * Martingale. Detail 4 is usually the profit (negative on loss).
                    // So roughly: Next Stake = Current Stake + (Loss * 1.8)?? 
                    // Wait, looking closer at XML:
                    // It changes "Initial Stake". 
                    // If it was just multiplying, it would be `Stake = Stake * Factor`.
                    // But "Change by" means `Stake = Stake + Delta`.
                    // Delta is `ABS(Loss) * Martingale`.
                    // So `Stake = Stake + (Loss * 1.8)`. 
                    // This is VERY aggressive. 
                    // Let's implement that.

                    const martingaleFactor = configRef.current?.martingaleFactor || 1.8;
                    const increase = lossAmount * martingaleFactor;
                    const newStake = parseFloat((currentStakeRef.current + increase).toFixed(2));
                    // Alternatively, standard martingale is just Stake * Factor.
                    // But I will follow XML "Change by" logic which accumulates.

                    currentStakeRef.current = newStake; // Update stake ref
                    addLog(`📈 Martingale (1.8x Loss): Próximo stake $${newStake.toFixed(2)}`, 'warning');

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: newStake,
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
    }, [socket, addLog]);

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
        currentStakeRef.current = config.stake; // Initialize stake ref
        isWaitingForContractRef.current = false;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
        });
        setLogs([]);

        addLog(`⏳ Esperando dígito 0...`, 'info');

        setIsRunning(true);
        return true;
    }, [addLog]);

    // --- SOCKET MANAGEMENT ---
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        const config = configRef.current;
        const symbol = config?.symbol || 'R_75';

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
            // Subscription cleanup is handled by useEffect on unmount/isRunning change
            // But we can force a forget all here to be safe
            if (subscriptionIdRef.current) {
                socket.send(JSON.stringify({ forget: subscriptionIdRef.current }));
            }
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        addLog('🛑 Bot Double Cuentas detenido', 'warning');
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
