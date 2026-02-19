import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Settings2, Activity, TrendingUp, Zap, Target, BarChart3, CheckCircle2, XCircle, AlertCircle, ArrowRight, Atom, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useBotQuantum } from '../hooks/useBotQuantum';
import { useDeriv } from '../contexts/DerivContext';

const BotQuantum = () => {
    const { isConnected } = useDeriv();
    const { isRunning, stats, logs, startBot, stopBot } = useBotQuantum();

    // Config States with XML defaults
    const [stake, setStake] = useState<string>('0.35');
    const [stopLoss, setStopLoss] = useState<string>('100');
    const [takeProfit, setTakeProfit] = useState<string>('100');
    const [sorosRounds, setSorosRounds] = useState<string>('12');
    const [martingaleCount, setMartingaleCount] = useState<string>('0');
    const [martingaleDivision, setMartingaleDivision] = useState<string>('0');
    const [martingaleMultiplier, setMartingaleMultiplier] = useState<string>('12');

    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Quantum Bot detenido');
        } else {
            if (!isConnected) {
                toast.error('Primero debe conectar su cuenta Deriv');
                return;
            }

            const stakeVal = parseFloat(stake);
            const stopLossVal = parseFloat(stopLoss);
            const takeProfitVal = parseFloat(takeProfit);
            const sorosVal = parseInt(sorosRounds);
            const mgCountVal = parseInt(martingaleCount);
            const mgDivVal = parseInt(martingaleDivision);
            const mgMultVal = parseFloat(martingaleMultiplier);

            if (isNaN(stakeVal) || stakeVal <= 0) {
                toast.error('Stake inválido');
                return;
            }

            const success = startBot({
                stake: stakeVal,
                stopLoss: stopLossVal,
                takeProfit: takeProfitVal,
                sorosRounds: sorosVal || 12,
                martingaleCount: mgCountVal || 0,
                martingaleDivision: mgDivVal || 1, // Avoid division by 0
                martingaleMultiplier: mgMultVal || 12,
                symbol: 'R_100',
            });

            if (success) {
                toast.success('Quantum Bot iniciado');
            }
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} className="text-emerald-400" />;
            case 'error': return <XCircle size={16} className="text-red-400" />;
            case 'warning': return <AlertCircle size={16} className="text-yellow-400" />;
            default: return <ArrowRight size={16} className="text-cyan-400" />;
        }
    };

    const winRate = stats.wins + stats.losses > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : '0.0';

    // Recommendation message component
    const RecommendationMessage = ({ message, type = 'info' }: { message: string; type?: 'info' | 'warning' }) => (
        <div className={cn(
            "flex items-start gap-2 mt-2 p-2.5 rounded-lg text-xs",
            type === 'warning'
                ? "bg-red-500/10 border border-red-500/20 text-red-300"
                : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
        )}>
            <Info size={14} className={cn("flex-shrink-0 mt-0.5", type === 'warning' ? "text-red-400" : "text-cyan-400")} />
            <span>{message}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#050a14] to-[#0a0a14] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
                            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center border border-cyan-400/20">
                                <Atom className="text-white animate-spin" style={{ animationDuration: '10s' }} size={28} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white mb-1 tracking-tight">Quantum Bot</h1>
                            <p className="text-sm text-white/40">R_100 | DIGITDIFF | Soros + Martingale</p>
                        </div>
                    </div>

                    <div className={cn(
                        "px-6 py-3 rounded-xl border flex items-center gap-3 transition-all duration-300",
                        isRunning
                            ? "bg-cyan-500/10 border-cyan-500/30"
                            : "bg-white/5 border-white/10"
                    )}>
                        <div className={cn(
                            "relative w-2 h-2 rounded-full",
                            isRunning && "animate-pulse"
                        )}>
                            {isRunning && (
                                <span className="absolute inset-0 rounded-full bg-cyan-500 animate-ping" />
                            )}
                            <span className={cn(
                                "absolute inset-0 rounded-full",
                                isRunning ? "bg-cyan-500" : "bg-gray-500"
                            )} />
                        </div>
                        <span className={cn(
                            "text-sm font-bold uppercase tracking-wider",
                            isRunning ? "text-cyan-400" : "text-white/50"
                        )}>
                            {isRunning ? 'Operando' : 'Inactivo'}
                        </span>
                    </div>
                </div>

                {/* Strategy Info Banner */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Atom className="text-cyan-400" size={24} />
                        <div>
                            <p className="text-sm text-white/80 font-medium">
                                Estrategia: <span className="text-cyan-400 font-bold">DIGIT DIFFERS</span> con interés compuesto Soros
                            </p>
                            <p className="text-xs text-white/40">
                                Dígito actual: {stats.currentDigit} | Soros: {stats.sorosCount}/{sorosRounds} | Hits: {stats.sorosHits}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Left Panel - Config */}
                    <div className="col-span-12 lg:col-span-4 space-y-4">
                        {/* Config Card */}
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <Settings2 size={18} className="text-cyan-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configuración</h3>
                            </div>

                            <div className="space-y-4">
                                {/* Stake */}
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-medium">
                                        💰 Stake Inicial ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={stake}
                                        onChange={(e) => setStake(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none disabled:opacity-50"
                                        step="0.01"
                                    />
                                    <RecommendationMessage message="💰 ¿Cuál es el valor de la PRIMERA APUESTA que deseas que el robot haga? Recomendado: 0.35" />
                                </div>

                                {/* Soros Rounds */}
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-medium">
                                        ✅ Rondas Soros (Interés Compuesto)
                                    </label>
                                    <input
                                        type="number"
                                        value={sorosRounds}
                                        onChange={(e) => setSorosRounds(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-cyan-500/50 transition-all outline-none disabled:opacity-50"
                                        step="1"
                                    />
                                    <RecommendationMessage message="✅ ¿Cuántas operaciones de interés compuesto deseas utilizar? Recomiendo 12 rondas debido a la alta precisión." />
                                </div>

                                {/* Martingale Count */}
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-medium">
                                        📈 Cantidad de Martingales
                                    </label>
                                    <input
                                        type="number"
                                        value={martingaleCount}
                                        onChange={(e) => setMartingaleCount(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-cyan-500/50 transition-all outline-none disabled:opacity-50"
                                        step="1"
                                    />
                                    <RecommendationMessage
                                        message="🛑 ATENCIÓN: ¿Cuántos Martingales deseas realizar? Se recomienda poner 0 (cero)."
                                        type="warning"
                                    />
                                </div>

                                {/* Martingale Division */}
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-medium">
                                        🔧 División de Martingale
                                    </label>
                                    <input
                                        type="number"
                                        value={martingaleDivision}
                                        onChange={(e) => setMartingaleDivision(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-cyan-500/50 transition-all outline-none disabled:opacity-50"
                                        step="1"
                                    />
                                    <RecommendationMessage
                                        message="🛑 ATENCIÓN: ¿En cuántas operaciones pretende dividir el Martingale? Se puede dividir en 5 o más. Se recomienda poner 0 (cero)."
                                        type="warning"
                                    />
                                </div>

                                {/* Martingale Multiplier */}
                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-medium">
                                        ⚡ Multiplicador Martingale
                                    </label>
                                    <input
                                        type="number"
                                        value={martingaleMultiplier}
                                        onChange={(e) => setMartingaleMultiplier(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:border-cyan-500/50 transition-all outline-none disabled:opacity-50"
                                        step="1"
                                    />
                                    <RecommendationMessage message="El multiplicador se aplica dividido por la cantidad de divisiones. Default: 12" />
                                </div>

                                {/* Stop Loss / Take Profit */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="text-xs text-red-400/70 uppercase tracking-wider mb-2 block font-medium">
                                            🛑 Pérdida Máx ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={stopLoss}
                                            onChange={(e) => setStopLoss(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full px-3 py-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 font-mono focus:border-red-500/50 transition-all outline-none disabled:opacity-50"
                                        />
                                        <RecommendationMessage
                                            message="🛑 ¿Cuál es el valor de la PÉRDIDA MÁXIMA aceptada?"
                                            type="warning"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-emerald-400/70 uppercase tracking-wider mb-2 block font-medium">
                                            💰 Meta de Ganancia ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={takeProfit}
                                            onChange={(e) => setTakeProfit(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full px-3 py-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-400 font-mono focus:border-emerald-500/50 transition-all outline-none disabled:opacity-50"
                                        />
                                        <RecommendationMessage message="💰 ¿Cuánto deseas GANAR?" />
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
                                    : "bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white border-none shadow-lg shadow-cyan-500/25"
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
                                    INICIAR QUANTUM
                                </>
                            )}
                        </button>
                    </div>

                    {/* Right Panel - Stats & Logs */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Total Profit */}
                            <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                            <BarChart3 size={16} className="text-cyan-400" />
                                        </div>
                                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Resultado</span>
                                    </div>
                                    <div className={cn(
                                        "text-2xl font-black",
                                        stats.totalProfit > 0 ? "text-emerald-400" : stats.totalProfit < 0 ? "text-red-400" : "text-white"
                                    )}>
                                        {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                                        <span className="text-xs ml-1 opacity-50">USD</span>
                                    </div>
                                </div>
                            </div>

                            {/* Soros Hits */}
                            <div className="bg-gradient-to-br from-cyan-500/5 to-transparent border border-cyan-500/20 rounded-2xl p-5 group hover:border-cyan-500/30 transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                        <Zap size={16} className="text-cyan-400" />
                                    </div>
                                    <span className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-wider">Soros Hits</span>
                                </div>
                                <div className="text-2xl font-black text-cyan-400">{stats.sorosHits}</div>
                            </div>

                            {/* Win Rate */}
                            <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-5 group hover:border-emerald-500/30 transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <Target size={16} className="text-emerald-400" />
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">Win Rate</span>
                                </div>
                                <div className="text-2xl font-black text-emerald-400">
                                    {winRate}<span className="text-xs ml-1 opacity-70">%</span>
                                </div>
                            </div>

                            {/* Max Consecutive Wins */}
                            <div className="bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/20 rounded-2xl p-5 group hover:border-yellow-500/30 transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                        <TrendingUp size={16} className="text-yellow-400" />
                                    </div>
                                    <span className="text-[10px] font-bold text-yellow-400/70 uppercase tracking-wider">Máx Wins</span>
                                </div>
                                <div className="text-2xl font-black text-yellow-400">{stats.maxConsecutiveWins}</div>
                            </div>
                        </div>

                        {/* Secondary Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-xs text-white/40 mb-1">Wins</p>
                                <p className="text-xl font-bold text-emerald-400">{stats.wins}</p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-xs text-white/40 mb-1">Losses</p>
                                <p className="text-xl font-bold text-red-400">{stats.losses}</p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-xs text-white/40 mb-1">Soros Actual</p>
                                <p className="text-xl font-bold text-cyan-400">{stats.sorosCount}/{sorosRounds}</p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-xs text-white/40 mb-1">Drawdown</p>
                                <p className="text-xl font-bold text-orange-400">{stats.drawdown.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Activity Log */}
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                        <Activity size={18} className="text-cyan-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Registro de Actividad</h3>
                                        <p className="text-xs text-white/40">Eventos en tiempo real</p>
                                    </div>
                                </div>
                                <span className="text-xs text-white/30 font-mono">{logs.length} eventos</span>
                            </div>

                            <div className="h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {logs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center p-12">
                                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/5 flex items-center justify-center mb-4 border border-cyan-500/10">
                                            <Atom size={28} className="text-cyan-400/50" />
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
                                                    "flex items-start gap-3 p-3 rounded-xl transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2",
                                                    log.type === 'success' && "bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/30",
                                                    log.type === 'error' && "bg-red-500/5 border border-red-500/20 hover:border-red-500/30",
                                                    log.type === 'warning' && "bg-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/30",
                                                    log.type === 'info' && "bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/30"
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
                                                            log.type === 'info' && "text-cyan-400"
                                                        )}>
                                                            {log.time}
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

export default BotQuantum;
