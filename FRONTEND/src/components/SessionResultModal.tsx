import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ShieldX, X, Rocket, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface SessionResultModalProps {
    isOpen: boolean;
    type: 'take_profit' | 'stop_loss';
    amount: number;
    onClose: () => void;
    onAccept: () => void;
    onContinue?: () => void; // Apenas para take_profit
}

export const SessionResultModal: React.FC<SessionResultModalProps> = ({
    isOpen,
    type,
    amount,
    onClose,
    onAccept,
    onContinue,
}) => {
    const isTakeProfit = type === 'take_profit';
    const isStopLoss = type === 'stop_loss';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop - Static (não fecha ao clicar) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "relative w-full max-w-md overflow-hidden rounded-3xl border-2 shadow-2xl",
                            isTakeProfit && "bg-gradient-to-br from-amber-950/95 to-emerald-950/95 border-amber-500/50",
                            isStopLoss && "bg-gradient-to-br from-red-950/95 to-rose-950/95 border-red-500/50"
                        )}
                    >
                        {/* Background Effects */}
                        <div className={cn(
                            "absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl",
                            isTakeProfit && "bg-amber-500/20",
                            isStopLoss && "bg-red-500/20"
                        )} />
                        <div className={cn(
                            "absolute -bottom-24 -left-24 h-48 w-48 rounded-full blur-3xl",
                            isTakeProfit && "bg-emerald-500/10",
                            isStopLoss && "bg-rose-500/10"
                        )} />

                        {/* Close Button - Apenas visual, não funciona (backdrop static) */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/60 transition-colors z-20 opacity-30 cursor-not-allowed"
                            disabled
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 relative z-10">
                            {/* TAKE PROFIT STATE */}
                            {isTakeProfit && (
                                <>
                                    {/* Icon */}
                                    <div className="flex justify-center mb-6">
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.1, 1],
                                                rotate: [0, 5, -5, 0]
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            className="relative"
                                        >
                                            <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-xl animate-pulse" />
                                            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border-2 border-amber-500/50 flex items-center justify-center">
                                                <Trophy size={48} className="text-amber-400" />
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-3xl font-bold text-center mb-4 text-amber-400 flex items-center justify-center gap-2">
                                        🏆 MISIÓN CUMPLIDA
                                    </h2>

                                    {/* Amount */}
                                    <div className="text-center mb-6">
                                        <div className="text-6xl font-mono font-bold text-emerald-400 mb-2">
                                            +${Math.abs(amount).toFixed(2)}
                                        </div>
                                        <p className="text-amber-200/60 text-sm">Meta alcanzada</p>
                                    </div>

                                    {/* Message */}
                                    <div className="bg-black/30 rounded-xl p-5 mb-6 border border-amber-500/20">
                                        <p className="text-white/90 text-base leading-relaxed text-center">
                                            Tu meta de <span className="font-bold text-amber-400">${Math.abs(amount).toFixed(2)}</span> fue aniquilada.
                                        </p>
                                        <p className="text-amber-200/80 text-sm mt-3 text-center font-medium">
                                            El mercado quiere este dinero de vuelta. <span className="text-amber-400 font-bold">No se lo des.</span>
                                        </p>
                                        <p className="text-white/60 text-xs mt-3 text-center italic">
                                            El trader profesional sabe cuándo levantarse de la mesa.
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="space-y-3">
                                        <button
                                            onClick={onAccept}
                                            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                        >
                                            <Rocket size={20} />
                                            🔒 Cerrar y Asegurar Ganancia
                                        </button>

                                        {onContinue && (
                                            <button
                                                onClick={onContinue}
                                                className="w-full py-2 text-slate-500 hover:text-slate-400 text-xs transition-colors"
                                            >
                                                Ignorar recomendación y continuar (Alto Riesgo)
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* STOP LOSS STATE */}
                            {isStopLoss && (
                                <>
                                    {/* Icon */}
                                    <div className="flex justify-center mb-6">
                                        <motion.div
                                            animate={{
                                                x: [-2, 2, -2],
                                                rotate: [-3, 3, -3]
                                            }}
                                            transition={{
                                                duration: 0.5,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            className="relative"
                                        >
                                            <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse" />
                                            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 border-2 border-red-500/50 flex items-center justify-center">
                                                <ShieldX size={48} className="text-red-400" />
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-2xl font-bold text-center mb-4 text-red-400 flex items-center justify-center gap-2">
                                        🛡️ PROTOCOLO DE DEFENSA ACTIVADO
                                    </h2>

                                    {/* Amount */}
                                    <div className="text-center mb-6">
                                        <div className="text-6xl font-mono font-bold text-red-400 mb-2">
                                            -${Math.abs(amount).toFixed(2)}
                                        </div>
                                        <p className="text-red-200/60 text-sm">Límite alcanzado</p>
                                    </div>

                                    {/* Message */}
                                    <div className="bg-black/30 rounded-xl p-5 mb-6 border border-red-500/20">
                                        <p className="text-white/90 text-base leading-relaxed text-center">
                                            Has tocado tu límite de <span className="font-bold text-red-400">${Math.abs(amount).toFixed(2)}</span>.
                                        </p>
                                        <p className="text-red-200/80 text-sm mt-3 text-center font-medium">
                                            El sistema se detuvo para <span className="text-red-400 font-bold">salvar tu cuenta</span>.
                                        </p>
                                        <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-amber-200/90 text-xs leading-relaxed">
                                                    Intentar recuperar hoy es una <span className="font-bold text-amber-400">trampa emocional</span>. Tu capital sigue vivo para mañana.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <button
                                        onClick={onAccept}
                                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-red-500/20"
                                    >
                                        Aceptar y Enfriar la Mente (60s)
                                    </button>

                                    <p className="text-center text-white/40 text-xs mt-4">
                                        El botón INICIAR estará bloqueado por 60 segundos
                                    </p>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
