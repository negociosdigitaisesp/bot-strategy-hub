import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { useRiskSystem } from './useRiskSystem';
import { toast } from 'sonner';

// --- TYPES ---
interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    useMartingale: boolean;
}

type Parity = 'even' | 'odd';

interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    martingaleLevel: number;
    consecutiveCount: number;
    signalsTriggered: number;
    signalsBlocked: number;
    lastParity: Parity | null;
    isPingPong: boolean;
    isOnCooldown: boolean;
    trendStrength?: 'strong' | 'medium' | 'weak';
}

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'even' | 'odd' | 'blocked' | 'filter';
}

// ============================================================================
// BOT SIGMA CONFIG v3 - STRICT TREND FOLLOWING
// ============================================================================
const SIGMA_CONFIG = {
    SYMBOL: '1HZ10V',
    SYMBOL_NAME: 'Volatility 10 (1s)',

    // TREND TRIGGER
    CONSECUTIVE_TRIGGER: 3,           // 3 dígitos iguales = entrada

    // PING-PONG FILTER
    PING_PONG_WINDOW: 10,             // Ventana de análisis
    PING_PONG_THRESHOLD: 0.70,        // >70% alternancia = bloquear

    // RISK
    MARTINGALE_FACTOR: 2.1,
    MAX_MARTINGALE_LEVELS: 4,         // Max gales reducido a 4

    // SMART RECOVERY
    COOLDOWN_AFTER_LOSS: true,        // Pausa OBLIGATORIA después de pérdida
};

