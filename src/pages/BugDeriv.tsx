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
    Search,
    Play,
    Square,
    Settings2,
    Power,
    ArrowLeft,
    Wifi,
    WifiOff,
    RefreshCw,
    Train,
    Hand,
    Repeat,
    Circle,
    ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useBugDeriv } from '../hooks/useBugDeriv';
import { useDeriv } from '../contexts/DerivContext';
import { useNavigate } from 'react-router-dom';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
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
        switchRate,
        currentMode,
        snapbackPattern,
        lastParity,
        isReanalyzing,
        chameleonConfig,
        startBot,
        stopBot,
    } = useBugDeriv();

    const [stake, setStake] = useState<string>(() => localStorage.getItem('bugderiv_stake') || '1.00');
    const [stopLoss, setStopLoss] = useState<string>(() => localStorage.getItem('bugderiv_stoploss') || '50.00');
    const [takeProfit, setTakeProfit] = useState<string>(() => localStorage.getItem('bugderiv_takeprofit') || '20.00');
    const [useMartingale, setUseMartingale] = useState<boolean>(() => localStorage.getItem('bugderiv_martingale') !== 'false');

    const logsContainerRef = useRef<HTMLDivElement>(null);

    const { isFree, checkStakeLimit, isLimitReached, currentProfit } = useFreemiumLimiter();
    const [showLimitModal, setShowLimitModal] = useState(false);

    useEffect(() => {
        if (isLimitReached && isRunning) {
            stopBot();
            setShowLimitModal(true);
            toast.warning('Daily limit reached!');
        }
    }, [isLimitReached, isRunning, stopBot]);

    useEffect(() => {
        localStorage.setItem('bugderiv_stake', stake);
        localStorage.setItem('bugderiv_stoploss', stopLoss);
        localStorage.setItem('bugderiv_takeprofit', takeProfit);
        localStorage.setItem('bugderiv_martingale', String(useMartingale));
    }, [stake, stopLoss, takeProfit, useMartingale]);

    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Protocolo Encerrado');
        } else {
            if (!isConnected) {
                toast.error('Conecte sua conta Deriv primeiro');
                return;
            }

            const stakeVal = parseFloat(stake);
            if (isNaN(stakeVal) || stakeVal <= 0) {
                toast.error('Stake inválido');
                return;
            }

            const check = checkStakeLimit(stakeVal);
            if (!check.allowed) {
                toast.error(check.message);
                return;
            }

            const success = startBot({
                stake: stakeVal,
                stopLoss: parseFloat(stopLoss),
                takeProfit: parseFloat(takeProfit),
                useMartingale,
            });

            if (success) toast.success('🦎 Chameleon Mode Ativado!');
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={13} className="text-emerald-400" />;
            case 'error': return <XCircle size={13} className="text-rose-400" />;
            case 'warning': return <AlertCircle size={13} className="text-amber-400" />;
            case 'even': return <Circle size={13} className="text-cyan-400" fill="currentColor" />;
            case 'odd': return <Circle size={13} className="text-violet-400" />;
            case 'mode': return <Repeat size={13} className="text-amber-400" />;
            case 'snapback': return <Target size={13} className="text-orange-400" />;
            case 'cycle': return <RefreshCw size={13} className="text-cyan-400" />;
            case 'blocked': return <Hand size={13} className="text-slate-500" />;
            default: return <ArrowRight size={13} className="text-slate-500" />;
        }
    };

    // --- MODE INDICATOR ---
    const ModeIndicator = () => {
        const modeConfig = {
            'ping-pong': {
                icon: <RefreshCw size={24} className="text-cyan-400" />,
                label: 'PING-PONG',
                sublabel: 'Alternância Alta - Apostando Inversão',
                color: 'cyan',
                bgClass: 'bg-cyan-500/10 border-cyan-500/30',
                textClass: 'text-cyan-400'
            },
            'sequencia': {
                icon: <Train size={24} className="text-amber-400" />,
                label: 'SEQUÊNCIA',
                sublabel: 'Tendência Forte - Seguindo Repetição',
                color: 'amber',
                bgClass: 'bg-amber-500/10 border-amber-500/30',
                textClass: 'text-amber-400'
            },
            'espera': {
                icon: <Hand size={24} className="text-slate-400" />,
                label: 'ESPERA',
                sublabel: 'Analisando Definição de Ciclo...',
                color: 'slate',
                bgClass: 'bg-slate-500/10 border-slate-500/30',
                textClass: 'text-slate-400'
            }
        };

        const config = modeConfig[currentMode];

        return (
            <div className={cn(
                "relative p-4 rounded-xl border transition-all duration-300",
                config.bgClass,
                isReanalyzing && "animate-pulse"
            )}>
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center",
                        `bg-${config.color}-500/20`
                    )}>
                        {config.icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className={cn("text-lg font-bold font-mono", config.textClass)}>
                                {config.label}
                            </span>
                            {currentMode === 'ping-pong' && <span className="text-lg">🏓</span>}
                            {currentMode === 'sequencia' && <span className="text-lg">🚂</span>}
                            {currentMode === 'espera' && <span className="text-lg">✋</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{config.sublabel}</p>
                    </div>
                </div>
            </div>
        );
    };

    // --- SWITCH RATE GAUGE ---
    const SwitchRateGauge = () => {
        const isPingPong = switchRate > chameleonConfig.PING_PONG_THRESHOLD;
        const isSequencia = switchRate < chameleonConfig.SEQUENCIA_THRESHOLD;
        const repetitionRate = 100 - switchRate;

        return (
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Switch Rate</span>
                    <span className={cn(
                        "text-2xl font-mono font-bold",
                        isPingPong ? "text-cyan-400" : isSequencia ? "text-amber-400" : "text-slate-400"
                    )}>
                        {switchRate.toFixed(1)}%
                    </span>
                </div>

                {/* Main Progress Bar */}
                <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
                    {/* Zone Backgrounds */}
                    <div className="absolute inset-0 flex">
                        <div className="w-[45%] bg-amber-900/30" />
                        <div className="w-[10%] bg-slate-700/30" />
                        <div className="flex-1 bg-cyan-900/30" />
                    </div>

                    {/* Needle */}
                    <div
                        className={cn(
                            "absolute top-0 bottom-0 w-1.5 rounded-full shadow-lg transition-all duration-300 z-10",
                            isPingPong ? "bg-cyan-400 shadow-cyan-500/50" :
                                isSequencia ? "bg-amber-400 shadow-amber-500/50" : "bg-slate-400"
                        )}
                        style={{ left: `calc(${switchRate}% - 3px)` }}
                    />

                    {/* Threshold Lines */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-slate-500/50" style={{ left: '45%' }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-slate-500/50" style={{ left: '55%' }} />
                </div>

                <div className="flex justify-between mt-2 text-[9px] font-mono">
                    <span className="text-amber-400/60">🚂 SEQUÊNCIA</span>
                    <span className="text-slate-500">NEUTRO</span>
                    <span className="text-cyan-400/60">🏓 PING-PONG</span>
                </div>
            </div>
        );
    };

    // --- SNAPBACK PATTERN DISPLAY ---
    const SnapbackDisplay = () => {
        const last3 = logs
            .filter(l => l.type === 'even' || l.type === 'odd')
            .slice(-3)
            .map(l => l.type as 'even' | 'odd');

        while (last3.length < 3) {
            last3.unshift('even'); // Placeholder
        }

        return (
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Últimas Paridades</span>
                    {snapbackPattern !== 'none' && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-[9px] font-bold text-orange-400 animate-pulse">
                            🎯 SNAPBACK
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 justify-center">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold font-mono border-2 transition-all",
                        lastParity === 'even'
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                            : "bg-violet-500/20 border-violet-500/50 text-violet-400"
                    )}>
                        {lastParity === 'even' ? 'P' : 'I'}
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="text-[9px] text-slate-500">Último:</span>
                    <span className={cn(
                        "text-xs font-mono font-bold",
                        lastParity === 'even' ? "text-cyan-400" : "text-violet-400"
                    )}>
                        {lastParity === 'even' ? 'PAR' : 'ÍMPAR'}
                    </span>
                </div>

                {snapbackPattern !== 'none' && (
                    <div className="mt-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                        <span className="text-[10px] font-mono text-orange-400">
                            Gatilho: Apostar {snapbackPattern === 'even' ? 'PAR' : 'ÍMPAR'}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#080a0e] text-slate-200">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-0 left-0 w-full h-[300px] bg-emerald-600/5 blur-[120px]" />
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
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <span className="text-xl">🦎</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    Bug Deriv
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                                        Chameleon
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 font-mono">Even/Odd Adaptive | Ciclo: {chameleonConfig.HISTORY_SIZE} ticks</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isReanalyzing && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 animate-pulse">
                                <RefreshCw size={14} className="text-cyan-400 animate-spin" />
                                <span className="text-xs font-mono font-bold text-cyan-400">Reanalisando</span>
                            </div>
                        )}

                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono",
                            isConnected ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" : "bg-rose-950/30 border-rose-500/30 text-rose-400"
                        )}>
                            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                            {isConnected ? "LINKED" : "OFFLINE"}
                        </div>
                    </div>
                </div>

                {/* Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                    {/* Left: Controls */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-5 text-emerald-400">
                                <Settings2 size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Parâmetros</span>
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
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-6 pr-3 text-sm font-mono focus:border-emerald-500/50 focus:outline-none"
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
                                        <span className="text-[9px] text-slate-500">{chameleonConfig.MARTINGALE_FACTOR}x | Max {chameleonConfig.MAX_MARTINGALE_LEVELS}</span>
                                    </div>
                                    <button
                                        onClick={() => setUseMartingale(!useMartingale)}
                                        disabled={isRunning}
                                        className={cn("w-8 h-4 rounded-full relative transition-colors", useMartingale ? "bg-emerald-500" : "bg-slate-700")}
                                    >
                                        <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", useMartingale ? "left-4.5" : "left-0.5")} />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleToggleBot}
                                className={cn(
                                    "w-full mt-5 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2",
                                    isRunning
                                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                        : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20"
                                )}
                            >
                                {isRunning ? <><Square size={14} fill="currentColor" /> PARAR</> : <><Play size={14} fill="currentColor" /> INICIAR</>}
                            </button>

                            {isFree && <div className="mt-4"><FreemiumProgressBar currentProfit={currentProfit} /></div>}
                        </div>

                        {/* Risk Info */}
                        <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <ShieldAlert size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-bold text-emerald-300 mb-1">Gestão Inteligente</h4>
                                    <p className="text-[10px] text-emerald-200/60 leading-relaxed">
                                        Reanálise forçada após 2 losses consecutivos. O bot detecta mudanças de ciclo automaticamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center: Mode + Gauges */}
                    <div className="lg:col-span-6 space-y-4">
                        {/* Mode Indicator */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Repeat size={16} className="text-emerald-400" />
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Modo Atual</span>
                            </div>
                            <ModeIndicator />
                        </div>

                        {/* Gauges */}
                        <div className="grid grid-cols-2 gap-4">
                            <SwitchRateGauge />
                            <SnapbackDisplay />
                        </div>

                        {/* Logs */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[260px]">
                            <div className="p-3 border-b border-white/5 flex items-center gap-2">
                                <Activity size={14} className="text-slate-500" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Log de Atividade</span>
                                <span className="ml-auto text-[9px] font-mono text-slate-600">{stats.signalsTriggered} sinais</span>
                            </div>
                            <div ref={logsContainerRef} className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px]">
                                {logs.length === 0 ? (
                                    <div className="h-full flex items-center justify-center opacity-20">
                                        <Search size={24} />
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <div key={log.id} className="flex items-start gap-2 p-1.5 hover:bg-white/5 rounded">
                                            <span className="text-slate-600 shrink-0">{log.time}</span>
                                            {getLogIcon(log.type)}
                                            <span className={cn(
                                                log.type === 'error' && "text-rose-400",
                                                log.type === 'success' && "text-emerald-400",
                                                log.type === 'odd' && "text-violet-300",
                                                log.type === 'even' && "text-cyan-300",
                                                log.type === 'mode' && "text-amber-400",
                                                log.type === 'snapback' && "text-orange-400",
                                                log.type === 'cycle' && "text-cyan-400",
                                                log.type === 'blocked' && "text-slate-500",
                                                log.type === 'info' && "text-slate-400"
                                            )}>{log.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Performance</span>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] text-slate-500 block mb-1">Total P/L</span>
                                    <div className={cn("text-2xl font-mono font-bold", stats.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                        {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                                        <span className="text-sm ml-1 text-slate-500">USD</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Wins</span>
                                        <div className="text-xl font-mono text-emerald-400">{stats.wins}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Losses</span>
                                        <div className="text-xl font-mono text-rose-400">{stats.losses}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Switch Rate</span>
                                        <div className="text-lg font-mono text-cyan-400">{stats.switchRate.toFixed(1)}%</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Snapbacks</span>
                                        <div className="text-lg font-mono text-orange-400">{stats.snapbacksTriggered}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Sinais</span>
                                        <div className="text-lg font-mono text-emerald-400">{stats.signalsTriggered}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Ciclo Resets</span>
                                        <div className="text-lg font-mono text-amber-400">{stats.cycleResets}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SystemLimitModal isOpen={showLimitModal} limitAmount={currentProfit} onClose={() => setShowLimitModal(false)} />
        </div>
    );
};

export default BugDeriv;
