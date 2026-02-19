import React, { useState } from 'react';
import { ArrowLeft, Wifi, WifiOff, Lock, Unlock, Activity, TrendingUp, TrendingDown, Trophy, XCircle, Timer, Zap, BarChart3, Target, DollarSign, Percent, Clock, Signal, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useDeriv } from '../contexts/DerivContext';
import { useEvenOddSensor } from '../hooks/useEvenOddSensor';

const SensorExplosivo: React.FC = () => {
    const navigate = useNavigate();
    const { isConnected: derivConnected, account } = useDeriv();
    const {
        lastDigits,
        evenPercentage,
        oddPercentage,
        currentStreak,
        streakType,
        dominantSide,
        signalState,
        signalDirection,
        signalText,
        isSubscribed,
        isOnCooldown,
        cooldownRemaining,
        currentPrice,
        lastDigit,
        lastUpdate,
        totalTrades,
        wins,
        losses,
        totalProfit,
        totalGains,
        totalLosses,
        lastTradeProfit,
        lastTradeResult,
        executeTrade,
    } = useEvenOddSensor();

    const [stake, setStake] = useState<number>(1);

    const formatPrice = (price: number) => {
        if (price === 0) return '---';
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
    };

    const formatTime = (date: Date | null) => {
        if (!date) return '--:--:--';
        return date.toLocaleTimeString('es-ES');
    };

    const handleExecuteTrade = () => {
        if (signalDirection && !isOnCooldown) {
            executeTrade(signalDirection, stake);
        }
    };

    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0d0a1a] via-[#12091f] to-[#0a0514] p-3 md:p-6">
            {/* Purple grid background */}
            <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJhMWE0MCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30 pointer-events-none" />

            {/* Purple glow effects */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-950/50 border border-violet-500/20 text-violet-300 hover:text-white hover:border-violet-500/40 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Volver</span>
                    </button>

                    {/* Live Price Display - Central */}
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-4 px-5 py-2.5 rounded-xl bg-violet-950/60 border border-violet-500/20 backdrop-blur-sm">
                            <div className="flex flex-col">
                                <span className="text-violet-400/70 text-[10px] uppercase tracking-wider font-medium">Precio Actual</span>
                                <span className="text-white font-bold text-xl tabular-nums tracking-tight">{formatPrice(currentPrice)}</span>
                            </div>
                            <div className="w-px h-10 bg-violet-500/30" />
                            <div className="flex flex-col items-center">
                                <span className="text-violet-400/70 text-[10px] uppercase tracking-wider font-medium">Dígito</span>
                                <div className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg",
                                    lastDigit !== null && lastDigit % 2 === 0
                                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                        : "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                                )}>
                                    {lastDigit !== null ? lastDigit : '-'}
                                </div>
                            </div>
                            <div className="w-px h-10 bg-violet-500/30" />
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", isSubscribed ? "bg-violet-400 animate-pulse" : "bg-violet-600")} />
                                <div className="flex flex-col">
                                    <span className="text-violet-400/70 text-[10px] uppercase tracking-wider font-medium">Estado</span>
                                    <span className="text-violet-200 text-xs font-medium">{formatTime(lastUpdate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        'flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-sm border transition-all',
                        derivConnected
                            ? 'bg-violet-500/10 border-violet-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                    )}>
                        {derivConnected ? (
                            <>
                                <div className="relative">
                                    <Wifi className="w-4 h-4 text-violet-400" />
                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                                </div>
                                <span className="text-violet-300 text-sm font-mono">{account?.loginid}</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 text-sm font-mono">DESCONECTADO</span>
                            </>
                        )}
                    </div>
                </div>


                {/* Connection Required Panel */}
                {!derivConnected && (
                    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/60 via-purple-950/40 to-fuchsia-950/30 p-8 mb-6">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
                        <div className="relative text-center">
                            <div className="inline-flex p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
                                <Lock className="w-10 h-10 text-violet-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Sistema Bloqueado</h3>
                            <p className="text-violet-300/70 mb-6 text-sm max-w-md mx-auto">Conecte su cuenta Deriv para acceder al análisis en tiempo real</p>
                            <button onClick={() => navigate('/conectar-deriv')} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold rounded-xl hover:from-violet-400 hover:to-purple-400 transition-all shadow-lg shadow-violet-500/30">
                                <Unlock className="w-5 h-5" />
                                Desbloquear Sistema
                            </button>
                        </div>
                    </div>
                )}

                {/* Title Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-900/30 border border-violet-500/20 mb-4">
                        <Signal className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-medium text-violet-300/70 uppercase tracking-wider">Estrategia Activa</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 mb-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 blur-xl opacity-50 animate-pulse" />
                            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                                <Bug className="w-10 h-10 text-violet-400" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                            Bug Deriv
                        </h1>
                    </div>
                    <p className="text-violet-400/60 text-sm font-medium">Even/Odd Imbalance Reversal • Volatility 100 (1s)</p>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

                    {/* Left Column - Balance Analysis */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Balance Bar Card */}
                        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-purple-950/30 to-fuchsia-950/20 p-6">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-fuchsia-500/5" />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                            <BarChart3 className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold text-sm">Distribución de Mercado</h3>
                                            <p className="text-violet-400/50 text-xs">Últimos 100 dígitos</p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide",
                                        dominantSide === 'even' ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" :
                                            dominantSide === 'odd' ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30" :
                                                "bg-purple-700/30 text-purple-300 border border-purple-500/30"
                                    )}>
                                        {dominantSide === 'even' ? 'PAR Dominante' : dominantSide === 'odd' ? 'IMPAR Dominante' : 'Equilibrado'}
                                    </div>
                                </div>

                                {/* Percentage Display */}
                                <div className="flex justify-between items-end mb-3">
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn(
                                            "text-4xl font-black tabular-nums",
                                            evenPercentage > 55 ? "text-violet-300" : "text-violet-400/70"
                                        )}>
                                            {evenPercentage.toFixed(1)}
                                        </span>
                                        <span className="text-violet-400/60 text-sm font-medium">% PAR</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-fuchsia-400/60 text-sm font-medium">IMPAR %</span>
                                        <span className={cn(
                                            "text-4xl font-black tabular-nums",
                                            oddPercentage > 55 ? "text-fuchsia-300" : "text-fuchsia-400/70"
                                        )}>
                                            {oddPercentage.toFixed(1)}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative h-4 rounded-full bg-purple-950 overflow-hidden border border-violet-500/20">
                                    <div
                                        className={cn(
                                            "absolute left-0 top-0 h-full transition-all duration-500 ease-out",
                                            evenPercentage > 55
                                                ? "bg-gradient-to-r from-violet-600 via-violet-500 to-violet-400"
                                                : "bg-gradient-to-r from-violet-700 to-violet-600"
                                        )}
                                        style={{ width: `${evenPercentage}%` }}
                                    >
                                        {evenPercentage > 55 && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "absolute right-0 top-0 h-full transition-all duration-500 ease-out",
                                            oddPercentage > 55
                                                ? "bg-gradient-to-l from-fuchsia-600 via-fuchsia-500 to-fuchsia-400"
                                                : "bg-gradient-to-l from-fuchsia-700 to-fuchsia-600"
                                        )}
                                        style={{ width: `${oddPercentage}%` }}
                                    >
                                        {oddPercentage > 55 && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                        )}
                                    </div>
                                </div>

                                {/* Threshold Markers */}
                                <div className="flex justify-between mt-2">
                                    <span className={cn("text-xs font-medium", evenPercentage > 55 ? "text-violet-300" : "text-violet-600")}>
                                        {evenPercentage > 55 ? "⚠️ Desequilibrio" : "Normal"}
                                    </span>
                                    <span className={cn("text-xs font-medium", oddPercentage > 55 ? "text-fuchsia-300" : "text-fuchsia-600")}>
                                        {oddPercentage > 55 ? "Desequilibrio ⚠️" : "Normal"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Digit Sequence Card */}
                        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-purple-950/30 to-fuchsia-950/20 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                        <Activity className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-sm">Secuencia en Vivo</h3>
                                        <p className="text-violet-400/50 text-xs">Últimos dígitos del mercado</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold",
                                    currentStreak >= 4 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse" :
                                        currentStreak >= 3 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                            "bg-violet-900/50 text-violet-300 border border-violet-500/20"
                                )}>
                                    <Zap className="w-3.5 h-3.5" />
                                    <span className="tabular-nums">{currentStreak}</span>
                                    <span className="text-xs opacity-70">{streakType === 'even' ? 'PARES' : streakType === 'odd' ? 'IMPARES' : '---'}</span>
                                </div>
                            </div>

                            {/* Digit Balls */}
                            <div className="flex flex-wrap gap-2 justify-center py-4">
                                {lastDigits.length === 0 ? (
                                    <div className="flex items-center gap-2 text-violet-400/50 py-6">
                                        <div className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                                        <span className="text-sm">Esperando datos del mercado...</span>
                                    </div>
                                ) : (
                                    lastDigits.map((digit, index) => {
                                        const isEvenDigit = digit % 2 === 0;
                                        const isLast = index === lastDigits.length - 1;
                                        const opacity = 0.4 + (index / lastDigits.length) * 0.6;

                                        return (
                                            <div
                                                key={index}
                                                className={cn(
                                                    "relative w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-lg",
                                                    isEvenDigit
                                                        ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/30"
                                                        : "bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-fuchsia-500/30",
                                                    isLast && "ring-2 ring-white/50 ring-offset-2 ring-offset-[#12091f] scale-110"
                                                )}
                                                style={{ opacity }}
                                            >
                                                <span className="relative z-10 tabular-nums">{digit}</span>
                                                {isLast && (
                                                    <div className="absolute inset-0 rounded-xl bg-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Stats & Controls */}
                    <div className="space-y-4">

                        {/* Profit Card */}
                        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-purple-950/30 to-fuchsia-950/20 p-5">
                            <div className={cn(
                                "absolute inset-0",
                                totalProfit >= 0
                                    ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent"
                                    : "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent"
                            )} />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-violet-300/70 text-xs font-medium uppercase tracking-wide">Beneficio Total</span>
                                    {lastTradeResult && (
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-xs font-bold",
                                            lastTradeResult === 'win' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                        )}>
                                            {lastTradeResult === 'win' ? '+' : ''}{lastTradeProfit?.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                <div className={cn(
                                    "text-3xl font-black tabular-nums mb-4",
                                    totalProfit > 0 ? "text-emerald-400" : totalProfit < 0 ? "text-red-400" : "text-violet-300"
                                )}>
                                    {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} <span className="text-lg font-medium opacity-60">USD</span>
                                </div>

                                {/* Gains/Losses Breakdown */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-emerald-400/70 text-xs font-medium">Ganancias</span>
                                        </div>
                                        <span className="text-emerald-400 font-bold text-lg tabular-nums">+{totalGains.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                            <span className="text-red-400/70 text-xs font-medium">Pérdidas</span>
                                        </div>
                                        <span className="text-red-400 font-bold text-lg tabular-nums">-{totalLosses.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Card */}
                        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-purple-950/30 to-fuchsia-950/20 p-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 rounded-xl bg-violet-900/30 border border-violet-500/20">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                                    </div>
                                    <span className="text-2xl font-bold text-emerald-400 tabular-nums">{wins}</span>
                                    <p className="text-violet-400/50 text-xs mt-0.5">Victorias</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-violet-900/30 border border-violet-500/20">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                                    </div>
                                    <span className="text-2xl font-bold text-red-400 tabular-nums">{losses}</span>
                                    <p className="text-violet-400/50 text-xs mt-0.5">Pérdidas</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-violet-900/30 border border-violet-500/20">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <Percent className="w-3.5 h-3.5 text-violet-300" />
                                    </div>
                                    <span className="text-2xl font-bold text-violet-300 tabular-nums">{winRate}%</span>
                                    <p className="text-violet-400/50 text-xs mt-0.5">Win Rate</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-violet-900/30 border border-violet-500/20">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <Target className="w-3.5 h-3.5 text-purple-300" />
                                    </div>
                                    <span className="text-2xl font-bold text-purple-300 tabular-nums">{totalTrades}</span>
                                    <p className="text-violet-400/50 text-xs mt-0.5">Trades</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signal & Stake Section */}
                <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-purple-950/30 to-fuchsia-950/20 p-6">
                    <div className={cn(
                        "absolute inset-0 transition-all duration-500",
                        signalState === 'trigger' && !isOnCooldown
                            ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/30 via-transparent to-transparent"
                            : signalState === 'alert'
                                ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent"
                                : ""
                    )} />

                    <div className="relative">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Stake Control */}
                            <div className="flex items-center gap-3 bg-violet-900/30 rounded-xl p-2 border border-violet-500/20">
                                <span className="text-violet-300/70 text-sm font-medium pl-2">Stake</span>
                                <button
                                    onClick={() => setStake(Math.max(0.35, stake - 0.5))}
                                    className="w-9 h-9 rounded-lg bg-violet-800/50 text-violet-200 font-bold hover:bg-violet-700/50 transition-colors flex items-center justify-center border border-violet-500/30"
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    value={stake}
                                    onChange={(e) => setStake(Math.max(0.35, parseFloat(e.target.value) || 0.35))}
                                    className="w-20 h-9 bg-violet-950 border border-violet-500/30 rounded-lg text-center text-white font-bold tabular-nums focus:border-violet-400 focus:outline-none transition-colors"
                                    min="0.35"
                                    step="0.5"
                                />
                                <button
                                    onClick={() => setStake(stake + 0.5)}
                                    className="w-9 h-9 rounded-lg bg-violet-800/50 text-violet-200 font-bold hover:bg-violet-700/50 transition-colors flex items-center justify-center border border-violet-500/30"
                                >
                                    +
                                </button>
                                <span className="text-violet-400/50 text-sm pr-2">USD</span>
                            </div>

                            {/* Signal Button */}
                            <button
                                onClick={handleExecuteTrade}
                                disabled={signalState !== 'trigger' || isOnCooldown || !derivConnected}
                                className={cn(
                                    "flex-1 w-full md:w-auto py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-3",
                                    signalState === 'trigger' && !isOnCooldown
                                        ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-[1.02] cursor-pointer"
                                        : signalState === 'alert'
                                            ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white cursor-not-allowed"
                                            : isOnCooldown
                                                ? "bg-gradient-to-r from-violet-800 to-purple-800 text-violet-200 cursor-not-allowed"
                                                : "bg-violet-900/50 text-violet-400 border border-violet-500/20 cursor-not-allowed"
                                )}
                            >
                                {signalState === 'trigger' && !isOnCooldown && (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-pulse" />
                                        <div className="absolute -inset-1 bg-violet-500/40 blur-xl animate-pulse" />
                                    </>
                                )}

                                <div className="relative z-10 flex items-center gap-3">
                                    {isOnCooldown ? (
                                        <>
                                            <Timer className="w-5 h-5 animate-spin" style={{ animationDuration: '2s' }} />
                                            <span>Cooldown ({cooldownRemaining}s)</span>
                                        </>
                                    ) : signalState === 'trigger' ? (
                                        <>
                                            <Zap className="w-5 h-5" />
                                            <span>{signalDirection === 'ODD' ? '🟣 APOSTAR IMPAR' : '🔮 APOSTAR PAR'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Signal className="w-5 h-5" />
                                            <span>{signalText}</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Strategy Info Footer */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                    {[
                        { icon: BarChart3, label: "Análisis", desc: "100 dígitos", color: "violet" },
                        { icon: Percent, label: "Umbral", desc: "> 55%", color: "purple" },
                        { icon: Zap, label: "Secuencia", desc: "4+ seguidos", color: "fuchsia" },
                        { icon: Target, label: "Acción", desc: "Reversión", color: "pink" },
                    ].map(({ icon: Icon, label, desc, color }) => (
                        <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-violet-950/30 border border-violet-500/20">
                            <div className={cn(
                                "p-2 rounded-lg",
                                color === 'violet' && "bg-violet-500/10 text-violet-400",
                                color === 'purple' && "bg-purple-500/10 text-purple-400",
                                color === 'fuchsia' && "bg-fuchsia-500/10 text-fuchsia-400",
                                color === 'pink' && "bg-pink-500/10 text-pink-400"
                            )}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                                <p className="text-white text-sm font-medium">{label}</p>
                                <p className="text-violet-400/50 text-xs">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SensorExplosivo;
