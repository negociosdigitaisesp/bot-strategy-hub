import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { toast } from 'sonner';

// Types
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    martingaleFactor: number;
    symbol?: string;
    growthRate?: number;
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

type TrendColor = 'Red' | 'Blue';

export const useBotSX = () => {
    const { socket, isConnected } = useDeriv();

    // Bot State
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // References for state that needs to persist across renders in callbacks
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const totalLostRef = useRef<number>(0);
    const ticksRef = useRef<number[]>([]);
    const isWaitingForContractRef = useRef<boolean>(false);
    const subscriptionIdRef = useRef<string | null>(null);

    const contractIdRef = useRef<number | null>(null);
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

    // Determine trend color based on tick comparison
    // Red = price went DOWN (older > newer), Blue = price went UP (newer > older)
    const getTrendColor = (older: number, newer: number): TrendColor => {
        return older > newer ? 'Red' : 'Blue';
    };

    // Check entry condition: 3 consecutive drops then 1 rise
    // Pattern: tick4>tick3 (Red), tick3>tick2 (Red), tick2>tick1 (Red), tick1<current (Blue)
    const checkEntryCondition = useCallback((ticks: number[]): boolean => {
        if (ticks.length < 5) return false;

        const currentTick = ticks[ticks.length - 1];
        const tick1 = ticks[ticks.length - 2];
        const tick2 = ticks[ticks.length - 3];
        const tick3 = ticks[ticks.length - 4];
        const tick4 = ticks[ticks.length - 5];

        // Original pattern from XML:
        // single4 = tick4 > tick3 ? Red : Blue
        // single3 = tick3 > tick2 ? Red : Blue
        // single2 = tick2 > tick1 ? Red : Blue
        // single1 = tick1 > currentTick ? Red : Blue
        // Entry when: single1=Blue AND single2=Red AND single3=Red AND single4=Red

        const single1 = getTrendColor(tick1, currentTick); // Blue if current > tick1 (rose)
        const single2 = getTrendColor(tick2, tick1);       // Red if tick2 > tick1 (dropped)
        const single3 = getTrendColor(tick3, tick2);       // Red if tick3 > tick2 (dropped)
        const single4 = getTrendColor(tick4, tick3);       // Red if tick4 > tick3 (dropped)

        // Log pattern every 10 ticks for debugging
        if (ticks.length % 10 === 0) {
            console.log(`Pattern: ${single1}-${single2}-${single3}-${single4}`);
        }

        // MODO MENOS ESTRICTO: Solo necesita 2 Reds + 1 Blue para entrar más frecuente
        // Puedes cambiar esto a la condición original si prefieres:
        // return single1 === 'Blue' && single2 === 'Red' && single3 === 'Red' && single4 === 'Red';

        // Condición simplificada: subió después de bajar 2 veces
        return single1 === 'Blue' && single2 === 'Red' && single3 === 'Red';
    }, []);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick updates
        if (data.msg_type === 'tick' && data.tick) {
            const tick = parseFloat(data.tick.quote);
            ticksRef.current.push(tick);

            // Keep only last 10 ticks
            if (ticksRef.current.length > 10) {
                ticksRef.current = ticksRef.current.slice(-10);
            }

            // Log every 5th tick for debug
            if (ticksRef.current.length % 5 === 0) {
                addLog(`📈 Tick: ${tick.toFixed(2)} (${ticksRef.current.length} ticks)`, 'info');
            }

            // Check entry if not waiting for contract and we have enough ticks
            if (!isWaitingForContractRef.current && ticksRef.current.length >= 5) {
                const shouldEnter = checkEntryCondition(ticksRef.current);

                if (shouldEnter && socket && configRef.current) {
                    isWaitingForContractRef.current = true;
                    addLog(`🎯 ¡Patrón detectado! Ejecutando compra...`, 'success');

                    // Send buy request for Accumulator
                    const buyRequest = {
                        buy: 1,
                        subscribe: 1,
                        price: 100, // Max payout
                        parameters: {
                            contract_type: 'ACCU',
                            symbol: configRef.current.symbol || 'R_10',
                            currency: 'USD',
                            amount: stats.currentStake,
                            basis: 'stake',
                            growth_rate: configRef.current.growthRate || 0.02,
                            limit_order: {
                                take_profit: configRef.current.takeProfit
                            }
                        }
                    };

                    socket.send(JSON.stringify(buyRequest));
                    addLog(`🛒 Orden enviada: Stake $${stats.currentStake.toFixed(2)}`, 'info');
                }
            }
        }

        // Handle buy response
        if (data.msg_type === 'buy' && data.buy) {
            contractIdRef.current = data.buy.contract_id;
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
                    // WIN
                    addLog(`🎉 ¡GANAMOS! +$${profit.toFixed(2)}`, 'success');
                    totalLostRef.current = 0;

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                    }));

                    totalProfitRef.current = prev.totalProfit + profit;
                } else {
                    // LOSS - Apply Martingale
                    addLog(`💥 Perdimos: $${Math.abs(profit).toFixed(2)}`, 'error');
                    totalLostRef.current += Math.abs(profit);

                    const newStake = totalLostRef.current * (configRef.current?.martingaleFactor || 1);

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: newStake,
                    }));

                    totalProfitRef.current = prev.totalProfit + profit;

                    addLog(`📈 Martingale: Próximo stake $${newStake.toFixed(2)}`, 'warning');
                }


                // Check Stop Loss / Take Profit
                if (configRef.current) {
                    if (totalProfitRef.current >= configRef.current.takeProfit) {
                        addLog(`🏆 ¡META ALCANZADA! Ganancia total: $${totalProfitRef.current.toFixed(2)}`, 'success');
                        toast.success('¡Take Profit alcanzado!');
                        stopBot();
                        return;
                    }
                    if (totalProfitRef.current <= -configRef.current.stopLoss) {
                        addLog(`🛑 STOP LOSS activado. Pérdida: $${Math.abs(totalProfitRef.current).toFixed(2)}`, 'error');
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
            isWaitingForContractRef.current = false;
        }
    }, [socket, stats.currentStake, addLog, checkEntryCondition]);

    // Start the bot
    const startBot = useCallback((config: BotConfig) => {
        if (!socket || !isConnected) {
            toast.error('Debe conectarse a Deriv primero');
            return false;
        }

        // Reset state
        configRef.current = config;
        initialStakeRef.current = config.stake;
        totalLostRef.current = 0;
        ticksRef.current = [];
        isWaitingForContractRef.current = false;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
        });
        setLogs([]);

        addLog(`⏳ Analizando mercado...`, 'info');

        setIsRunning(true);
        return true;
    }, [addLog]);

    // --- SOCKET MANAGEMENT ---
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        const config = configRef.current;
        const symbol = config?.symbol || 'R_10';

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
            // Unsubscribe from ticks
            if (subscriptionIdRef.current) {
                socket.send(JSON.stringify({ forget: subscriptionIdRef.current }));
            }
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        addLog('🛑 Bot detenido por el usuario', 'warning');
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
