import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// --- TIPOS ---
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    useMartingale: boolean;
}

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    martingaleLevel: number;
    entriesFiltered: number;  // Entradas bloqueadas por fricción
    entriesExecuted: number;  // Entradas ejecutadas
    trendBlocked: number;     // Bloqueadas por tendencia
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'friction' | 'blocked' | 'entry' | 'trend';
}

// Resultado del análisis de fricción
interface FrictionResult {
    shouldEnter: boolean;
    reason: string;
    lastDigit: number;
    contractType?: 'DIGITEVEN' | 'DIGITODD';
    blockedByTrend?: boolean;
}

// Tipo de tendencia del tick
type TickDirection = 'green' | 'red' | 'neutral';

// ============================================================================
// DIGITAL FRICTION CONSTANTS - CONFIGURACIÓN ÓPTIMA
// ============================================================================
const FRICTION_CONFIG = {
    SYMBOL: 'R_100',                    // Volatility 100 (1s) - Máxima velocidad
    SYMBOL_NAME: 'Volatility 100 (1s)',
    SEQUENCE_LENGTH: 2,                 // Solo 2 dígitos = Alta frecuencia
    MARTINGALE_FACTOR: 2.0,             // Factor Martingale
    MAX_MARTINGALE_LEVELS: 4,           // 4 niveles (filtro confiable)

    // DÍGITOS CON ALTA FRICCIÓN (Buena repulsión)
    HIGH_FRICTION_EVEN: [6, 8],         // Pares que repelen bien
    HIGH_FRICTION_ODD: [1, 3],          // Impares que repelen bien

    // DÍGITOS PEGAJOSOS (Alto riesgo de repetición)
    STICKY_EVEN: [0, 2, 4],             // Pares pegajosos
    STICKY_ODD: [5, 7, 9],              // Impares pegajosos
};

