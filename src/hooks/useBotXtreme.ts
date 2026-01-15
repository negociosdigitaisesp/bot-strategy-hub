import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// Types
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    symbol?: string;
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

export const useBotXtreme = () => {
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
    const currentStakeRef = useRef<number>(0);
    const isWaitingForContractRef = useRef<boolean>(false);

    // Fixed strategy values (hidden from user)
    const TRIGGER_DIGIT = 5;
    const PREDICTION = 3;

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
            const quote = Number(data.tick.quote).toFixed(2); // R_100 has 2 decimal places
            const lastDigit = parseInt(quote.charAt(quote.length - 1));

            // Log ticks occasionally
            if (Math.random() < 0.15) {
                addLog(`📊 Último dígito: ${lastDigit}`, 'info');
            }

            // Entry condition: last digit == 5
            if (!isWaitingForContractRef.current && lastDigit === TRIGGER_DIGIT && socket && configRef.current) {
                isWaitingForContractRef.current = true;
                addLog(`🎯 ¡Dígito ${TRIGGER_DIGIT} detectado! Comprando DIGITDIFF...`, 'success');

                const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));

                // Send buy request for DIGITDIFF
                const buyRequest = {
                    buy: 1,
                    subscribe: 1,
                    price: 100,
                    parameters: {
                        contract_type: 'DIGITDIFF',
                        symbol: configRef.current.symbol || 'R_100',
                        currency: 'USD',
                        amount: stakeAmount,
                        basis: 'stake',
                        duration: 1,
                        duration_unit: 't',
                        barrier: PREDICTION.toString(),
                    }
                };

                socket.send(JSON.stringify(buyRequest));
                addLog(`🛒 Orden: DIGITDIFF ≠ ${PREDICTION} | Stake: $${stakeAmount.toFixed(2)}`, 'info');
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
                    currentStakeRef.current = initialStakeRef.current;

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                    }));
                } else {
                    // LOSS - Apply Martingale (stake + loss * 2)
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 Perdimos: -$${lossAmount.toFixed(2)}`, 'error');

                    // Martingale: current stake + (loss * 2)
                    const newStake = parseFloat((currentStakeRef.current + (lossAmount * 2)).toFixed(2));
                    currentStakeRef.current = newStake;
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
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Debe conectarse a Deriv primero');
            return false;
        }

        // Reset state
        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        isWaitingForContractRef.current = false;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
        });
        setLogs([]);

        // Notify Global Session
        setActiveBot('Xtreme Bot');

        // Add message listener
        socket.addEventListener('message', handleMessage);

        // First, forget all tick subscriptions
        socket.send(JSON.stringify({ forget_all: 'ticks' }));

        // Then subscribe to ticks
        setTimeout(() => {
            const tickRequest = {
                ticks: config.symbol || 'R_100',
                subscribe: 1,
            };
            socket.send(JSON.stringify(tickRequest));
        }, 100);

        addLog(`🚀 Xtreme Bot iniciado en ${config.symbol || 'R_100'}`, 'success');
        addLog(`💰 Stake: $${config.stake} | TP: $${config.takeProfit} | SL: $${config.stopLoss}`, 'info');
        addLog(`📊 Estrategia: DIGITDIFF cuando dígito = ${TRIGGER_DIGIT}`, 'info');
        addLog(`📈 Martingale: stake + (pérdida × 2)`, 'info');
        addLog(`⏳ Esperando dígito ${TRIGGER_DIGIT}...`, 'info');

        setIsRunning(true);
        return true;
    }, [socket, isConnected, handleMessage, addLog, setActiveBot]);

    // Stop the bot
    const stopBot = useCallback(() => {
        if (socket) {
            socket.removeEventListener('message', handleMessage);
        }

        setActiveBot(null);
        addLog('🛑 Xtreme Bot detenido', 'warning');
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
