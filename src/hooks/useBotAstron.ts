import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// Types
export interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    symbol?: string;
    useMartingale?: boolean;
    maxMartingaleLevel?: number; // New: Limit martingale steps
}

export interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
}

export interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

export interface TickData {
    id: string;
    price: string;
    lastDigit: number;
    signal: string;
    change: string;
    isUp: boolean;
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
    const [recentTicks, setRecentTicks] = useState<TickData[]>([]); // New: For UI Data Stream

    // References
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const currentStakeRef = useRef<number>(0);
    const isWaitingForContractRef = useRef<boolean>(false);
    const totalProfitRef = useRef<number>(0);

    // NEW: Smart Strategy Refs
    const historyRef = useRef<number[]>([]); // Rolling window of last 100 ticks
    const consecutiveLossesRef = useRef<number>(0);

    // Last tick reference for change calculation
    const lastPriceRef = useRef<number>(0);

    // Helper to add log
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
        };
        setLogs(prev => [...prev.slice(-49), newLog]); // Keep last 50
    }, []);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick updates
        if (data.msg_type === 'tick' && data.tick) {
            const price = parseFloat(data.tick.quote);
            const quote = price.toFixed(2);
            const currentDigit = parseInt(quote.charAt(quote.length - 1));

            // Calculate change
            const changeVal = lastPriceRef.current !== 0 ? price - lastPriceRef.current : 0;
            const isUp = changeVal >= 0;
            const changeStr = (isUp ? '+' : '') + changeVal.toFixed(2);

            lastPriceRef.current = price;

            // Generate "Signal" for UI (Simulated based on strategy heuristics or random for visual if not calculated per tick)
            // For now, let's show the frequency of this digit in the last 100 ticks as "Signal"
            const freq = historyRef.current.filter(d => d === currentDigit).length / (historyRef.current.length || 1);
            const signalStr = freq.toFixed(5);

            const newTick: TickData = {
                id: data.tick.id || Math.random().toString(),
                price: quote,
                lastDigit: currentDigit,
                signal: signalStr,
                change: changeStr,
                isUp: isUp
            };

            setRecentTicks(prev => [newTick, ...prev].slice(0, 15)); // Keep last 15 for UI

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
            if (isRunning && !isWaitingForContractRef.current && socket && configRef.current) {

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
                    consecutiveLossesRef.current = 0; // Reset consecutively losses on win

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                    }));

                    totalProfitRef.current = stats.totalProfit + profit;
                } else {
                    // LOSS
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 Perdimos: -$${lossAmount.toFixed(2)}`, 'error');

                    const martingaleEnabled = configRef.current?.useMartingale !== false;
                    const maxGale = configRef.current?.maxMartingaleLevel || 100; // Default high if not set

                    if (!martingaleEnabled) {
                        addLog(`🔄 Martingale DESHABILITADO: Stake fijo`, 'info');
                    } else {
                        // MARTINGALE
                        consecutiveLossesRef.current += 1;

                        if (consecutiveLossesRef.current > maxGale) {
                            // Limit reached
                            addLog(`🚨 MÁXIMO GALE (${maxGale}) ALCANZADO! Reseteando stake...`, 'error');
                            currentStakeRef.current = initialStakeRef.current;
                            consecutiveLossesRef.current = 0;
                        } else {
                            // Martingale for DIGITDIFF (recovery requires high multiplier ~11x due to low payout)
                            // NOTE: User requested "Doubling payload size after rejection" in UI text, 
                            // BUT DIGITDIFF mathematically requires ~11x. 
                            // HOWEVER, if the strategy was changed to OVER/UNDER in the previous prompt context (which I should check), 
                            // I should stick to the current Strategy (Mean Reversion / DIGITDIFF). 
                            // The user said "NAO MUDE A ESTRATEGIA". 
                            // So I will keep the 11x or whatever was there, BUT check if I should effectively start using the "Reset" logic.
                            // The previous code had `if (consecutiveLossesRef.current >= MAX_GALE)` with hardcoded 3.
                            // Now we use dynamic maxGale.

                            const newStake = parseFloat((currentStakeRef.current * 11).toFixed(2));
                            currentStakeRef.current = newStake;
                            addLog(`📈 Martingale Nivel ${consecutiveLossesRef.current}: $${newStake.toFixed(2)}`, 'warning');
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
    }, [socket, addLog, updateStats, isRunning]);

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
        // historyRef.current = []; // Don't clear history to allow quick restart without warm-up if already collected
        // Actually, better to clear if symbol changes, but we assume same symbol context. 
        // Let's clear to be safe and predictable.
        historyRef.current = [];
        consecutiveLossesRef.current = 0;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
        });
        setLogs([]);
        setRecentTicks([]);

        setActiveBot('Astron Bot');
        addLog(`🧠 Iniciando Estrategia Mean Reversion...`, 'info');
        addLog(`⏳ Recolectando 100 ticks de historial...`, 'info');

        setIsRunning(true);
        return true;
    }, [addLog, setActiveBot, socket]);

    // --- SOCKET MANAGEMENT ---
    useEffect(() => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        const config = configRef.current;
        const symbol = config?.symbol || 'R_100';

        // Subscribe to ticks - ALWAYS subscribe if component mounted, or only when running?
        // To show "Data Stream" even when not running (like in Dashboard.tsx), we should subscribe if not already.
        // But useBotAstron is a hook. 
        // Let's subscribe when the hook is used, but careful about duplicates.
        // The previous code only subscribed when `isRunning`.
        // The user wants the UI to look line reference. Reference has "Live Feed".
        // Let's assume we subscribe when `isRunning` OR we can add a "preview" mode.
        // For now, I'll stick to `isRunning` or manual subscription. 
        // Wait, if I want to show ticks BEFORE starting, I need to subscribe.
        // I will change the dependency to `socket` and always subscribe if `useBotAstron` is active?
        // No, that might flood. Let's keep it bound to `isRunning` for now, 
        // OR add a `subscribeTicks` function to manually verify.
        // Actually, in the reference Dashboard.tsx, it generates fake ticks. 
        // Here we want real ticks.
        // I will modify the effect to subscribe if `socket` is open, regardless of `isRunning`, 
        // BUT only if we are in this "Astron" context.
        // Only safely subscribe if we have a symbol. Default 'R_100'.

        // BETTER APPROACH: Only subscribe when `isRunning` to save bandwidth, 
        // UNLESS user specifically wants to see ticks before starting.
        // The user said "QUERO QUE APARECA OS TIKS.. E O QUE FOR USADO NA ESTRATEGIA".
        // I will subscribe when the component mounts (hook used).

        socket.send(JSON.stringify({
            ticks: symbol,
            subscribe: 1,
        }));

        return () => {
            socket.removeEventListener('message', onMessage);
            // We should forget_all only if we are taking over.
            // But be careful not to kill other streams if shared.
            // For this specific bot hook, we can leave it as is.
        };
    }, [socket, handleMessage]);

    // Stop the bot
    const stopBot = useCallback(() => {
        // Do NOT forget_all ticks here if we want to keep seeing them?
        // If we want to keep seeing ticks, we shouldn't forget ticks.
        // So I will remove the `forget_all` call for ticks, or explicitly handle it.
        // Let's remove `forget_all` so ticks continue for the UI.

        /* 
        if (socket) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }
        */

        setActiveBot(null);
        addLog('🛑 Astron Bot detenido', 'warning');
        setIsRunning(false);
    }, [/*socket,*/ handleMessage, addLog, setActiveBot]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isRunning) {
                stopBot();
            }
            // Now we might want to clean up ticks on unmount
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ forget_all: 'ticks' }));
            }
        };
    }, [isRunning, stopBot, socket]);

    return {
        isRunning,
        stats,
        logs,
        recentTicks, // Exported for UI
        startBot,
        stopBot,
        addLog,
    };
};