export const useBugDeriv = () => {
    const { socket, isConnected } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();

    // Estado del Bot
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0.35,
        martingaleLevel: 0,
        entriesFiltered: 0,
        entriesExecuted: 0,
        trendBlocked: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [lastDigits, setLastDigits] = useState<number[]>([]);

    // Estado de Fricción
    const [frictionStatus, setFrictionStatus] = useState<'waiting' | 'analyzing' | 'blocked' | 'entering'>('waiting');
    const [lastAnalyzedDigit, setLastAnalyzedDigit] = useState<number | null>(null);
    const [sequenceType, setSequenceType] = useState<'even' | 'odd' | null>(null);

    // Estado de Tendencia de Tick (NUEVO)
    const [tickDirection, setTickDirection] = useState<TickDirection>('neutral');

    // Código "hacker" stream
    const [codeStream, setCodeStream] = useState<string[]>([]);

    // Referencias
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0.35);
    const currentStakeRef = useRef<number>(0.35);
    const isWaitingForContractRef = useRef<boolean>(false);
    const lastDigitsRef = useRef<number[]>([]);
    const lastPricesRef = useRef<number[]>([]);  // Para análisis de vector
    const martingaleLevelRef = useRef<number>(0);
    const isRunningRef = useRef<boolean>(false);
    const entriesFilteredRef = useRef<number>(0);
    const entriesExecutedRef = useRef<number>(0);
    const trendBlockedRef = useRef<number>(0);

    // --- HELPERS ---
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
        };
        setLogs(prev => [...prev.slice(-80), newLog]);
    }, []);

    // Genera código "hacker" aleatorio
    const generateHackerCode = useCallback(() => {
        const codes = [
            `0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`,
            `SCAN::${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
            `FRIC_${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            `>>TICK_${Date.now().toString().slice(-6)}`,
            `[${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}]`,
            `HASH:${Math.random().toString(36).substr(2, 6)}`,
            `SIG_${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 100)}`,
            `MEM:0x${Math.random().toString(16).substr(2, 4)}`,
        ];
        return codes[Math.floor(Math.random() * codes.length)];
    }, []);

    // --- NUEVO: ANÁLISIS DE VETOR DE TICK ---
    const analyzeTickDirection = useCallback((prices: number[]): TickDirection => {
        if (prices.length < 2) return 'neutral';

        const prevPrice = prices[prices.length - 2];
        const currentPrice = prices[prices.length - 1];

        if (currentPrice > prevPrice) return 'green';  // Subida
        if (currentPrice < prevPrice) return 'red';    // Queda
        return 'neutral';
    }, []);

    // --- CORE: DETECTOR DE SECUENCIA (2 dígitos iguales) ---
    const detectSequence = useCallback((digits: number[]): { detected: boolean; isEven: boolean; lastDigit: number } => {
        if (digits.length < FRICTION_CONFIG.SEQUENCE_LENGTH) {
            return { detected: false, isEven: false, lastDigit: -1 };
        }

        const last2 = digits.slice(-2);
        const d1 = last2[0];
        const d2 = last2[1];

        // Ambos pares?
        if (d1 % 2 === 0 && d2 % 2 === 0) {
            return { detected: true, isEven: true, lastDigit: d2 };
        }

        // Ambos impares?
        if (d1 % 2 !== 0 && d2 % 2 !== 0) {
            return { detected: true, isEven: false, lastDigit: d2 };
        }

        return { detected: false, isEven: false, lastDigit: d2 };
    }, []);

    // --- CORE: FILTRO DE FRICCIÓN DIGITAL + VETOR ---
    const analyzeFriction = useCallback((isEvenSequence: boolean, lastDigit: number, direction: TickDirection): FrictionResult => {
        if (isEvenSequence) {
            // Secuencia de PARES -> Buscamos entrar en ÍMPAR
            if (FRICTION_CONFIG.HIGH_FRICTION_EVEN.includes(lastDigit)) {
                // NOVO FILTRO: Para entrar ÍMPAR após pares [6,8], tick deve ser RED ou NEUTRAL
                // Se for GREEN (subindo), pares altos podem repetir
                if (direction === 'green') {
                    return {
                        shouldEnter: false,
                        reason: `🚫 Bloqueio: Tendencia Contra a Aposta [${lastDigit}] ↑ Verde`,
                        lastDigit,
                        blockedByTrend: true,
                    };
                }
                return {
                    shouldEnter: true,
                    reason: `⚡ FRICCIÓN [${lastDigit}] + Vector ${direction === 'red' ? '↓' : '—'} → ÍMPAR`,
                    lastDigit,
                    contractType: 'DIGITODD',
                };
            } else {
                return {
                    shouldEnter: false,
                    reason: `🚫 Ignorado: Dígito Pegajoso [${lastDigit}]`,
                    lastDigit,
                };
            }
        } else {
            // Secuencia de ÍMPARES -> Buscamos entrar en PAR
            if (FRICTION_CONFIG.HIGH_FRICTION_ODD.includes(lastDigit)) {
                // NOVO FILTRO: Para entrar PAR após impares [1,3], tick deve ser GREEN ou NEUTRAL
                // Se for RED (descendo), ímpares baixos podem repetir
                if (direction === 'red') {
                    return {
                        shouldEnter: false,
                        reason: `🚫 Bloqueio: Tendencia Contra a Aposta [${lastDigit}] ↓ Rojo`,
                        lastDigit,
                        blockedByTrend: true,
                    };
                }
                return {
                    shouldEnter: true,
                    reason: `⚡ FRICCIÓN [${lastDigit}] + Vector ${direction === 'green' ? '↑' : '—'} → PAR`,
                    lastDigit,
                    contractType: 'DIGITEVEN',
                };
            } else {
                return {
                    shouldEnter: false,
                    reason: `🚫 Ignorado: Dígito Pegajoso [${lastDigit}]`,
                    lastDigit,
                };
            }
        }
    }, []);

    // --- EJECUTAR TRADE ---
    const executeTrade = useCallback((contractType: 'DIGITEVEN' | 'DIGITODD') => {
        if (!socket || isWaitingForContractRef.current || !isRunningRef.current) return;

        isWaitingForContractRef.current = true;
        const stake = currentStakeRef.current;

        const request = {
            buy: 1,
            price: stake,
            parameters: {
                contract_type: contractType,
                symbol: FRICTION_CONFIG.SYMBOL,
                duration: 1,
                duration_unit: 't',
                basis: 'stake',
                amount: stake,
                currency: 'USD',
            },
        };

        socket.send(JSON.stringify(request));

        // Incrementar entradas ejecutadas
        entriesExecutedRef.current += 1;
        setStats(prev => ({ ...prev, entriesExecuted: entriesExecutedRef.current }));

        addLog(`🎯 ORDEN ENVIADA: ${contractType === 'DIGITEVEN' ? 'PAR' : 'ÍMPAR'} | Stake: $${stake.toFixed(2)} | Gale: ${martingaleLevelRef.current}`, 'entry');
    }, [socket, addLog]);

    // --- PROCESAR TICK ---
    const processTick = useCallback((digit: number, price: number) => {
        if (!isRunningRef.current || isWaitingForContractRef.current) return;

        // Actualizar stream de dígitos
        lastDigitsRef.current = [...lastDigitsRef.current, digit].slice(-50);
        setLastDigits(lastDigitsRef.current);

        // Actualizar precios para análisis de vector
        lastPricesRef.current = [...lastPricesRef.current, price].slice(-10);

        // Analizar dirección del tick
        const direction = analyzeTickDirection(lastPricesRef.current);
        setTickDirection(direction);

        // Generar código hacker
        setCodeStream(prev => [...prev.slice(-15), generateHackerCode()]);

        // Detectar secuencia de 2
        const sequence = detectSequence(lastDigitsRef.current);

        if (!sequence.detected) {
            setFrictionStatus('waiting');
            setSequenceType(null);
            return;
        }

        // Secuencia detectada - Analizar fricción + vector
        setFrictionStatus('analyzing');
        setSequenceType(sequence.isEven ? 'even' : 'odd');
        setLastAnalyzedDigit(sequence.lastDigit);

        const friction = analyzeFriction(sequence.isEven, sequence.lastDigit, direction);

        if (friction.shouldEnter && friction.contractType) {
            // FRICCIÓN ALTA + VECTOR OK - ENTRAR
            setFrictionStatus('entering');
            addLog(friction.reason, 'friction');

            // Ejecutar inmediatamente (< 100ms)
            setTimeout(() => {
                executeTrade(friction.contractType!);
            }, 50);
        } else {
            // BLOQUEADO
            setFrictionStatus('blocked');

            if (friction.blockedByTrend) {
                // Bloqueado por tendencia
                trendBlockedRef.current += 1;
                setStats(prev => ({ ...prev, trendBlocked: trendBlockedRef.current }));
                addLog(friction.reason, 'trend');
            } else {
                // Bloqueado por dígito pegajoso
                entriesFilteredRef.current += 1;
                setStats(prev => ({ ...prev, entriesFiltered: entriesFilteredRef.current }));
                addLog(friction.reason, 'blocked');
            }
        }
    }, [detectSequence, analyzeFriction, analyzeTickDirection, executeTrade, addLog, generateHackerCode]);

    // --- PROCESAR RESULTADO DEL CONTRATO ---
    const processContractResult = useCallback((result: { profit: number; status: string }) => {
        if (!configRef.current) return;

        const config = configRef.current;
        const isWin = result.profit > 0;

        setStats(prev => {
            const newStats = {
                ...prev,
                wins: isWin ? prev.wins + 1 : prev.wins,
                losses: !isWin ? prev.losses + 1 : prev.losses,
                totalProfit: prev.totalProfit + result.profit,
            };

            // Actualizar estadísticas globales
            updateStats(result.profit, isWin);

            // Verificar Stop Loss / Take Profit
            if (newStats.totalProfit <= -config.stopLoss) {
                addLog(`🛑 STOP LOSS alcanzado: -$${config.stopLoss.toFixed(2)}`, 'error');
                toast.error('Stop Loss alcanzado');
                stopBot();
                return newStats;
            }

            if (newStats.totalProfit >= config.takeProfit) {
                addLog(`🏆 TAKE PROFIT alcanzado: +$${config.takeProfit.toFixed(2)}`, 'success');
                toast.success('¡Take Profit alcanzado!');
                stopBot();
                return newStats;
            }

            // Martingale Logic
            if (isWin) {
                // Reset al stake inicial
                currentStakeRef.current = initialStakeRef.current;
                martingaleLevelRef.current = 0;
                addLog(`✅ WIN +$${result.profit.toFixed(2)} | Stake reset: $${currentStakeRef.current.toFixed(2)}`, 'success');
            } else {
                if (config.useMartingale && martingaleLevelRef.current < FRICTION_CONFIG.MAX_MARTINGALE_LEVELS) {
                    martingaleLevelRef.current += 1;
                    currentStakeRef.current = initialStakeRef.current * Math.pow(FRICTION_CONFIG.MARTINGALE_FACTOR, martingaleLevelRef.current);
                    addLog(`❌ LOSS -$${Math.abs(result.profit).toFixed(2)} | Gale ${martingaleLevelRef.current}: $${currentStakeRef.current.toFixed(2)}`, 'error');
                } else {
                    // Max martingale o sin martingale - reset
                    currentStakeRef.current = initialStakeRef.current;
                    martingaleLevelRef.current = 0;
                    addLog(`❌ LOSS -$${Math.abs(result.profit).toFixed(2)} | Max Gale - Reset`, 'error');
                }
            }

            return {
                ...newStats,
                currentStake: currentStakeRef.current,
                martingaleLevel: martingaleLevelRef.current,
            };
        });

        isWaitingForContractRef.current = false;
        setFrictionStatus('waiting');
    }, [updateStats, addLog]);

    // --- MENSAJE HANDLER ---
    const handleMessage = useCallback((event: MessageEvent) => {
        if (!isRunningRef.current) return;

        try {
            const data = JSON.parse(event.data);

            // Procesar ticks
            if (data.msg_type === 'tick' && data.tick) {
                const price = data.tick.quote;
                const digit = parseInt(price.toString().slice(-1));
                processTick(digit, price);
            }

            // Procesar compra
            if (data.msg_type === 'buy' && data.buy) {
                const contractId = data.buy.contract_id;
                addLog(`📝 Contrato abierto: ${contractId}`, 'info');

                // Suscribirse al contrato
                socket?.send(JSON.stringify({
                    proposal_open_contract: 1,
                    contract_id: contractId,
                    subscribe: 1,
                }));
            }

            // Error en compra
            if (data.msg_type === 'buy' && data.error) {
                addLog(`❌ Error: ${data.error.message}`, 'error');
                isWaitingForContractRef.current = false;
            }

            // Procesar resultado del contrato
            if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
                const contract = data.proposal_open_contract;
                if (contract.is_sold) {
                    const profit = parseFloat(contract.profit);
                    processContractResult({ profit, status: contract.status });

                    // Cancelar suscripción
                    if (contract.id) {
                        socket?.send(JSON.stringify({ forget: contract.id }));
                    }
                }
            }
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    }, [socket, processTick, processContractResult, addLog]);

    // --- START BOT ---
    const startBot = useCallback((config: BotConfig) => {
        if (!isConnected || !socket) {
            toast.error('Conecte su cuenta Deriv primero');
            return false;
        }

        // Inicializar
        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        martingaleLevelRef.current = 0;
        isWaitingForContractRef.current = false;
        lastDigitsRef.current = [];
        lastPricesRef.current = [];
        entriesFilteredRef.current = 0;
        entriesExecutedRef.current = 0;
        trendBlockedRef.current = 0;
        isRunningRef.current = true;

        setIsRunning(true);
        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
            martingaleLevel: 0,
            entriesFiltered: 0,
            entriesExecuted: 0,
            trendBlocked: 0,
        });
        setLogs([]);
        setLastDigits([]);
        setCodeStream([]);
        setFrictionStatus('waiting');
        setTickDirection('neutral');

        // Registrar bot activo
        setActiveBot('Bug Deriv [Friction+Vector]');

        addLog(`🚀 DIGITAL FRICTION + VECTOR PROTOCOL INICIADO`, 'friction');
        addLog(`📊 Activo: ${FRICTION_CONFIG.SYMBOL_NAME}`, 'info');
        addLog(`🎯 Filtro Fricción: [6,8,1,3] = ENTRADA | [0,2,4,5,7,9] = BLOQUEADO`, 'info');
        addLog(`📈 Filtro Vector: Pares→Verde=BLOQ | Ímpares→Rojo=BLOQ`, 'info');
        addLog(`💰 Stake: $${config.stake.toFixed(2)} | Gale: ${config.useMartingale ? `2.0x (Max ${FRICTION_CONFIG.MAX_MARTINGALE_LEVELS})` : 'OFF'}`, 'info');

        // Suscribirse a ticks
        socket.send(JSON.stringify({
            ticks: FRICTION_CONFIG.SYMBOL,
            subscribe: 1,
        }));

        socket.addEventListener('message', handleMessage);
        return true;
    }, [isConnected, socket, handleMessage, addLog, setActiveBot]);

    // --- STOP BOT ---
    const stopBot = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);
        setFrictionStatus('waiting');

        if (socket) {
            socket.removeEventListener('message', handleMessage);
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        setActiveBot(null);
        addLog(`⏹️ Bot detenido. Filtradas: ${entriesFilteredRef.current} | Tendencia: ${trendBlockedRef.current} | Ejecutadas: ${entriesExecutedRef.current}`, 'warning');
    }, [socket, handleMessage, addLog, setActiveBot]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isRunningRef.current) {
                stopBot();
            }
        };
    }, []);

    return {
        isRunning,
        stats,
        logs,
        lastDigits,
        frictionStatus,
        lastAnalyzedDigit,
        sequenceType,
        tickDirection,
        codeStream,
        frictionConfig: FRICTION_CONFIG,
        startBot,
        stopBot,
    };
};
