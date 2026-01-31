import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTradingSession } from '../contexts/TradingSessionContext';

// Constantes de límites para el plan gratuito
export const FREEMIUM_LIMITS = {
    MAX_STAKE: Infinity,  // Límite de apuesta: Ilimitado
    MAX_PROFIT: 5.00,     // Tope de ganancia de sesión: $5.00 USD (antes $14.00)
};

// Marketing accounts - always PRO
const MARKETING_EMAILS = ['brendacostatmktcp@outlook.com'];

// Cooldown configuration - 3 HOURS
export const COOLDOWN_CONFIG = {
    DURATION_MS: 3 * 60 * 60 * 1000, // 3 horas en milisegundos (antes 1 hora)
    STORAGE_KEY: 'freemium_cooldown_ends_at',
};

export type PlanType = 'free' | 'pro' | 'premium' | 'elite' | 'whale' | 'vitalicio' | 'iniciado' | 'mensual' | 'anual';

interface FreemiumLimiterState {
    planType: PlanType;
    isPro: boolean;
    isFree: boolean;
    maxStake: number;
    maxProfit: number;
    isLoading: boolean;
    isLimitReached: boolean;
    daysLeft: number | null;
    daysActive: number;
    expirationDate: string | null;
    // Cooldown state
    isOnSessionCooldown: boolean;
    cooldownEndsAt: number | null;
    cooldownRemainingMs: number;
    // Lost opportunity tracking
    missedSignals: number;
    estimatedLostProfit: number;
}

