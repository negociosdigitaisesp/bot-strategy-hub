import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { toast } from 'sonner';

// Types
interface BotConfig {
    stake: number;                  // Aposta Inicial
    stopLoss: number;               // Máximo de Perda
    takeProfit: number;             // Lucro Esperado
    sorosRounds: number;            // Qtde Soros (compound interest rounds, default 12)
    martingaleCount: number;        // Qtde Martingale (0 = disabled)
    martingaleDivision: number;     // Divisão MG (0 = no division)
    martingaleMultiplier: number;   // Multiplicador Martingale (default 12)
    symbol?: string;                // R_100
}

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    sorosCount: number;
    sorosHits: number;
    maxConsecutiveWins: number;
    drawdown: number;
    currentDigit: number;
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

export const useBotQuantum = () => {
    const { socket, isConnected, account } = useDeriv();

    // Bot State
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0,
        sorosCount: 0,
        sorosHits: 0,
        maxConsecutiveWins: 0,
        drawdown: 0,
        currentDigit: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // References (from XML variables)
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const auxStakeRef = useRef<number>(0);      // Aux. Aposta
    const currentStakeRef = useRef<number>(0);  // Aposta Inicial
    const mgStakeRef = useRef<number>(0);       // Aposta Mg
    const digitRef = useRef<number>(0);         // DIGITO
    const sorosCountRef = useRef<number>(0);    // Cont Soros
    const sorosHitsRef = useRef<number>(0);     // SOROS ACERTADOS
    const mgCounterRef = useRef<number>(0);     // Contador Martingale
    const mgDivCountRef = useRef<number>(0);    // Cont Divisão MG
    const winCountRef = useRef<number>(0);      // Cont W
    const lossCountRef = useRef<number>(0);     // Count L
    const consecutiveWinsRef = useRef<number>(0);// Cont. Max win consecutivo.
    const maxConsecutiveWinsRef = useRef<number>(0);// Max win consecutivo
    const drawdownRef = useRef<number>(0);      // DrawDown
    const totalProfitRef = useRef<number>(0);   // Track total profit in ref to avoid dependency issues
    const isWaitingForContractRef = useRef<boolean>(false);
    const isRunningRef = useRef<boolean>(false); // Track running state in ref
    const handlerRef = useRef<((event: MessageEvent) => void) | null>(null);

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

    // Generate random digit 0-9
    const generateRandomDigit = useCallback(() => {
        return Math.floor(Math.random() * 10);
    }, []);

    // Stop the bot - defined first as it's used in handleMessage
    const stopBot = useCallback(() => {
        if (!isRunningRef.current) return; // Prevent double stop

        isRunningRef.current = false;

        if (socket) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        addLog('🛑 Quantum Bot detenido', 'warning');
        setIsRunning(false);
    }, [socket, addLog]);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        if (!isRunningRef.current) return; // Exit early if not running

        const data = JSON.parse(event.data);

        // Handle tick updates
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(2); // R_100 has 2 decimal places
            const lastDigit = parseInt(quote.charAt(quote.length - 1));

            // Log every 5th tick
            if (Math.random() < 0.2) {
                addLog(`📊 Tick: ${quote} | Dígito actual: ${lastDigit}`, 'info');
            }

            // Enter trade if not waiting
            if (!isWaitingForContractRef.current && socket && configRef.current) {
                isWaitingForContractRef.current = true;

                const stakeAmount = currentStakeRef.current;
                const prediction = digitRef.current;
                const currency = account?.currency || 'USD';

                addLog(`🎯 DIGITDIFF ≠${prediction} | Stake: $${stakeAmount.toFixed(2)}`, 'success');

                setStats(prev => ({ ...prev, currentDigit: prediction }));

                // Send buy request for DIGITDIFF
                const buyRequest = {
                    buy: 1,
                    subscribe: 1,
                    price: 100,
                    parameters: {
                        contract_type: 'DIGITDIFF',
                        symbol: configRef.current.symbol || 'R_100',
                        currency: currency,
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

                // Update digit after purchase (from XML: DIGITO = random + 1, reset if > 9)
                digitRef.current = generateRandomDigit();
                digitRef.current += 1;
                if (digitRef.current > 9) {
                    digitRef.current = generateRandomDigit();
                }

                // Update total profit ref
                totalProfitRef.current += profit;

                // Update drawdown
                if (drawdownRef.current > totalProfitRef.current) {
                    drawdownRef.current = totalProfitRef.current;
                }

                if (isWin) {
                    // WIN
                    addLog(`🎉 ¡GANAMOS! +$${profit.toFixed(2)}`, 'success');

                    winCountRef.current += 1;
                    consecutiveWinsRef.current += 1;

                    if (consecutiveWinsRef.current > maxConsecutiveWinsRef.current) {
                        maxConsecutiveWinsRef.current = consecutiveWinsRef.current;
                    }

                    addLog(`📊 Drawdown Máximo: ${drawdownRef.current.toFixed(2)}`, 'success');
                    addLog(`🎯 SOROS Nº: ${sorosCountRef.current}`, 'success');

                    const config = configRef.current!;

                    // Soros logic (compound interest)
                    if (config.sorosRounds > sorosCountRef.current && mgDivCountRef.current === 0) {
                        // Continue Soros: stake = abs(profit) + current stake
                        currentStakeRef.current = Math.abs(profit) + currentStakeRef.current;
                        sorosCountRef.current += 1;
                    } else if (config.sorosRounds === sorosCountRef.current && mgDivCountRef.current === 0) {
                        // Completed Soros cycle
                        addLog(`🏆 ¡SOROS COMPLETADO!`, 'success');
                        sorosHitsRef.current += 1;
                        sorosCountRef.current = 0;
                        currentStakeRef.current = auxStakeRef.current;
                    } else if (mgDivCountRef.current > 0 && mgDivCountRef.current < config.martingaleDivision) {
                        // Martingale division in progress
                        mgDivCountRef.current += 1;
                        currentStakeRef.current = mgStakeRef.current;
                    } else if (mgDivCountRef.current > 0 && mgDivCountRef.current === config.martingaleDivision) {
                        // Martingale division completed
                        currentStakeRef.current = auxStakeRef.current;
                        mgDivCountRef.current = 0;
                        mgCounterRef.current = 0;
                    }

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: totalProfitRef.current,
                        currentStake: currentStakeRef.current,
                        sorosCount: sorosCountRef.current,
                        sorosHits: sorosHitsRef.current,
                        maxConsecutiveWins: maxConsecutiveWinsRef.current,
                        drawdown: drawdownRef.current,
                    }));
                } else {
                    // LOSS
                    const lossAmount = Math.abs(profit);
                    addLog(`💥 PERDIMOS: -$${lossAmount.toFixed(2)}`, 'error');

                    lossCountRef.current += 1;
                    sorosCountRef.current = 0;
                    consecutiveWinsRef.current = 0;

                    const config = configRef.current!;

                    // Martingale logic
                    if (config.martingaleCount > mgCounterRef.current && mgDivCountRef.current === 0) {
                        // Start martingale with division
                        const divider = config.martingaleDivision > 0 ? config.martingaleDivision : 1;
                        mgStakeRef.current = auxStakeRef.current * (config.martingaleMultiplier / divider);
                        currentStakeRef.current = mgStakeRef.current;
                        mgDivCountRef.current += 1;
                        mgCounterRef.current += 1;
                        addLog(`📈 Martingale ${mgCounterRef.current}/${config.martingaleCount} | Stake: $${currentStakeRef.current.toFixed(2)}`, 'warning');
                    } else if (config.martingaleCount > mgCounterRef.current && mgDivCountRef.current > 0) {
                        // Continue martingale with division
                        const divider = config.martingaleDivision > 0 ? config.martingaleDivision : 1;
                        mgStakeRef.current = mgStakeRef.current * (config.martingaleMultiplier / divider);
                        currentStakeRef.current = mgStakeRef.current;
                        mgDivCountRef.current = 1;
                        mgCounterRef.current += 1;
                        addLog(`📈 Martingale ${mgCounterRef.current}/${config.martingaleCount} | Stake: $${currentStakeRef.current.toFixed(2)}`, 'warning');
                    } else if (config.martingaleCount === mgCounterRef.current) {
                        // Max martingale reached, reset
                        currentStakeRef.current = auxStakeRef.current;
                        mgDivCountRef.current = 0;
                        mgCounterRef.current = 0;
                        addLog(`⚠️ Martingale agotado, reiniciando stake`, 'warning');
                    }

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: totalProfitRef.current,
                        currentStake: currentStakeRef.current,
                        sorosCount: sorosCountRef.current,
                        drawdown: drawdownRef.current,
                    }));
                }

                // Check Stop Loss / Take Profit using refs (not state)
                if (configRef.current) {
                    if (totalProfitRef.current >= configRef.current.takeProfit) {
                        addLog(`🏆 ¡META ALCANZADA! +$${totalProfitRef.current.toFixed(2)}`, 'success');
                        addLog(`📊 Soros Acertados: ${sorosHitsRef.current}`, 'success');
                        addLog(`📊 Máx wins consecutivos: ${maxConsecutiveWinsRef.current}`, 'success');
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
    }, [socket, addLog, generateRandomDigit, stopBot]);

    // Start the bot
    const startBot = useCallback((config: BotConfig) => {
        // Check socket readyState directly to avoid stale closure issues
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Debe conectarse a Deriv primero');
            return false;
        }

        // Initialize all variables (from XML initialization)
        configRef.current = config;
        initialStakeRef.current = config.stake;
        auxStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        mgStakeRef.current = config.stake;
        digitRef.current = generateRandomDigit();
        sorosCountRef.current = 0;
        sorosHitsRef.current = 0;
        mgCounterRef.current = 0;
        mgDivCountRef.current = 0;
        winCountRef.current = 0;
        lossCountRef.current = 0;
        consecutiveWinsRef.current = 0;
        maxConsecutiveWinsRef.current = 0;
        drawdownRef.current = 0;
        totalProfitRef.current = 0;
        isWaitingForContractRef.current = false;
        isRunningRef.current = true;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
            sorosCount: 0,
            sorosHits: 0,
            maxConsecutiveWins: 0,
            drawdown: 0,
            currentDigit: digitRef.current,
        });
        setLogs([]);

        setIsRunning(true);
        return true;
    }, [addLog, generateRandomDigit]);

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

    // Cleanup on unmount only
    useEffect(() => {
        return () => {
            if (isRunningRef.current && socket) {
                socket.send(JSON.stringify({ forget_all: 'ticks' }));
            }
        };
    }, [socket]);

    return {
        isRunning,
        stats,
        logs,
        startBot,
        stopBot,
        addLog,
    };
};
