import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { toast } from 'sonner';

// Types
export type SignalState = 'neutral' | 'alert' | 'trigger';
export type DigitType = 'even' | 'odd';

interface EvenOddData {
    lastDigits: number[];
    evenCount: number;
    oddCount: number;
    evenPercentage: number;
    oddPercentage: number;
    currentStreak: number;
    streakType: DigitType | null;
    dominantSide: DigitType | 'balanced';
    signalState: SignalState;
    signalDirection: 'ODD' | 'EVEN' | null;
    signalText: string;
    isSubscribed: boolean;
    isOnCooldown: boolean;
    cooldownRemaining: number;
    currentPrice: number;
    lastDigit: number | null;
    lastUpdate: Date | null;
    totalTrades: number;
    wins: number;
    losses: number;
    totalProfit: number;
    totalGains: number;
    totalLosses: number;
    lastTradeProfit: number | null;
    lastTradeResult: 'win' | 'loss' | null;
}

// Helper: Check if digit is even
const isEven = (digit: number): boolean => digit % 2 === 0;

// Helper: Get last digit from price
const getLastDigit = (price: number): number => {
    const priceStr = price.toString().replace('.', '');
    return parseInt(priceStr.charAt(priceStr.length - 1), 10);
};

// Calculate streak (consecutive same type)
const calculateStreak = (digits: number[]): { count: number; type: DigitType | null } => {
    if (digits.length === 0) return { count: 0, type: null };

    const lastDigit = digits[digits.length - 1];
    const lastType: DigitType = isEven(lastDigit) ? 'even' : 'odd';
    let count = 0;

    for (let i = digits.length - 1; i >= 0; i--) {
        const digitType: DigitType = isEven(digits[i]) ? 'even' : 'odd';
        if (digitType === lastType) {
            count++;
        } else {
            break;
        }
    }

    return { count, type: lastType };
};

// Determine signal state based on conditions
const getSignalState = (
    evenPercentage: number,
    oddPercentage: number,
    streak: number,
    streakType: DigitType | null,
    dominantSide: DigitType | 'balanced'
): { state: SignalState; direction: 'ODD' | 'EVEN' | null; text: string } => {
    const IMBALANCE_THRESHOLD = 55;
    const STREAK_THRESHOLD = 4;

    const hasImbalance = evenPercentage > IMBALANCE_THRESHOLD || oddPercentage > IMBALANCE_THRESHOLD;
    const hasStreak = streak >= STREAK_THRESHOLD && streakType === dominantSide;
    const hasAlertStreak = streak >= 3 && streakType === dominantSide;

    // Trigger: Both conditions met
    if (hasImbalance && hasStreak) {
        // Signal to bet OPPOSITE of dominant side
        const direction: 'ODD' | 'EVEN' = dominantSide === 'even' ? 'ODD' : 'EVEN';
        const directionText = direction === 'ODD' ? 'IMPAR' : 'PAR';
        return {
            state: 'trigger',
            direction,
            text: `🎯 ¡ENTRAR AHORA! APUESTA ${directionText}`
        };
    }

    // Alert: One condition met or close to trigger
    if (hasImbalance && hasAlertStreak) {
        return {
            state: 'alert',
            direction: null,
            text: `⚡ Secuencia Detectada (${streak}/4)...`
        };
    }

    if (hasImbalance) {
        const sideText = dominantSide === 'even' ? 'PARES' : 'IMPARES';
        const percentage = dominantSide === 'even' ? evenPercentage : oddPercentage;
        return {
            state: 'alert',
            direction: null,
            text: `📊 Desequilibrio: ${percentage.toFixed(0)}% ${sideText}`
        };
    }

    // Neutral: Analyzing
    return {
        state: 'neutral',
        direction: null,
        text: '🔍 Analizando Mercado...'
    };
};

