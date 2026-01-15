import React, { useState, useRef, useEffect } from 'react';
import {
    Play,
    Square,
    Settings2,
    Activity,
    TrendingUp,
    TrendingDown,
    Zap,
    Target,
    BarChart3,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowRight,
    Shield,
    Bug,
    Wifi,
    WifiOff,
    ArrowLeft,
    Filter,
    Terminal,
    Ban,
    Sparkles,
    Power
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useBugDeriv } from '../hooks/useBugDeriv';
import { useDeriv } from '../contexts/DerivContext';
import { useNavigate } from 'react-router-dom';
import { useFreemiumLimiter, FREEMIUM_LIMITS } from '../hooks/useFreemiumLimiter';
import { FreemiumProgressBar } from '../components/FreemiumProgressBar';
import { SystemLimitModal } from '../components/SystemLimitModal';
import RecentGainsTicker from '../components/RecentGainsTicker';

const BugDeriv = () => {
    const navigate = useNavigate();
    const { isConnected, account } = useDeriv();
    const {
        isRunning,
        stats,
        logs,
        lastDigits,
        frictionStatus,
        lastAnalyzedDigit,
        sequenceType,
        tickDirection,
        codeStream,
        frictionConfig,
        startBot,
        stopBot,
    } = useBugDeriv();

    // Estados de configuración guardados en localStorage
    const [stake, setStake] = useState<string>(() => localStorage.getItem('bugderiv_stake') || '0.35');
    const [stopLoss, setStopLoss] = useState<string>(() => localStorage.getItem('bugderiv_stoploss') || '10.00');
    const [takeProfit, setTakeProfit] = useState<string>(() => localStorage.getItem('bugderiv_takeprofit') || '5.00');
    const [useMartingale, setUseMartingale] = useState<boolean>(() => localStorage.getItem('bugderiv_martingale') !== 'false');

    const logsEndRef = useRef<HTMLDivElement>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // Freemium limiter
    const { isFree, checkStakeLimit, isLimitReached, currentProfit } = useFreemiumLimiter();
    const [showLimitModal, setShowLimitModal] = useState(false);

    // Check if profit limit reached and show modal
    useEffect(() => {
        if (isLimitReached && isRunning) {
            stopBot();
            setShowLimitModal(true);
            toast.warning('¡Meta diaria alcanzada! Bot detenido.');
        }
    }, [isLimitReached, isRunning, stopBot]);

    // Guardar config en localStorage
    useEffect(() => {
        localStorage.setItem('bugderiv_stake', stake);
        localStorage.setItem('bugderiv_stoploss', stopLoss);
        localStorage.setItem('bugderiv_takeprofit', takeProfit);
        localStorage.setItem('bugderiv_martingale', String(useMartingale));
    }, [stake, stopLoss, takeProfit, useMartingale]);

    // Smart scroll - only auto-scroll if user is near bottom
    useEffect(() => {
        const container = logsContainerRef.current;
        if (!container) return;

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }, [logs]);

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Digital Friction desactivado');
        } else {
            if (!isConnected) {
                toast.error('Primero debe conectar su cuenta Deriv');
                return;
            }

            const stakeVal = parseFloat(stake);
            const stopLossVal = parseFloat(stopLoss);
            const takeProfitVal = parseFloat(takeProfit);

            if (isNaN(stakeVal) || stakeVal <= 0) {
                toast.error('Stake inválido');
                return;
            }

            // Freemium stake validation
            const stakeCheck = checkStakeLimit(stakeVal);
            if (!stakeCheck.allowed) {
                toast.error(stakeCheck.message);
                return;
            }

            const success = startBot({
                stake: stakeVal,
                stopLoss: stopLossVal,
                takeProfit: takeProfitVal,
                useMartingale,
            });

            if (success) {
                toast.success('¡Digital Friction activado!');
            }
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={14} className="text-emerald-400" />;
            case 'error': return <XCircle size={14} className="text-rose-400" />;
            case 'warning': return <AlertCircle size={14} className="text-amber-400" />;
            case 'friction': return <Zap size={14} className="text-cyan-400" />;
            case 'blocked': return <Ban size={14} className="text-rose-400" />;
            case 'entry': return <Sparkles size={14} className="text-emerald-400" />;
            case 'trend': return <TrendingDown size={14} className="text-orange-400" />;
            default: return <ArrowRight size={14} className="text-cyan-400/70" />;
        }
    };

    const winRate = stats.wins + stats.losses > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : '0.0';

    // Friction efficiency
    const totalAnalyzed = stats.entriesFiltered + stats.entriesExecuted;
    const filterRate = totalAnalyzed > 0
        ? ((stats.entriesFiltered / totalAnalyzed) * 100).toFixed(0)
        : '0';

    // Hacker Code Stream Component
    const HackerStream = () => (
        <div className="font-mono text-[10px] leading-tight overflow-hidden h-32 bg-black/60 rounded-xl p-3 border border-cyan-500/10">
            <div className="flex flex-col-reverse gap-0.5">
                {codeStream.slice(-12).map((code, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "transition-all duration-300",
                            idx === codeStream.length - 1 ? "text-cyan-400" : "text-cyan-700"
                        )}
                        style={{ opacity: 0.3 + (idx / 12) * 0.7 }}
                    >
                        {code}
                    </div>
                ))}
                {codeStream.length === 0 && (
                    <span className="text-white/20">// WAITING_FOR_DATA...</span>
                )}
            </div>
        </div>
    );

    // Digit Stream with friction indicators
    const DigitStream = () => (
        <div className="flex items-center gap-1 overflow-hidden py-2">
            {lastDigits.slice(-20).map((digit, idx) => {
                const isLast = idx === lastDigits.slice(-20).length - 1;
                const isSecondLast = idx === lastDigits.slice(-20).length - 2;
                const isEven = digit % 2 === 0;

                // Check if this digit is part of active sequence
                const isInSequence = (isLast || isSecondLast) && sequenceType !== null;

                // Check if high friction digit
                const isHighFriction = isLast && (
                    (isEven && frictionConfig.HIGH_FRICTION_EVEN.includes(digit)) ||
                    (!isEven && frictionConfig.HIGH_FRICTION_ODD.includes(digit))
                );

                return (
                    <div
                        key={idx}
                        className={cn(
                            "relative w-7 h-7 flex items-center justify-center font-mono text-xs rounded transition-all duration-200",
                            isHighFriction && isInSequence
                                ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 scale-110"
                                : isInSequence
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                                    : isLast
                                        ? "bg-white/10 text-white/80 border border-white/10"
                                        : "text-white/30"
                        )}
                        style={{ opacity: 0.4 + (idx / 25) * 0.6 }}
                    >
                        {digit}
                        {/* Even/Odd indicator */}
                        <span className={cn(
                            "absolute -bottom-1 text-[7px] font-bold",
                            isEven ? "text-cyan-500" : "text-rose-400"
                        )}>
                            {isEven ? 'P' : 'I'}
                        </span>
                    </div>
                );
            })}
            {lastDigits.length === 0 && (
                <span className="text-xs text-white/20 font-mono">// ESPERANDO_TICKS...</span>
            )}
        </div>
    );

    // Friction Status Indicator
    const FrictionIndicator = () => {
        const statusConfig = {
            waiting: { color: 'text-white/40', bg: 'bg-white/5', label: 'ESCANEANDO' },
            analyzing: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'ANALIZANDO' },
            blocked: { color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'BLOQUEADO' },
            entering: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'ENTRANDO' },
        };

        const config = statusConfig[frictionStatus];

        return (
            <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all",
                config.bg,
                frictionStatus === 'entering' ? "border-emerald-500/30" :
                    frictionStatus === 'blocked' ? "border-rose-500/30" :
                        frictionStatus === 'analyzing' ? "border-cyan-500/30" :
                            "border-white/10"
            )}>
                {frictionStatus === 'entering' && <Zap size={14} className="text-emerald-400 animate-pulse" />}
                {frictionStatus === 'blocked' && <Ban size={14} className="text-rose-400" />}
                {frictionStatus === 'analyzing' && <Activity size={14} className="text-cyan-400 animate-pulse" />}
                {frictionStatus === 'waiting' && <Terminal size={14} className="text-white/40" />}

                <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.color)}>
                    {config.label}
                </span>

                {lastAnalyzedDigit !== null && frictionStatus !== 'waiting' && (
                    <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold",
                        frictionStatus === 'entering' ? "bg-emerald-500/20 text-emerald-400" :
                            frictionStatus === 'blocked' ? "bg-rose-500/20 text-rose-400" :
                                "bg-cyan-500/20 text-cyan-400"
                    )}>
                        [{lastAnalyzedDigit}]
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#080a0f] via-[#0a0d14] to-[#080a0f] p-4 md:p-6">
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-20 left-1/3 w-[500px] h-[300px] bg-cyan-500/[0.015] rounded-full blur-[120px]" />
                <div className="absolute bottom-20 right-1/4 w-[400px] h-[250px] bg-cyan-600/[0.01] rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto space-y-5">
                {/* Recent Gains Ticker */}
                <RecentGainsTicker className="mb-4 -mx-4 md:-mx-6" />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:border-cyan-500/20 transition-all"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        {/* Logo */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-xl" />
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                <Bug className="text-white drop-shadow" size={22} />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                                    Bug Deriv
                                </h1>
                                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 text-cyan-400 border border-cyan-500/20 rounded">
                                    Friction
                                </span>
                            </div>
                            <p className="text-xs text-white/40 font-mono">DIGITAL_FRICTION_PROTOCOL</p>
                        </div>
                    </div>

                    {/* Status Pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <FrictionIndicator />

                        {/* Vector Indicator */}
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                            tickDirection === 'green'
                                ? "bg-emerald-500/10 border-emerald-500/20"
                                : tickDirection === 'red'
                                    ? "bg-rose-500/10 border-rose-500/20"
                                    : "bg-white/[0.02] border-white/[0.08]"
                        )}>
                            {tickDirection === 'green' && <TrendingUp size={14} className="text-emerald-400" />}
                            {tickDirection === 'red' && <TrendingDown size={14} className="text-rose-400" />}
                            {tickDirection === 'neutral' && <Activity size={14} className="text-white/40" />}
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                tickDirection === 'green' ? "text-emerald-400" :
                                    tickDirection === 'red' ? "text-rose-400" :
                                        "text-white/40"
                            )}>
                                {tickDirection === 'green' ? '↑ SUBIDA' : tickDirection === 'red' ? '↓ QUEDA' : '— NEUTRO'}
                            </span>
                        </div>

                        {/* Connection */}
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border",
                            isConnected ? "bg-white/[0.02] border-white/[0.08]" : "bg-rose-500/5 border-rose-500/20"
                        )}>
                            {isConnected ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-rose-400" />}
                            <span className="text-[10px] font-mono text-white/60">
                                {isConnected ? account?.loginid : 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Scanner Panel - Hacker Style */}
                <div className="relative rounded-2xl bg-white/[0.015] border border-cyan-500/20 overflow-hidden">
                    {/* Top gradient accent */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

                    {/* Scan effect when running */}
                    {isRunning && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div
                                className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
                                style={{ animation: 'scanLine 2s ease-in-out infinite' }}
                            />
                        </div>
                    )}

                    <div className="p-5 md:p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Left: Code Stream */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Terminal size={14} className="text-cyan-400" />
                                    <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest">SCANNER_OUTPUT</span>
                                    {isRunning && (
                                        <span className="flex items-center gap-1 ml-auto">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                            <span className="text-[9px] text-cyan-400/50 font-mono">LIVE</span>
                                        </span>
                                    )}
                                </div>
                                <HackerStream />
                            </div>

                            {/* Right: Friction Filter Info */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter size={14} className="text-cyan-400" />
                                    <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest">FILTRO_FRICCIÓN</span>
                                </div>
                                <div className="bg-black/40 rounded-xl p-4 border border-cyan-500/10 space-y-3">
                                    {/* High Friction Digits */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-emerald-400/70 uppercase">Alta Fricción (Entrada)</span>
                                        <div className="flex gap-1">
                                            {[...frictionConfig.HIGH_FRICTION_EVEN, ...frictionConfig.HIGH_FRICTION_ODD].map(d => (
                                                <span key={d} className="w-6 h-6 flex items-center justify-center rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sticky Digits */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-rose-400/70 uppercase">Pegajosos (Bloqueado)</span>
                                        <div className="flex gap-1">
                                            {[...frictionConfig.STICKY_EVEN, ...frictionConfig.STICKY_ODD].map(d => (
                                                <span key={d} className="w-6 h-6 flex items-center justify-center rounded bg-rose-500/10 text-rose-400/60 text-xs font-mono border border-rose-500/20">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/5" />

                                    {/* Sequence Type */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-white/40 uppercase">Secuencia Detectada</span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                                            sequenceType === 'even' ? "bg-cyan-500/20 text-cyan-400" :
                                                sequenceType === 'odd' ? "bg-rose-500/20 text-rose-400" :
                                                    "bg-white/5 text-white/30"
                                        )}>
                                            {sequenceType === 'even' ? 'PAR + PAR' : sequenceType === 'odd' ? 'ÍMPAR + ÍMPAR' : 'NINGUNA'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Digit Stream */}
                        <div className="mt-5 bg-black/30 rounded-xl p-3 border border-white/[0.05]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[9px] text-cyan-400/60 uppercase tracking-widest font-mono">TICK_STREAM</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-transparent" />
                                <span className="text-[9px] text-white/20 font-mono">{lastDigits.length} TICKS</span>
                            </div>
                            <DigitStream />
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                </div>

                <div className="grid grid-cols-12 gap-5">
                    {/* Left Panel - Config */}
                    <div className="col-span-12 lg:col-span-3 space-y-4">
                        {/* Config Card */}
                        <div className="bg-white/[0.015] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1/2 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />

                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
                                    <Settings2 size={16} className="text-white/60" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-white">Configuración</h3>
                                    <p className="text-[10px] text-white/40">Parámetros</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Stake */}
                                <div>
                                    <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block font-medium">
                                        Stake Inicial
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/60 font-mono text-sm">$</span>
                                        <input
                                            type="number"
                                            value={stake}
                                            onChange={(e) => setStake(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full pl-7 pr-3 py-2.5 bg-black/30 border border-white/[0.08] rounded-lg text-white font-mono focus:border-cyan-500/40 focus:outline-none transition-colors disabled:opacity-50"
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                {/* SL / TP */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-rose-400/60 uppercase tracking-wider mb-1.5 block font-medium">
                                            Stop Loss
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400/60 font-mono text-xs">$</span>
                                            <input
                                                type="number"
                                                value={stopLoss}
                                                onChange={(e) => setStopLoss(e.target.value)}
                                                disabled={isRunning}
                                                className="w-full pl-6 pr-2 py-2 bg-rose-500/5 border border-rose-500/20 rounded-lg text-rose-400 font-mono text-sm focus:border-rose-400/40 focus:outline-none transition-colors disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-emerald-400/60 uppercase tracking-wider mb-1.5 block font-medium">
                                            Take Profit
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-400/60 font-mono text-xs">$</span>
                                            <input
                                                type="number"
                                                value={takeProfit}
                                                onChange={(e) => setTakeProfit(e.target.value)}
                                                disabled={isRunning}
                                                className="w-full pl-6 pr-2 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-emerald-400 font-mono text-sm focus:border-emerald-400/40 focus:outline-none transition-colors disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Martingale */}
                                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-white/60 uppercase tracking-wider font-medium block">Martingale</span>
                                            <span className="text-[9px] text-cyan-400/50 font-mono">2.0x | Max 4</span>
                                        </div>
                                        <button
                                            onClick={() => setUseMartingale(!useMartingale)}
                                            disabled={isRunning}
                                            className={cn(
                                                "relative w-10 h-5 rounded-full transition-colors disabled:opacity-50",
                                                useMartingale ? "bg-gradient-to-r from-cyan-500/40 to-cyan-600/40" : "bg-white/10"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow",
                                                useMartingale ? "left-5" : "left-0.5"
                                            )} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Control Button */}
                        <button
                            onClick={handleToggleBot}
                            disabled={!isConnected}
                            className={cn(
                                "w-full py-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group",
                                isRunning
                                    ? "bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                    : "bg-gradient-to-r from-cyan-500 via-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/35"
                            )}
                        >
                            {!isRunning && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
                            )}
                            {isRunning ? (
                                <>
                                    <Square fill="currentColor" size={16} />
                                    <span>DETENER</span>
                                </>
                            ) : (
                                <>
                                    <Power size={18} className="drop-shadow" />
                                    <span>ENCENDER BUG</span>
                                </>
                            )}
                        </button>

                        {/* Freemium Progress Bar - only for free users */}
                        {isFree && (
                            <FreemiumProgressBar currentProfit={currentProfit} />
                        )}

                        {/* Info */}
                        <div className="bg-white/[0.015] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl" />
                            <div className="relative flex items-start gap-3">
                                <Shield size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-medium text-white mb-1">Fricción Digital</h4>
                                    <p className="text-[11px] text-white/40 leading-relaxed">
                                        Opera en dígitos de alta repulsión [6,8,1,3]. Bloquea pegajosos [0,2,4,5,7,9].
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Stats & Logs */}
                    <div className="col-span-12 lg:col-span-9 space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            {/* Total Profit */}
                            <div className="col-span-2 bg-white/[0.015] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/30 via-cyan-500/10 to-transparent" />
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 size={16} className="text-cyan-400/60" />
                                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Resultado</span>
                                </div>
                                <div className={cn(
                                    "text-3xl font-bold font-mono",
                                    stats.totalProfit > 0 ? "text-emerald-400" :
                                        stats.totalProfit < 0 ? "text-rose-400" :
                                            "text-white/60"
                                )}>
                                    {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                                    <span className="text-sm ml-1 text-white/40">USD</span>
                                </div>
                            </div>

                            {/* Wins */}
                            <div className="bg-white/[0.015] border-l-2 border-l-emerald-500/50 border-y border-r border-white/[0.08] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp size={14} className="text-emerald-400" />
                                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Wins</span>
                                </div>
                                <div className="text-2xl font-bold font-mono text-emerald-400">{stats.wins}</div>
                            </div>

                            {/* Losses */}
                            <div className="bg-white/[0.015] border-l-2 border-l-rose-500/50 border-y border-r border-white/[0.08] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown size={14} className="text-rose-400" />
                                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Losses</span>
                                </div>
                                <div className="text-2xl font-bold font-mono text-rose-400">{stats.losses}</div>
                            </div>

                            {/* Win Rate */}
                            <div className="bg-white/[0.015] border border-white/[0.08] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target size={14} className="text-white/40" />
                                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Rate</span>
                                </div>
                                <div className="text-2xl font-bold font-mono text-white/80">
                                    {winRate}<span className="text-sm text-white/40">%</span>
                                </div>
                            </div>

                            {/* Filtered */}
                            <div className="bg-white/[0.015] border-l-2 border-l-rose-500/30 border-y border-r border-white/[0.08] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Ban size={14} className="text-rose-400/60" />
                                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Pegajosos</span>
                                </div>
                                <div className="text-xl font-bold font-mono text-rose-400/80">
                                    {stats.entriesFiltered}
                                </div>
                            </div>

                            {/* Trend Blocked */}
                            <div className="bg-white/[0.015] border-l-2 border-l-orange-500/30 border-y border-r border-white/[0.08] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown size={14} className="text-orange-400/60" />
                                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Tendencia</span>
                                </div>
                                <div className="text-xl font-bold font-mono text-orange-400/80">
                                    {stats.trendBlocked}
                                </div>
                            </div>

                            {/* Executed */}
                            <div className="bg-white/[0.015] border-l-2 border-l-emerald-500/30 border-y border-r border-white/[0.08] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={14} className="text-emerald-400/60" />
                                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Ejecutadas</span>
                                </div>
                                <div className="text-xl font-bold font-mono text-emerald-400/80">
                                    {stats.entriesExecuted}
                                </div>
                            </div>
                        </div>

                        {/* Activity Log */}
                        <div className="bg-white/[0.015] border border-white/[0.08] rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Activity size={16} className="text-white/40" />
                                    <span className="text-sm font-medium text-white">Terminal</span>
                                </div>
                                <span className="text-[10px] text-cyan-400/50 font-mono">{logs.length} eventos</span>
                            </div>

                            <div ref={logsContainerRef} className="h-[280px] overflow-y-auto">
                                {logs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center p-8">
                                        <Terminal size={24} className="text-white/20 mb-2" />
                                        <p className="text-white/30 text-sm font-mono">// ESPERANDO_ACTIVIDAD...</p>
                                    </div>
                                ) : (
                                    <div className="p-3 space-y-1">
                                        {logs.map((log) => (
                                            <div
                                                key={log.id}
                                                className={cn(
                                                    "flex items-start gap-2.5 p-2 rounded-lg transition-all font-mono text-xs",
                                                    log.type === 'friction' && "bg-cyan-500/5 border-l-2 border-l-cyan-500/50",
                                                    log.type === 'entry' && "bg-emerald-500/5 border-l-2 border-l-emerald-500/50",
                                                    log.type === 'blocked' && "bg-rose-500/5 border-l-2 border-l-rose-500/50",
                                                    log.type === 'success' && "border-l-2 border-l-emerald-500/50",
                                                    log.type === 'error' && "border-l-2 border-l-rose-500/50",
                                                    log.type === 'warning' && "border-l-2 border-l-amber-500/50",
                                                    log.type === 'info' && "border-l-2 border-l-white/10"
                                                )}
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {getLogIcon(log.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[9px] text-white/30 block mb-0.5">
                                                        {log.time}
                                                    </span>
                                                    <p className="text-white/70 leading-relaxed">
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

            {/* CSS Animations */}
            <style>{`
                @keyframes scanLine {
                    0%, 100% { top: 0%; opacity: 0; }
                    5% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                    95% { opacity: 0.6; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>

            {/* System Limit Modal */}
            <SystemLimitModal
                isOpen={showLimitModal}
                limitAmount={currentProfit}
                onClose={() => setShowLimitModal(false)}
            />
        </div>
    );
};

export default BugDeriv;
