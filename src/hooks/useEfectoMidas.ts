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
    vaultEnabled: boolean;
    vaultTarget: number;
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

// 🔒 Datos de Sesión Acumulados (persiste entre ciclos)
interface SessionData {
    totalProfit: number;
    vaultCount: number;
    totalWins: number;
    lastUpdated: string;
}

const SESSION_STORAGE_KEY = 'midas_session_data';

// Load session from localStorage
const loadSessionData = (): SessionData => {
    try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading session:', e);
    }
    return { totalProfit: 0, vaultCount: 0, totalWins: 0, lastUpdated: '' };
};

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

    // Vault (Bóveda Inteligente) States
    const [vaultAccumulated, setVaultAccumulated] = useState<number>(0);
    const [isVaultCooldown, setIsVaultCooldown] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    // 📊 Session Accumulator States (persiste entre ciclos)
    const [sessionData, setSessionData] = useState<SessionData>(() => loadSessionData());

    // 🔥 WARM-UP SYSTEM - Análise pré-mercado
    const [isWarmingUp, setIsWarmingUp] = useState(false);
    const [warmUpRemaining, setWarmUpRemaining] = useState(0);
    const [warmUpTicks, setWarmUpTicks] = useState(0);

    const [lastEntryScore, setLastEntryScore] = useState<number>(0);

    // Referencias
    const configRef = useRef<BotConfig | null>(null);
    const initialStakeRef = useRef<number>(0);
    const currentStakeRef = useRef<number>(0);
    const isWaitingForContractRef = useRef<boolean>(false);
    const lastDigitsRef = useRef<number[]>([]);
    const lastPricesRef = useRef<number[]>([]);
    const consecutiveLossesRef = useRef<number>(0);
    const tickSubscriptionIdRef = useRef<string | null>(null);
    const totalProfitRef = useRef<number>(0);
    const isRunningRef = useRef<boolean>(false);

    // Vault Refs
    const vaultAccumulatedRef = useRef<number>(0);
    const vaultTargetRef = useRef<number>(3.0);
    const vaultEnabledRef = useRef<boolean>(true);
    const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isVaultCooldownRef = useRef<boolean>(false); // 🔒 Track cooldown state for callbacks
    const cycleWinsRef = useRef<number>(0); // 🏆 Track wins per cycle for session

    // 🔄 Cycle Tracking Refs (para cálculo de lucro líquido)
    const cycleOperationsRef = useRef<Array<{ profit: number, stake: number }>>([]);
    const cycleLossesCountRef = useRef<number>(0);

    // 🎯 FASE 1 - Filtro de Confirmação de Sinal
    const awaitingConfirmationRef = useRef<{ digit: number, timestamp: number } | null>(null);

    // 🔥 WARM-UP REFS
    const isWarmingUpRef = useRef<boolean>(false);
    const warmUpTicksRef = useRef<number>(0);
    const warmUpIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const WARM_UP_DURATION = 45; // segundos
    const WARM_UP_MIN_TICKS = 50; // mínimo de ticks para análise

    // 💾 Save session to localStorage
    const saveSession = useCallback((data: SessionData) => {
        try {
            const updated = { ...data, lastUpdated: new Date().toISOString() };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
            setSessionData(updated);
        } catch (e) {
            console.error('Error saving session:', e);
        }
    }, []);

    // 🔄 Reset session (Nueva Sesión)
    const resetSession = useCallback(() => {
        // Reset accumulated session data (localStorage)
        const emptySession: SessionData = {
            totalProfit: 0,
            vaultCount: 0,
            totalWins: 0,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(emptySession));
        setSessionData(emptySession);

        // Reset current stats (the "Resultado" shown in UI)
        totalProfitRef.current = 0;
        consecutiveLossesRef.current = 0;
        vaultAccumulatedRef.current = 0;
        cycleWinsRef.current = 0;

        // 🔄 Reset cycle tracking
        cycleOperationsRef.current = [];
        cycleLossesCountRef.current = 0;

        // 🎯 Reset confirmation state
        awaitingConfirmationRef.current = null;

        setStats({
            wins: 0,
            losses: 0,
            totalProfit: 0,
            currentStake: initialStakeRef.current || 0.35,
            consecutiveLosses: 0,
        });
        setVaultAccumulated(0);
        setLogs([]);
    }, []);

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

    // 🔒 Sonido de Bóveda (Cash Register / Vault closing)
    const playVaultSound = useCallback(() => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // First chime - high
            const osc1 = audioContext.createOscillator();
            const gain1 = audioContext.createGain();
            osc1.connect(gain1);
            gain1.connect(audioContext.destination);
            osc1.frequency.setValueAtTime(1400, audioContext.currentTime);
            osc1.type = 'sine';
            gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            osc1.start(audioContext.currentTime);
            osc1.stop(audioContext.currentTime + 0.15);

            // Second chime - higher (cha-ching effect)
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.setValueAtTime(1800, audioContext.currentTime + 0.1);
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0, audioContext.currentTime);
            gain2.gain.setValueAtTime(0.35, audioContext.currentTime + 0.1);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
            osc2.start(audioContext.currentTime + 0.1);
            osc2.stop(audioContext.currentTime + 0.35);

            // Third chime - even higher (vault lock)
            const osc3 = audioContext.createOscillator();
            const gain3 = audioContext.createGain();
            osc3.connect(gain3);
            gain3.connect(audioContext.destination);
            osc3.frequency.setValueAtTime(2200, audioContext.currentTime + 0.2);
            osc3.type = 'sine';
            gain3.gain.setValueAtTime(0, audioContext.currentTime);
            gain3.gain.setValueAtTime(0.25, audioContext.currentTime + 0.2);
            gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc3.start(audioContext.currentTime + 0.2);
            osc3.stop(audioContext.currentTime + 0.5);
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
        // Para estratégia de Reversão (Digit Differs após Repetição),
        // dígito quente é BOM sinal (tendência a não repetir 3x)
        return { safe: true, message: '' };
    }, []);

    // 🎯 FASE 1 - Detector de Streak Ativo
    const checkStreakSafety = useCallback((digit: number, history: number[]) => {
        // Analisar últimos 10 ticks
        if (history.length < 10) return { safe: true, message: '' };

        const recentHistory = history.slice(-10);

        // Contar ocorrências do dígito
        const occurrences = recentHistory.filter(d => d === digit).length;
        const frequency = occurrences / recentHistory.length;

        // Se dígito apareceu > 40% nos últimos 10 ticks (aumentado de 30% para 40%)
        if (frequency > 0.40) {
            return {
                safe: false,
                message: `🚫 Streak Extremo: Dígito [${digit}] em ${(frequency * 100).toFixed(0)}% dos últimos 10 ticks`
            };
        }

        return { safe: true, message: '' };
    }, []);

    // 📊 CONFIDENCE SCORE SYSTEM - Calcula pontuação de confiança para entrada
    const calculateEntryScore = useCallback((digit: number, digitHistory: number[], priceHistory: number[]): { score: number, reasons: string[] } => {
        let score = 0;
        const reasons: string[] = [];

        // 1. TREND STATUS (+2 se neutro)
        const recentPrices = priceHistory.slice(-6);
        let upCount = 0, downCount = 0;
        for (let i = 1; i < recentPrices.length; i++) {
            if (recentPrices[i] > recentPrices[i - 1]) upCount++;
            else if (recentPrices[i] < recentPrices[i - 1]) downCount++;
        }
        if (upCount < 4 && downCount < 4) {
            score += 2;
            reasons.push('✅ Mercado lateral');
        } else {
            reasons.push('⚠️ Tendência forte');
        }

        // 2. DIGIT TEMPERATURE (Invertido: +2 se quente, preferível para reversão)
        const sampleSize = Math.min(digitHistory.length, 50);
        const sample = digitHistory.slice(-sampleSize);
        const digitFreq = sample.filter(d => d === digit).length / sampleSize;

        if (digitFreq > 0.12) { // > 12% (Quente)
            score += 2;
            reasons.push(`🔥 Dígito [${digit}] quente (${(digitFreq * 100).toFixed(1)}%) - Bom para Reversão`);
        } else if (digitFreq < 0.08) { // < 8% (Frio)
            score -= 1;
            reasons.push(`❄️ Dígito [${digit}] muito frio - Cuidado`);
        } else {
            score += 1;
            reasons.push(`➖ Dígito [${digit}] normal`);
        }

        // 3. STREAK LOCAL (+1 se sem streak)
        const recent10 = digitHistory.slice(-10);
        const localFreq = recent10.filter(d => d === digit).length / 10;
        if (localFreq < 0.20) {
            score += 1;
            reasons.push('✅ Sem streak local');
        }

        // 4. CONFIRMAÇÃO VÁLIDA (+2 pontos base)
        score += 2;

        // 5. DISTRIBUIÇÃO UNIFORME (+1 se entropia alta)
        const last30 = digitHistory.slice(-30);
        const counts: Record<number, number> = {};
        for (const d of last30) {
            counts[d] = (counts[d] || 0) + 1;
        }
        let entropy = 0;
        for (const count of Object.values(counts)) {
            const p = count / last30.length;
            if (p > 0) entropy -= p * Math.log2(p);
        }
        if (entropy > 2.2) {
            score += 1;
            reasons.push('✅ Distribuição uniforme');
        }

        return { score, reasons };
    }, []);

    // 🏥 MARKET HEALTH CHECK REMOVED


    // 🔥 START WARM-UP - Inicia período de aquecimento
    const startWarmUp = useCallback(() => {
        isWarmingUpRef.current = true;
        warmUpTicksRef.current = 0;
        setIsWarmingUp(true);
        setWarmUpTicks(0);
        setWarmUpRemaining(WARM_UP_DURATION);


        addLog(`🔥 WARM-UP INICIADO: Analizando mercado por ${WARM_UP_DURATION}s...`, 'gold');

        if (warmUpIntervalRef.current) {
            clearInterval(warmUpIntervalRef.current);
            warmUpIntervalRef.current = null;
        }

        let remainingTime = WARM_UP_DURATION;

        warmUpIntervalRef.current = setInterval(() => {
            remainingTime -= 1;
            setWarmUpRemaining(remainingTime);

            if (remainingTime <= 0) {
                // Timer finished - clean up interval
                if (warmUpIntervalRef.current) {
                    clearInterval(warmUpIntervalRef.current);
                    warmUpIntervalRef.current = null;
                }

                const currentTicks = warmUpTicksRef.current;

                // Check if we have enough ticks
                if (currentTicks >= WARM_UP_MIN_TICKS) {
                    // Complete warm-up
                    isWarmingUpRef.current = false;
                    setIsWarmingUp(false);
                    addLog(`✅ WARM-UP COMPLETO: Operações liberadas!`, 'gold');
                } else {
                    // Not enough ticks - extend warm-up
                    addLog(`⏳ Ticks insuficientes (${currentTicks}/${WARM_UP_MIN_TICKS}). Extendiendo 15s...`, 'info');
                    remainingTime = 15;
                    setWarmUpRemaining(15);

                    // Restart interval for extension
                    warmUpIntervalRef.current = setInterval(() => {
                        remainingTime -= 1;
                        setWarmUpRemaining(remainingTime);

                        if (remainingTime <= 0) {
                            if (warmUpIntervalRef.current) {
                                clearInterval(warmUpIntervalRef.current);
                                warmUpIntervalRef.current = null;
                            }

                            // Force complete after extension
                            isWarmingUpRef.current = false;
                            setIsWarmingUp(false);
                            addLog(`✅ WARM-UP FINALIZADO después de extensión.`, 'gold');
                        }
                    }, 1000);
                }
            }
        }, 1000);
    }, [addLog, WARM_UP_DURATION, WARM_UP_MIN_TICKS]);

    // 🧊 Sistema de Resfriamento Inteligente Adaptativo
    const startAdaptiveCooldown = useCallback((reason: 'vault_complete' | 'excessive_losses') => {
        isVaultCooldownRef.current = true;
        setIsVaultCooldown(true);

        let cooldownDuration = 60; // Default: 60s

        if (reason === 'excessive_losses') {
            // Cooldown progressivo baseado em losses consecutivas do ciclo
            const losses = cycleLossesCountRef.current;

            if (losses >= 7) {
                cooldownDuration = 300; // 5 minutos
                addLog(`❄️ RESFRIAMENTO EXTREMO: ${losses} losses detectadas. Pausando 5 minutos...`, 'error');
                toast.warning(`⚠️ Mercado instável! Resfriando 5 minutos...`);
            } else if (losses >= 5) {
                cooldownDuration = 180; // 3 minutos
                addLog(`❄️ RESFRIAMENTO ALTO: ${losses} losses detectadas. Pausando 3 minutos...`, 'warning');
                toast.warning(`⚠️ Ciclo ruim detectado. Resfriando 3 minutos...`);
            } else {
                cooldownDuration = 60; // 1 minuto
                addLog(`❄️ Resfriamento padrão: 60 segundos`, 'info');
            }
        } else {
            addLog(`🔒 Bóveda completa. Resfriando 60 segundos...`, 'gold');
        }

        setCooldownRemaining(cooldownDuration);

        // Clear any existing interval
        if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
        }

        cooldownIntervalRef.current = setInterval(() => {
            setCooldownRemaining(prev => {
                if (prev <= 1) {
                    // Cooldown finished
                    if (cooldownIntervalRef.current) {
                        clearInterval(cooldownIntervalRef.current);
                        cooldownIntervalRef.current = null;
                    }

                    // Reset vault and cycle tracking
                    vaultAccumulatedRef.current = 0;
                    setVaultAccumulated(0);
                    isVaultCooldownRef.current = false;
                    setIsVaultCooldown(false);
                    cycleWinsRef.current = 0; // Reset cycle wins for next cycle
                    cycleOperationsRef.current = []; // 🔄 Limpar operações do ciclo
                    cycleLossesCountRef.current = 0; // 🔄 Resetar contador de losses

                    // Auto-restart if global TP not reached
                    if (configRef.current && totalProfitRef.current < configRef.current.takeProfit) {
                        addLog('🔓 Resfriamento concluído. Reiniciando operações...', 'gold');
                        toast.success('✅ Sistema resfriado! Retomando operações...');
                    } else {
                        addLog('🏆 Meta global alcanzada. Bot detenido.', 'gold');
                    }

                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [addLog]);

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

            // 🔥 WARM-UP: Contar ticks durante aquecimento
            if (isWarmingUpRef.current) {
                warmUpTicksRef.current += 1;
                setWarmUpTicks(warmUpTicksRef.current);
            }

            // Detectar anomalía de repetición
            const repeated = detectRepetitionAnomaly(lastDigitsRef.current);

            if (repeated !== null) {
                setAnomalyDetected(true);
                setRepeatedDigit(repeated);

                // Si no estamos esperando un contrato, procesar señal
                if (!isWaitingForContractRef.current && socket && configRef.current) {

                    // 🎯 FASE 1 - FILTRO DE CONFIRMAÇÃO DE SINAL
                    // Se não estamos aguardando confirmação, iniciar processo
                    if (!awaitingConfirmationRef.current) {
                        awaitingConfirmationRef.current = {
                            digit: repeated,
                            timestamp: Date.now()
                        };
                        addLog(`👁️ Anomalia detectada [${repeated}]. Aguardando confirmação...`, 'info');
                        setTimeout(() => {
                            setAnomalyDetected(false);
                            setRepeatedDigit(null);
                        }, 1000);
                        return; // NÃO ENTRAR AINDA - aguardar próximo tick
                    }

                    // Se estamos aguardando confirmação do MESMO dígito
                    if (awaitingConfirmationRef.current.digit === repeated) {
                        // TRIPLA REPETIÇÃO! Cancelar entrada
                        addLog(`🚫 Tripla repetição [${repeated}] detectada. Entrada CANCELADA.`, 'warning');
                        awaitingConfirmationRef.current = null;
                        setTimeout(() => {
                            setAnomalyDetected(false);
                            setRepeatedDigit(null);
                        }, 1000);
                        return;
                    }
                }
            } else {
                // Tick diferente - verificar se estávamos aguardando confirmação
                if (awaitingConfirmationRef.current && !isWaitingForContractRef.current && socket && configRef.current) {
                    const confirmedDigit = awaitingConfirmationRef.current.digit;
                    awaitingConfirmationRef.current = null;

                    // ✅ CONFIRMAÇÃO RECEBIDA! Aplicar filtros de segurança
                    addLog(`✅ Confirmação recebida para dígito [${confirmedDigit}]`, 'gold');


                    // 🔥 WARM-UP CHECK - Bloquear durante aquecimento
                    if (isWarmingUpRef.current) {
                        addLog(`⏳ WARM-UP ativo. Sinal ignorado...`, 'info');
                        return;
                    }

                    // --- FILTROS DE SEGURIDAD EXISTENTES ---

                    // 1. Check Trend Guard
                    const trendCheck = checkTrendSafety(confirmedDigit, lastPricesRef.current);
                    if (!trendCheck.safe) {
                        addLog(trendCheck.message, 'warning');
                        return;
                    }

                    // 2. Check Hot Digit Overload
                    const hotDigitCheck = checkHotDigitSafety(confirmedDigit, lastDigitsRef.current);
                    if (!hotDigitCheck.safe) {
                        addLog(hotDigitCheck.message, 'warning');
                        return;
                    }

                    // 🎯 FASE 1 - 3. Check Streak Ativo
                    const streakCheck = checkStreakSafety(confirmedDigit, lastDigitsRef.current);
                    if (!streakCheck.safe) {
                        addLog(streakCheck.message, 'warning');
                        return;
                    }

                    // 📊 CONFIDENCE SCORE CHECK - Mínimo 5 pontos para entrar
                    const { score, reasons } = calculateEntryScore(confirmedDigit, lastDigitsRef.current, lastPricesRef.current);
                    setLastEntryScore(score);

                    const minScore = 5; // Score fixo
                    if (score < minScore) {
                        addLog(`📊 Score ${score}/${minScore} insuficiente. Entrada bloqueada.`, 'warning');
                        reasons.forEach(r => addLog(`   ${r}`, 'info'));
                        return;
                    }
                    addLog(`📊 Score de confiança: ${score}/8 ✓`, 'gold');

                    // --- EXECUTION ---
                    setIsShadowMode(false);
                    isWaitingForContractRef.current = true;

                    const stakeAmount = parseFloat(currentStakeRef.current.toFixed(2));
                    setSelectedDigit(confirmedDigit);

                    addLog(`⚡ SINAL CONFIRMADO >> DÍGITO [${confirmedDigit}] VALIDADO`, 'gold');
                    addLog(`🎯 Ejecutando DIGIT DIFFERS en [${confirmedDigit}] con $${stakeAmount.toFixed(2)}`, 'gold');

                    // Enviar orden de compra - DIGITDIFF (apostar que el próximo NO será el dígito repetido)
                    const buyRequest = {
                        buy: 1,
                        subscribe: 1,
                        price: 100,
                        parameters: {
                            contract_type: 'DIGITDIFF',
                            symbol: configRef.current?.symbol || '1HZ100V',
                            currency: 'USD',
                            amount: stakeAmount,
                            basis: 'stake',
                            duration: 1,
                            duration_unit: 't',
                            barrier: confirmedDigit.toString(),
                        }
                    };

                    socket.send(JSON.stringify(buyRequest));

                    // Resetear anomalía después de entrada
                    setTimeout(() => {
                        setAnomalyDetected(false);
                        setRepeatedDigit(null);
                    }, 1000);
                }
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

                    // 🔄 Adicionar operação ao ciclo
                    cycleOperationsRef.current.push({ profit, stake: currentStakeRef.current });

                    // 💰 Calcular lucro LÍQUIDO do ciclo (soma de todos os profits/losses)
                    const cycleNetProfit = cycleOperationsRef.current.reduce((sum, op) => sum + op.profit, 0);

                    addLog(`💰 ¡GANAMOS! +$${profit.toFixed(2)} | Lucro Líquido do Ciclo: $${cycleNetProfit.toFixed(2)}`, 'gold');

                    currentStakeRef.current = initialStakeRef.current;
                    consecutiveLossesRef.current = 0;
                    cycleWinsRef.current += 1; // 🏆 Increment cycle wins

                    setStats(prev => {
                        totalProfitRef.current = prev.totalProfit + profit;
                        return {
                            ...prev,
                            wins: prev.wins + 1,
                            totalProfit: prev.totalProfit + profit,
                            currentStake: initialStakeRef.current,
                            consecutiveLosses: 0,
                        };
                    });

                    // 🔒 BÓVEDA INTELIGENTE - Acumular ganancia LÍQUIDA del ciclo
                    if (vaultEnabledRef.current && !isVaultCooldownRef.current) {
                        // ✅ Acumular lucro LÍQUIDO (não bruto)
                        vaultAccumulatedRef.current += cycleNetProfit;
                        setVaultAccumulated(vaultAccumulatedRef.current);

                        // Limpar operações do ciclo após WIN
                        cycleOperationsRef.current = [];
                        cycleLossesCountRef.current = 0;

                        // Check if vault target reached
                        if (vaultAccumulatedRef.current >= vaultTargetRef.current) {
                            playVaultSound();
                            addLog(`🔒 **BÓVEDA LLENA ($${vaultTargetRef.current.toFixed(2)}). Asegurando ganancias...**`, 'gold');
                            addLog(`❄️ Enfriando algoritmo por 60 segundos...`, 'info');
                            toast.success(`¡Bóveda llena! $${vaultAccumulatedRef.current.toFixed(2)} asegurados`);

                            // 📊 GUARDAR SESIÓN ACUMULADA - Este lucro es SAGRADO
                            const cycleProfit = vaultAccumulatedRef.current;
                            const cycleWins = cycleWinsRef.current; // Use ref for accurate count
                            saveSession({
                                totalProfit: sessionData.totalProfit + cycleProfit,
                                vaultCount: sessionData.vaultCount + 1,
                                totalWins: sessionData.totalWins + cycleWins,
                                lastUpdated: new Date().toISOString()
                            });

                            startAdaptiveCooldown('vault_complete');
                            return; // Stop processing - cooldown active
                        }
                    }
                } else {
                    // LOSS - Martingale Recovery Logic (Recovery Factor, NOT Stop Trigger)
                    const lossAmount = Math.abs(profit);

                    // 🔄 Adicionar operação ao ciclo
                    cycleOperationsRef.current.push({ profit, stake: currentStakeRef.current });

                    const maxGale = configRef.current?.maxConsecutiveLosses || 0;
                    const martingaleEnabled = configRef.current?.useMartingale === true; // ✅ Validação estrita
                    const multiplier = configRef.current?.martingaleMultiplier || 2.1;

                    // ⚠️ GUARD CLAUSE PRIORITÁRIA: Se martingale desabilitado, NÃO incrementar consecutiveLosses
                    if (!martingaleEnabled) {
                        addLog(`💥 Pérdida: -$${lossAmount.toFixed(2)}`, 'error');
                        addLog(`🔄 Martingale DESABILITADO: Continuando com stake fixo $${initialStakeRef.current.toFixed(2)}`, 'info');

                        cycleLossesCountRef.current += 1; // Apenas para cooldown adaptativo

                        // Update stats with loss (sem incrementar consecutiveLosses)
                        setStats(prev => {
                            totalProfitRef.current = prev.totalProfit + profit;
                            return {
                                ...prev,
                                losses: prev.losses + 1,
                                totalProfit: prev.totalProfit + profit,
                                currentStake: initialStakeRef.current,
                                consecutiveLosses: 0, // Sempre 0 quando martingale desabilitado
                            };
                        });

                        // Manter stake fixo
                        currentStakeRef.current = initialStakeRef.current;
                        consecutiveLossesRef.current = 0;

                        // 🧊 COOLDOWN POR LOSSES EXCESSIVAS (6+ losses no ciclo)
                        if (cycleLossesCountRef.current >= 6 && vaultEnabledRef.current) {
                            addLog(`⚠️ ${cycleLossesCountRef.current} losses consecutivas detectadas no ciclo`, 'warning');
                            addLog(`🧊 Ativando resfriamento adaptativo...`, 'warning');

                            // Resetar ciclo antes de cooldown
                            cycleOperationsRef.current = [];
                            cycleLossesCountRef.current = 0;

                            startAdaptiveCooldown('excessive_losses');
                        }

                        return; // ✅ Sair da função, não executar lógica de martingale
                    }

                    // MARTINGALE HABILITADO - Continuar com lógica normal
                    consecutiveLossesRef.current += 1;
                    cycleLossesCountRef.current += 1;

                    addLog(`💥 Pérdida: -$${lossAmount.toFixed(2)} (Gale ${consecutiveLossesRef.current}/${maxGale})`, 'error');

                    // Update stats with loss
                    setStats(prev => {
                        totalProfitRef.current = prev.totalProfit + profit;
                        return {
                            ...prev,
                            losses: prev.losses + 1,
                            totalProfit: prev.totalProfit + profit,
                            consecutiveLosses: prev.consecutiveLosses + 1,
                        };
                    });

                    // 🧊 COOLDOWN POR LOSSES EXCESSIVAS (6+ losses no ciclo)
                    if (cycleLossesCountRef.current >= 6 && vaultEnabledRef.current) {
                        addLog(`⚠️ ${cycleLossesCountRef.current} losses consecutivas detectadas no ciclo`, 'warning');
                        addLog(`🧊 Ativando resfriamento adaptativo...`, 'warning');

                        // Resetar ciclo antes de cooldown
                        cycleOperationsRef.current = [];
                        cycleLossesCountRef.current = 0;
                        currentStakeRef.current = initialStakeRef.current;
                        consecutiveLossesRef.current = 0;

                        setStats(prev => ({
                            ...prev,
                            currentStake: initialStakeRef.current,
                            consecutiveLosses: 0,
                        }));

                        startAdaptiveCooldown('excessive_losses');
                        return;
                    }

                    // Determine next stake (Martingale habilitado)
                    let newStake = initialStakeRef.current;

                    if (consecutiveLossesRef.current <= maxGale) {
                        // MARTINGALE: Calculate recovery stake
                        newStake = parseFloat((currentStakeRef.current * multiplier).toFixed(2));

                        // 🛡️ PRE-STOP LOSS CHECK: Would this stake cause us to exceed Stop Loss?
                        const currentLoss = Math.abs(totalProfitRef.current);
                        const potentialTotalLoss = currentLoss + newStake;
                        const stopLossLimit = configRef.current?.stopLoss || 10;

                        if (potentialTotalLoss >= stopLossLimit) {
                            // PRE-STOP: Don't open operation, would exceed SL
                            addLog(`⚠️ PRE-STOP: Próximo stake $${newStake.toFixed(2)} excedería SL ($${stopLossLimit.toFixed(2)})`, 'error');
                            addLog(`🛑 Deteniendo bot preventivamente.`, 'error');
                            toast.error('Pre-Stop Loss: Próxima operación excedería límite');
                            currentStakeRef.current = initialStakeRef.current;
                            stopBot();
                            return;
                        }

                        addLog(`🔄 Gale ${consecutiveLossesRef.current}/${maxGale}: Próximo stake $${newStake.toFixed(2)} (×${multiplier})`, 'warning');
                        currentStakeRef.current = newStake;

                        setStats(prev => ({
                            ...prev,
                            currentStake: newStake,
                        }));
                    } else {
                        // MAX GALE EXCEEDED: Reset stake and CONTINUE
                        addLog(`🔄 Gale ${maxGale} fallido. Reiniciando ciclo com stake inicial $${initialStakeRef.current.toFixed(2)}`, 'warning');

                        // Reset to initial stake and consecutive losses
                        currentStakeRef.current = initialStakeRef.current;
                        consecutiveLossesRef.current = 0;
                        cycleOperationsRef.current = []; // Limpar ciclo após max gale

                        setStats(prev => ({
                            ...prev,
                            currentStake: initialStakeRef.current,
                            consecutiveLosses: 0,
                        }));

                        // Bot CONTINUES operating - only SL/TP will stop it
                    }
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

        // 🔒 Initialize Vault refs from config
        vaultTargetRef.current = config.vaultTarget || 3.0;
        vaultEnabledRef.current = config.vaultEnabled !== false;
        vaultAccumulatedRef.current = 0;
        setVaultAccumulated(0);
        isVaultCooldownRef.current = false;
        setIsVaultCooldown(false);
        setCooldownRemaining(0);
        if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
            cooldownIntervalRef.current = null;
        }
        cycleWinsRef.current = 0; // Reset cycle wins for fresh start

        // 🔄 Reset cycle tracking refs
        cycleOperationsRef.current = [];
        cycleLossesCountRef.current = 0;

        // 🎯 Reset confirmation state
        awaitingConfirmationRef.current = null;

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

        // Subscription is now handled by useEffect

        addLog(`⚡ PROTOCOLO MIDAS ACTIVADO`, 'gold');
        addLog(`🎯 Activo: ${config.symbol || '1HZ100V'} (Volatility 100 1s)`, 'info');
        addLog(`💰 Stake: $${config.stake} | TP: $${config.takeProfit} | SL: $${config.stopLoss}`, 'info');

        // 🔄 Log de configuração de Martingale
        if (config.useMartingale) {
            addLog(`🔄 Martingale HABILITADO: Máx ${config.maxConsecutiveLosses} gales, multiplicador ${config.martingaleMultiplier}x`, 'info');
        } else {
            addLog(`🔄 Martingale DESABILITADO: Stake fixo em $${config.stake}`, 'info');
        }

        addLog(`🔱️ Segurança: Trend Guard & Hot Digit Overload Activados`, 'info');
        if (config.vaultEnabled !== false) {
            addLog(`🔒 Bóveda Inteligente: Meta $${(config.vaultTarget || 3.0).toFixed(2)} por ciclo`, 'info');
        }
        addLog(`👁️ Modo Sombra activado... Buscando anomalías de repetición...`, 'info');

        // 🔥 INICIAR WARM-UP antes de permitir operações
        isRunningRef.current = true;
        setIsRunning(true);

        // Iniciar warm-up após bot estar running (para subscrever ticks)
        setTimeout(() => {
            startWarmUp();
        }, 500);

        return true;
    }, [socket, isConnected, handleMessage, addLog, setActiveBot, startWarmUp]);

    // Detener el bot
    const stopBot = useCallback(() => {
        // Listener removal handled by useEffect cleanup
        if (socket) {
            socket.send(JSON.stringify({ forget_all: 'ticks' }));
        }

        // Clean up vault cooldown
        if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
            cooldownIntervalRef.current = null;
        }
        isVaultCooldownRef.current = false;
        setIsVaultCooldown(false);
        setCooldownRemaining(0);

        // 🔥 Clean up warm-up
        if (warmUpIntervalRef.current) {
            clearInterval(warmUpIntervalRef.current);
            warmUpIntervalRef.current = null;
        }
        isWarmingUpRef.current = false;
        setIsWarmingUp(false);
        setWarmUpRemaining(0);
        // setMarketHealth('unknown'); // Removed

        setActiveBot(null);
        addLog('🛑 Protocolo Midas desactivado', 'warning');
        isRunningRef.current = false;
        setIsRunning(false);
        setIsShadowMode(true);
        setTrendStatus('neutral');
    }, [socket, handleMessage, addLog, setActiveBot]);

    // Limpiar al desmontar
    // Limpiar al desmontar
    useEffect(() => {
        return () => {
            if (isRunningRef.current) { // Check ref instead of state to avoid deps
                // We don't call stopBot here because it might trigger state updates on unmounted component
                // Just ensure clean up happens via socket management
            }
        };
    }, []);

    // --- SOCKET MANAGEMENT ---
    useEffect(() => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) return;

        const onMessage = (event: MessageEvent) => handleMessage(event);
        socket.addEventListener('message', onMessage);

        const config = configRef.current;
        const symbol = config?.symbol || '1HZ100V';

        // Subscribe to ticks
        socket.send(JSON.stringify({
            ticks: symbol,
            subscribe: 1,
        }));

        return () => {
            socket.removeEventListener('message', onMessage);
        };
    }, [isRunning, socket, handleMessage]);

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
        // Bóveda Inteligente exports
        vaultAccumulated,
        isVaultCooldown,
        cooldownRemaining,
        // 📊 Session Accumulator exports
        sessionData,
        resetSession,
        // 🔥 WARM-UP & MARKET HEALTH exports
        isWarmingUp,
        warmUpRemaining,
        warmUpTicks,
        lastEntryScore,
    };
};
