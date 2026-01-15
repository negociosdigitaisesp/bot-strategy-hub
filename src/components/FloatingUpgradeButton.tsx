import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { usePricingModal } from '../contexts/PricingModalContext';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';

export const FloatingUpgradeButton: React.FC = () => {
    const { openPricingModal } = usePricingModal();
    const { isPro, daysLeft } = useFreemiumLimiter();
    const [isMinimized, setIsMinimized] = React.useState(false);
    const [isDismissed, setIsDismissed] = React.useState(false);

    // Não mostrar para usuários PRO
    if (isPro || isDismissed) return null;

    // Show urgency when less than 3 days left
    const isUrgent = daysLeft !== null && daysLeft <= 3;

    return (
        <AnimatePresence>
            {!isMinimized ? (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="fixed bottom-24 right-6 z-50"
                >
                    <div className="relative group">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Main button */}
                        <motion.button
                            onClick={openPricingModal}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                relative flex items-center gap-3 px-5 py-3.5 rounded-2xl
                                backdrop-blur-xl border transition-all duration-300
                                shadow-2xl
                                ${isUrgent
                                    ? 'bg-gradient-to-r from-amber-500/10 to-red-500/10 border-amber-500/30 hover:border-amber-400'
                                    : 'bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-slate-700/50 hover:border-cyan-500/50'
                                }
                            `}
                        >
                            {/* Icon */}
                            <div className={`
                                w-9 h-9 rounded-xl flex items-center justify-center
                                ${isUrgent
                                    ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/20'
                                    : 'bg-gradient-to-br from-cyan-500/20 to-emerald-500/20'
                                }
                            `}>
                                <Sparkles
                                    size={18}
                                    className={isUrgent ? 'text-amber-400' : 'text-cyan-400'}
                                />
                            </div>

                            {/* Text */}
                            <div className="flex flex-col items-start">
                                <span className={`
                                    text-sm font-bold
                                    ${isUrgent
                                        ? 'bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent'
                                        : 'bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent'
                                    }
                                `}>
                                    Desbloquear Pro
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {isUrgent && daysLeft !== null
                                        ? `⚡ ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} restante${daysLeft === 1 ? '' : 's'}`
                                        : 'Trading ilimitado'
                                    }
                                </span>
                            </div>

                            {/* Pulse indicator for urgent */}
                            {isUrgent && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                </span>
                            )}
                        </motion.button>

                        {/* Close button */}
                        <motion.button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMinimized(true);
                            }}
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            className="
                                absolute -top-2 -right-2 w-6 h-6 rounded-full
                                bg-slate-800 border border-slate-700
                                flex items-center justify-center
                                text-slate-400 hover:text-white hover:bg-slate-700
                                transition-all duration-200
                                shadow-lg
                            "
                        >
                            <X size={12} />
                        </motion.button>
                    </div>
                </motion.div>
            ) : (
                // Minimized floating dot
                <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    onClick={() => setIsMinimized(false)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`
                        fixed bottom-24 right-6 z-50
                        w-14 h-14 rounded-full
                        backdrop-blur-xl border
                        flex items-center justify-center
                        shadow-2xl
                        ${isUrgent
                            ? 'bg-gradient-to-br from-amber-500/20 to-red-500/20 border-amber-500/30'
                            : 'bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50'
                        }
                    `}
                >
                    <Sparkles
                        size={22}
                        className={isUrgent ? 'text-amber-400' : 'text-cyan-400'}
                    />

                    {isUrgent && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                    )}
                </motion.button>
            )}
        </AnimatePresence>
    );
};
