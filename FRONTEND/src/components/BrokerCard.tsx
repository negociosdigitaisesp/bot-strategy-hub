import React from 'react';
import { Wifi, WifiOff, ChevronRight, Clock, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

interface BrokerCardProps {
    name: string;
    logoUrl?: string;
    logoFallback: string; // emoji fallback
    isConnected: boolean;
    balance?: number | null;
    currency?: string;
    ctaLabel: string;
    ctaDisconnectedLabel?: string;
    onCtaClick: () => void;
    comingSoon?: boolean;
    description?: string;
    affiliateUrl?: string;
    affiliateLabel?: string;
}

const BrokerCard: React.FC<BrokerCardProps> = ({
    name,
    logoUrl,
    logoFallback,
    isConnected,
    balance,
    currency = 'USD',
    ctaLabel,
    ctaDisconnectedLabel,
    onCtaClick,
    comingSoon = false,
    description,
    affiliateUrl,
    affiliateLabel,
}) => {
    if (comingSoon) {
        return (
            <div className="relative rounded-2xl border border-white/5 bg-[#0B0E14]/60 backdrop-blur-sm p-6 overflow-hidden opacity-60 cursor-not-allowed group">
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-2xl">
                            🔮
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white/40">{name}</h3>
                            {description && <p className="text-xs text-white/20 mt-0.5">{description}</p>}
                        </div>
                    </div>

                    <div className="flex items-center justify-center py-4">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/30 uppercase tracking-wider">
                            <Clock size={14} />
                            Próximamente
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const borderColor = isConnected
        ? 'border-emerald-500/20 hover:border-emerald-500/40'
        : 'border-red-500/10 hover:border-[#00E5FF]/30';

    const glowColor = isConnected
        ? 'from-emerald-500/5 via-transparent to-transparent'
        : 'from-red-500/5 via-transparent to-transparent';

    return (
        <div className={cn(
            "relative rounded-2xl border bg-[#0B0E14]/80 backdrop-blur-xl p-6 overflow-hidden transition-all duration-300 group",
            borderColor,
            "shadow-[0_0_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]"
        )}>
            {/* Background gradient */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", glowColor)} />
            {/* Corner glow */}
            <div className={cn(
                "absolute -top-12 -right-12 w-28 h-28 rounded-full blur-3xl transition-all duration-500",
                isConnected ? "bg-emerald-500/5 group-hover:bg-emerald-500/10" : "bg-[#00E5FF]/3 group-hover:bg-[#00E5FF]/8"
            )} />

            <div className="relative z-10">
                {/* Header: Logo + Name + Status */}
                <div className="flex items-center gap-4 mb-5">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl border flex items-center justify-center text-2xl transition-all duration-300 overflow-hidden",
                        isConnected
                            ? "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                            : "bg-white/5 border-white/10"
                    )}>
                        {logoUrl ? (
                            <img src={logoUrl} alt={name} className="w-8 h-8 object-contain" />
                        ) : (
                            <span>{logoFallback}</span>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">{name}</h3>
                        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
                    </div>
                    {/* Status badge */}
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                        isConnected
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}>
                        {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                        {isConnected ? 'Conectado' : 'Desconectado'}
                    </div>
                </div>

                {/* Balance (only if connected and available) */}
                {isConnected && balance !== null && balance !== undefined && (
                    <div className="mb-5 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500/5 to-transparent border border-emerald-500/10">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-[0.15em] font-mono mb-1">SALDO DISPONIBLE</span>
                        <span className="block text-xl font-black font-mono text-white">
                            <span className="text-emerald-400 mr-1">$</span>
                            {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                {/* CTA Button */}
                <button
                    onClick={onCtaClick}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300",
                        isConnected
                            ? "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20"
                            : "bg-gradient-to-r from-[#00E5FF]/20 to-[#00D1FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] hover:from-[#00E5FF]/30 hover:to-[#00D1FF]/20 hover:border-[#00E5FF]/50 shadow-[0_0_15px_rgba(0,229,255,0.1)] hover:shadow-[0_0_25px_rgba(0,229,255,0.2)]"
                    )}
                >
                    {isConnected ? ctaLabel : (ctaDisconnectedLabel || ctaLabel)}
                    <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Affiliate link (optional) */}
                {affiliateUrl && !isConnected && (
                    <a
                        href={affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-white/30 hover:text-white/50 transition-colors"
                    >
                        <ExternalLink size={10} />
                        {affiliateLabel || `¿No tienes cuenta? Crea una`}
                    </a>
                )}
            </div>
        </div>
    );
};

export default BrokerCard;
