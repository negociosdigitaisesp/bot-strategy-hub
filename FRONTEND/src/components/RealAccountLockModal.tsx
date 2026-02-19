import React from 'react';
import { X, Shield, Lock, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePricingModal } from '../contexts/PricingModalContext';

interface RealAccountLockModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * RealAccountLockModal - Modal shown when Free users try to switch to Real account
 * Blocks the action and prompts upgrade
 */
export const RealAccountLockModal: React.FC<RealAccountLockModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { openPricingModal } = usePricingModal();

    if (!isOpen) return null;

    const handleActivateLicense = () => {
        onClose();
        openPricingModal();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-300">
                <div className={cn(
                    "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
                    "border border-slate-700/50 rounded-2xl overflow-hidden",
                    "shadow-2xl shadow-black/50"
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-700/30">
                        <div className="flex items-center gap-2">
                            <Lock size={14} className="text-amber-500" />
                            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                                security://real_mode
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Icon */}
                        <div className="flex justify-center">
                            <div className="relative">
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-150" />
                                <div className={cn(
                                    "relative w-20 h-20 rounded-2xl",
                                    "bg-gradient-to-br from-emerald-500/20 to-teal-500/20",
                                    "border border-emerald-500/30",
                                    "flex items-center justify-center",
                                    "shadow-lg shadow-emerald-500/10"
                                )}>
                                    <Shield size={40} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-center text-2xl font-bold text-white tracking-tight">
                            Modo Real Protegido
                        </h2>

                        {/* Message */}
                        <div className={cn(
                            "bg-slate-800/50 border border-slate-700/30 rounded-xl p-4",
                            "backdrop-blur-sm"
                        )}>
                            <p className="text-sm text-slate-300 leading-relaxed text-center">
                                El <span className="text-amber-400 font-semibold">Plan Gratuito</span> está diseñado
                                para entrenamiento en Demo. Para operar con dinero real y retirar ganancias,
                                necesitas una <span className="text-emerald-400 font-semibold">Licencia Activa</span>.
                            </p>
                        </div>

                        {/* Benefits preview */}
                        <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium text-center">
                                Con Licencia Activa obtienes:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                                <div className="flex items-center gap-2 bg-slate-800/30 rounded-lg px-3 py-2">
                                    <span className="text-emerald-400">✓</span>
                                    Cuenta Real desbloqueada
                                </div>
                                <div className="flex items-center gap-2 bg-slate-800/30 rounded-lg px-3 py-2">
                                    <span className="text-emerald-400">✓</span>
                                    Sin límite de ganancias
                                </div>
                                <div className="flex items-center gap-2 bg-slate-800/30 rounded-lg px-3 py-2">
                                    <span className="text-emerald-400">✓</span>
                                    Sin tiempos de espera
                                </div>
                                <div className="flex items-center gap-2 bg-slate-800/30 rounded-lg px-3 py-2">
                                    <span className="text-emerald-400">✓</span>
                                    Retiros ilimitados
                                </div>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={handleActivateLicense}
                            className={cn(
                                "w-full py-4 px-6 rounded-xl font-bold text-base transition-all duration-300",
                                "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 bg-[length:200%_100%]",
                                "text-white shadow-lg shadow-emerald-500/25",
                                "hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02]",
                                "active:scale-[0.98]",
                                "flex items-center justify-center gap-2"
                            )}
                        >
                            <Sparkles size={18} />
                            <span>Activar Licencia Ahora</span>
                        </button>

                        {/* Dismiss */}
                        <button
                            onClick={onClose}
                            className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors font-mono py-1"
                        >
                            Continuar en Demo →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealAccountLockModal;
