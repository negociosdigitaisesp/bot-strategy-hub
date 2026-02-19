import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, DollarSign, Shield, Zap, TrendingUp, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface SocialProofNotification {
    id: string;
    type: 'withdrawal' | 'license' | 'profit';
    message: string;
    userName: string;
    amount?: string;
    country?: string;
    time: string;
}

// Latin American names and countries for authenticity
const LATAM_NAMES = [
    'Carlos M.', 'María G.', 'Juan P.', 'Ana L.', 'Pedro R.',
    'Lucía S.', 'Diego F.', 'Sofia H.', 'Andrés V.', 'Valentina C.',
    'Miguel Á.', 'Camila R.', 'Jorge L.', 'Fernanda M.', 'Ricardo T.',
    'Isabella G.', 'Luis E.', 'Gabriela P.', 'Antonio S.', 'Daniela V.',
];

const COUNTRIES = [
    'Colombia', 'México', 'Argentina', 'Perú', 'Chile',
    'Ecuador', 'Venezuela', 'Brasil', 'Bolivia', 'Paraguay',
];

// Generate random notification
const generateNotification = (): SocialProofNotification => {
    const types: ('withdrawal' | 'license' | 'profit')[] = ['withdrawal', 'license', 'profit'];
    const type = types[Math.floor(Math.random() * types.length)];
    const userName = LATAM_NAMES[Math.floor(Math.random() * LATAM_NAMES.length)];
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const userId = Math.floor(Math.random() * 900) + 100;

    let message = '';
    let amount = '';

    switch (type) {
        case 'withdrawal':
            amount = `$${(Math.random() * 200 + 50).toFixed(2)}`;
            message = `Usuario #${userId} acaba de retirar ${amount}`;
            break;
        case 'license':
            const licenseType = Math.random() > 0.5 ? 'Licencia Anual' : 'Plan Pro';
            message = `${licenseType} activada por ${userName}`;
            break;
        case 'profit':
            amount = `+$${(Math.random() * 50 + 10).toFixed(2)}`;
            message = `Usuario #${userId} ganó ${amount} con Efecto Midas`;
            break;
    }

    return {
        id: `${Date.now()}-${Math.random()}`,
        type,
        message,
        userName,
        amount,
        country,
        time: 'Hace unos segundos',
    };
};

interface SocialProofWidgetProps {
    className?: string;
}

/**
 * SocialProofWidget - Shows fake social proof notifications to create FOMO
 * Displays withdrawal, license activation, and profit notifications
 */
export const SocialProofWidget: React.FC<SocialProofWidgetProps> = ({ className }) => {
    const [currentNotification, setCurrentNotification] = useState<SocialProofNotification | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Initial delay before first notification
        const initialDelay = setTimeout(() => {
            showNotification();
        }, 10000); // 10 seconds

        // Show new notification every 30 seconds
        const interval = setInterval(() => {
            showNotification();
        }, 30000);

        return () => {
            clearTimeout(initialDelay);
            clearInterval(interval);
        };
    }, []);

    const showNotification = () => {
        const notification = generateNotification();
        setCurrentNotification(notification);
        setIsVisible(true);

        // Hide after 6 seconds
        setTimeout(() => {
            setIsVisible(false);
        }, 6000);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'withdrawal':
                return <DollarSign size={14} className="text-emerald-400" />;
            case 'license':
                return <Shield size={14} className="text-amber-400" />;
            case 'profit':
                return <TrendingUp size={14} className="text-cyan-400" />;
            default:
                return <Bell size={14} className="text-slate-400" />;
        }
    };

    const getBorderColor = (type: string) => {
        switch (type) {
            case 'withdrawal':
                return 'border-emerald-500/30';
            case 'license':
                return 'border-amber-500/30';
            case 'profit':
                return 'border-cyan-500/30';
            default:
                return 'border-white/10';
        }
    };

    return (
        <AnimatePresence>
            {isVisible && currentNotification && (
                <motion.div
                    initial={{ opacity: 0, x: 100, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 100, scale: 0.9 }}
                    transition={{ type: 'spring', bounce: 0.3 }}
                    className={cn(
                        "fixed bottom-4 right-4 z-40 max-w-xs",
                        className
                    )}
                >
                    <div className={cn(
                        "bg-slate-900/95 backdrop-blur-xl rounded-xl border shadow-2xl shadow-black/40 p-4",
                        getBorderColor(currentNotification.type)
                    )}>
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center border",
                                currentNotification.type === 'withdrawal' && "bg-emerald-500/10 border-emerald-500/20",
                                currentNotification.type === 'license' && "bg-amber-500/10 border-amber-500/20",
                                currentNotification.type === 'profit' && "bg-cyan-500/10 border-cyan-500/20"
                            )}>
                                {getIcon(currentNotification.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Bell size={10} className="text-slate-500" />
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                        {currentNotification.type === 'withdrawal' ? 'Retiro' :
                                            currentNotification.type === 'license' ? 'Nueva Licencia' : 'Ganancia'}
                                    </span>
                                </div>

                                <p className="text-sm text-white font-medium leading-tight">
                                    🔔 {currentNotification.message}
                                </p>

                                {currentNotification.type === 'license' && currentNotification.country && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        ({currentNotification.country})
                                    </p>
                                )}

                                {currentNotification.type !== 'license' && (
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        (Plan Pro)
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Animated progress bar */}
                        <div className="mt-3 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: 6, ease: 'linear' }}
                                className={cn(
                                    "h-full rounded-full",
                                    currentNotification.type === 'withdrawal' && "bg-emerald-500",
                                    currentNotification.type === 'license' && "bg-amber-500",
                                    currentNotification.type === 'profit' && "bg-cyan-500"
                                )}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SocialProofWidget;
