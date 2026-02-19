import React, { useState } from 'react';
import { Zap, Bell, BellRing, Clock, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFreemiumLimiter, FREEMIUM_LIMITS } from '../hooks/useFreemiumLimiter';
import { toast } from 'sonner';
import { usePricingModal } from '../contexts/PricingModalContext';

interface CooldownTimerProps {
    className?: string;
}

/**
 * CooldownTimer - Visual countdown component for session cooldown
 * Shows "Recargando Servidores" UI with countdown and upgrade CTA
 */
export const CooldownTimer: React.FC<CooldownTimerProps> = ({ className }) => {
    const { openPricingModal } = usePricingModal();
    const {
        getFormattedCooldownTime,
        cooldownRemainingMs,
        scheduleNotification,
        requestNotificationPermission,
        daysLeft
    } = useFreemiumLimiter();

    const [notificationScheduled, setNotificationScheduled] = useState(false);
    const [isRequestingPermission, setIsRequestingPermission] = useState(false);

    const formattedTime = getFormattedCooldownTime();

    // Check if trial is still active (if daysLeft > 0, trial is active)
    const isTrialActive = daysLeft !== null && daysLeft > 0;

    // Checkout URLs - normal for active trial, discount for expired
    const NORMAL_CHECKOUT_URL = 'https://pay.hotmart.com/Q103866199O';
    const DISCOUNT_CHECKOUT_URL = 'https://pay.hotmart.com/Q103866199O?off=itafpp2z';

    const handleUpgrade = () => {
        // During active trial: show normal price
        // After trial expires: show discount price
        const checkoutUrl = isTrialActive ? NORMAL_CHECKOUT_URL : DISCOUNT_CHECKOUT_URL;
        window.open(checkoutUrl, '_blank');
    };

    const handleNotifyMe = async () => {
        setIsRequestingPermission(true);
        try {
            const hasPermission = await requestNotificationPermission();
            if (hasPermission) {
                const scheduled = await scheduleNotification();
                if (scheduled) {
                    setNotificationScheduled(true);
                    toast.success('¡Te avisaremos cuando el sistema esté listo!', {
                        icon: '🔔',
                    });
                }
            } else {
                toast.error('Permiso de notificación denegado. Actívalo en la configuración del navegador.');
            }
        } catch (error) {
            console.error('Error scheduling notification:', error);
            toast.error('Error al programar notificación');
        } finally {
            setIsRequestingPermission(false);
        }
    };

    // Parse time for visual effects
    const totalSeconds = Math.floor(cooldownRemainingMs / 1000);
    const progress = ((3600 - totalSeconds) / 3600) * 100; // Progress based on 1 hour

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20",
            "p-6 shadow-2xl shadow-amber-900/10",
            className
        )}>
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 animate-pulse" />

            {/* Header */}
            <div className="relative flex items-center justify-center gap-3 mb-6">
                <div className="relative">
                    <Zap size={28} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                </div>
                <h2 className="text-xl font-bold text-amber-100 tracking-wide uppercase">
                    Recargando Servidores...
                </h2>
            </div>

            {/* Subtitle */}
            <p className="relative text-center text-sm text-slate-400 mb-6 leading-relaxed max-w-md mx-auto">
                Meta de sesión <span className="text-amber-400 font-mono font-bold">(${FREEMIUM_LIMITS.MAX_PROFIT.toFixed(2)})</span> completada.
                El sistema gratuito se está recargando para tu próxima ronda.
            </p>

            {/* Progress bar */}
            <div className="relative mb-6">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 transition-all duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-mono text-slate-500">
                    <span>Recargando...</span>
                    <span>{Math.round(progress)}% completado</span>
                </div>
            </div>

            {/* Big Countdown Timer */}
            <div className="relative flex flex-col items-center justify-center mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-slate-500" />
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                        Tiempo restante
                    </span>
                </div>
                <div className="relative">
                    {/* Glow effect behind timer */}
                    <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full scale-150" />
                    <div className={cn(
                        "relative font-mono text-6xl sm:text-7xl font-black tracking-tight",
                        "bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent",
                        "drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]"
                    )}>
                        {formattedTime}
                    </div>
                </div>
            </div>

            {/* CTA Buttons */}
            <div className="relative space-y-3">
                {/* Primary CTA - Upgrade */}
                <button
                    onClick={handleUpgrade}
                    className={cn(
                        "w-full py-4 px-6 rounded-xl font-bold text-base transition-all duration-300",
                        "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%]",
                        "text-black shadow-lg shadow-amber-500/25",
                        "hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02]",
                        "active:scale-[0.98]",
                        "flex items-center justify-center gap-2"
                    )}
                >
                    <span className="text-lg">🔥</span>
                    <span>No quiero esperar 1 hora</span>
                    <Sparkles size={18} className="ml-1" />
                </button>

                {/* Secondary CTA - Notification */}
                <button
                    onClick={handleNotifyMe}
                    disabled={notificationScheduled || isRequestingPermission}
                    className={cn(
                        "w-full py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300",
                        "border border-slate-600/50 bg-slate-800/50 backdrop-blur-sm",
                        "text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-700/50",
                        "flex items-center justify-center gap-2",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800/50"
                    )}
                >
                    {notificationScheduled ? (
                        <>
                            <BellRing size={16} className="text-amber-400" />
                            <span className="text-amber-400">¡Te avisaremos cuando esté listo!</span>
                        </>
                    ) : isRequestingPermission ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            <span>Solicitando permiso...</span>
                        </>
                    ) : (
                        <>
                            <Bell size={16} />
                            <span>🔔 Avísame cuando esté listo</span>
                        </>
                    )}
                </button>
            </div>

            {/* Footer hint */}
            <p className="relative text-center text-[10px] text-slate-600 mt-6 font-mono">
                Plan PRO: Sin límites de ganancia • Sin tiempos de espera
            </p>
        </div>
    );
};

export default CooldownTimer;