export const useEvenOddSensor = () => {
    const { socket, isConnected } = useDeriv();

    const [data, setData] = useState<EvenOddData>({
        lastDigits: [],
        evenCount: 0,
        oddCount: 0,
        evenPercentage: 50,
        oddPercentage: 50,
        currentStreak: 0,
        streakType: null,
        dominantSide: 'balanced',
        signalState: 'neutral',
        signalDirection: null,
        signalText: 'Conectando al Sistema...',
        isSubscribed: false,
        isOnCooldown: false,
        cooldownRemaining: 0,
        currentPrice: 0,
        lastDigit: null,
        lastUpdate: null,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        totalGains: 0,
        totalLosses: 0,
        lastTradeProfit: null,
        lastTradeResult: null,
    });

    const digitsRef = useRef<number[]>([]);
    const isSubscribedRef = useRef(false);
    const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingContractRef = useRef<string | null>(null);

    // Start cooldown
    const startCooldown = useCallback(() => {
        setData(prev => ({ ...prev, isOnCooldown: true, cooldownRemaining: 5 }));

        let remaining = 5;
        cooldownTimerRef.current = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
                setData(prev => ({ ...prev, isOnCooldown: false, cooldownRemaining: 0 }));
            } else {
                setData(prev => ({ ...prev, cooldownRemaining: remaining }));
            }
        }, 1000);
    }, []);

    // Execute trade
    const executeTrade = useCallback((direction: 'ODD' | 'EVEN', stake: number) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Conexión no disponible');
            return false;
        }

        if (data.isOnCooldown) {
            toast.warning('Espera el cooldown...');
            return false;
        }

        const contractType = direction === 'ODD' ? 'DIGITODD' : 'DIGITEVEN';

        const buyRequest = {
            buy: 1,
            subscribe: 1,
            price: 100,
            parameters: {
                contract_type: contractType,
                symbol: '1HZ100V',
                currency: 'USD',
                amount: stake,
                basis: 'stake',
                duration: 1,
                duration_unit: 't',
            }
        };

        socket.send(JSON.stringify(buyRequest));

        const directionText = direction === 'ODD' ? 'IMPAR' : 'PAR';
        toast.success(`🎯 Orden ${directionText} enviada - $${stake}`);

        // Start cooldown
        startCooldown();

        setData(prev => ({ ...prev, totalTrades: prev.totalTrades + 1 }));

        return true;
    }, [socket, data.isOnCooldown, startCooldown]);

    // Handle WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const response = JSON.parse(event.data);

        // Handle tick data
        if (response.msg_type === 'tick' && response.tick) {
            const price = parseFloat(response.tick.quote);
            const digit = getLastDigit(price);

            // Add digit to array (keep last 100)
            digitsRef.current = [...digitsRef.current.slice(-99), digit];
            const digits = digitsRef.current;

            // Calculate statistics
            const evenCount = digits.filter(d => isEven(d)).length;
            const oddCount = digits.length - evenCount;
            const evenPercentage = digits.length > 0 ? (evenCount / digits.length) * 100 : 50;
            const oddPercentage = digits.length > 0 ? (oddCount / digits.length) * 100 : 50;

            // Determine dominant side
            let dominantSide: DigitType | 'balanced' = 'balanced';
            if (evenPercentage > 55) dominantSide = 'even';
            else if (oddPercentage > 55) dominantSide = 'odd';

            // Calculate streak
            const { count: currentStreak, type: streakType } = calculateStreak(digits);

            // Get signal state
            const { state, direction, text } = getSignalState(
                evenPercentage,
                oddPercentage,
                currentStreak,
                streakType,
                dominantSide
            );

            setData(prev => ({
                ...prev,
                lastDigits: digits.slice(-15), // Keep last 15 for display
                evenCount,
                oddCount,
                evenPercentage,
                oddPercentage,
                currentStreak,
                streakType,
                dominantSide,
                signalState: prev.isOnCooldown ? 'neutral' : state,
                signalDirection: prev.isOnCooldown ? null : direction,
                signalText: prev.isOnCooldown ? `⏳ Cooldown (${prev.cooldownRemaining}s)...` : text,
                currentPrice: price,
                lastDigit: digit,
                lastUpdate: new Date(),
                isSubscribed: true,
            }));
        }

        // Handle buy response
        if (response.msg_type === 'buy' && response.buy) {
            pendingContractRef.current = response.buy.contract_id;
            toast.success(`✅ Contrato abierto: ID ${response.buy.contract_id}`);
        }

        // Handle contract result
        if (response.msg_type === 'proposal_open_contract' && response.proposal_open_contract) {
            const contract = response.proposal_open_contract;
            if (contract.is_sold) {
                const profit = parseFloat(contract.profit);
                if (profit > 0) {
                    toast.success(`🎉 ¡Victoria! +$${profit.toFixed(2)}`);
                    setData(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        totalGains: prev.totalGains + profit,
                        lastTradeProfit: profit,
                        lastTradeResult: 'win',
                    }));
                } else {
                    toast.error(`💥 Perdimos: -$${Math.abs(profit).toFixed(2)}`);
                    setData(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        totalLosses: prev.totalLosses + Math.abs(profit),
                        lastTradeProfit: profit,
                        lastTradeResult: 'loss',
                    }));
                }
                pendingContractRef.current = null;
            }
        }

        // Handle errors
        if (response.error) {
            console.error('Even/Odd Sensor Error:', response.error);
            if (response.error.message) {
                toast.error(response.error.message);
            }
        }
    }, []);

    // Subscribe to ticks
    const subscribe = useCallback(() => {
        if (!socket || socket.readyState !== WebSocket.OPEN || isSubscribedRef.current) return;

        isSubscribedRef.current = true;

        // Forget previous subscriptions
        socket.send(JSON.stringify({ forget_all: 'ticks' }));

        setTimeout(() => {
            // Subscribe to Volatility 100 (1s) ticks
            socket?.send(JSON.stringify({
                ticks: '1HZ100V',
                subscribe: 1
            }));
        }, 200);

        setData(prev => ({ ...prev, signalText: 'Sincronizando con el Mercado...' }));
    }, [socket]);

    // Unsubscribe
    const unsubscribe = useCallback(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }
        isSubscribedRef.current = false;
        digitsRef.current = [];
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
        setData(prev => ({ ...prev, isSubscribed: false, signalText: 'Desconectado' }));
    }, [socket]);

    // Setup WebSocket listener
    useEffect(() => {
        if (!socket) return;
        socket.addEventListener('message', handleMessage);
        return () => socket.removeEventListener('message', handleMessage);
    }, [socket, handleMessage]);

    // Auto-subscribe when connected
    useEffect(() => {
        setData(prev => ({
            ...prev,
            signalText: isConnected ? prev.signalText : 'Conecte Deriv para Activar...',
        }));
        if (isConnected && socket && !isSubscribedRef.current) {
            subscribe();
        }
    }, [isConnected, socket, subscribe]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            unsubscribe();
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
        };
    }, [unsubscribe]);

    return { ...data, subscribe, unsubscribe, executeTrade };
};

export default useEvenOddSensor;
