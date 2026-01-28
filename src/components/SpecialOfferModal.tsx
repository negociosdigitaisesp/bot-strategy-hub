import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, X, Clock, Shield, Zap } from 'lucide-react';

interface SpecialOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onContinueFree?: () => void;
    isExpired?: boolean; // If true, user cannot continue with free plan (hard lock)
}

export const SpecialOfferModal: React.FC<SpecialOfferModalProps> = ({
    isOpen,
    onClose,
    onContinueFree,
    isExpired = false,
}) => {
    const handleActivateOffer = () => {
        window.open('https://pay.hotmart.com/Q103866199O?off=itafpp2z', '_blank');
    };

    const handleContinueFree = () => {
        if (!isExpired && onContinueFree) {
            onContinueFree();
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={!isExpired ? onClose : undefined}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 300,
                            duration: 0.4
                        }}
                        className="relative w-full max-w-md rounded-2xl overflow-hidden"
                    >
                        {/* Background with gradient glow */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1510] via-[#0f0d0a] to-[#0a0908] border border-amber-500/20 rounded-2xl" />

                        {/* Top golden glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-gradient-radial from-amber-500/20 via-amber-600/5 to-transparent blur-2xl pointer-events-none" />

                        {/* Shimmer effect */}
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent skew-x-12 pointer-events-none"
                        />

                        {/* Content */}
                        <div className="relative z-10 p-8">
                            {/* Close button (only if not expired) */}
                            {!isExpired && (
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/5"
                                >
                                    <X size={18} />
                                </button>
                            )}

                            {/* Icon */}
                            <motion.div
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                                className="flex justify-center mb-6"
                            >
                                <div className="relative">
                                    <motion.div
                                        animate={{
                                            boxShadow: [
                                                '0 0 20px rgba(251,191,36,0.2)',
                                                '0 0 40px rgba(251,191,36,0.4)',
                                                '0 0 20px rgba(251,191,36,0.2)'
                                            ]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center"
                                    >
                                        <Gift size={32} className="text-amber-400" />
                                    </motion.div>
                                    {/* Floating sparkle */}
                                    <motion.div
                                        animate={{ y: [-2, 2, -2], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute -top-1 -right-1"
                                    >
                                        <Sparkles size={14} className="text-amber-300" />
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-xl font-bold text-center text-white mb-2"
                            >
                                Oportunidad de Permanencia Detectada
                            </motion.h2>

                            {/* Subtitle */}
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                                className="text-center text-amber-200/60 text-sm mb-8"
                            >
                                Hemos reservado un cupón exclusivo para tu cuenta.
                            </motion.p>

                            {/* Price Section */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 }}
                                className="bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 rounded-xl p-6 mb-6"
                            >
                                <div className="text-center mb-4">
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                        <span className="text-gray-500 line-through text-lg">$30.00</span>
                                        <span className="text-amber-400 font-bold text-3xl">$24.00</span>
                                        <span className="text-amber-200/50 text-sm">/año</span>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wide">Ahorras 20%</span>
                                    </div>
                                </div>

                                <p className="text-center text-amber-100/70 text-sm">
                                    Equivale a <strong className="text-amber-300">$2.00 al mes</strong>. Acceso total sin interrupciones.
                                </p>
                            </motion.div>

                            {/* Benefits */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.45 }}
                                className="flex flex-wrap justify-center gap-4 mb-8 text-xs text-amber-200/50"
                            >
                                <div className="flex items-center gap-1.5">
                                    <Zap size={12} className="text-amber-400" />
                                    <span>Activación Inmediata</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Shield size={12} className="text-amber-400" />
                                    <span>Garantía 7 Días</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-amber-400" />
                                    <span>12 Meses Completos</span>
                                </div>
                            </motion.div>

                            {/* CTA Button */}
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleActivateOffer}
                                className="w-full py-4 px-6 rounded-xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black hover:from-amber-400 hover:via-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <span>🔓</span>
                                <span>ACTIVAR OFERTA ANUAL</span>
                            </motion.button>

                            {/* Secondary Button (only if not expired) */}
                            {!isExpired && (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    onClick={handleContinueFree}
                                    className="w-full mt-4 py-3 text-xs text-gray-500 hover:text-gray-400 transition-colors text-center"
                                >
                                    Continuar con Plan Gratuito (Limitado)
                                </motion.button>
                            )}

                            {/* Expired Warning */}
                            {isExpired && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="mt-4 text-center"
                                >
                                    <p className="text-xs text-red-400/70">
                                        Tu período de prueba ha expirado. Activa tu plan para continuar.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SpecialOfferModal;
