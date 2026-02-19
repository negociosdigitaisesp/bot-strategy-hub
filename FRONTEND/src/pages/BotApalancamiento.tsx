import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Settings2, Activity, TrendingUp, Zap, Target, BarChart3, CheckCircle2, XCircle, AlertCircle, ArrowRight, Flame, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useBotApalancamiento } from '../hooks/useBotApalancamiento';
import { useDeriv } from '../contexts/DerivContext';

const BotApalancamiento = () => {
    const { isConnected } = useDeriv();
    const { isRunning, stats, logs, startBot, stopBot } = useBotApalancamiento();

    // Config States
    const [stake, setStake] = useState<string>('1.00');
    const [stopLoss, setStopLoss] = useState<string>('10.00');
    const [takeProfit, setTakeProfit] = useState<string>('10.00');
    const [martingale, setMartingale] = useState<string>('2.1');
    const [maxLosses, setMaxLosses] = useState<string>('6');
    const [tradesPerCycle, setTradesPerCycle] = useState<string>('100');

    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Bot del Apalancamiento detenido');
        } else {
            if (!isConnected) {
                toast.error('Primero debe conectar su cuenta Deriv');
                return;
            }

            const stakeVal = parseFloat(stake);
            const stopLossVal = parseFloat(stopLoss);
            const takeProfitVal = parseFloat(takeProfit);
            const martingaleVal = parseFloat(martingale);
            const maxLossesVal = parseInt(maxLosses);
            const tradesPerCycleVal = parseInt(tradesPerCycle);

            if (isNaN(stakeVal) || stakeVal <= 0) {
                toast.error('Stake inválido');
                return;
            }

            const success = startBot({
                stake: stakeVal,
                stopLoss: stopLossVal,
                takeProfit: takeProfitVal,
                martingaleSize: martingaleVal || 2.1,
                maxLosses: maxLossesVal || 6,
                tradesPerCycle: tradesPerCycleVal || 100,
                symbol: '1HZ75V',
            });

            if (success) {
                toast.success('Bot del Apalancamiento iniciado');
            }
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} className="text-emerald-400" />;
            case 'error': return <XCircle size={16} className="text-red-400" />;
            case 'warning': return <AlertCircle size={16} className="text-yellow-400" />;
            default: return <ArrowRight size={16} className="text-orange-400" />;
        }
    };

    const winRate = stats.wins + stats.losses > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#140a08] to-[#0a0a14] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center border border-orange-400/20">
                                <Flame className="text-white" size={28} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white mb-1 tracking-tight">Bot del Apalancamiento</h1>
                            <p className="text-sm text-white/40">1HZ75V | OVER/UNDER Alternante</p>
                        </div>
                    </div>

                    <div className={cn(
                        "px-6 py-3 rounded-xl border flex items-center gap-3 transition-all duration-300",
                        isRunning
                            ? "bg-orange-500/10 border-orange-500/30"
                            : "bg-white/5 border-white/10"
                    )}>
                        <div className={cn(
                            "relative w-2 h-2 rounded-full",
                            isRunning && "animate-pulse"
                        )}>
                            {isRunning && (
                                <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping" />
                            )}
                            <span className={cn(
                                "absolute inset-0 rounded-full",
                                isRunning ? "bg-orange-500" : "bg-gray-500"
                            )} />
                        </div>
                        <span className={cn(
                            "text-sm font-bold uppercase tracking-wider",
                            isRunning ? "text-orange-400" : "text-white/50"
                        )}>
                            {isRunning ? 'Operando' : 'Inactivo'}
                        </span>
                    </div>
                </div>

                {/* Mode Indicator */}
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <RefreshCw className={cn("text-orange-400", isRunning && "animate-spin")} size={20} />
                        <div>
                            <p className="text-sm text-white/80 font-medium">
                                Modo Actual: <span className="text-orange-400 font-bold">DIGIT{stats.currentMode}</span>
                            </p>
                            <p className="text-xs text-white/40">
                                Trades en ciclo: {stats.tradesInCycle} | Cambia cada 100 trades
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-white/40">Próximo cambio</p>
                        <p className="text-sm text-orange-400 font-mono font-bold">
                            {100 - stats.tradesInCycle} trades
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Left Panel - Config */}
                    <div className="col-span-12 lg:col-span-3 space-y-4">
                        {/* Config Card */}
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <Settings2 size={18} className="text-orange-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configuración</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-medium">
                                        Stake Inicial ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={stake}
                                        onChange={(e) => setStake(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none disabled:opacity-50"
                                        step="0.01"
                                    />
                                    <p className="text-[10px] text-orange-400/80 mt-1.5 font-medium flex items-center gap-1">
                                        <Zap size={10} />
                                        Recomendado: 1.00
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-medium">
                                        Martingale (×)
                                    </label>
                                    <input
                                        type="number"
                                        value={martingale}
                                        onChange={(e) => setMartingale(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-orange-500/50 transition-all outline-none disabled:opacity-50"
                                        step="0.1"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-medium">
                                        Máx Pérdidas
                                    </label>
                                    <input
                                        type="number"
                                        value={maxLosses}
                                        onChange={(e) => setMaxLosses(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-orange-500/50 transition-all outline-none disabled:opacity-50"
                                        step="1"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-medium">
                                        Trades por Ciclo
                                    </label>
                                    <input
                                        type="number"
                                        value={tradesPerCycle}
                                        onChange={(e) => setTradesPerCycle(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-orange-500/50 transition-all outline-none disabled:opacity-50"
                                        step="10"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="text-xs text-red-400/70 uppercase tracking-wider mb-2 block font-medium">
                                            SL ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={stopLoss}
                                            onChange={(e) => setStopLoss(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full px-3 py-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 font-mono focus:border-red-500/50 transition-all outline-none disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-emerald-400/70 uppercase tracking-wider mb-2 block font-medium">
                                            TP ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={takeProfit}
                                            onChange={(e) => setTakeProfit(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full px-3 py-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-400 font-mono focus:border-emerald-500/50 transition-all outline-none disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Control Button */}
                        <button
                            onClick={handleToggleBot}
                            className={cn(
                                "w-full py-4 rounded-2xl font-black text-base shadow-xl transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group",
                                isRunning
                                    ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                                    : "bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-500 hover:to-red-600 text-white border-none shadow-lg shadow-orange-500/25"
                            )}
                        >
                            {isRunning ? (
                                <>
                                    <Square fill="currentColor" size={18} />
                                    DETENER
                                </>
                            ) : (
                                <>
                                    <Play fill="currentColor" size={18} />
                                    INICIAR APALANCAMIENTO
                                </>
                            )}
                        </button>
                    </div>

                    {/* Right Panel - Stats & Logs */}
                    <div className="col-span-12 lg:col-span-9 space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Total Profit */}
                            <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                            <BarChart3 size={20} className="text-orange-400" />
                                        </div>
                                        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Resultado</span>
                                    </div>
                                    <div className={cn(
                                        "text-3xl font-black",
                                        stats.totalProfit > 0 ? "text-emerald-400" : stats.totalProfit < 0 ? "text-red-400" : "text-white"
                                    )}>
                                        {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                                        <span className="text-sm ml-1.5 opacity-50">USD</span>
                                    </div>
                                </div>
                            </div>

                            {/* Wins */}
                            <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-6 group hover:border-emerald-500/30 transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <TrendingUp size={20} className="text-emerald-400" />
                                    </div>
                                    <span className="text-xs font-bold text-emerald-400/70 uppercase tracking-wider">Wins</span>
                                </div>
                                <div className="text-3xl font-black text-emerald-400">{stats.wins}</div>
                            </div>

                            {/* Losses */}
                            <div className="bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/20 rounded-2xl p-6 group hover:border-red-500/30 transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                        <Activity size={20} className="text-red-400" />
                                    </div>
                                    <span className="text-xs font-bold text-red-400/70 uppercase tracking-wider">Losses</span>
                                </div>
                                <div className="text-3xl font-black text-red-400">{stats.losses}</div>
                            </div>

                            {/* Win Rate */}
                            <div className="bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/20 rounded-2xl p-6 group hover:border-orange-500/30 transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                        <Target size={20} className="text-orange-400" />
                                    </div>
                                    <span className="text-xs font-bold text-orange-400/70 uppercase tracking-wider">Win Rate</span>
                                </div>
                                <div className="text-3xl font-black text-orange-400">
                                    {winRate}<span className="text-sm ml-1 opacity-70">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Activity Log */}
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                        <Activity size={20} className="text-orange-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Registro de Actividad</h3>
                                        <p className="text-xs text-white/40">Eventos en tiempo real</p>
                                    </div>
                                </div>
                                <span className="text-xs text-white/30 font-mono">{logs.length} eventos</span>
                            </div>

                            <div className="h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {logs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center p-12">
                                        <div className="w-20 h-20 rounded-2xl bg-orange-500/5 flex items-center justify-center mb-4 border border-orange-500/10">
                                            <Flame size={32} className="text-orange-400/50" />
                                        </div>
                                        <p className="text-white/30 text-sm font-medium">Esperando actividad del bot...</p>
                                        <p className="text-white/20 text-xs mt-1">Los eventos aparecerán aquí</p>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-2">
                                        {logs.map((log, index) => (
                                            <div
                                                key={log.id}
                                                className={cn(
                                                    "flex items-start gap-3 p-4 rounded-xl transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2",
                                                    log.type === 'success' && "bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/30",
                                                    log.type === 'error' && "bg-red-500/5 border border-red-500/20 hover:border-red-500/30",
                                                    log.type === 'warning' && "bg-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/30",
                                                    log.type === 'info' && "bg-orange-500/5 border border-orange-500/20 hover:border-orange-500/30"
                                                )}
                                                style={{ animationDelay: `${index * 20}ms` }}
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {getLogIcon(log.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn(
                                                            "text-xs font-mono font-medium",
                                                            log.type === 'success' && "text-emerald-400",
                                                            log.type === 'error' && "text-red-400",
                                                            log.type === 'warning' && "text-yellow-400",
                                                            log.type === 'info' && "text-orange-400"
                                                        )}>
                                                            {log.time}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        <span className="text-xs text-white/30 uppercase tracking-wider font-bold">
                                                            {log.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-white/80 leading-relaxed">
                                                        {log.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={logsEndRef} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BotApalancamiento;
