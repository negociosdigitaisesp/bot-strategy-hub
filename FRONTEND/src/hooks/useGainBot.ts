import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// Types
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    martingaleSplit: number; // Defaults to 2
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

export const useGainBot = () => {
    const { socket, account } = useDeriv();
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

    // Strategy State Refs
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const winStakeRef = useRef<number>(0); // Store initial stake for reset
    const currentStakeRef = useRef<number>(0);
    const totalLostRef = useRef<number>(0);
    const countLossRef = useRef<number>(0);
    const nextTradeRef = useRef<string>('OVER 2');
    const binaryToolRef = useRef<string>('Instagram - @miguelltrader'); // Initial value from XML
    const totalProfitRef = useRef<number>(0);

    const isWaitingForContractRef = useRef<boolean>(false);

    // Handler Ref for Cleanup
    const handleMessageRef = useRef<((event: MessageEvent) => void) | null>(null);

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

    // Stop Bot Logic - Defined early
    const stopBot = useCallback(() => {
        // Listener removal handled by useEffect cleanup
        if (socket) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        setActiveBot(null);
        setIsRunning(false);
        addLog('🛑 Bot Detenido', 'warning');
    }, [socket, setActiveBot, addLog]);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Handle tick updates
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(2);
            const lastDigit = parseInt(quote.charAt(quote.length - 1));

            if (!isWaitingForContractRef.current && socket && configRef.current) {

                let signal = false;
                let tradeType: 'DIGITOVER' | 'DIGITUNDER' | null = null;
                let prediction = 0;

                const isBinaryToolActive = binaryToolRef.current === 'app.binarytool.site/bot';

                if (isBinaryToolActive) {
                    if (nextTradeRef.current === 'OVER 2') {
                        signal = true;
                        tradeType = 'DIGITOVER';
                        prediction = 2;
                        addLog(`⚡ Modo Rápido: NextTrade OVER 2 -> Buying OVER 2`, 'info');
                    } else {
                        signal = true;
                        tradeType = 'DIGITUNDER';
                        prediction = 8;
                        addLog(`⚡ Modo Rápido: NextTrade NOT OVER 2 -> Buying UNDER 8`, 'info');
                    }
                } else {
                    if (nextTradeRef.current === 'OVER 2') {
                        if (lastDigit === 7) {
                            signal = true;
                            tradeType = 'DIGITOVER';
                            prediction = 2;
                            addLog(`🎯 Señal: Dígito 7 detectado -> Compra OVER 2`, 'success');
                        }
                    } else {
                        if (lastDigit === 2) {
                            signal = true;
                            tradeType = 'DIGITUNDER';
                            prediction = 8;
                            addLog(`🎯 Señal: Dígito 2 detectado -> Compra UNDER 8`, 'success');
                        }
                    }
                }

                if (signal && tradeType) {
                    isWaitingForContractRef.current = true;

                    const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));
                    const currency = account?.currency || 'USD';

                    const buyRequest = {
                        buy: 1,
                        price: 100,
                        parameters: {
                            contract_type: tradeType,
                            symbol: 'R_100',
                            currency: currency,
                            amount: stakeAmount,
                            basis: 'stake',
                            duration: 1,
                            duration_unit: 't',
                            barrier: prediction.toString(),
                        }
                    };

                    socket.send(JSON.stringify(buyRequest));
                    addLog(`🛒 Enviando Orden: ${tradeType} ${prediction} | Stake: $${stakeAmount}`, 'info');
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
            addLog(`✅ Orden Ejecutada: ID ${data.buy.contract_id}`, 'info');
        }

        // Handle contract result
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
            const contract = data.proposal_open_contract;

            if (contract.is_sold) {
                isWaitingForContractRef.current = false;
                const profit = parseFloat(contract.profit);
                const isWin = profit > 0;

                updateStats(profit, isWin);

                if (isWin) {
                    addLog(`🎉 WIN: +$${profit.toFixed(2)}`, 'success');

                    totalLostRef.current -= profit;
                    if (totalLostRef.current < 0) totalLostRef.current = 0;

                    if (nextTradeRef.current === 'OVER 1') {
                        nextTradeRef.current = 'UNDER 8';
                    } else {
                        nextTradeRef.current = 'OVER 1';
                    }

                    binaryToolRef.current = 'app.binarytool.site/bot';

                    if (totalLostRef.current > 0) {
                        countLossRef.current += 1;

                        if (countLossRef.current === 1) {
                            const factor = 100 / 35;
                            const recoveryStake = (totalLostRef.current / factor) / (configRef.current?.martingaleSplit || 2);
                            let nextStake = parseFloat(recoveryStake.toFixed(2));
                            if (nextStake < 0.35) nextStake = 0.35;

                            currentStakeRef.current = nextStake;
                            addLog(`📉 Recuperación Activada (Intento 1). Nuevo Stake: $${nextStake}`, 'warning');
                        } else {
                            countLossRef.current = 0;
                            currentStakeRef.current = winStakeRef.current;
                            addLog(`🔄 Reset Stake tras intento fallido`, 'info');
                        }
                    } else {
                        countLossRef.current = 0;
                        currentStakeRef.current = winStakeRef.current;
                    }

                } else {
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 LOSS: -$${lossAmount.toFixed(2)}`, 'error');

                    totalLostRef.current += lossAmount;
                    binaryToolRef.current = 'app.binarytool.site';

                    if (nextTradeRef.current === 'OVER 1') {
                        nextTradeRef.current = 'UNDER 8';
                    } else {
                        nextTradeRef.current = 'OVER 1';
                    }

                    if (totalLostRef.current > 0) {
                        countLossRef.current += 1;

                        if (countLossRef.current === 1) {
                            const factor = 100 / 35;
                            const recoveryStake = (totalLostRef.current / factor) / (configRef.current?.martingaleSplit || 2);
                            let nextStake = parseFloat(recoveryStake.toFixed(2));
                            if (nextStake < 0.35) nextStake = 0.35;

                            currentStakeRef.current = nextStake;
                            addLog(`📉 Recuperación Activada (Intento 1). Nuevo Stake: $${nextStake}`, 'warning');
                        } else {
                            countLossRef.current = 0;
                            currentStakeRef.current = winStakeRef.current;
                            addLog(`🔄 Reset Stake tras intento fallido`, 'info');
                        }
                    }
                }

                if (currentStakeRef.current < 0.35) currentStakeRef.current = 0.35;

                if (totalProfitRef.current >= (configRef.current?.takeProfit || 100)) {
                    addLog(`🏆 TAKE PROFIT ALCANZADO`, 'success');
                    stopBot();
                } else if (totalProfitRef.current <= -(configRef.current?.stopLoss || 100)) {
                    addLog(`🛑 STOP LOSS ALCANZADO`, 'error');
                    stopBot();
                }

                setStats(prev => ({
                    ...prev,
                    wins: isWin ? prev.wins + 1 : prev.wins,
                    losses: isWin ? prev.losses : prev.losses + 1,
                    totalProfit: prev.totalProfit + profit,
                    currentStake: currentStakeRef.current,
                }));

                totalProfitRef.current = prev.totalProfit + profit;
            }
        }

    }, [socket, updateStats, addLog, stopBot]); // StopBot is stable now

    // Start Bot
    const startBot = useCallback((config: BotConfig) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Deriv no conectado');
            return false;
        }

        // Store handleMessage in ref for cleanup
        handleMessageRef.current = handleMessage;

        configRef.current = config;
        initialStakeRef.current = config.stake;
        winStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        totalLostRef.current = 0;
        countLossRef.current = 0;
        nextTradeRef.current = 'OVER 2';
        binaryToolRef.current = 'Instagram - @miguelltrader';
        isWaitingForContractRef.current = false;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
        });
        setLogs([]);
        setActiveBot('Gain Bot');

        addLog(`💰 Stake Inicial: $${config.stake} | Split: ${config.martingaleSplit}`, 'info');
        setIsRunning(true);
        return true;

    }, [addLog, setActiveBot]);

    // --- SOCKET MANAGEMENT ---
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        handleMessageRef.current = onMessage; // Update ref for cleanup logic if used elsewhere
        socket.addEventListener('message', onMessage);

        // Subscribe to ticks
        socket.send(JSON.stringify({
            ticks: 'R_100',
            subscribe: 1,
        }));

        return () => {
            socket.removeEventListener('message', onMessage);
            handleMessageRef.current = null;
        };
    }, [isRunning, socket, handleMessage]);

    // Cleanup on unmount
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cleanup handled by socket effect
        };
    }, []);

    return { isRunning, stats, logs, startBot, stopBot };
};
