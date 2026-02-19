
import React from 'react';
import { Crown, Gem, Infinity, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { PlanType } from '../hooks/useFreemiumLimiter';

interface PlanBadgeProps {
    planType: PlanType | string;
    daysLeft?: number | null;
    className?: string;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ planType, daysLeft, className }) => {
    // Normalize plan type for comparison
    const type = (planType || 'free').toLowerCase();

    // Determine badge variant
    const isWhale = ['whale', 'vitalicio', 'elite'].includes(type);
    const isPro = ['pro', 'premium'].includes(type);
    const isFree = !isWhale && !isPro;

    if (isWhale) {
        return (
            <div className={cn("group relative inline-flex items-center", className)}>
                {/* Purple Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-fuchsia-500 to-violet-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-tilt"></div>

                <div className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1 rounded-full",
                    "bg-[#0F0F12] border border-purple-500/40",
                    "shadow-[0_0_20px_-3px_rgba(168,85,247,0.4)]"
                )}>
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-purple-300/15 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                    </div>

                    {/* Diamond Icon with pulse animation */}
                    <Gem size={12} className="text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse" />

                    <span className="text-[10px] font-bold tracking-widest bg-gradient-to-r from-purple-300 via-fuchsia-400 to-violet-400 text-transparent bg-clip-text uppercase">
                        Diamante Vitalicio
                    </span>

                    <Infinity size={12} className="text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
                </div>
            </div>
        );
    }

    if (isPro) {
        return (
            <div className={cn("relative inline-flex items-center", className)}>
                <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full",
                    "bg-amber-950/30 border border-amber-500/30",
                    "shadow-[0_0_10px_-3px_rgba(245,158,11,0.2)]"
                )}>
                    <Crown size={12} className="text-amber-400" />

                    <span className="text-[10px] font-bold tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 text-transparent bg-clip-text uppercase">
                        Pro Trader
                    </span>
                </div>
            </div>
        );
    }

    // Free Tier
    return (
        <div className={cn("relative inline-flex items-center", className)}>
            <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                "bg-white/5 border border-white/10 backdrop-blur-sm",
                "text-white/50"
            )}>
                <Clock size={11} className="" />
                <span className="text-[10px] font-medium tracking-wide uppercase font-mono">
                    Trial: {daysLeft ?? 0} Días
                </span>
            </div>
        </div>
    );
};
