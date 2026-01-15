import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// Types
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    martingaleFactor: number;
    symbol?: string;
    prediction?: number; // Digit prediction (0-9)
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

export const useBotSigma = () => {
    const { socket, isConnected } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();

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
    const currentStakeRef = useRef<number>(0); // Track current stake for callbacks
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

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick updates - check for entry condition
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(3); // R_10 has 3 decimal places
            const lastDigit = parseInt(quote.charAt(quote.length - 1));

            // Log every 3rd tick
            if (Math.random() < 0.3) {
                addLog(`📊 Último dígito: ${lastDigit}`, 'info');
            }

            // Entry condition: last digit == 1
            if (!isWaitingForContractRef.current && lastDigit === 1 && socket && configRef.current) {
                isWaitingForContractRef.current = true;
                addLog(`🎯 ¡Dígito 1 detectado! Comprando DIGITOVER...`, 'success');

                // Use ref for current stake value and round to 2 decimals
                const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));

                // Send buy request for Digit Over
                const buyRequest = {
                    buy: 1,
                    subscribe: 1,
                    price: 100,
                    parameters: {
                        contract_type: 'DIGITOVER',
                        symbol: configRef.current.symbol || 'R_10',
                        currency: 'USD',
                        amount: stakeAmount,
                        basis: 'stake',
                        duration: 1,
                        duration_unit: 't',
                        barrier: configRef.current.prediction?.toString() || '3',
                    }
                };

                socket.send(JSON.stringify(buyRequest));
                addLog(`🛒 Orden: DIGITOVER > ${configRef.current.prediction || 3} | Stake: $${stakeAmount.toFixed(2)}`, 'info');
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

                // Update Session Global Stats
                updateStats(profit, isWin);

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
                } else {
                    // LOSS - Apply Martingale
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 Perdimos: -$${lossAmount.toFixed(2)}`, 'error');

                    // Calculate new stake and round to 2 decimals
                    const newStake = parseFloat((currentStakeRef.current + (lossAmount * (configRef.current?.martingaleFactor || 2.5))).toFixed(2));
                    currentStakeRef.current = newStake; // Update stake ref
                    addLog(`📈 Martingale: Próximo stake $${newStake.toFixed(2)}`, 'warning');

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: newStake,
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
    }, [socket, addLog, updateStats]);

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

        // Notify Global Session
        setActiveBot('Sigma Scalper');

        // Add message listener
        socket.addEventListener('message', handleMessage);

        // First, forget all tick subscriptions to avoid "already subscribed" error
        socket.send(JSON.stringify({ forget_all: 'ticks' }));

        // Then subscribe to ticks after a short delay
        setTimeout(() => {
            const tickRequest = {
                ticks: config.symbol || 'R_10',
                subscribe: 1,
            };
            socket.send(JSON.stringify(tickRequest));
        }, 100);

        addLog(`🚀 Sigma Scalper iniciado en ${config.symbol || 'R_10'}`, 'success');
        addLog(`💰 Stake: $${config.stake} | TP: $${config.takeProfit} | SL: $${config.stopLoss}`, 'info');
        addLog(`📊 Estrategia: DIGITOVER > ${config.prediction || 3} cuando dígito = 1`, 'info');
        addLog(`📈 Martingale: x${config.martingaleFactor}`, 'info');
        addLog(`⏳ Esperando dígito 1...`, 'info');

        setIsRunning(true);
        return true;
    }, [socket, isConnected, handleMessage, addLog, setActiveBot]);

    // Stop the bot
    const stopBot = useCallback(() => {
        if (socket) {
            socket.removeEventListener('message', handleMessage);

            if (subscriptionIdRef.current) {
                socket.send(JSON.stringify({ forget: subscriptionIdRef.current }));
            }
        }

        setActiveBot(null);
        addLog('🛑 Sigma Scalper detenido', 'warning');
        setIsRunning(false);
    }, [socket, handleMessage, addLog, setActiveBot]);

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