export const useBotSigma = () => {
    const { socket, isConnected } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();
    const { isEnabled: riskEnabled, checkSafetyLock } = useRiskSystem();

    // Bot State
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<BotStats>({
        wins: 0,
        losses: 0,
        totalProfit: 0,
        currentStake: 0.35,
        martingaleLevel: 0,
        consecutiveCount: 0,
        signalsTriggered: 0,
        signalsBlocked: 0,
        lastParity: null,
        isPingPong: false,
        isOnCooldown: false,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Refs
    const isRunningRef = useRef(false);
    const isWaitingForContractRef = useRef(false);
    const parityHistoryRef = useRef<Parity[]>([]);
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef(0.35);
    const currentStakeRef = useRef(0.35);
    const martingaleLevelRef = useRef(0);
    const totalProfitRef = useRef(0);

    // Smart Recovery Refs
    const isOnCooldownRef = useRef(false);           // Pausa después de pérdida
    const pendingMartingaleRef = useRef(false);      // Gale esperando patrón

    // --- ADD LOG ---
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            time: new Date().toLocaleTimeString('es-CL'),
            message,
            type,
        };
        setLogs(prev => [entry, ...prev].slice(0, 100));
    }, []);

    // --- GET PARITY ---
    const getParityFromTick = useCallback((quote: number): Parity => {
        const lastDigit = Math.floor(quote * 100) % 10;
        return lastDigit % 2 === 0 ? 'even' : 'odd';
    }, []);

    // --- COUNT CONSECUTIVE (Same parity at end) ---
    const countConsecutive = useCallback((history: Parity[]): { count: number; parity: Parity | null } => {
        if (history.length === 0) return { count: 0, parity: null };

        const lastParity = history[history.length - 1];
        let count = 0;

        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i] === lastParity) {
                count++;
            } else {
                break;
            }
        }

        return { count, parity: lastParity };
    }, []);

    // --- ANALYZE CONTEXT (Strength of Trend) ---
    const analyzeContext = useCallback((history: Parity[], consecutive: number): 'strong' | 'medium' | 'weak' => {
        // history = [..., P, I, P, P, P] (consecutive = 3, parity = P)
        // We want to check what was BEFORE the sequence.
        // Index of last element in sequence = length - 1
        // Index of element BEFORE sequence = length - 1 - consecutive

        const indexBefore = history.length - 1 - consecutive;
        if (indexBefore < 0) return 'medium'; // Not enough history

        const beforeParity = history[indexBefore];
        const lastParity = history[history.length - 1];

        // If before was Different -> Clean Break -> STRONG
        if (beforeParity !== lastParity) {
            return 'strong';
        }

        // This case shouldn't technically happen if countConsecutive is correct, 
        // because if beforeParity == lastParity, consecutive would be +1.
        // Unless there was a gap?

        return 'medium';
    }, []);

    // --- PING-PONG FILTER ---
    const checkPingPongFilter = useCallback((history: Parity[]): { isPingPong: boolean; switchRate: number } => {
        const window = history.slice(-SIGMA_CONFIG.PING_PONG_WINDOW);
        if (window.length < SIGMA_CONFIG.PING_PONG_WINDOW) {
            return { isPingPong: false, switchRate: 0 };
        }

        let switches = 0;
        for (let i = 1; i < window.length; i++) {
            if (window[i] !== window[i - 1]) switches++;
        }

        const switchRate = switches / (window.length - 1);
        return {
            isPingPong: switchRate >= SIGMA_CONFIG.PING_PONG_THRESHOLD,
            switchRate
        };
    }, []);

    // --- EXECUTE TRADE ---
    const executeTrade = useCallback((betOn: Parity, reason: string) => {
        if (!socket || !isRunningRef.current) return;

        const stake = Math.round(currentStakeRef.current * 100) / 100;
        const contractType = betOn === 'even' ? 'DIGITEVEN' : 'DIGITODD';

        const request = {
            buy: 1,
            price: stake,
            parameters: {
                contract_type: contractType,
                symbol: SIGMA_CONFIG.SYMBOL,
                duration: 1,
                duration_unit: 't',
                basis: 'stake',
                amount: stake,
                currency: 'USD',
            },
        };

        socket.send(JSON.stringify(request));

        setStats(prev => ({
            ...prev,
            signalsTriggered: prev.signalsTriggered + 1,
        }));

        addLog(reason, betOn === 'even' ? 'even' : 'odd');
    }, [socket, addLog]);

    // --- PROCESS TICK ---
    const processTick = useCallback((quote: number) => {
        if (!isRunningRef.current || isWaitingForContractRef.current) return;

        const parity = getParityFromTick(quote);

        // Update history
        parityHistoryRef.current = [...parityHistoryRef.current, parity].slice(-50);

        // Need minimum data
        if (parityHistoryRef.current.length < 5) {
            addLog(`📊 Recolectando datos... ${parityHistoryRef.current.length}/5`, 'info');
            return;
        }

        // Count consecutive same parity
        const { count: consecutive, parity: lastParity } = countConsecutive(parityHistoryRef.current);

        // Analyze Context
        const trendStrength = analyzeContext(parityHistoryRef.current, consecutive);

        // Check Ping-Pong Filter
        const { isPingPong, switchRate } = checkPingPongFilter(parityHistoryRef.current);

        // Update stats for UI
        setStats(prev => ({
            ...prev,
            consecutiveCount: consecutive,
            lastParity,
            isPingPong,
            isOnCooldown: isOnCooldownRef.current,
            trendStrength
        }));

        // --- SMART RECOVERY: Cooldown Check ---
        if (isOnCooldownRef.current) {
            // Esperando nuevo patrón de 3 iguales (fresh start)
            // IMPORTANTE: Debemos asegurarnos que es una NUEVA secuencia, no la misma que causó el loss.
            // Pero como paramos de operar, el mercado sigue. Si vemos 3 iguales ahora, es una nueva oportunidad.
            if (consecutive >= SIGMA_CONFIG.CONSECUTIVE_TRIGGER) {
                // Check strength for reentry
                if (trendStrength === 'strong') {
                    isOnCooldownRef.current = false;
                    addLog(`✅ Nueva Tendencia Fuerte. Fin del cooldown.`, 'success');
                    // Continue to entry logic
                } else {
                    if (Math.random() < 0.2) addLog(`⚠️ Tendencia débil para recuperación. Esperando...`, 'warning');
                    return;
                }
            } else {
                if (Math.random() < 0.1) {
                    addLog(`⏸️ COOLDOWN: Esperando patrón (${consecutive}/${SIGMA_CONFIG.CONSECUTIVE_TRIGGER})...`, 'warning');
                }
                return;
            }
        }

        // --- PING-PONG FILTER ---
        if (isPingPong) {
            addLog(`🚫 PING-PONG: Choppy market (${(switchRate * 100).toFixed(0)}%). Bloqueado.`, 'filter');
            setStats(prev => ({ ...prev, signalsBlocked: prev.signalsBlocked + 1 }));
            return;
        }

        // --- TREND TRIGGER: 3 CONSECUTIVE SAME ---
        if (consecutive < SIGMA_CONFIG.CONSECUTIVE_TRIGGER) {
            // Not enough consecutive
            if (Math.random() < 0.1) {
                addLog(`🔍 Analizando... Secuencia: ${consecutive}/${SIGMA_CONFIG.CONSECUTIVE_TRIGGER}`, 'info');
            }
            return;
        }

        // --- RISK SYSTEM CHECK ---
        if (riskEnabled) {
            const safetyCheck = checkSafetyLock(totalProfitRef.current);
            if (!safetyCheck.allowed) {
                addLog(`🛑 ${safetyCheck.reason}`, 'warning');
                isRunningRef.current = false;
                setIsRunning(false);
                toast.warning(safetyCheck.reason);
                return;
            }
        }

        // --- ENTRY: BET ON SAME SIDE (TREND FOLLOWING) ---
        const betOn: Parity = lastParity!;
        const betName = betOn === 'even' ? 'PAR' : 'IMPAR';

        isWaitingForContractRef.current = true;

        const strengthEmoji = trendStrength === 'strong' ? '💪' : '⚠️';
        const galeInfo = pendingMartingaleRef.current ? ` | GALE ${martingaleLevelRef.current}` : '';
        executeTrade(betOn, `📈 TENDENCIA ${strengthEmoji} >> ${betName} (Seq: ${consecutive})${galeInfo}`);

        // Clear pending martingale flag
        pendingMartingaleRef.current = false;

    }, [getParityFromTick, countConsecutive, analyzeContext, checkPingPongFilter, executeTrade, addLog, riskEnabled, checkSafetyLock]);

    // --- PROCESS CONTRACT RESULT ---
    const processContractResult = useCallback((result: { profit: number; status: string }) => {
        if (!configRef.current) return;

        const config = configRef.current;
        const isWin = result.profit > 0;

        // Update stats
        setStats(prev => {
            const newStats = {
                ...prev,
                wins: isWin ? prev.wins + 1 : prev.wins,
                losses: !isWin ? prev.losses + 1 : prev.losses,
                totalProfit: prev.totalProfit + result.profit,
            };
            totalProfitRef.current = newStats.totalProfit;
            return newStats;
        });

        updateStats(result.profit, isWin);

        if (isWin) {
            // WIN - Reset stake
            currentStakeRef.current = initialStakeRef.current;
            martingaleLevelRef.current = 0;
            isOnCooldownRef.current = false; // Just in case
            pendingMartingaleRef.current = false;

            addLog(`✅ ¡VICTORIA! +$${result.profit.toFixed(2)} | Reset`, 'success');

            if ((window as any).showProfitNotification) {
                (window as any).showProfitNotification('Bot Sigma', result.profit);
            }
        } else {
            // LOSS - Smart Martingale
            addLog(`❌ PÉRDIDA -$${Math.abs(result.profit).toFixed(2)}`, 'error');

            if (config.useMartingale && martingaleLevelRef.current < SIGMA_CONFIG.MAX_MARTINGALE_LEVELS) {
                martingaleLevelRef.current += 1;
                currentStakeRef.current = Math.round(initialStakeRef.current * Math.pow(SIGMA_CONFIG.MARTINGALE_FACTOR, martingaleLevelRef.current) * 100) / 100;

                // SMART RECOVERY: Activate cooldown IMMEDIATELY
                isOnCooldownRef.current = true;
                pendingMartingaleRef.current = true;
                addLog(`⏸️ PAUSA OBLIGATORIA: Esperando nueva secuencia de 3.`, 'warning');
            } else {
                currentStakeRef.current = initialStakeRef.current;
                martingaleLevelRef.current = 0;
                isOnCooldownRef.current = false;
                pendingMartingaleRef.current = false;
                addLog(`🔄 Max Gale alcanzado. Reset.`, 'error');
            }
        }

        setStats(prev => ({
            ...prev,
            currentStake: currentStakeRef.current,
            martingaleLevel: martingaleLevelRef.current,
            isOnCooldown: isOnCooldownRef.current,
        }));

        isWaitingForContractRef.current = false;
    }, [updateStats, addLog]);

    // --- MESSAGE HANDLER ---
    const handleMessage = useCallback((event: MessageEvent) => {
        if (!isRunningRef.current) return;

        try {
            const data = JSON.parse(event.data);

            if (data.msg_type === 'tick' && data.tick) {
                processTick(data.tick.quote);
            }

            if (data.msg_type === 'buy' && data.buy) {
                socket?.send(JSON.stringify({
                    proposal_open_contract: 1,
                    contract_id: data.buy.contract_id,
                    subscribe: 1,
                }));
            }

            if (data.msg_type === 'buy' && data.error) {
                addLog(`Error: ${data.error.message}`, 'error');
                isWaitingForContractRef.current = false;
            }

            if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
                const contract = data.proposal_open_contract;
                if (contract.is_sold) {
                    processContractResult({ profit: parseFloat(contract.profit), status: contract.status });
                }
            }

            if (data.error && data.msg_type !== 'buy') {
                addLog(`Error API: ${data.error.message}`, 'error');
            }
        } catch (error) {
            console.error('[BotSigma] Error parsing message:', error);
        }
    }, [socket, processTick, processContractResult, addLog]);

    // --- SOCKET MANAGEMENT ---
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        // Subscribe to ticks
        socket.send(JSON.stringify({
            ticks: SIGMA_CONFIG.SYMBOL,
            subscribe: 1,
        }));

        return () => {
            socket.removeEventListener('message', onMessage);
        };
    }, [isRunning, socket, handleMessage]);

    // --- START BOT ---
    const startBot = useCallback((config: BotConfig) => {
        if (!socket || !isConnected) {
            toast.error('Conexión requerida', {
                description: 'Conecte su cuenta Deriv primero.',
            });
            return;
        }

        configRef.current = config;
        initialStakeRef.current = config.stake;
        currentStakeRef.current = config.stake;
        martingaleLevelRef.current = 0;
        totalProfitRef.current = 0;
        isRunningRef.current = true;
        isWaitingForContractRef.current = false;
        isOnCooldownRef.current = false;
        pendingMartingaleRef.current = false;
        parityHistoryRef.current = [];

        setIsRunning(true);
        setActiveBot('Bot Sigma');
        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: config.stake,
            martingaleLevel: 0,
            consecutiveCount: 0,
            signalsTriggered: 0,
            signalsBlocked: 0,
            lastParity: null,
            isPingPong: false,
            isOnCooldown: false,
        });
        setLogs([]);

        addLog(`🎯 BOT SIGMA v3 - STRICT TREND`, 'success');
        addLog(`📈 Estrategia: Sequencia de ${SIGMA_CONFIG.CONSECUTIVE_TRIGGER} dígitos iguales`, 'info');
        addLog(`💡 Smart Recovery: Pausa obligatoria después de Loss`, 'info');
        addLog(`🛡️ Max Gales: ${SIGMA_CONFIG.MAX_MARTINGALE_LEVELS}`, 'info');

        toast.success('Bot Sigma v3 Activado', {
            description: `Operando en ${SIGMA_CONFIG.SYMBOL_NAME}`,
        });
    }, [socket, isConnected, setActiveBot, addLog]);

    // --- STOP BOT ---
    const stopBot = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);
        setActiveBot(null);

        if (socket) {
            socket.send(JSON.stringify({
                forget_all: 'ticks',
            }));
        }

        addLog(`⏹️ BOT SIGMA DETENIDO`, 'warning');
        toast.info('Bot Sigma Detenido');
    }, [socket, setActiveBot, addLog]);

    return {
        isRunning,
        isConnected,
        stats,
        logs,
        startBot,
        stopBot,
    };
};
