import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowRight, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface AffiliateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AffiliateModal: React.FC<AffiliateModalProps> = ({ isOpen, onClose }) => {
    const AFFILIATE_LINK = "https://deriv.com/?t=TRCjAn8FEcUivlVU8hndU2Nd7ZgqdRLk&utm_source=affiliate_223442&utm_medium=affiliate&utm_campaign=MyAffiliates&utm_content=&referrer=";
    const NORMAL_TOKEN_LINK = "https://app.deriv.com/account/api-token";

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e12]/95 shadow-2xl backdrop-blur-xl"
                    >
                        {/* Background Effects */}
                        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
                        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-20"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-6 sm:p-8 relative z-10">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                    <Zap size={32} className="text-yellow-400 fill-yellow-400/20" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                                    <AlertTriangle size={24} className="text-yellow-500" />
                                    Configuración de Latencia
                                </h2>
                                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                                    Para garantizar la máxima precisión del bot y evitar delays, recomendamos vincular una cuenta optimizada.
                                </p>
                            </div>

                            {/* Option 1: Recommended (Affiliate) */}
                            <a
                                href={AFFILIATE_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                                className="group block relative mb-4 overflow-hidden rounded-xl border border-emerald-500 bg-emerald-950/20 p-1 hover:bg-emerald-900/20 transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                            >
                                {/* Pulse Animation Border */}
                                <div className="absolute inset-0 rounded-xl border border-emerald-500/50 animate-pulse" />

                                <div className="relative flex items-center gap-4 rounded-lg bg-[#0f1c18] p-4">
                                    <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-emerald-400 text-lg">Crear Cuenta Optimizada</h3>
                                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                                                Recomendado
                                            </span>
                                        </div>
                                        <p className="text-xs text-emerald-100/70">
                                            Sincronizada con nuestros servidores HFT. Ejecución prioritaria y menor slippage.
                                        </p>
                                    </div>
                                    <div className="rounded-full bg-emerald-500 p-2 text-black shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                        <ArrowRight size={20} />
                                    </div>
                                </div>

                                {/* Button Look-alike Footer inside card */}
                                <div className="mt-1 flex items-center justify-center rounded-b-lg bg-emerald-600/90 py-2 text-sm font-bold text-white uppercase tracking-wider backdrop-blur-sm">
                                    CREAR CUENTA AHORA
                                </div>
                            </a>

                            {/* Option 2: Normal Link */}
                            <div className="text-center mt-6">
                                <p className="text-gray-500 text-xs mb-3">
                                    ¿Ya tiene una cuenta? La conexión puede tener latencia estándar.
                                </p>
                                <a
                                    href={NORMAL_TOKEN_LINK}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={onClose}
                                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors border-b border-transparent hover:border-gray-600 pb-0.5"
                                >
                                    Ya tengo una cuenta (Riesgo de Delay normal)
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