export const useFreemiumLimiter = () => {
    const { user } = useAuth();
    const { sessionProfit } = useTradingSession();
    const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const missedSignalIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [state, setState] = useState<FreemiumLimiterState>({
        planType: 'free',
        isPro: false,
        isFree: true,
        maxStake: FREEMIUM_LIMITS.MAX_STAKE,
        maxProfit: FREEMIUM_LIMITS.MAX_PROFIT,
        isLoading: true,
        isLimitReached: false,
        daysLeft: null,
        daysActive: 0,
        expirationDate: null,
        // Cooldown state
        isOnSessionCooldown: false,
        cooldownEndsAt: null,
        cooldownRemainingMs: 0,
        // Lost opportunity tracking
        missedSignals: 0,
        estimatedLostProfit: 0,
    });

    // Load cooldown state from localStorage on mount
    useEffect(() => {
        const storedCooldownEnd = localStorage.getItem(COOLDOWN_CONFIG.STORAGE_KEY);
        if (storedCooldownEnd) {
            const endsAt = parseInt(storedCooldownEnd, 10);
            const now = Date.now();
            if (endsAt > now) {
                // Calculate missed signals based on time elapsed
                const elapsedMs = now - (endsAt - COOLDOWN_CONFIG.DURATION_MS);
                const missedSignals = Math.floor(elapsedMs / (10 * 60 * 1000)); // 1 signal per 10 min
                const estimatedLostProfit = missedSignals * (2.5 + Math.random() * 2); // $2.50-$4.50 per signal

                setState(prev => ({
                    ...prev,
                    isOnSessionCooldown: true,
                    cooldownEndsAt: endsAt,
                    cooldownRemainingMs: endsAt - now,
                    missedSignals,
                    estimatedLostProfit: Number(estimatedLostProfit.toFixed(2)),
                }));
            } else {
                // Cooldown expired, clear it
                localStorage.removeItem(COOLDOWN_CONFIG.STORAGE_KEY);
            }
        }
    }, []);

    // Simulate missed signals during cooldown (psychological pressure)
    useEffect(() => {
        if (state.isOnSessionCooldown && state.isFree) {
            missedSignalIntervalRef.current = setInterval(() => {
                setState(prev => {
                    const newMissed = prev.missedSignals + 1;
                    const newProfit = prev.estimatedLostProfit + (2.5 + Math.random() * 2);
                    return {
                        ...prev,
                        missedSignals: newMissed,
                        estimatedLostProfit: Number(newProfit.toFixed(2)),
                    };
                });
            }, 10 * 60 * 1000); // Every 10 minutes add a "missed signal"

            return () => {
                if (missedSignalIntervalRef.current) {
                    clearInterval(missedSignalIntervalRef.current);
                }
            };
        }
    }, [state.isOnSessionCooldown, state.isFree]);

    // Cooldown countdown interval
    useEffect(() => {
        if (state.isOnSessionCooldown && state.cooldownEndsAt) {
            cooldownIntervalRef.current = setInterval(() => {
                const now = Date.now();
                const remaining = state.cooldownEndsAt! - now;

                if (remaining <= 0) {
                    // Cooldown finished
                    if (cooldownIntervalRef.current) {
                        clearInterval(cooldownIntervalRef.current);
                    }
                    localStorage.removeItem(COOLDOWN_CONFIG.STORAGE_KEY);
                    setState(prev => ({
                        ...prev,
                        isOnSessionCooldown: false,
                        cooldownEndsAt: null,
                        cooldownRemainingMs: 0,
                        isLimitReached: false,
                        missedSignals: 0,
                        estimatedLostProfit: 0,
                    }));
                } else {
                    setState(prev => ({
                        ...prev,
                        cooldownRemainingMs: remaining,
                    }));
                }
            }, 1000);

            return () => {
                if (cooldownIntervalRef.current) {
                    clearInterval(cooldownIntervalRef.current);
                }
            };
        }
    }, [state.isOnSessionCooldown, state.cooldownEndsAt]);

    // Cargar plan_type desde Supabase
    useEffect(() => {
        const fetchPlanType = async () => {
            if (!user?.id) {
                setState(prev => ({ ...prev, isLoading: false }));
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching plan_type:', error);
                    setState(prev => ({ ...prev, isLoading: false }));
                    return;
                }

                console.log("PERFIL CARREGADO:", data);

                const planType = (data?.plan_type as PlanType) || 'free';

                // MARKETING BYPASS: Force PRO for marketing accounts
                const isMarketingAccount = MARKETING_EMAILS.includes(user.email?.toLowerCase() || '');

                // Check for all paid plans (including legacy names) OR marketing accounts
                const PAID_PLANS = ['pro', 'premium', 'elite', 'whale', 'vitalicio', 'iniciado', 'mensual', 'anual'];
                const isPro = isMarketingAccount || PAID_PLANS.includes(planType.toLowerCase());

                // Calculate days logic
                const now = new Date();
                const createdAt = new Date(data?.created_at || now);
                const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

                let expirationDate = null;
                let daysLeft = null;

                if (isPro) {
                    expirationDate = data?.expiration_date;
                } else {
                    expirationDate = data?.trial_ends_at;
                }

                if (expirationDate) {
                    const expDate = new Date(expirationDate);
                    expDate.setHours(23, 59, 59, 999);
                    const diffTime = expDate.getTime() - now.getTime();
                    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (daysLeft < 0) daysLeft = 0;
                }

                setState(prev => ({
                    ...prev,
                    planType,
                    isPro,
                    isFree: !isPro,
                    maxStake: isPro ? Infinity : FREEMIUM_LIMITS.MAX_STAKE,
                    maxProfit: isPro ? Infinity : FREEMIUM_LIMITS.MAX_PROFIT,
                    isLoading: false,
                    daysLeft,
                    daysActive,
                    expirationDate
                }));
            } catch (err) {
                console.error('Error in fetchPlanType:', err);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };

        fetchPlanType();
    }, [user?.id]);

    // Sync profit to Supabase for persistence
    const syncProfitToSupabase = useCallback(async (profit: number) => {
        if (!user?.id || state.isPro) return;

        try {
            await supabase
                .from('profiles')
                .update({ daily_trial_profit: profit })
                .eq('id', user.id);
        } catch (err) {
            console.error('Error syncing profit:', err);
        }
    }, [user?.id, state.isPro]);

    // Start cooldown when limit is reached
    const startCooldown = useCallback(() => {
        const endsAt = Date.now() + COOLDOWN_CONFIG.DURATION_MS;
        localStorage.setItem(COOLDOWN_CONFIG.STORAGE_KEY, endsAt.toString());

        // Sync cooldown start to Supabase
        if (user?.id) {
            supabase
                .from('profiles')
                .update({ last_cooldown_start: new Date().toISOString() })
                .eq('id', user.id)
                .then(() => console.log('Cooldown synced to Supabase'));
        }

        setState(prev => ({
            ...prev,
            isOnSessionCooldown: true,
            cooldownEndsAt: endsAt,
            cooldownRemainingMs: COOLDOWN_CONFIG.DURATION_MS,
            isLimitReached: true,
            missedSignals: 0,
            estimatedLostProfit: 0,
        }));
    }, [user?.id]);

    // Monitorear si se alcanzó el límite de ganancia
    useEffect(() => {
        if (state.isFree && !state.isOnSessionCooldown && sessionProfit >= FREEMIUM_LIMITS.MAX_PROFIT) {
            // Sync profit before cooldown
            syncProfitToSupabase(sessionProfit);
            // Trigger cooldown
            startCooldown();
        }
    }, [sessionProfit, state.isFree, state.isOnSessionCooldown, startCooldown, syncProfitToSupabase]);

    // Request browser notification permission
    const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }, []);

    // Schedule notification when cooldown ends
    const scheduleNotification = useCallback(async () => {
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission || !state.cooldownRemainingMs) return false;

        setTimeout(() => {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('⚡ Million Bots - ¡Sistema Listo!', {
                    body: 'Tu sesión de trading está lista. ¡Vuelve a operar ahora!',
                    icon: '/lovable-uploads/65acdf4d-abfd-4e5a-b2c2-27c297ceb7c6.png',
                    tag: 'cooldown-complete',
                });
            }
        }, state.cooldownRemainingMs);

        return true;
    }, [state.cooldownRemainingMs, requestNotificationPermission]);

    // Verificar si el stake está dentro del límite
    const checkStakeLimit = useCallback((stake: number): { allowed: boolean; message?: string } => {
        if (state.isPro) {
            return { allowed: true };
        }

        if (state.isOnSessionCooldown) {
            return {
                allowed: false,
                message: '⏳ Sistema en recarga. Espera a que termine el cooldown (3 horas).',
            };
        }

        if (stake > FREEMIUM_LIMITS.MAX_STAKE) {
            return {
                allowed: false,
                message: `⚠️ El plan Gratuito permite entradas máximas de $${FREEMIUM_LIMITS.MAX_STAKE.toFixed(2)}`,
            };
        }

        return { allowed: true };
    }, [state.isPro, state.isOnSessionCooldown]);

    // Verificar si se puede operar (no alcanzó límite de ganancia)
    const canTrade = useCallback((): { allowed: boolean; message?: string } => {
        if (state.isPro) {
            return { allowed: true };
        }

        if (state.isOnSessionCooldown) {
            return {
                allowed: false,
                message: '⚡ Sistema en recarga. Espera 3 horas o actualiza a PRO.',
            };
        }

        if (state.isLimitReached) {
            return {
                allowed: false,
                message: `🚀 ¡Has alcanzado tu meta de sesión de $${FREEMIUM_LIMITS.MAX_PROFIT.toFixed(2)}! El sistema se está recargando.`,
            };
        }

        return { allowed: true };
    }, [state.isPro, state.isLimitReached, state.isOnSessionCooldown]);

    // Calcular progreso hacia el límite
    const getProfitProgress = useCallback(() => {
        if (state.isPro) return { current: sessionProfit, max: Infinity, percentage: 0 };

        const percentage = Math.min((sessionProfit / FREEMIUM_LIMITS.MAX_PROFIT) * 100, 100);
        return {
            current: sessionProfit,
            max: FREEMIUM_LIMITS.MAX_PROFIT,
            percentage,
        };
    }, [sessionProfit, state.isPro]);

    // Format remaining time for display (HH:MM:SS for 3 hours)
    const getFormattedCooldownTime = useCallback(() => {
        if (!state.cooldownRemainingMs) return '00:00:00';

        const totalSeconds = Math.floor(state.cooldownRemainingMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, [state.cooldownRemainingMs]);

    return {
        ...state,
        checkStakeLimit,
        canTrade,
        getProfitProgress,
        currentProfit: sessionProfit,
        // Cooldown functions
        startCooldown,
        getFormattedCooldownTime,
        requestNotificationPermission,
        scheduleNotification,
        syncProfitToSupabase,
    };
};

export default useFreemiumLimiter;
