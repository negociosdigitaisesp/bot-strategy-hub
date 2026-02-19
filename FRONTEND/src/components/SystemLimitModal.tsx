import React from 'react';
import { X, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';
import { CooldownTimer } from './CooldownTimer';
import { useFreemiumLimiter, FREEMIUM_LIMITS } from '../hooks/useFreemiumLimiter';

interface SystemLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * SystemLimitModal - Modal that appears when free users hit their session limit
 * Now integrates the CooldownTimer for the 1-hour cooldown period
 */
export const SystemLimitModal: React.FC<SystemLimitModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { isOnSessionCooldown } = useFreemiumLimiter();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-300">
                <div className={cn(
                    "bg-slate-950 border border-slate-700/50 rounded-2xl overflow-hidden",
                    "shadow-2xl shadow-black/50"
                )}>
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-700/30">
                        <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-slate-500" />
                            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                                system://cooldown_protocol
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
                    <div className="p-4">
                        {isOnSessionCooldown ? (
                            // Show cooldown timer when in cooldown
                            <CooldownTimer />
                        ) : (
                            // Fallback message (shouldn't normally show)
                            <div className="p-6 text-center">
                                <p className="text-slate-400 font-mono text-sm">
                                    Meta de sesión (${FREEMIUM_LIMITS.MAX_PROFIT.toFixed(2)}) completada.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Dismiss link */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={onClose}
                            className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors font-mono py-2"
                        >
                            Cerrar ventana →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemLimitModal;
