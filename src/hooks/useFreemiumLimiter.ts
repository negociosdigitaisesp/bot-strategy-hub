import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTradingSession } from '../contexts/TradingSessionContext';

// Constantes de límites para el plan gratuito
export const FREEMIUM_LIMITS = {
    MAX_STAKE: Infinity,  // Límite de apuesta: Ilimitado (antes $1.00)
    MAX_PROFIT: 14.00,    // Tope de ganancia de sesión: $14.00 USD (antes $10.00)
};

// Marketing accounts - always PRO
const MARKETING_EMAILS = ['brendacostatmktcp@outlook.com'];

// Cooldown configuration
export const COOLDOWN_CONFIG = {
    DURATION_MS: 60 * 60 * 1000, // 1 hora en milisegundos
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
    // New cooldown state
    isOnSessionCooldown: boolean;
    cooldownEndsAt: number | null;
    cooldownRemainingMs: number;
}

export const useFreemiumLimiter = () => {
    const { user } = useAuth();
    const { sessionProfit } = useTradingSession();
    const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        // New cooldown state
        isOnSessionCooldown: false,
        cooldownEndsAt: null,
        cooldownRemainingMs: 0,
    });

    // Load cooldown state from localStorage on mount
    useEffect(() => {
        const storedCooldownEnd = localStorage.getItem(COOLDOWN_CONFIG.STORAGE_KEY);
        if (storedCooldownEnd) {
            const endsAt = parseInt(storedCooldownEnd, 10);
            const now = Date.now();
            if (endsAt > now) {
                setState(prev => ({
                    ...prev,
                    isOnSessionCooldown: true,
                    cooldownEndsAt: endsAt,
                    cooldownRemainingMs: endsAt - now,
                }));
            } else {
                // Cooldown expired, clear it
                localStorage.removeItem(COOLDOWN_CONFIG.STORAGE_KEY);
            }
        }
    }, []);

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
                // Paid plans include: pro, premium, elite, whale, vitalicio, iniciado, mensual, anual
                const PAID_PLANS = ['pro', 'premium', 'elite', 'whale', 'vitalicio', 'iniciado', 'mensual', 'anual'];
                const isPro = isMarketingAccount || PAID_PLANS.includes(planType.toLowerCase());

                // Calculate days logic
                const now = new Date();
                const createdAt = new Date(data?.created_at || now);
                const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

                let expirationDate = null;
                let daysLeft = null;

                if (isPro) {
                    // Pro users: use expiration_date
                    expirationDate = data?.expiration_date;
                } else {
                    // Free users: use trial_end
                    expirationDate = data?.trial_end;
                }

                if (expirationDate) {
                    const expDate = new Date(expirationDate);
                    // Set time to end of day for accurate calculation
                    expDate.setHours(23, 59, 59, 999);
                    const diffTime = expDate.getTime() - now.getTime();
                    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    // If expired, set to 0
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

    // Start cooldown when limit is reached
    const startCooldown = useCallback(() => {
        const endsAt = Date.now() + COOLDOWN_CONFIG.DURATION_MS;
        localStorage.setItem(COOLDOWN_CONFIG.STORAGE_KEY, endsAt.toString());
        setState(prev => ({
            ...prev,
            isOnSessionCooldown: true,
            cooldownEndsAt: endsAt,
            cooldownRemainingMs: COOLDOWN_CONFIG.DURATION_MS,
            isLimitReached: true,
        }));
    }, []);

    // Monitorear si se alcanzó el límite de ganancia
    useEffect(() => {
        if (state.isFree && !state.isOnSessionCooldown && sessionProfit >= FREEMIUM_LIMITS.MAX_PROFIT) {
            // Trigger cooldown
            startCooldown();
        }
    }, [sessionProfit, state.isFree, state.isOnSessionCooldown, startCooldown]);

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

        // Set a timeout to show notification when cooldown ends
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
                message: '⏳ Sistema en recarga. Espera a que termine el cooldown.',
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
                message: '⚡ Sistema en recarga. Espera 1 hora o actualiza a PRO.',
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

    // Format remaining time for display
    const getFormattedCooldownTime = useCallback(() => {
        if (!state.cooldownRemainingMs) return '00:00';

        const totalSeconds = Math.floor(state.cooldownRemainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, [state.cooldownRemainingMs]);

    return {
        ...state,
        checkStakeLimit,
        canTrade,
        getProfitProgress,
        currentProfit: sessionProfit,
        // New cooldown functions
        startCooldown,
        getFormattedCooldownTime,
        requestNotificationPermission,
        scheduleNotification,
    };
};

export default useFreemiumLimiter;
