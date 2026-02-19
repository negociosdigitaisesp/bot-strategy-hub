import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { toast } from 'sonner';

// Types
export type SignalState = 'neutral' | 'squeeze' | 'call' | 'put';

interface PriceCandle {
    open: number;
    high: number;
    low: number;
    close: number;
    epoch: number;
}

interface BollingerBands {
    upper: number;
    middle: number;
    lower: number;
    width: number;
}

interface SqueezeData {
    signalState: SignalState;
    signalText: string;
    isConnected: boolean;
    isSubscribed: boolean;
    currentPrice: number;
    priceHistory: PriceCandle[];
    lastUpdate: Date | null;
    bollingerBands: BollingerBands | null;
    squeezeLevel: number;
    avgBandWidth: number;
    currentBandWidth: number;
    isInSqueeze: boolean;
}

// Calculate Simple Moving Average
function calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate Standard Deviation
function calculateStdDev(prices: number[], period: number, sma: number): number {
    if (prices.length < period) return 0;
    const slice = prices.slice(-period);
    const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    return Math.sqrt(avgSquaredDiff);
}

// Calculate Bollinger Bands
function calculateBollingerBands(closePrices: number[], period: number = 20, stdDevMultiplier: number = 2): BollingerBands | null {
    if (closePrices.length < period) return null;

    const sma = calculateSMA(closePrices, period);
    const stdDev = calculateStdDev(closePrices, period, sma);

    const upper = sma + (stdDevMultiplier * stdDev);
    const lower = sma - (stdDevMultiplier * stdDev);
    const width = upper - lower;

    return { upper, middle: sma, lower, width };
}

// Calculate average band width
function calculateAvgBandWidth(closePrices: number[], period: number = 20, lookback: number = 20): number {
    if (closePrices.length < period + lookback) return 0;

    const widths: number[] = [];
    for (let i = 0; i < lookback; i++) {
        const pricesSlice = closePrices.slice(0, closePrices.length - i);
        const bands = calculateBollingerBands(pricesSlice, period);
        if (bands) widths.push(bands.width);
    }

    if (widths.length === 0) return 0;
    return widths.reduce((a, b) => a + b, 0) / widths.length;
}

// Determine signal state
function getSignalState(
    isInSqueeze: boolean,
    currentPrice: number,
    bands: BollingerBands | null
): { state: SignalState; text: string } {
    if (!bands) return { state: 'neutral', text: 'Iniciando Análisis...' };

    if (isInSqueeze) {
        if (currentPrice > bands.upper) {
            return { state: 'call', text: '🎯 ROMPIMIENTO DETECTADO ↑ CALL' };
        }
        if (currentPrice < bands.lower) {
            return { state: 'put', text: '🎯 ROMPIMIENTO DETECTADO ↓ PUT' };
        }
        return { state: 'squeeze', text: '⚡ CARGANDO TENSIÓN... Preparar Emboscada' };
    }

    return { state: 'neutral', text: '🔍 Rastreando Volatilidad...' };
}

