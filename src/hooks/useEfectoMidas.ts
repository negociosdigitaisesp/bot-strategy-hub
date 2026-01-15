import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// Tipos
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    maxConsecutiveLosses: number;
    symbol?: string;
    useMartingale: boolean;
    martingaleMultiplier: number;
}

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    consecutiveLosses: number;
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'gold';
}

interface DigitFrequency {
    digit: number;
    count: number;
}

export const useEfectoMidas = () => {
    const { socket, isConnected } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();

    // Estado del Bot
    const [isRunning, setIsRunning] = useState(false);
    const [isShadowMode, setIsShadowMode] = useState(true);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0,
        consecutiveLosses: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [lastDigits, setLastDigits] = useState<number[]>([]);
    const [digitFrequencies, setDigitFrequencies] = useState<DigitFrequency[]>([]);
    const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
    const [anomalyDetected, setAnomalyDetected] = useState(false);
    const [repeatedDigit, setRepeatedDigit] = useState<number | null>(null);
    const [trendStatus, setTrendStatus] = useState<'neutral' | 'bullish' | 'bearish'>('neutral');

    // Referencias
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const currentStakeRef = useRef<number>(0);
    const isWaitingForContractRef = useRef<boolean>(false);
    const lastDigitsRef = useRef<number[]>([]);
    const lastPricesRef = useRef<number[]>([]);
    const consecutiveLossesRef = useRef<number>(0);
    const tickSubscriptionIdRef = useRef<string | null>(null);

    // Sonido de moneda de oro
    const playGoldCoinSound = useCallback(() => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log('Audio no disponible');
        }
    }, []);

    // Helper para agregar logs
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
        };
        setLogs(prev => [...prev.slice(-100), newLog]);
    }, []);

    // Calcular frecuencias de dígitos en los últimos N ticks
    const calculateDigitFrequencies = useCallback((digits: number[]): DigitFrequency[] => {
        const counts: Record<number, number> = {};
        for (let i = 0; i <= 9; i++) {
            counts[i] = 0;
        }
        digits.forEach(d => {
            counts[d] = (counts[d] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([digit, count]) => ({ digit: parseInt(digit), count }))
            .sort((a, b) => a.count - b.count);
    }, []);

    // Detectar anomalía de repetición (mismo dígito 2 veces seguidas)
    const detectRepetitionAnomaly = useCallback((digits: number[]): number | null => {
        if (digits.length < 2) return null;
        const last = digits[digits.length - 1];
        const secondLast = digits[digits.length - 2];
        if (last === secondLast) {
            return last;
        }
        return null;
    }, []);

    // --- FILTROS DE SEGURIDAD ---
    const checkTrendSafety = useCallback((digit: number, prices: number[]) => {
        // Necesitamos al menos 6 precios para calcular 5 cambios (ticks)
        if (prices.length < 6) return { safe: true, message: '' };

        // Tomar los últimos 6 precios para analizar los últimos 5 ticks
        const recentPrices = prices.slice(-6);

        let upCount = 0;
        let downCount = 0;

        // Contar movimientos UP y DOWN
        for (let i = 1; i < recentPrices.length; i++) {
            if (recentPrices[i] > recentPrices[i - 1]) {
                upCount++;
            } else if (recentPrices[i] < recentPrices[i - 1]) {
                downCount++;
            }
        }

        // 1. CENÁRIO DE ALTA FORTE (Pressure Buy)
        if (upCount >= 4) {
            setTrendStatus('bullish');
            // El mercado está puxando dígitos altos (7, 8, 9).
            // AÇÃO: BLOQUEAR qualquer entrada "Digit Differs" contra 6, 7, 8 ou 9.
            if ([6, 7, 8, 9].includes(digit)) {
                return { safe: false, message: '🚫 Bloqueio: Pressão de Compra Detectada.' };
            }
        }
        // 2. CENÁRIO DE BAIXA FORTE (Pressure Sell)
        else if (downCount >= 4) {
            setTrendStatus('bearish');
            // El mercado está puxando dígitos baixos (0, 1, 2).
            // AÇÃO: BLOQUEAR qualquer entrada "Digit Differs" contra 0, 1, 2 ou 3.
            if ([0, 1, 2, 3].includes(digit)) {
                return { safe: false, message: '🚫 Bloqueio: Pressão de Venda Detectada.' };
            }
        }
        // 3. CENÁRIO PERFEITO (Green Zone - Market Mixed)
        else {
            setTrendStatus('neutral');
            // O bot só tem permissão para disparar o gatilho de entrada se o mercado estiver MISTO
            // Isso garante que estamos operando em lateralização
        }

        return { safe: true, message: '' };
    }, []);

    const checkHotDigitSafety = useCallback((digit: number, history: number[]) => {
        // Analisar últimos 100 ticks (ou o que tivermos)
        const sampleSize = Math.min(history.length, 100);
        const sample = history.slice(-sampleSize);

        const count = sample.filter(d => d === digit).length;
        const frequency = count / sampleSize;

        if (frequency > 0.15) { // 15% threshold
            return { safe: false, message: `🚫 Entrada Bloqueada: Dígito [${digit}] Super Quente (${(frequency * 100).toFixed(1)}%)` };
        }

        return { safe: true, message: '' };
    }, []);

    // Manejar mensajes entrantes del WebSocket
    const handleMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data);

        // Manejar actualizaciones de ticks
        if (data.msg_type === 'tick' && data.tick) {
            const quote = Number(data.tick.quote).toFixed(2);
            const quoteVal = parseFloat(quote);
            const lastDigit = parseInt(quote.charAt(quote.length - 1));

            // Actualizar referencias
            lastDigitsRef.current = [...lastDigitsRef.current, lastDigit].slice(-100); // Guardar 100 para análisis Hot Digit
            lastPricesRef.current = [...lastPricesRef.current, quoteVal].slice(-10); // Guardar 10 para análisis tendencia
            setLastDigits([...lastDigitsRef.current.slice(-25)]); // UI shows last 25

            // Calcular frecuencias
            const frequencies = calculateDigitFrequencies(lastDigitsRef.current.slice(-25));
            setDigitFrequencies(frequencies);

            // Detectar anomalía de repetición
            const repeated = detectRepetitionAnomaly(lastDigitsRef.current);

            if (repeated !== null) {
                setAnomalyDetected(true);
                setRepeatedDigit(repeated);

                // Si no estamos esperando un contrato, ejecutar entrada
                if (!isWaitingForContractRef.current && socket && configRef.current) {

                    // --- FILTROS DE SEGURIDAD ---

                    // 1. Check Trend Guard
                    const trendCheck = checkTrendSafety(repeated, lastPricesRef.current);
                    if (!trendCheck.safe) {
                        addLog(trendCheck.message, 'warning');
                        setTimeout(() => {
                            setAnomalyDetected(false);
                            setRepeatedDigit(null);
                        }, 1000);
                        return;
                    }

                    // 2. Check Hot Digit Overload
                    const hotDigitCheck = checkHotDigitSafety(repeated, lastDigitsRef.current);
                    if (!hotDigitCheck.safe) {
                        addLog(hotDigitCheck.message, 'warning');
                        setTimeout(() => {
                            setAnomalyDetected(false);
                            setRepeatedDigit(null);
                        }, 1000);
                        return;
                    }

                    // --- EXECUTION ---
                    setIsShadowMode(false);
                    isWaitingForContractRef.current = true;

                    const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));
                    setSelectedDigit(repeated);

                    addLog(`⚡ ANOMALÍA DETECTADA >> DÍGITO [${repeated}] REPETIDO`, 'gold');
                    addLog(`🎯 Ejecutando DIGIT DIFFERS en [${repeated}] con $${stakeAmount.toFixed(2)}`, 'gold');

                    // Enviar orden de compra - DIGITDIFF (apostar que el próximo NO será el dígito repetido)
                    const buyRequest = {
                        buy: 1,
                        subscribe: 1,
                        price: 100,
                        parameters: {
                            contract_type: 'DIGITDIFF',
                            symbol: configRef.current.symbol || '1HZ100V',
                            currency: 'USD',
                            amount: stakeAmount,
                            basis: 'stake',
                            duration: 1,
                            duration_unit: 't',
                            barrier: repeated.toString(),
                        }
                    };

                    socket.send(JSON.stringify(buyRequest));

                    // Resetear anomalía después de entrada
                    setTimeout(() => {
                        setAnomalyDetected(false);
                        setRepeatedDigit(null);
                    }, 1000);
                }
            } else {
                setAnomalyDetected(false);
                setRepeatedDigit(null);
            }

            // Log cada algunos ticks (modo sombra)
            if (Math.random() < 0.15 && !isWaitingForContractRef.current) {
                addLog(`👁️ Modo Sombra | Últimos: [${lastDigitsRef.current.slice(-5).join(', ')}]`, 'info');
            }
        }

        // Manejar respuesta de compra
        if (data.msg_type === 'buy' && data.buy) {
            addLog(`✅ Contrato abierto: ID ${data.buy.contract_id}`, 'success');
        }

        // Manejar resultado del contrato
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
            const contract = data.proposal_open_contract;

            if (contract.is_sold) {
                isWaitingForContractRef.current = false;
                setIsShadowMode(true);
                const profit = parseFloat(contract.profit);
                const isWin = profit > 0;

                // Actualizar estadísticas globales de sesión
                updateStats(profit, isWin);

                if (isWin) {
                    // WIN - Reproducir sonido y resetear stake
                    playGoldCoinSound();
                    addLog(`💰 ¡GANAMOS! +$${profit.toFixed(2)} | Moneda de Oro Caída`, 'gold');
                    currentStakeRef.current = initialStakeRef.current;
                    consecutiveLossesRef.current = 0;

                    setStats(prev => ({
                        ...prev,
                        wins: prev.wins + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: initialStakeRef.current,
                        consecutiveLosses: 0,
                    }));
                } else {
                    // LOSS - Check Martingale
                    const lossAmount = Math.abs(profit);
                    consecutiveLossesRef.current += 1;
                    addLog(`💥 Pérdida: -$${lossAmount.toFixed(2)}`, 'error');

                    // Verificar stop por pérdidas consecutivas
                    if (configRef.current && consecutiveLossesRef.current >= configRef.current.maxConsecutiveLosses) {
                        addLog(`🛑 STOP DE SEGURIDAD: ${consecutiveLossesRef.current} pérdidas consecutivas`, 'error');
                        toast.error('Stop de seguridad activado: Demasiadas pérdidas consecutivas');
                        stopBot();
                        return;
                    }

                    let newStake = initialStakeRef.current;

                    if (configRef.current?.useMartingale) {
                        const multiplier = configRef.current.martingaleMultiplier || 11;
                        newStake = parseFloat((currentStakeRef.current * multiplier).toFixed(2));
                        addLog(`🔄 Smart Recovery: Próximo stake $${newStake.toFixed(2)} (×${multiplier})`, 'warning');
                    } else {
                        addLog(`🔄 Reset Stake: Próximo stake $${newStake.toFixed(2)}`, 'info');
                    }

                    currentStakeRef.current = newStake;

                    setStats(prev => ({
                        ...prev,
                        losses: prev.losses + 1,
                        totalProfit: prev.totalProfit + profit,
                        currentStake: newStake,
                        consecutiveLosses: prev.consecutiveLosses + 1,
                    }));
                }

                // Verificar Stop Loss / Take Profit
                setStats(prev => {
                    if (configRef.current) {
                        if (prev.totalProfit >= configRef.current.takeProfit) {
                            addLog(`🏆 ¡META DORADA ALCANZADA! +$${prev.totalProfit.toFixed(2)}`, 'gold');
                            toast.success('¡Take Profit alcanzado! El Efecto Midas ha funcionado.');
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

        // Manejar errores
        if (data.error) {
            addLog(`❌ Error API: ${data.error.message}`, 'error');
            console.error('Deriv API Error:', data.error);
            isWaitingForContractRef.current = false;
            setIsShadowMode(true);
        }
    }, [socket, addLog, updateStats, calculateDigitFrequencies, detectRepetitionAnomaly, playGoldCoinSound, checkTrendSafety, checkHotDigitSafety]);

    // Iniciar el bot
    const startBot = useCallback((config: BotConfig) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Debe conectarse a Deriv primero');
            return false;
        }

        // Resetear estado
        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        isWaitingForContractRef.current = false;
        lastDigitsRef.current = [];
        lastPricesRef.current = [];
        consecutiveLossesRef.current = 0;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
            consecutiveLosses: 0,
        });
        setLogs([]);
        setLastDigits([]);
        setDigitFrequencies([]);
        setSelectedDigit(null);
        setAnomalyDetected(false);
        setRepeatedDigit(null);
        setIsShadowMode(true);
        setTrendStatus('neutral');

        // Notificar sesión global
        setActiveBot('Efecto Midas');

        // Agregar listener de mensajes
        socket.addEventListener('message', handleMessage);

        // Primero, olvidar todas las suscripciones de ticks
        socket.send(JSON.stringify({ forget_all: 'ticks' }));

        // Luego suscribirse a ticks
        setTimeout(() => {
            const tickRequest = {
                ticks: config.symbol || '1HZ100V',
                subscribe: 1,
            };
            socket.send(JSON.stringify(tickRequest));
        }, 100);

        addLog(`⚡ PROTOCOLO MIDAS ACTIVADO`, 'gold');
        addLog(`🎯 Activo: ${config.symbol || '1HZ100V'} (Volatility 100 1s)`, 'info');
        addLog(`💰 Stake: $${config.stake} | TP: $${config.takeProfit} | SL: $${config.stopLoss}`, 'info');
        addLog(`🛡️ Segurança: Trend Guard & Hot Digit Overload Activados`, 'info');
        addLog(`👁️ Modo Sombra activado... Buscando anomalías de repetición...`, 'info');

        setIsRunning(true);
        return true;
    }, [socket, isConnected, handleMessage, addLog, setActiveBot]);

    // Detener el bot
    const stopBot = useCallback(() => {
        if (socket) {
            socket.removeEventListener('message', handleMessage);
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        setActiveBot(null);
        addLog('🛑 Protocolo Midas desactivado', 'warning');
        setIsRunning(false);
        setIsShadowMode(true);
        setTrendStatus('neutral');
    }, [socket, handleMessage, addLog, setActiveBot]);

    // Limpiar al desmontar
    useEffect(() => {
        return () => {
            if (isRunning) {
                stopBot();
            }
        };
    }, [isRunning, stopBot]);

    return {
        isRunning,
        isShadowMode,
        stats,
        logs,
        lastDigits,
        digitFrequencies,
        selectedDigit,
        anomalyDetected,
        repeatedDigit,
        startBot,
        stopBot,
        addLog,
        trendStatus,
    };
};
