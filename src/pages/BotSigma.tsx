import React, { useState, useRef, useEffect } from 'react';
import {
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
    Play,
    Square,
    Settings2,
    Power,
    ArrowLeft,
    Wifi,
    WifiOff,
    RefreshCw,
    Circle,
    ShieldAlert,
    Bug,
    Gauge,
    Filter,
    AlertTriangle,
    Shield,
    Sparkles,
    Radio,
    Terminal,
    Code,
    Cpu,
    Database
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useBotSigma } from '../hooks/useBotSigma';
import { useDeriv } from '../contexts/DerivContext';
import { useNavigate } from 'react-router-dom';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
import { FreemiumProgressBar } from '../components/FreemiumProgressBar';
import { SystemLimitModal } from '../components/SystemLimitModal';
import RecentGainsTicker from '../components/RecentGainsTicker';
import { motion, AnimatePresence } from 'framer-motion';

const BotSigma = () => {
    const navigate = useNavigate();
    const { isConnected, account } = useDeriv();
    const {
        isRunning,
        stats,
        logs,
        saturationPercent,
        dominantSide,
        semaphore,
        consecutiveCount,
        lastSequence,
        filterStatus,
        startBot,
        stopBot,
    } = useBotSigma();

    const [stake, setStake] = useState<string>(() => localStorage.getItem('sigma_stake') || '0.35');
    const [stopLoss, setStopLoss] = useState<string>(() => localStorage.getItem('sigma_stoploss') || '50.00');
    const [takeProfit, setTakeProfit] = useState<string>(() => localStorage.getItem('sigma_takeprofit') || '20.00');
    const [useMartingale, setUseMartingale] = useState<boolean>(() => localStorage.getItem('sigma_martingale') !== 'false');

    const logsContainerRef = useRef<HTMLDivElement>(null);

    const { isFree, checkStakeLimit, isLimitReached, currentProfit } = useFreemiumLimiter();
    const [showLimitModal, setShowLimitModal] = useState(false);

    useEffect(() => {
        if (isLimitReached && isRunning) {
            stopBot();
            setShowLimitModal(true);
            toast.warning('¡Límite diario alcanzado!');
        }
    }, [isLimitReached, isRunning, stopBot]);

    useEffect(() => {
        localStorage.setItem('sigma_stake', stake);
        localStorage.setItem('sigma_stoploss', stopLoss);
        localStorage.setItem('sigma_takeprofit', takeProfit);
        localStorage.setItem('sigma_martingale', String(useMartingale));
    }, [stake, stopLoss, takeProfit, useMartingale]);

    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = 0;
        }
    }, [logs]);

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Bot Sigma Detenido');
        } else {
            if (!isConnected) {
                toast.error('Conexión requerida', { description: 'Conecte su cuenta Deriv primero' });
                return;
            }

            const stakeVal = parseFloat(stake);
            if (isNaN(stakeVal) || stakeVal <= 0) {
                toast.error('Stake inválido');
                return;
            }

            if (isFree && !checkStakeLimit(stakeVal)) {
                toast.error('Stake máximo $0.35 en modo gratuito');
                return;
            }

            startBot({
                stake: stakeVal,
                stopLoss: parseFloat(stopLoss) || 50,
                takeProfit: parseFloat(takeProfit) || 20,
                useMartingale,
            });
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={13} className="text-emerald-400" />;
            case 'error': return <XCircle size={13} className="text-rose-400" />;
            case 'warning': return <AlertCircle size={13} className="text-amber-400" />;
            case 'even': return <Circle size={13} className="text-cyan-400" fill="currentColor" />;
            case 'odd': return <Circle size={13} className="text-violet-400" />;
            case 'blocked': return <ShieldAlert size={13} className="text-orange-400" />;
            case 'filter': return <Filter size={13} className="text-rose-400" />;
            default: return <Terminal size={13} className="text-slate-500" />;
        }
    };

    // --- SATURATION GAUGE (Hacker Style) ---
    const SaturationGauge = () => {
        const evenPercent = dominantSide === 'even' ? saturationPercent : 100 - saturationPercent;
        const oddPercent = 100 - evenPercent;
        const isSaturated = saturationPercent >= 55;

        return (
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        <Database size={12} className="inline mr-1.5" />
                        Saturación 100 Ticks
                    </span>
                    <span className={cn(
                        "text-2xl font-mono font-bold",
                        isSaturated ? "text-purple-400" : "text-slate-400"
                    )}>
                        {saturationPercent.toFixed(1)}%
                    </span>
                </div>

                {/* Main Progress Bar */}
                <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
                    {/* Zone Backgrounds */}
                    <div className="absolute inset-0 flex">
                        <div className="w-[45%] bg-cyan-900/30" />
                        <div className="w-[10%] bg-slate-700/30" />
                        <div className="flex-1 bg-violet-900/30" />
                    </div>

                    {/* Needle */}
                    <div
                        className={cn(
                            "absolute top-0 bottom-0 w-1.5 rounded-full shadow-lg transition-all duration-300 z-10",
                            isSaturated ? "bg-purple-400 shadow-purple-500/50" : "bg-slate-400"
                        )}
                        style={{ left: `calc(${saturationPercent}% - 3px)` }}
                    />

                    {/* Threshold Lines */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-slate-500/50" style={{ left: '45%' }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500/50" style={{ left: '55%' }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-purple-500/50" style={{ left: '60%' }} />
                </div>

                <div className="flex justify-between mt-2 text-[9px] font-mono">
                    <span className="text-cyan-400/60">PAR {evenPercent.toFixed(0)}%</span>
                    <span className="text-amber-400/60">55%</span>
                    <span className="text-violet-400/60">IMPAR {oddPercent.toFixed(0)}%</span>
                </div>
            </div>
        );
    };

    // --- SEMAPHORE DISPLAY (Hacker Style) ---
    const SemaphoreDisplay = () => (
        <div className="bg-black/40 rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    <Cpu size={12} className="inline mr-1.5" />
                    Trigger de Exaustão
                </span>
                {semaphore === 'green' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 animate-pulse">
                        🎯 ENTRADA
                    </span>
                )}
            </div>

            {/* Sequence Display */}
            <div className="flex items-center gap-3">
                {/* Traffic Light */}
                <div className="flex flex-col items-center gap-1.5 p-3 bg-slate-900/50 rounded-lg border border-white/5">
                    <motion.div
                        className={cn("w-5 h-5 rounded-full border-2",
                            semaphore === 'red' ? 'bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/50' : 'bg-rose-500/10 border-rose-500/20'
                        )}
                        animate={{ scale: semaphore === 'red' ? [1, 1.15, 1] : 1 }}
                        transition={{ repeat: semaphore === 'red' ? Infinity : 0, duration: 0.6 }}
                    />
                    <motion.div
                        className={cn("w-5 h-5 rounded-full border-2",
                            semaphore === 'yellow' ? 'bg-amber-500 border-amber-400 shadow-lg shadow-amber-500/50' : 'bg-amber-500/10 border-amber-500/20'
                        )}
                        animate={{ scale: semaphore === 'yellow' ? [1, 1.15, 1] : 1 }}
                        transition={{ repeat: semaphore === 'yellow' ? Infinity : 0, duration: 0.6 }}
                    />
                    <motion.div
                        className={cn("w-5 h-5 rounded-full border-2",
                            semaphore === 'green' ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/50' : 'bg-emerald-500/10 border-emerald-500/20'
                        )}
                        animate={{ scale: semaphore === 'green' ? [1, 1.15, 1] : 1 }}
                        transition={{ repeat: semaphore === 'green' ? Infinity : 0, duration: 0.6 }}
                    />
                </div>

                {/* Sequence Boxes */}
                <div className="flex-1">
                    <div className="text-[9px] text-slate-500 mb-2 font-mono">Secuencia: {consecutiveCount}/4</div>
                    <div className="flex gap-2">
                        {lastSequence.map((p, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold font-mono border-2 transition-all",
                                    p === 'even'
                                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                                        : "bg-violet-500/20 border-violet-500/50 text-violet-400"
                                )}
                            >
                                {p === 'even' ? 'P' : 'I'}
                            </motion.div>
                        ))}
                        {Array(4 - lastSequence.length).fill(0).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="w-10 h-10 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center"
                            >
                                <Code size={14} className="text-white/10" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Badge */}
                <div className={cn(
                    "px-3 py-2 rounded-lg text-xs font-bold font-mono",
                    semaphore === 'green' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        semaphore === 'yellow' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                            semaphore === 'red' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                                "bg-slate-800 text-slate-400 border border-white/5"
                )}>
                    {semaphore === 'green' ? '🟢 GO' :
                        semaphore === 'yellow' ? '🟡 WAIT' :
                            semaphore === 'red' ? '🔴 STOP' : '⚪ IDLE'}
                </div>
            </div>
        </div>
    );

    // --- FILTERS PANEL (Hacker Style) ---
    const FiltersPanel = () => (
        <div className="bg-black/40 rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-purple-400" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Filtros de Seguridad</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Edge Filter */}
                <div className={cn(
                    "p-3 rounded-lg border flex items-center gap-3",
                    filterStatus.edge.passed
                        ? "bg-emerald-950/30 border-emerald-500/20"
                        : "bg-rose-950/30 border-rose-500/20"
                )}>
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        filterStatus.edge.passed ? "bg-emerald-500/20" : "bg-rose-500/20"
                    )}>
                        <Bug size={16} className={filterStatus.edge.passed ? "text-emerald-400" : "text-rose-400"} />
                    </div>
                    <div>
                        <div className="text-[10px] font-mono font-bold text-slate-300">BORDA</div>
                        <div className={cn(
                            "text-[9px] font-mono",
                            filterStatus.edge.passed ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {filterStatus.edge.passed ? '✓ Limpio' : '✗ 0/9 detect'}
                        </div>
                    </div>
                </div>

                {/* HFT Filter */}
                <div className={cn(
                    "p-3 rounded-lg border flex items-center gap-3",
                    filterStatus.hft.passed
                        ? "bg-emerald-950/30 border-emerald-500/20"
                        : "bg-rose-950/30 border-rose-500/20"
                )}>
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        filterStatus.hft.passed ? "bg-emerald-500/20" : "bg-rose-500/20"
                    )}>
                        <Zap size={16} className={filterStatus.hft.passed ? "text-emerald-400" : "text-rose-400"} />
                    </div>
                    <div>
                        <div className="text-[10px] font-mono font-bold text-slate-300">HFT</div>
                        <div className={cn(
                            "text-[9px] font-mono",
                            filterStatus.hft.passed ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {filterStatus.hft.passed ? '✓ Normal' : '✗ >70% switch'}
                        </div>
                    </div>
                </div>

                {/* Friction Filter */}
                <div className={cn(
                    "p-3 rounded-lg border flex items-center gap-3",
                    filterStatus.friction.passed
                        ? "bg-emerald-950/30 border-emerald-500/20"
                        : "bg-rose-950/30 border-rose-500/20"
                )}>
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        filterStatus.friction.passed ? "bg-emerald-500/20" : "bg-rose-500/20"
                    )}>
                        <Activity size={16} className={filterStatus.friction.passed ? "text-emerald-400" : "text-rose-400"} />
                    </div>
                    <div>
                        <div className="text-[10px] font-mono font-bold text-slate-300">FRICCIÓN</div>
                        <div className={cn(
                            "text-[9px] font-mono",
                            filterStatus.friction.passed ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {filterStatus.friction.passed ? '✓ Homogéneo' : '✗ Interrupt'}
                        </div>
                    </div>
                </div>

                {/* Trend Filter */}
                <div className={cn(
                    "p-3 rounded-lg border flex items-center gap-3",
                    filterStatus.trend.passed
                        ? "bg-emerald-950/30 border-emerald-500/20"
                        : "bg-rose-950/30 border-rose-500/20"
                )}>
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        filterStatus.trend.passed ? "bg-emerald-500/20" : "bg-rose-500/20"
                    )}>
                        <TrendingUp size={16} className={filterStatus.trend.passed ? "text-emerald-400" : "text-rose-400"} />
                    </div>
                    <div>
                        <div className="text-[10px] font-mono font-bold text-slate-300">TREND</div>
                        <div className={cn(
                            "text-[9px] font-mono",
                            filterStatus.trend.passed ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {filterStatus.trend.passed ? '✓ Estable' : '✗ >70% sat'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#080a0e] text-slate-200">
            {/* Hacker Grid Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-0 left-0 w-full h-[300px] bg-purple-600/5 blur-[120px]" />
            </div>

            <div className="relative z-10 p-4 md:p-6 max-w-7xl mx-auto space-y-5">
                <RecentGainsTicker />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-slate-400" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <span className="text-xl">🎰</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    Bot Sigma
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest">
                                        LGN
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 font-mono">Ley Grandes Números | 100 ticks</p>
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono",
                        isConnected ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" : "bg-rose-950/30 border-rose-500/30 text-rose-400"
                    )}>
                        {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {isConnected ? "LINKED" : "OFFLINE"}
                    </div>
                </div>

                {/* Freemium Bar */}
                {isFree && <FreemiumProgressBar currentProfit={currentProfit} />}

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                    {/* Left: Controls */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-5 text-purple-400">
                                <Settings2 size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Parámetros</span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">Stake</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            value={stake}
                                            onChange={(e) => setStake(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-6 pr-3 text-sm font-mono focus:border-purple-500/50 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">TP</label>
                                        <input
                                            type="number"
                                            value={takeProfit}
                                            onChange={(e) => setTakeProfit(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-emerald-400 focus:border-emerald-500/50 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">SL</label>
                                        <input
                                            type="number"
                                            value={stopLoss}
                                            onChange={(e) => setStopLoss(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-rose-400 focus:border-rose-500/50 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <div>
                                        <span className="text-xs font-medium text-slate-200 block">Martingale</span>
                                        <span className="text-[9px] text-slate-500">x2.1 por pérdida</span>
                                    </div>
                                    <button
                                        onClick={() => setUseMartingale(!useMartingale)}
                                        disabled={isRunning}
                                        className={cn(
                                            "relative w-11 h-6 rounded-full transition-colors",
                                            useMartingale ? "bg-purple-500" : "bg-slate-700"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all",
                                            useMartingale ? "left-5" : "left-0.5"
                                        )} />
                                    </button>
                                </div>
                            </div>

                            {/* Start Button */}
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleToggleBot}
                                className={cn(
                                    "w-full mt-5 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2.5 text-sm uppercase tracking-wider",
                                    isRunning
                                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                        : "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 transition-shadow"
                                )}
                            >
                                {isRunning ? (
                                    <>
                                        <Square size={16} />
                                        Detener
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} />
                                        Iniciar
                                    </>
                                )}
                            </motion.button>
                        </div>

                        {/* Stats */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4 text-slate-400">
                                <BarChart3 size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Stats</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase">Wins</div>
                                    <div className="text-xl font-mono font-bold text-emerald-400">{stats.wins}</div>
                                </div>
                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase">Loss</div>
                                    <div className="text-xl font-mono font-bold text-rose-400">{stats.losses}</div>
                                </div>
                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase">Lucro</div>
                                    <div className={cn(
                                        "text-xl font-mono font-bold",
                                        stats.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        ${stats.totalProfit.toFixed(2)}
                                    </div>
                                </div>
                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase">Blocked</div>
                                    <div className="text-xl font-mono font-bold text-orange-400">{stats.signalsBlocked}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center: Analysis */}
                    <div className="lg:col-span-5 space-y-4">
                        <SaturationGauge />
                        <SemaphoreDisplay />
                        <FiltersPanel />
                    </div>

                    {/* Right: Logs */}
                    <div className="lg:col-span-4">
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5 h-full">
                            <div className="flex items-center gap-2 mb-4">
                                <Terminal size={16} className="text-purple-400" />
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Log</span>
                                <span className="ml-auto text-[9px] font-mono text-slate-600">{logs.length} entries</span>
                            </div>

                            <div ref={logsContainerRef} className="h-[400px] overflow-y-auto space-y-1.5 scrollbar-thin">
                                {logs.length === 0 ? (
                                    <div className="text-center text-slate-600 text-xs py-12 font-mono">
                                        &gt;&gt; AWAITING SIGNAL...
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-2 py-1.5 px-2 rounded bg-black/30 text-[11px] font-mono border border-white/5"
                                        >
                                            {getLogIcon(log.type)}
                                            <span className="text-slate-600">{log.time}</span>
                                            <span className="text-slate-300 flex-1">{log.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Limit Modal */}
            {showLimitModal && (
                <SystemLimitModal onClose={() => setShowLimitModal(false)} />
            )}
        </div>
    );
};

export default BotSigma;