export const useSpikeSensor = () => {
    const { socket, isConnected, account } = useDeriv();

    const [data, setData] = useState<SqueezeData>({
        signalState: 'neutral',
        signalText: 'Conectando al Sistema...',
        isConnected: false,
        isSubscribed: false,
        currentPrice: 0,
        priceHistory: [],
        lastUpdate: null,
        bollingerBands: null,
        squeezeLevel: 0,
        avgBandWidth: 0,
        currentBandWidth: 0,
        isInSqueeze: false,
    });

    const priceHistoryRef = useRef<number[]>([]);
    const candleHistoryRef = useRef<PriceCandle[]>([]);
    const isSubscribedRef = useRef(false);

    // Execute trade
    const executeTrade = useCallback((contractType: 'CALL' | 'PUT', stake: number) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Conexión no disponible');
            return false;
        }

        const buyRequest = {
            buy: 1,
            subscribe: 1,
            price: 100,
            parameters: {
                contract_type: contractType,
                symbol: '1HZ100V',
                currency: account?.currency || 'USD',
                amount: stake,
                basis: 'stake',
                duration: 5,
                duration_unit: 't',
            }
        };

        socket.send(JSON.stringify(buyRequest));
        toast.success(`🎯 Orden ${contractType} enviada - $${stake}`);
        return true;
    }, [socket]);

    // Handle WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const response = JSON.parse(event.data);

        if (response.msg_type === 'ohlc' && response.ohlc) {
            const ohlc = response.ohlc;
            const closePrice = parseFloat(ohlc.close);

            priceHistoryRef.current = [...priceHistoryRef.current.slice(-49), closePrice];

            const newCandle: PriceCandle = {
                open: parseFloat(ohlc.open),
                high: parseFloat(ohlc.high),
                low: parseFloat(ohlc.low),
                close: closePrice,
                epoch: ohlc.epoch,
            };
            candleHistoryRef.current = [...candleHistoryRef.current.slice(-49), newCandle];

            const bands = calculateBollingerBands(priceHistoryRef.current, 20, 2);
            const avgWidth = calculateAvgBandWidth(priceHistoryRef.current, 20, 20);
            const currentWidth = bands?.width || 0;
            const isInSqueeze = currentWidth > 0 && avgWidth > 0 && currentWidth < avgWidth;

            let squeezeLevel = 0;
            if (avgWidth > 0) {
                const ratio = currentWidth / avgWidth;
                squeezeLevel = Math.min(100, Math.max(0, (1 - ratio) * 100));
            }

            const { state, text } = getSignalState(isInSqueeze, closePrice, bands);

            setData(prev => ({
                ...prev,
                signalState: state,
                signalText: text,
                currentPrice: closePrice,
                priceHistory: candleHistoryRef.current.slice(-20),
                lastUpdate: new Date(),
                isSubscribed: true,
                bollingerBands: bands,
                squeezeLevel,
                avgBandWidth: avgWidth,
                currentBandWidth: currentWidth,
                isInSqueeze,
            }));
        }

        if (response.msg_type === 'tick' && response.tick) {
            const currentPrice = parseFloat(response.tick.quote);
            setData(prev => ({ ...prev, currentPrice, lastUpdate: new Date() }));
        }

        if (response.msg_type === 'buy' && response.buy) {
            toast.success(`✅ Contrato abierto: ID ${response.buy.contract_id}`);
        }

        if (response.msg_type === 'proposal_open_contract' && response.proposal_open_contract) {
            const contract = response.proposal_open_contract;
            if (contract.is_sold) {
                const profit = parseFloat(contract.profit);
                if (profit > 0) toast.success(`🎉 ¡Victoria! +$${profit.toFixed(2)}`);
                else toast.error(`💥 Perdimos: -$${Math.abs(profit).toFixed(2)}`);
            }
        }

        if (response.error) {
            console.error('System Override Error:', response.error);
        }
    }, []);

    // Subscribe
    const subscribe = useCallback(() => {
        if (!socket || socket.readyState !== WebSocket.OPEN || isSubscribedRef.current) return;

        isSubscribedRef.current = true;
        socket.send(JSON.stringify({ forget_all: 'candles' }));
        socket.send(JSON.stringify({ forget_all: 'ticks' }));

        setTimeout(() => {
            socket?.send(JSON.stringify({
                ticks_history: '1HZ100V',
                adjust_start_time: 1,
                count: 50,
                end: 'latest',
                granularity: 60,
                style: 'candles',
                subscribe: 1,
            }));

            setTimeout(() => {
                socket?.send(JSON.stringify({ ticks: '1HZ100V', subscribe: 1 }));
            }, 100);
        }, 200);

        setData(prev => ({ ...prev, signalText: 'Sincronizando con el Mercado...' }));
    }, [socket]);

    // Unsubscribe
    const unsubscribe = useCallback(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ forget_all: 'candles' }));
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }
        isSubscribedRef.current = false;
        priceHistoryRef.current = [];
        candleHistoryRef.current = [];
        setData(prev => ({ ...prev, isSubscribed: false, signalText: 'Desconectado' }));
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        socket.addEventListener('message', handleMessage);
        return () => socket.removeEventListener('message', handleMessage);
    }, [socket, handleMessage]);

    useEffect(() => {
        setData(prev => ({
            ...prev,
            isConnected,
            signalText: isConnected ? prev.signalText : 'Conecte Deriv para Activar...',
        }));
        if (isConnected && socket && !isSubscribedRef.current) subscribe();
    }, [isConnected, socket, subscribe]);

    useEffect(() => { return () => { unsubscribe(); }; }, [unsubscribe]);

    return { ...data, subscribe, unsubscribe, executeTrade };
};

export default useSpikeSensor;
