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
    useMartingale?: boolean;
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

export const useBotAstron = () => {
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
    const totalProfitRef = useRef<number>(0);

    // NEW: Smart Strategy Refs
    const historyRef = useRef<number[]>([]); // Rolling window of last 100 ticks
    const consecutiveLossesRef = useRef<number>(0);
    const MAX_GALE = 3;

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

        // Handle tick updates
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(2);
            const currentDigit = parseInt(quote.charAt(quote.length - 1));

            // Update History (Rolling Window 100)
            if (historyRef.current.length >= 100) {
                historyRef.current.shift();
            }
            historyRef.current.push(currentDigit);

            // WARM-UP PHASE
            if (historyRef.current.length < 100) {
                if (historyRef.current.length % 25 === 0) {
                    addLog(`⏳ Calentamiento: ${historyRef.current.length}/100 ticks recolectados`, 'info');
                }
                return; // Do not trade yet
            }

            // STRATEGY: Statistical Mean Reversion
            if (!isWaitingForContractRef.current && socket && configRef.current) {

                // 1. Calculate Frequencies
                const counts = new Array(10).fill(0);
                historyRef.current.forEach(d => counts[d]++);

                // 2. Find "Coldest" Digit (Lowest Frequency)
                let minFreq = 1.0;
                let coldDigit = -1;

                for (let i = 0; i < 10; i++) {
                    const freq = counts[i] / 100;
                    if (freq < minFreq) {
                        minFreq = freq;
                        coldDigit = i;
                    }
                }

                // 3. Calculate Deviation & Confidence
                const expectedFreq = 0.10; // 10%
                const deviation = expectedFreq - minFreq;
                // Confidence: scaled so that 4% deviation = 50% confidence. Max 100%.
                const confidence = Math.min(1.0, deviation / 0.08);

                // 4. Entry Condition
                // Deviation >= 0.04 (4%) -> which implies Confidence >= 0.5 (50%)
                if (deviation >= 0.04) {
                    isWaitingForContractRef.current = true;
                    const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));
                    const percentageConfidence = (confidence * 100).toFixed(1);

                    addLog(`🎯 Señal: Dígito ${coldDigit} frío (${(minFreq * 100).toFixed(0)}%). Desviación: ${(deviation * 100).toFixed(1)}%. Confianza: ${percentageConfidence}%`, 'success');

                    // 5. Place Trade: DIGITDIFF (Betting that the cold digit will NOT appear next)
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
                            barrier: coldDigit.toString(),
                        }
                    };

                    socket.send(JSON.stringify(buyRequest));
                    addLog(`🛒 Orden: DIFF ${coldDigit} | Confianza: ${percentageConfidence}% | Stake: $${stakeAmount.toFixed(2)}`, 'info');
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
                    // WIN
                    addLog(`🎉 ¡GANAMOS! +$${profit.toFixed(2)}`, 'success');
                    currentStakeRef.current = initialStakeRef.current; // Reset stake

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                    }));

                    consecutiveLossesRef.current = 0;
                    totalProfitRef.current = stats.totalProfit + profit;
                } else {
                    // LOSS
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 Perdimos: -$${lossAmount.toFixed(2)}`, 'error');

                    const martingaleEnabled = configRef.current?.useMartingale !== false;

                    if (!martingaleEnabled) {
                        addLog(`🔄 Martingale DESHABILITADO: Stake fijo`, 'info');
                    } else {
                        // MARTINGALE
                        consecutiveLossesRef.current += 1;

                        if (consecutiveLossesRef.current >= MAX_GALE) {
                            addLog(`🚨 MÁXIMO GALE (${MAX_GALE}) ALCANZADO! Reseteando stake...`, 'error');
                            currentStakeRef.current = initialStakeRef.current;
                            consecutiveLossesRef.current = 0;
                        } else {
                            // Martingale for DIGITDIFF (recovery requires high multiplier ~11x due to low payout)
                            const newStake = parseFloat((currentStakeRef.current * 11).toFixed(2));
                            currentStakeRef.current = newStake;
                            addLog(`📈 Martingale (DIGITDIFF): $${newStake.toFixed(2)}`, 'warning');
                        }
                    }

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: currentStakeRef.current,
                    }));

                    totalProfitRef.current = stats.totalProfit + profit;
                }

                // Check Stop Loss / Take Profit
                if (configRef.current) {
                    if (totalProfitRef.current >= configRef.current.takeProfit) {
                        toast.success('¡Take Profit alcanzado!');
                        stopBot();
                        return;
                    }
                    if (totalProfitRef.current <= -configRef.current.stopLoss) {
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
        historyRef.current = []; // Clear history
        consecutiveLossesRef.current = 0;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
        });
        setLogs([]);

        setActiveBot('Astron Bot');
        addLog(`🧠 Iniciando Estrategia Mean Reversion...`, 'info');
        addLog(`⏳ Recolectando 100 ticks de historial...`, 'info');

        setIsRunning(true);
        return true;
    }, [addLog, setActiveBot]);

    // --- SOCKET MANAGEMENT ---
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        const config = configRef.current;
        const symbol = config?.symbol || 'R_100';

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
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        setActiveBot(null);
        addLog('🛑 Astron Bot detenido', 'warning');
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
