import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ChevronDown, ChevronUp, Wifi, WifiOff, Loader2, Plug } from 'lucide-react';
import { cn } from '../lib/utils';
import { useBrokerHub } from '../hooks/useBrokerHub';

export const BrokerStatusWidget = () => {
    const [expanded, setExpanded] = useState(false);
    const { brokers, totalBalance, connectedCount, totalBrokers, isAnyConnected, isLoading } = useBrokerHub();

    // No broker connected
    if (!isAnyConnected && !isLoading) {
        return (
            <Link
                to="/mis-brokers"
                className="w-full p-4 rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 hover:border-red-500/30 transition-all duration-200 group block"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20">
                        <WifiOff size={20} className="text-red-400" />
                    </div>
                    <div className="flex-1">
                        <span className="block text-sm font-bold text-red-400 group-hover:text-red-300">Sin Conexión</span>
                        <span className="block text-[10px] text-red-400/50 uppercase tracking-wider">0 brokers activos</span>
                    </div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10 text-center">
                    <span className="text-xs text-red-400/70">Clic para conectar tus cuentas</span>
                </div>
            </Link>
        );
    }

    // Loading state
    if (isLoading && !isAnyConnected) {
        return (
            <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <Loader2 size={20} className="text-yellow-500 animate-spin" />
                    </div>
                    <div className="flex-1">
                        <span className="block text-sm font-bold text-yellow-500">Verificando...</span>
                        <span className="block text-[10px] text-yellow-500/50 uppercase tracking-wider">Conexiones</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full rounded-2xl bg-[#0B0E14]/80 backdrop-blur-xl border border-[#00E5FF]/20 transition-all duration-300 relative group overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.4)]">
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00E5FF]/5 rounded-full blur-2xl group-hover:bg-[#00E5FF]/10 transition-all duration-500" />

            {/* Main clickable area */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 text-left relative z-10"
            >
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 shadow-[0_0_10px_rgba(0,229,255,0.1)]">
                        <Wallet size={20} className="text-[#00E5FF]" />
                        {/* Connected count badge */}
                        <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#0B0E14] text-[8px] font-black text-white">
                            {connectedCount}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-[0.15em] leading-none mb-1 font-mono">
                            CARTERA TOTAL
                        </span>
                        <span className="block text-lg font-black font-mono text-white leading-none tracking-tight">
                            <span className="text-[#00E5FF] mr-1">$</span>
                            {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="text-white/30">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center gap-1 mt-2">
                    <span className="text-[10px] text-[#00E5FF]/60 font-mono uppercase tracking-wider">
                        {connectedCount}/{totalBrokers} activos
                    </span>
                </div>
            </button>

            {/* Expanded dropdown showing individual brokers */}
            <div className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                expanded ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="px-4 pb-4 space-y-2 relative z-10">
                    <div className="h-px bg-white/5 mb-2" />
                    {brokers.map((broker) => (
                        <Link
                            key={broker.id}
                            to="/mis-brokers"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#00E5FF]/20 hover:bg-white/[0.04] transition-all duration-200"
                        >
                            {/* Status dot */}
                            <div className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                broker.isConnected ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-red-400"
                            )} />

                            {/* Name */}
                            <span className="text-xs font-semibold text-white/80 flex-1">
                                {broker.name}
                            </span>

                            {/* Balance or status */}
                            {broker.isConnected ? (
                                <span className="text-xs font-mono text-[#00E5FF]/80">
                                    {broker.balance !== null
                                        ? `$${broker.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : '● Activo'}
                                </span>
                            ) : (
                                <span className="text-[10px] text-red-400/70 font-medium">
                                    Desconectado
                                </span>
                            )}
                        </Link>
                    ))}

                    {/* Manage link */}
                    <Link
                        to="/mis-brokers"
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-[#00E5FF]/60 hover:text-[#00E5FF] uppercase tracking-wider transition-colors"
                    >
                        <Plug size={12} />
                        Administrar Brokers
                    </Link>
                </div>
            </div>
        </div>
    );
};
