import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, TrendingUp, Clock, Zap, Lock, Timer, DollarSign, ArrowRight, Sparkles } from 'lucide-react';
import { useFreemiumLimiter, FREEMIUM_LIMITS, COOLDOWN_CONFIG } from '../hooks/useFreemiumLimiter';
import { usePricingModal } from '../contexts/PricingModalContext';

interface LossAversionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LossAversionModal: React.FC<LossAversionModalProps> = ({ isOpen, onClose }) => {
    const {
        getFormattedCooldownTime,
        missedSignals,
        estimatedLostProfit,
        cooldownRemainingMs
    } = useFreemiumLimiter();

    const { openPricingModal } = usePricingModal();
    const [pulseEffect, setPulseEffect] = useState(false);

    // Pulse effect every 5 seconds to draw attention
    useEffect(() => {
        if (isOpen) {
            const interval = setInterval(() => {
                setPulseEffect(true);
                setTimeout(() => setPulseEffect(false), 500);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    const handleUpgrade = () => {
        onClose();
        openPricingModal();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", bounce: 0.3 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.15)] overflow-hidden"
                >
                    {/* Glow effect */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-red-500/10 rounded-full blur-[60px] pointer-events-none" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    {/* Header */}
                    <div className="relative p-6 pb-4 text-center border-b border-white/5">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 mb-4">
                            <AlertTriangle className="w-8 h-8 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            ⚠️ SISTEMA PAUSADO
                        </h2>
                        <p className="text-amber-400 text-sm font-semibold">
                            Límite de Prueba Alcanzado
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5">
                        {/* Cooldown Timer */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Timer size={16} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Tiempo Restante</span>
                                </div>
                                <div className="flex items-center gap-1 text-amber-400">
                                    <Lock size={14} />
                                    <span className="text-xs">Bloqueado</span>
                                </div>
                            </div>
                            <div className="text-center">
                                <span className="text-4xl font-mono font-bold text-white tracking-wider">
                                    {getFormattedCooldownTime()}
                                </span>
                            </div>
                        </div>

                        {/* Lost Opportunity Counter */}
                        <motion.div
                            animate={pulseEffect ? { scale: 1.02 } : { scale: 1 }}
                            className="bg-gradient-to-r from-red-900/30 to-amber-900/30 rounded-xl p-4 border border-red-500/20"
                        >
                            <div className="flex items-center gap-2 text-red-400 mb-3">
                                <TrendingUp size={16} />
                                <span className="text-xs font-semibold uppercase tracking-wider">Oportunidades Perdidas</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Mientras estuviste limitado, el bot detectó
                                        <span className="text-white font-bold mx-1">{missedSignals || 3}</span>
                                        señales de alta precisión.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                                <span className="text-slate-400 text-sm">Ganancias estimadas perdidas:</span>
                                <span className="text-2xl font-bold text-red-400">
                                    +${(estimatedLostProfit || 12.40).toFixed(2)}
                                </span>
                            </div>
                        </motion.div>

                        {/* Message */}
                        <p className="text-center text-slate-300 text-sm leading-relaxed">
                            Tu servidor gratuito ha entrado en enfriamiento por <span className="text-amber-400 font-bold">3 horas</span>.
                            <br />
                            <span className="text-slate-400">No dejes que el mercado siga pagando sin ti.</span>
                        </p>

                        {/* CTA Button */}
                        <motion.button
                            onClick={handleUpgrade}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black font-bold py-4 px-6 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] transition-all duration-300 group"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                                <Zap className="w-5 h-5" />
                                🚀 REMOVER LÍMITES Y SER PRO AHORA
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                        </motion.button>

                        {/* Price hint */}
                        <p className="text-center text-slate-500 text-xs">
                            Precio especial: <span className="text-emerald-400 font-bold">$30 USD</span> acceso completo
                        </p>
                    </div>

                    {/* Footer sparkle */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {[...Array(3)].map((_, i) => (
                            <Sparkles key={i} size={8} className="text-amber-500/30" />
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LossAversionModal;
