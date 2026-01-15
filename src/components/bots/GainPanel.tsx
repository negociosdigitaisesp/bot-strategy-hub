import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Settings2, Activity, TrendingUp, Zap, Target, BarChart3, CheckCircle2, XCircle, AlertCircle, ArrowRight, Radio, Gauge } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useGainBot } from '../../hooks/useGainBot';
import { useDeriv } from '../../contexts/DerivContext';

interface GainPanelProps {
    isActive: boolean;
    onToggle: () => void;
    onBack?: () => void;
}

export const GainPanel = ({ isActive, onToggle, onBack }: GainPanelProps) => {
    const { isConnected } = useDeriv();
    const { isRunning, stats, logs, startBot, stopBot } = useGainBot();

    // Estados de Configuración
    const [stake, setStake] = useState<string>('1.00');
    const [stopLoss, setStopLoss] = useState<string>('100.00');
    const [takeProfit, setTakeProfit] = useState<string>('100.00');
    const [split, setSplit] = useState<string>('2');



    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Gain Bot detenido');
        } else {
            if (!isConnected) {
                toast.error('Primero debes conectar tu cuenta Deriv');
                return;
            }

            const stakeVal = parseFloat(stake);
            const stopLossVal = parseFloat(stopLoss);
            const takeProfitVal = parseFloat(takeProfit);
            const splitVal = parseFloat(split);

            if (isNaN(stakeVal) || stakeVal <= 0) {
                toast.error('Stake inválido');
                return;
            }

            const success = startBot({
                stake: stakeVal,
                stopLoss: stopLossVal,
                takeProfit: takeProfitVal,
                martingaleSplit: splitVal || 2,
            });

            if (success) {
                toast.success('¡Gain Bot iniciado!');
            }
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={12} className="text-emerald-400" />;
            case 'error': return <XCircle size={12} className="text-rose-400" />;
            case 'warning': return <AlertCircle size={12} className="text-yellow-400" />;
            default: return <ArrowRight size={12} className="text-cyan-400" />;
        }
    };

    const winRate = stats.wins + stats.losses > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : '0.0';

    const isProfitable = stats.totalProfit >= 0;

    return (
        <div className="p-5 space-y-5 animate-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-12 gap-5">

                {/* ===== IZQUIERDA: PANEL DE CONFIGURACIÓN ===== */}
                <div className="col-span-12 lg:col-span-4 space-y-4">

                    {/* Tarjeta de Configuración - Glassmorphism */}
                    <div className="relative overflow-hidden rounded-xl p-5 bg-slate-900/50 backdrop-blur-xl border border-white/10">
                        <div className="flex items-center gap-2 mb-5">
                            <Settings2 size={14} className="text-emerald-400" />
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Configuración</h3>
                            {isRunning && (
                                <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    EN VIVO
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Entrada de Stake */}
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 block font-bold">
                                    Stake Inicial
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={stake}
                                        onChange={(e) => setStake(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full pl-7 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm font-mono focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            {/* Split de Martingale */}
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 block font-bold">
                                    Divisor Martingale
                                </label>
                                <input
                                    type="number"
                                    value={split}
                                    onChange={(e) => setSplit(e.target.value)}
                                    disabled={isRunning}
                                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm font-mono focus:border-emerald-500/50 transition-all outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                    step="0.1"
                                />
                            </div>

                            {/* Fila SL y TP */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-rose-400/80 uppercase tracking-wider mb-1.5 block font-bold">
                                        Stop Loss
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500/60 text-sm">$</span>
                                        <input
                                            type="number"
                                            value={stopLoss}
                                            onChange={(e) => setStopLoss(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full pl-7 pr-3 py-2.5 bg-rose-950/20 border border-rose-500/20 rounded-lg text-rose-400 text-sm font-mono focus:border-rose-500/50 transition-all outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-emerald-400/80 uppercase tracking-wider mb-1.5 block font-bold">
                                        Take Profit
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/60 text-sm">$</span>
                                        <input
                                            type="number"
                                            value={takeProfit}
                                            onChange={(e) => setTakeProfit(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full pl-7 pr-3 py-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-mono focus:border-emerald-500/50 transition-all outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botón de Control */}
                        <button
                            onClick={handleToggleBot}
                            className={cn(
                                "w-full mt-5 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 border",
                                isRunning
                                    ? "bg-transparent border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/10"
                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
                            )}
                        >
                            {isRunning ? (
                                <>
                                    <Square size={14} fill="currentColor" />
                                    DETENER BOT
                                </>
                            ) : (
                                <>
                                    <Play size={14} fill="currentColor" />
                                    INICIAR BOT
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* ===== DERECHA: ESTADÍSTICAS Y LOGS ===== */}
                <div className="col-span-12 lg:col-span-8 space-y-4">

                    {/* ===== MINI BENTO DE ESTADÍSTICAS ===== */}
                    <div className="grid grid-cols-4 gap-3">

                        {/* Resultado - Hero Mini */}
                        <div className={cn(
                            "col-span-2 relative overflow-hidden rounded-xl p-4 backdrop-blur-xl border",
                            isProfitable
                                ? "bg-gradient-to-br from-emerald-950/40 via-emerald-900/10 to-black/40 border-emerald-500/20"
                                : "bg-gradient-to-br from-rose-950/40 via-rose-900/10 to-black/40 border-rose-500/20"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={12} className={isProfitable ? "text-emerald-400" : "text-rose-400"} />
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest",
                                    isProfitable ? "text-emerald-400/60" : "text-rose-400/60"
                                )}>Resultado</span>
                                {isRunning && (
                                    <span className="ml-auto w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                )}
                            </div>
                            <div className={cn(
                                "text-2xl font-black font-mono",
                                isProfitable ? "text-emerald-300" : "text-rose-300"
                            )}>
                                {isProfitable ? '+' : ''}{stats.totalProfit.toFixed(2)}
                                <span className="text-xs ml-1 opacity-50 font-sans">USD</span>
                            </div>
                        </div>

                        {/* Tasa de Acierto */}
                        <div className="relative overflow-hidden rounded-xl p-4 bg-slate-900/50 backdrop-blur-xl border border-white/10">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Gauge size={10} className="text-yellow-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/60">Tasa</span>
                            </div>
                            <div className="text-xl font-black font-mono text-yellow-300">
                                {winRate}<span className="text-xs opacity-50">%</span>
                            </div>
                        </div>

                        {/* Stake Actual */}
                        <div className="relative overflow-hidden rounded-xl p-4 bg-slate-900/50 backdrop-blur-xl border border-white/10">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Target size={10} className="text-emerald-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60">Stake</span>
                            </div>
                            <div className="text-xl font-black font-mono text-emerald-300">
                                ${stats.currentStake.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* ===== LOG DE ACTIVIDAD ===== */}
                    <div className="relative overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-xl border border-white/10">
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/20">
                            <div className="flex items-center gap-2">
                                <Activity size={12} className="text-cyan-400" />
                                <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Terminal de Actividad</h3>
                                {isRunning && (
                                    <Radio size={10} className="text-cyan-400 animate-pulse ml-2" />
                                )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">{logs.length} eventos</span>
                        </div>

                        <div className="h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-6">
                                    <div className="w-10 h-10 rounded-full border border-dashed border-slate-700 flex items-center justify-center mb-3">
                                        <Radio size={16} className="text-slate-600" />
                                    </div>
                                    <p className="text-slate-600 text-xs font-medium">Esperando señales...</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-1">
                                    {logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className={cn(
                                                "flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-mono",
                                                log.type === 'success' && "bg-emerald-500/5 border-l-2 border-emerald-500",
                                                log.type === 'error' && "bg-rose-500/5 border-l-2 border-rose-500",
                                                log.type === 'warning' && "bg-yellow-500/5 border-l-2 border-yellow-500",
                                                log.type === 'info' && "bg-cyan-500/5 border-l-2 border-cyan-500"
                                            )}
                                        >
                                            <span className="text-slate-600 text-[10px] flex-shrink-0 mt-0.5">{log.time}</span>
                                            <span className="flex-shrink-0 mt-0.5">{getLogIcon(log.type)}</span>
                                            <span className={cn(
                                                "text-[11px] leading-relaxed",
                                                log.type === 'success' && "text-emerald-300/80",
                                                log.type === 'error' && "text-rose-300/80",
                                                log.type === 'warning' && "text-yellow-300/80",
                                                log.type === 'info' && "text-cyan-300/80"
                                            )}>
                                                {log.message}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
