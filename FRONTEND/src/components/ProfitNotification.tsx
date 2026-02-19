import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

interface ProfitNotification {
    id: string;
    botName: string;
    profit: number;
    timestamp: Date;
}

interface ProfitNotificationToastProps {
    notification: ProfitNotification;
    onClose: (id: string) => void;
}

// Individual Toast Component - Subtle Professional Style
const ProfitNotificationToast: React.FC<ProfitNotificationToastProps> = ({ notification, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(notification.id);
        }, 4000); // 4 seconds auto dismiss

        return () => clearTimeout(timer);
    }, [notification.id, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="relative w-80"
        >
            {/* Main Card - Clean Professional Design */}
            <div className="relative bg-[#0d1117]/95 backdrop-blur-xl rounded-xl border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 overflow-hidden">

                {/* Left Accent Line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-emerald-500 to-cyan-500" />

                <div className="relative p-3 pl-4">
                    {/* Header Row */}
                    <div className="flex items-center gap-2.5 mb-2">
                        {/* Million Bots Logo - Same as Sidebar */}
                        <div className="relative flex-shrink-0">
                            <div className="absolute -inset-0.5 bg-emerald-500/20 rounded-lg blur-sm" />
                            <img
                                src="/lovable-uploads/65acdf4d-abfd-4e5a-b2c2-27c297ceb7c6.png"
                                alt="Million Bots"
                                className="relative w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            />
                        </div>

                        {/* App Name & Bot */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-white/90">Million Bots</span>
                                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                <span className="text-[10px] text-white/40">ahora</span>
                            </div>
                            <div className="text-[10px] text-white/50 truncate">
                                {notification.botName}
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => onClose(notification.id)}
                            className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                        >
                            <X size={10} />
                        </button>
                    </div>

                    {/* Profit Row - Compact */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Success Icon */}
                            <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            </div>
                            <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-wide">Ganancia</span>
                        </div>

                        {/* Profit Amount */}
                        <div className="text-lg font-bold text-emerald-400 font-mono tracking-tight">
                            +${notification.profit.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Bottom Gradient Line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            </div>
        </motion.div>
    );
};

// Container Component - Bottom Right Position
export const ProfitNotificationContainer: React.FC = () => {
    const [notifications, setNotifications] = useState<ProfitNotification[]>([]);

    // Expose function globally for bots to call
    useEffect(() => {
        (window as any).showProfitNotification = (botName: string, profit: number) => {
            if (profit <= 0) return; // Only show for wins

            const newNotification: ProfitNotification = {
                id: Math.random().toString(36).substr(2, 9),
                botName,
                profit,
                timestamp: new Date(),
            };
            setNotifications(prev => [...prev.slice(-3), newNotification]); // Max 3 visible
        };

        return () => {
            delete (window as any).showProfitNotification;
        };
    }, []);

    const handleClose = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {notifications.map(notification => (
                    <div key={notification.id} className="pointer-events-auto">
                        <ProfitNotificationToast
                            notification={notification}
                            onClose={handleClose}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};

// Hook for bots to trigger notifications (alternative to window global)
export const useProfitNotification = () => {
    const showNotification = useCallback((botName: string, profit: number) => {
        if ((window as any).showProfitNotification) {
            (window as any).showProfitNotification(botName, profit);
        }
    }, []);

    return { showNotification };
};

export default ProfitNotificationContainer;
