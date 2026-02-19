import React from 'react';
import { cn } from '../lib/utils';
import { Zap } from 'lucide-react';
import { FREEMIUM_LIMITS } from '../hooks/useFreemiumLimiter';

interface FreemiumProgressBarProps {
    currentProfit: number;
    maxProfit?: number;
    className?: string;
}

export const FreemiumProgressBar: React.FC<FreemiumProgressBarProps> = ({
    currentProfit,
    maxProfit = FREEMIUM_LIMITS.MAX_PROFIT,
    className,
}) => {
    const percentage = Math.min((currentProfit / maxProfit) * 100, 100);
    const isNearLimit = percentage >= 80;
    const isAtLimit = percentage >= 100;

    return (
        <div className={cn(
            "w-full p-3 rounded-xl backdrop-blur-sm border transition-all duration-300",
            isAtLimit
                ? "bg-amber-500/10 border-amber-500/30"
                : isNearLimit
                    ? "bg-yellow-500/10 border-yellow-500/20"
                    : "bg-slate-800/50 border-white/10",
            className
        )}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Zap size={14} className={cn(
                        isAtLimit ? "text-amber-400" : isNearLimit ? "text-yellow-400" : "text-slate-400"
                    )} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Meta de Sesión Gratuita
                    </span>
                </div>
                <span className={cn(
                    "text-xs font-mono font-bold",
                    isAtLimit ? "text-amber-400" : isNearLimit ? "text-yellow-400" : "text-slate-300"
                )}>
                    ${currentProfit.toFixed(2)} / ${maxProfit.toFixed(2)}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        isAtLimit
                            ? "bg-gradient-to-r from-amber-500 to-orange-500"
                            : isNearLimit
                                ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                                : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {isNearLimit && !isAtLimit && (
                <p className="text-[10px] text-yellow-400/70 mt-2 text-center">
                    ⚡ ¡Casi alcanzas tu meta de sesión!
                </p>
            )}
        </div>
    );
};

export default FreemiumProgressBar;
