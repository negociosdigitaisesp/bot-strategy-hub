import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

export interface SniperConfig {
    symbol: string;
    stake: number;
    stopLoss: number;
    takeProfit: number;
}

export interface SniperLog {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'biollante' | 'analysis';
}

export interface SniperStats {
    wins: number;
    losses: number;
    winRate: number;
    totalTrades: number;
    totalProfit: number;
    currentStreak: number;
    patternsDetected: number;
    ticksAnalyzed: number;
    lastPattern: string | null;
}

export const useOneShotSniper = () => {
    const { socket, isConnected, account } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();

    // Estado principal
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<SniperLog[]>([]);
    const [lastDigit, setLastDigit] = useState<number | null>(null);
    const [martingaleMultiplier, setMartingaleMultiplier] = useState<number>(1);
    const [totalProfit, setTotalProfit] = useState(0);

    // Estadísticas detalladas
    const [stats, setStats] = useState<SniperStats>({
        wins: 0,
        losses: 0,
        winRate: 0,
        totalTrades: 0,
        totalProfit: 0,
        currentStreak: 0,
        patternsDetected: 0,
        ticksAnalyzed: 0,
        lastPattern: null
    });

    // Refs para lógica en tiempo real
    const isRunningRef = useRef(false);
    const ticksRef = useRef<number[]>([]);
    const configRef = useRef<SniperConfig>({
        symbol: '1HZ100V',
        stake: 1,
        stopLoss: 100,
        takeProfit: 100
    });
    const martingaleOpenRef = useRef(false);
    const contractInProgressRef = useRef(false);
    const profitSessionRef = useRef(0);
    const winsRef = useRef(0);
    const lossesRef = useRef(0);
    const streakRef = useRef(0);
    const patternsRef = useRef(0);
    const ticksAnalyzedRef = useRef(0);

    // Helpers de Log
    const addLog = useCallback((message: string, type: SniperLog['type'] = 'info') => {
        const newLog = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50));
    }, []);

    // ------------------------------------------------------------------------
    // LÓGICA CORE: ONE-SHOT SNIPER
    // ------------------------------------------------------------------------
    // Helper para atualizar stats
    const updateStatsState = useCallback(() => {
        const wins = winsRef.current;
        const losses = lossesRef.current;
        const total = wins + losses;
        const winRate = total > 0 ? (wins / total) * 100 : 0;

        setStats({
            wins,
            losses,
            winRate,
            totalTrades: total,
            totalProfit: profitSessionRef.current,
            currentStreak: streakRef.current,
            patternsDetected: patternsRef.current,
            ticksAnalyzed: ticksAnalyzedRef.current,
            lastPattern: null
        });
    }, []);

    const processTick = useCallback((digit: number, price: number) => {
        // Actualizar UI
        setLastDigit(digit);
        ticksAnalyzedRef.current += 1;

        if (!isRunningRef.current) return;
        if (contractInProgressRef.current) return;

        // Histórico de ticks (mantener últimos 10)
        const ticks = ticksRef.current;
        ticks.push(digit);
        if (ticks.length > 10) ticks.shift();

        // Necesitamos al menos 3 ticks para patrón
        if (ticks.length < 3) {
            addLog(`⏳ Recolectando datos... (${ticks.length}/3 ticks)`, 'info');
            return;
        }

        // 1. ANÁLISIS DE PATRÓN (Trend Following)
        const d1 = ticks[ticks.length - 1];
        const d2 = ticks[ticks.length - 2];
        const d3 = ticks[ticks.length - 3];

        const isEven1 = d1 % 2 === 0;
        const isEven2 = d2 % 2 === 0;
        const isEven3 = d3 % 2 === 0;

        let signal: 'EVEN' | 'ODD' | null = null;
        let patternName = '';

        if (isEven1 && isEven2 && isEven3) {
            signal = 'EVEN';
            patternName = '3 PARES';
            patternsRef.current += 1;
        } else if (!isEven1 && !isEven2 && !isEven3) {
            signal = 'ODD';
            patternName = '3 IMPARES';
            patternsRef.current += 1;
        }

        // Log de análisis detallado
        const evenOddStr = `[${d3}${isEven3 ? 'P' : 'I'}, ${d2}${isEven2 ? 'P' : 'I'}, ${d1}${isEven1 ? 'P' : 'I'}]`;

        if (!signal) {
            addLog(`🔍 Análisis: ${evenOddStr} → Sin patrón`, 'analysis');
            updateStatsState();
            return;
        }

        addLog(`✨ PATRÓN DETECTADO: ${evenOddStr} → ${patternName}`, 'analysis');

        // 2. FILTRO DE SEGURIDAD (0/5)
        if (d1 === 0 || d1 === 5) {
            addLog(`🚫 Filtro de Seguridad: Dígito ${d1} bloqueado`, 'warning');
            return;
        }

        // 3. EJECUCIÓN
        const stake = configRef.current.stake * martingaleMultiplier;

        if (martingaleMultiplier > 1) {
            addLog(`🔥 RECUPERACIÓN: ${signal} | Apuesta: $${stake.toFixed(2)} (x${martingaleMultiplier.toFixed(1)})`, 'biollante');
        } else {
            addLog(`🎯 ENTRADA: ${signal} detectado | Apuesta: $${stake.toFixed(2)}`, 'info');
        }

        buyContract(signal, stake);
        updateStatsState();

    }, [martingaleMultiplier, addLog, updateStatsState]);

    // ------------------------------------------------------------------------
    // COMUNICACIÓN DERIV
    // ------------------------------------------------------------------------
    const buyContract = (type: 'EVEN' | 'ODD', amount: number) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        contractInProgressRef.current = true;
        const currency = account?.currency || 'USD';

        const proposal = {
            proposal: 1,
            amount: amount,
            basis: 'stake',
            contract_type: type === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD',
            currency: currency,
            duration: 1,
            duration_unit: 't',
            symbol: configRef.current.symbol
        };

        socket.send(JSON.stringify(proposal));
    };

    // Manejo de mensajes de Socket
    useEffect(() => {
        if (!socket) return;

        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            console.log('📡 [WS MESSAGE]', data.msg_type, data);

            // GUARDA DE SEGURANÇA OBRIGATÓRIA
            if (data.msg_type === 'tick' && data.tick) {
                const quote = data.tick?.quote;
                const digit = parseInt(quote.toString().slice(-1));
                console.log('✅ Tick válido processado:', { quote, digit });
                processTick(digit, quote);
            } else if (data.msg_type === 'history') {
                console.log('📜 Mensagem de histórico recebida');
                // Lógica de histórico (se houver)
            } else {
                console.log('ℹ️ Mensagem ignorada:', data.msg_type);
            }

            if (data.msg_type === 'proposal') {
                // Comprar inmediatamente la propuesta
                const param = {
                    buy: data.proposal.id,
                    price: data.proposal.ask_price
                };
                socket.send(JSON.stringify(param));
            }

            if (data.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract.is_sold) {
                    handleContractResult(contract);
                }
            }
        };

        socket.addEventListener('message', handleMessage);
        return () => socket.removeEventListener('message', handleMessage);
    }, [socket, processTick]);

    const handleContractResult = (contract: any) => {
        const profit = parseFloat(contract.profit);
        const isWin = profit > 0;

        contractInProgressRef.current = false;
        profitSessionRef.current += profit;
        setTotalProfit(profitSessionRef.current);
        updateStats(profit, isWin);

        // Actualizar estadísticas
        if (isWin) {
            winsRef.current += 1;
            streakRef.current = streakRef.current >= 0 ? streakRef.current + 1 : 1;
            addLog(`✅ VICTORIA: +$${profit.toFixed(2)} | Racha: +${streakRef.current}`, 'success');
            setMartingaleMultiplier(1);
            martingaleOpenRef.current = false;

            if (profitSessionRef.current >= configRef.current.takeProfit) {
                stopBot();
                toast.success(`🏆 ¡META ALCANZADA! +$${profitSessionRef.current.toFixed(2)}`);
            }
        } else {
            lossesRef.current += 1;
            streakRef.current = streakRef.current <= 0 ? streakRef.current - 1 : -1;
            addLog(`❌ DERROTA: -$${Math.abs(profit).toFixed(2)} | Racha: ${streakRef.current}`, 'error');
            setMartingaleMultiplier(prev => prev * 2.1);
            martingaleOpenRef.current = true;

            if (Math.abs(profitSessionRef.current) >= configRef.current.stopLoss) {
                stopBot();
                toast.error(`🛑 STOP LOSS ALCANZADO: -$${Math.abs(profitSessionRef.current).toFixed(2)}`);
            }
        }

        // Atualizar estado de stats
        const wins = winsRef.current;
        const losses = lossesRef.current;
        const total = wins + losses;
        const winRate = total > 0 ? (wins / total) * 100 : 0;

        setStats(prev => ({
            ...prev,
            wins,
            losses,
            winRate,
            totalTrades: total,
            totalProfit: profitSessionRef.current,
            currentStreak: streakRef.current
        }));
    };

    // ------------------------------------------------------------------------
    // CONTROLES
    // ------------------------------------------------------------------------
    const startBot = (config: SniperConfig) => {
        if (!isConnected) {
            toast.error('Conecta tu cuenta Deriv primero');
            return;
        }

        // Reset configuración
        configRef.current = config;
        ticksRef.current = [];
        isRunningRef.current = true;
        contractInProgressRef.current = false;
        martingaleOpenRef.current = false;
        profitSessionRef.current = 0;

        // Reset estadísticas
        winsRef.current = 0;
        lossesRef.current = 0;
        streakRef.current = 0;
        patternsRef.current = 0;
        ticksAnalyzedRef.current = 0;

        setIsRunning(true);
        setLogs([]);
        setTotalProfit(0);
        setMartingaleMultiplier(1);
        setActiveBot('Bug Deriv Sniper');
        setStats({
            wins: 0,
            losses: 0,
            winRate: 0,
            totalTrades: 0,
            totalProfit: 0,
            currentStreak: 0,
            patternsDetected: 0,
            ticksAnalyzed: 0,
            lastPattern: null
        });

        addLog('🤖 SISTEMA INICIADO: Modo Sniper Activo', 'info');
        addLog(`⚙️ Configuración: Apuesta $${config.stake} | SL $${config.stopLoss} | TP $${config.takeProfit}`, 'info');

        // Suscribirse a ticks
        socket?.send(JSON.stringify({
            ticks: config.symbol,
            subscribe: 1
        }));
    };

    const stopBot = () => {
        isRunningRef.current = false;
        setIsRunning(false);
        setActiveBot(null);
        addLog('⏹️ SISTEMA DETENIDO', 'warning');

        socket?.send(JSON.stringify({
            forget_all: 'ticks'
        }));
    };

    return {
        isRunning,
        logs,
        lastDigit,
        totalProfit,
        martingaleMultiplier,
        stats,
        startBot,
        stopBot
    };
};
