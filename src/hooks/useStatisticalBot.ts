/**
 * useStatisticalBot - Hook React para el bot de trading estadístico avanzado
 * 
 * Integra TradingBot con Deriv API y proporciona estado reactivo para UI
 * Sistema Multi-Layer con PatternHeatmap, StreakDetector y DiffersStrategy
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { useRiskSystem } from './useRiskSystem';
import { toast } from 'sonner';
import {
    TradingBot,
    BotConfig,
    LogEntry,
    PendingContract,
    RiskStatus,
    AdvancedAnalysis,
    MultiLayerStatus
} from '../lib/trading';

// Símbolos disponibles - Solo V75 1s y V100 1s según requisitos
export const AVAILABLE_SYMBOLS = [
    { id: '1HZ75V', name: 'Volatility 75 (1s) Index' },
    { id: '1HZ100V', name: 'Volatility 100 (1s) Index' },
    { id: 'R_75', name: 'Volatility 75 Index' },
    { id: 'R_100', name: 'Volatility 100 Index' }
];

export interface StatBotState {
    isRunning: boolean;
    isWaitingForContract: boolean;
    analysis: AdvancedAnalysis | null;
    riskStatus: RiskStatus | null;
    logs: LogEntry[];
    lastDigits: number[];
    currentPrice: number;
    pendingContract: PendingContract | null;
    multiLayerStatus: MultiLayerStatus | null;
}

export interface StatBotConfig {
    symbol: string;
    initialCapital: number;
    stakePercentage: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
    maxConsecutiveLosses: number;
    preferredContractType: 'EVENODD' | 'DIFFERS' | 'AUTO';
}

export const useStatisticalBot = () => {
    const { socket, isConnected, account } = useDeriv();
    const { updateStats, setActiveBot } = useTradingSession();
    const { isEnabled: riskEnabled, checkSafetyLock } = useRiskSystem();

    // State
    const [state, setState] = useState<StatBotState>({
        isRunning: false,
        isWaitingForContract: false,
        analysis: null,
        riskStatus: null,
        logs: [],
        lastDigits: [],
        currentPrice: 0,
        pendingContract: null,
        multiLayerStatus: null
    });

    // Refs
    const botRef = useRef<TradingBot | null>(null);
    const isRunningRef = useRef<boolean>(false);
    const currentContractIdRef = useRef<string | null>(null);
    const pendingContractRef = useRef<PendingContract | null>(null);

    /**
     * Agregar log al estado
     */
    const addLog = useCallback((log: LogEntry) => {
        setState(prev => ({
            ...prev,
            logs: [...prev.logs.slice(-100), log]
        }));
    }, []);

    /**
     * Actualizar estadísticas con análisis avanzado
     */
    const updateAnalysis = useCallback((analysis: AdvancedAnalysis, riskStatus: RiskStatus) => {
        setState(prev => ({
            ...prev,
            analysis,
            riskStatus,
            multiLayerStatus: analysis.multiLayer,
            lastDigits: botRef.current?.getLastDigits(25) || []
        }));
    }, []);

    /**
     * Manejar stop del bot
     */
    const handleBotStop = useCallback((reason: string) => {
        isRunningRef.current = false;
        setState(prev => ({
            ...prev,
            isRunning: false,
            isWaitingForContract: false,
            pendingContract: null
        }));

        setActiveBot(null);
        toast.info(reason);

        // Log relatório final
        if (botRef.current) {
            const report = botRef.current.getSessionReport();
            console.log('📊 Reporte Final:', report);
        }

        // Desuscribir de ticks
        if (socket) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }
    }, [socket, setActiveBot]);

    /**
     * Ejecutar compra de contrato
     */
    const executeContract = useCallback((contract: PendingContract) => {
        if (!socket || !isRunningRef.current) return;

        const bot = botRef.current;
        if (!bot) return;

        setState(prev => ({
            ...prev,
            isWaitingForContract: true,
            pendingContract: contract
        }));

        // Store in ref for closure access
        pendingContractRef.current = contract;

        // Construir request de propuesta
        const proposalRequest: any = {
            proposal: 1,
            amount: contract.stake,
            basis: 'stake',
            contract_type: contract.type,
            currency: 'USD',
            duration: 5,
            duration_unit: 't',
            symbol: bot.getConfig().symbol
        };

        // Para DIGITDIFF, especificar el dígito de barrera
        if (contract.type === 'DIGITDIFF' && contract.digit !== undefined) {
            proposalRequest.barrier = contract.digit.toString();
        }

        // Para DIGITOVER/DIGITUNDER, especificar la barrera
        if ((contract.type === 'DIGITOVER' || contract.type === 'DIGITUNDER') && contract.barrier !== undefined) {
            proposalRequest.barrier = contract.barrier.toString();
        }

        socket.send(JSON.stringify(proposalRequest));
    }, [socket]);

    /**
     * Procesar tick
     */
    const processTick = useCallback((price: number) => {
        if (!isRunningRef.current || !botRef.current) return;

        setState(prev => ({ ...prev, currentPrice: price }));

        const result = botRef.current.processTick(price);

        if (result.shouldTrade && result.contract) {
            executeContract(result.contract);
        }
    }, [executeContract]);

    /**
     * Manejar respuesta de propuesta
     */
    const handleProposalResponse = useCallback((proposal: any) => {
        const currentPendingContract = pendingContractRef.current;
        if (!socket || !isRunningRef.current || !currentPendingContract) {
            console.log('[StatBot] No pending contract for proposal response');
            return;
        }

        const payout = proposal.payout;
        const askPrice = proposal.ask_price;
        const profitPercent = ((payout - askPrice) / askPrice) * 100;

        console.log(`[StatBot] Proposal received - Payout: ${profitPercent.toFixed(1)}%, Ask: $${askPrice}`);

        // Verificar payout mínimo (10%)
        if (profitPercent < 10) {
            addLog({
                id: Math.random().toString(36).substr(2, 9),
                time: new Date().toLocaleTimeString('es-ES'),
                message: `⚠️ Payout muy bajo (${profitPercent.toFixed(1)}%) - Trade cancelado`,
                type: 'warning'
            });

            pendingContractRef.current = null;
            setState(prev => ({
                ...prev,
                isWaitingForContract: false,
                pendingContract: null
            }));
            return;
        }

        // Comprar contrato
        socket.send(JSON.stringify({
            buy: proposal.id,
            price: askPrice
        }));

        addLog({
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message: `🎯 Ejecutando ${currentPendingContract.type} | Stake: $${askPrice.toFixed(2)} | Payout: ${profitPercent.toFixed(1)}%`,
            type: 'trade'
        });
    }, [socket, addLog]);

    /**
     * Manejar compra exitosa
     */
    const handleBuyResponse = useCallback((buyData: any) => {
        if (!socket) return;

        currentContractIdRef.current = buyData.contract_id;

        // Suscribir a actualizaciones del contrato
        socket.send(JSON.stringify({
            proposal_open_contract: 1,
            contract_id: buyData.contract_id,
            subscribe: 1
        }));
    }, [socket]);

    /**
     * Manejar resultado del contrato
     */
    const handleContractResult = useCallback((contract: any) => {
        if (!contract.is_sold || !botRef.current) return;

        const profit = parseFloat(contract.profit);
        const payout = parseFloat(contract.payout || '0');

        console.log(`[StatBot] Contract result - Profit: $${profit.toFixed(2)}`);

        botRef.current.recordContractResult(profit, payout);
        updateStats(profit, profit > 0);

        pendingContractRef.current = null;
        setState(prev => ({
            ...prev,
            isWaitingForContract: false,
            pendingContract: null,
            riskStatus: botRef.current?.getRiskStatus() || null
        }));

        // Olvidar suscripción
        if (socket && currentContractIdRef.current) {
            socket.send(JSON.stringify({ forget: contract.id }));
            currentContractIdRef.current = null;
        }
    }, [socket, updateStats]);

    /**
     * Handler de mensajes del socket
     */
    const handleMessage = useCallback((event: MessageEvent) => {
        if (!isRunningRef.current) return;

        try {
            const data = JSON.parse(event.data);

            // Tick
            if (data.msg_type === 'tick' && data.tick) {
                processTick(data.tick.quote);
            }

            // Propuesta
            if (data.msg_type === 'proposal' && data.proposal) {
                handleProposalResponse(data.proposal);
            }

            // Compra
            if (data.msg_type === 'buy' && data.buy) {
                handleBuyResponse(data.buy);
            }

            // Contrato abierto
            if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
                handleContractResult(data.proposal_open_contract);
            }

            // Error
            if (data.error) {
                console.error('[StatBot] API Error:', data.error.message);
                if (data.msg_type === 'proposal' || data.msg_type === 'buy') {
                    addLog({
                        id: Math.random().toString(36).substr(2, 9),
                        time: new Date().toLocaleTimeString('es-ES'),
                        message: `❌ Error Deriv: ${data.error.message}`,
                        type: 'error'
                    });

                    pendingContractRef.current = null;
                    setState(prev => ({
                        ...prev,
                        isWaitingForContract: false,
                        pendingContract: null
                    }));
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }, [processTick, handleProposalResponse, handleBuyResponse, handleContractResult, addLog]);

    /**
     * Iniciar bot
     */
    const startBot = useCallback((config: StatBotConfig): boolean => {
        if (!isConnected || !socket) {
            toast.error('Conecte su cuenta Deriv primero');
            return false;
        }

        // Crear nueva instancia del bot
        const bot = new TradingBot(config.initialCapital);

        // Configurar callbacks
        bot.setCallbacks({
            onLog: addLog,
            onStatsUpdate: updateAnalysis,
            onStop: handleBotStop
        });

        // Iniciar bot con config
        const started = bot.start({
            ...config,
            initialCapital: config.initialCapital,
            stakePercentage: 3, // Forzar 3% según requisitos
        });

        if (!started) {
            toast.error('Error al iniciar el bot');
            return false;
        }

        botRef.current = bot;
        isRunningRef.current = true;

        setState(prev => ({
            ...prev,
            isRunning: true,
            logs: [],
            analysis: null,
            riskStatus: bot.getRiskStatus(),
            lastDigits: [],
            multiLayerStatus: null
        }));

        setActiveBot('Analizador Avanzado');

        return true;
    }, [isConnected, socket, addLog, updateAnalysis, handleBotStop, setActiveBot]);

    /**
     * Detener bot
     */
    const stopBot = useCallback(() => {
        if (botRef.current) {
            botRef.current.stop('Detenido por usuario');
        }

        isRunningRef.current = false;

        setState(prev => ({
            ...prev,
            isRunning: false,
            isWaitingForContract: false,
            pendingContract: null
        }));

        // Limpiar suscripciones
        if (socket) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        setActiveBot(null);
    }, [socket, setActiveBot]);

    /**
     * Obtener dados do PatternHeatmap
     */
    const getPatternData = useCallback(() => {
        return botRef.current?.getPatternHeatmap().getAllPatterns() || {};
    }, []);

    /**
     * Obtener top patterns
     */
    const getTopPatterns = useCallback((limit: number = 5) => {
        return botRef.current?.getPatternHeatmap().getTopPatterns(limit) || [];
    }, []);

    /**
     * Obtener streak status
     */
    const getStreakStatus = useCallback(() => {
        return botRef.current?.getStreakDetector().getCurrentStatus() || null;
    }, []);

    /**
     * Effect para manejar mensajes del socket
     */
    useEffect(() => {
        if (!state.isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const bot = botRef.current;
        if (!bot) return;

        socket.addEventListener('message', handleMessage);

        // Suscribir a ticks
        socket.send(JSON.stringify({
            ticks: bot.getConfig().symbol,
            subscribe: 1
        }));

        return () => {
            socket.removeEventListener('message', handleMessage);
        };
    }, [state.isRunning, socket, handleMessage]);

    /**
     * Cleanup al desmontar
     */
    useEffect(() => {
        return () => {
            if (isRunningRef.current) {
                stopBot();
            }
        };
    }, []);

    return {
        // State
        isRunning: state.isRunning,
        isWaitingForContract: state.isWaitingForContract,
        analysis: state.analysis,
        riskStatus: state.riskStatus,
        logs: state.logs,
        lastDigits: state.lastDigits,
        currentPrice: state.currentPrice,
        pendingContract: state.pendingContract,
        multiLayerStatus: state.multiLayerStatus,

        // Actions
        startBot,
        stopBot,

        // Data getters
        getPatternData,
        getTopPatterns,
        getStreakStatus,

        // Config
        availableSymbols: AVAILABLE_SYMBOLS
    };
};
