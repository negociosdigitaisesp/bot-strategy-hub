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

export const useBotMaquina = () => {
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
    const lastDigitsRef = useRef<number[]>([]);

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

    // Check if all digits are even
    const areAllEven = (digits: number[]) => {
        return digits.every(d => d % 2 === 0);
    };

    // Check if all digits are odd
    const areAllOdd = (digits: number[]) => {
        return digits.every(d => d % 2 !== 0);
    };

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick updates - collect last 3 digits
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(2); // R_75 has 2 decimal places
            const lastDigit = parseInt(quote.charAt(quote.length - 1));

            // Update last digits array
            lastDigitsRef.current = [...lastDigitsRef.current, lastDigit].slice(-3);

            // Log every few ticks
            if (Math.random() < 0.2) {
                addLog(`📊 Últimos dígitos: [${lastDigitsRef.current.join(', ')}]`, 'info');
            }

            // Entry condition: we have 3 digits collected
            if (!isWaitingForContractRef.current && lastDigitsRef.current.length === 3 && socket && configRef.current) {
                const digits = lastDigitsRef.current;
                let contractType: string | null = null;

                // Check if all 3 are even -> buy ODD
                if (areAllEven(digits)) {
                    contractType = 'DIGITODD';
                    addLog(`🎯 ¡3 dígitos PARES detectados! Comprando DIGITODD...`, 'success');
                }
                // Check if all 3 are odd -> buy EVEN
                else if (areAllOdd(digits)) {
                    contractType = 'DIGITEVEN';
                    addLog(`🎯 ¡3 dígitos IMPARES detectados! Comprando DIGITEVEN...`, 'success');
                }

                if (contractType) {
                    isWaitingForContractRef.current = true;
                    const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));

                    // Send buy request
                    const buyRequest = {
                        buy: 1,
                        subscribe: 1,
                        price: 100,
                        parameters: {
                            contract_type: contractType,
                            symbol: configRef.current.symbol || 'R_75',
                            currency: 'USD',
                            amount: stakeAmount,
                            basis: 'stake',
                            duration: 1,
                            duration_unit: 't',
                        }
                    };

                    socket.send(JSON.stringify(buyRequest));
                    addLog(`🛒 Orden: ${contractType} | Stake: $${stakeAmount.toFixed(2)}`, 'info');

                    // Reset digits after trade
                    lastDigitsRef.current = [];
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
                    // LOSS - Apply Martingale
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 Perdimos: -$${lossAmount.toFixed(2)}`, 'error');

                    const newStake = parseFloat((currentStakeRef.current * (configRef.current?.martingaleFactor || 2.5)).toFixed(2));
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
        lastDigitsRef.current = [];

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
        });
        setLogs([]);

        // Notify Global Session
        setActiveBot('Maquina del Ganancias');

        // Add message listener
        socket.addEventListener('message', handleMessage);

        // First, forget all tick subscriptions
        socket.send(JSON.stringify({ forget_all: 'ticks' }));

        // Then subscribe to ticks
        setTimeout(() => {
            const tickRequest = {
                ticks: config.symbol || 'R_75',
                subscribe: 1,
            };
            socket.send(JSON.stringify(tickRequest));
        }, 100);

        addLog(`🚀 Maquina del Ganancias iniciado en ${config.symbol || 'R_75'}`, 'success');
        addLog(`💰 Stake: $${config.stake} | TP: $${config.takeProfit} | SL: $${config.stopLoss}`, 'info');
        addLog(`📊 Estrategia: 3 PARES → DIGITODD | 3 IMPARES → DIGITEVEN`, 'info');
        addLog(`📈 Martingale: x${config.martingaleFactor}`, 'info');
        addLog(`⏳ Recolectando dígitos...`, 'info');

        setIsRunning(true);
        return true;
    }, [socket, isConnected, handleMessage, addLog, setActiveBot]);

    // Stop the bot
    const stopBot = useCallback(() => {
        if (socket) {
            socket.removeEventListener('message', handleMessage);
        }

        setActiveBot(null);
        addLog('🛑 Maquina del Ganancias detenido', 'warning');
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
