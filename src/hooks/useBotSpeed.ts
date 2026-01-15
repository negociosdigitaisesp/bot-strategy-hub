import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { toast } from 'sonner';

// Types
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    martingaleSize: number; // Multiplier (default 2)
    symbol?: string; // R_75
    prediction?: number; // 1 (DIGITOVER > 1)
    maxStake?: number; // Optional max stake limit
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

export const useBotSpeed = () => {
    const { socket } = useDeriv();

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
    const multiplierRef = useRef<number>(1); // Current martingale multiplier
    const isWaitingForContractRef = useRef<boolean>(false);
    const subscriptionIdRef = useRef<string | null>(null);

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

    // Calculate current stake based on multiplier
    const getCurrentStake = useCallback(() => {
        const stake = initialStakeRef.current * multiplierRef.current;
        const maxStake = configRef.current?.maxStake;

        // Check max stake limit
        if (maxStake && stake > maxStake) {
            multiplierRef.current = 1; // Reset multiplier if exceeds max
            addLog(`⚠️ Stake excede límite máximo. Reiniciando...`, 'warning');
            return initialStakeRef.current;
        }

        return parseFloat(stake.toFixed(2));
    }, [addLog]);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick updates - AUTOMATIC ENTRY (no digit trigger)
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(4); // R_75 has 4 decimal places
            const lastDigit = parseInt(quote.charAt(quote.length - 1));

            // Log every 5th tick
            if (Math.random() < 0.2) {
                addLog(`📊 Tick recibido - Último dígito: ${lastDigit}`, 'info');
            }

            // AUTOMATIC ENTRY - Buy immediately if not waiting for contract
            if (!isWaitingForContractRef.current && socket && configRef.current) {
                isWaitingForContractRef.current = true;

                const stakeAmount = getCurrentStake();
                const prediction = configRef.current.prediction ?? 1;

                addLog(`🎯 Ejecutando DIGITOVER > ${prediction} | Stake: $${stakeAmount.toFixed(2)}`, 'success');

                // Send buy request for Digit Over
                const buyRequest = {
                    buy: 1,
                    subscribe: 1,
                    price: 100,
                    parameters: {
                        contract_type: 'DIGITOVER',
                        symbol: configRef.current.symbol || 'R_75',
                        currency: 'USD',
                        amount: stakeAmount,
                        basis: 'stake',
                        duration: 1,
                        duration_unit: 't',
                        barrier: prediction.toString(),
                    }
                };

                socket.send(JSON.stringify(buyRequest));
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
                    // WIN - Reset multiplier to 1
                    addLog(`🎉 ¡GANAMOS! +$${profit.toFixed(2)}`, 'success');
                    multiplierRef.current = 1;

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                    }));
                } else {
                    // LOSS - Classic Martingale: multiply stake by martingaleSize
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 Perdimos: -$${lossAmount.toFixed(2)}`, 'error');

                    const martingaleSize = configRef.current?.martingaleSize || 2;
                    multiplierRef.current = multiplierRef.current * martingaleSize;

                    const nextStake = getCurrentStake();
                    addLog(`📈 Martingale x${martingaleSize}: Próximo stake $${nextStake.toFixed(2)}`, 'warning');

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: nextStake,
                    }));
                }

                // Check Stop Loss / Take Profit
                setStats(prev => {
                    if (configRef.current) {
                        if (prev.totalProfit >= configRef.current.takeProfit) {
                            addLog(`🏆 ¡META ALCANZADA! +$${prev.totalProfit.toFixed(2)}`, 'success');
                            toast.success('¡Take Profit alcanzado!');
                            stopBot();
                            return prev;
                        }
                        if (prev.totalProfit <= -configRef.current.stopLoss) {
                            addLog(`🛑 STOP LOSS activado. -$${Math.abs(prev.totalProfit).toFixed(2)}`, 'error');
                            toast.error('Stop Loss activado');
                            stopBot();
                            return prev;
                        }
                    }
                    return prev;
                });
            }
        }

        // Handle errors
        if (data.error) {
            addLog(`❌ Error API: ${data.error.message}`, 'error');
            console.error('Deriv API Error:', data.error);
            isWaitingForContractRef.current = false;
        }
    }, [socket, addLog, getCurrentStake]);

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
        multiplierRef.current = 1; // Reset multiplier
        isWaitingForContractRef.current = false;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
        });
        setLogs([]);

        // Add message listener
        socket.addEventListener('message', handleMessage);

        // First, forget all tick subscriptions
        socket.send(JSON.stringify({ forget_all: 'ticks' }));

        // Then subscribe to ticks after a short delay
        setTimeout(() => {
            const tickRequest = {
                ticks: config.symbol || 'R_75',
                subscribe: 1,
            };
            socket.send(JSON.stringify(tickRequest));
        }, 100);

        addLog(`🚀 Speed Bot iniciado en ${config.symbol || 'R_75'}`, 'success');
        addLog(`💰 Stake: $${config.stake} | TP: $${config.takeProfit} | SL: $${config.stopLoss}`, 'info');
        addLog(`📊 Estrategia: DIGITOVER > ${config.prediction || 1} (Automático)`, 'info');
        addLog(`📈 Martingale: x${config.martingaleSize || 2} en pérdida`, 'info');
        addLog(`⚡ Modo automático - Operando continuamente...`, 'warning');

        setIsRunning(true);
        return true;
    }, [socket, handleMessage, addLog]);

    // Stop the bot
    const stopBot = useCallback(() => {
        if (socket) {
            socket.removeEventListener('message', handleMessage);

            if (subscriptionIdRef.current) {
                socket.send(JSON.stringify({ forget: subscriptionIdRef.current }));
            }
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        addLog('🛑 Speed Bot detenido', 'warning');
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
