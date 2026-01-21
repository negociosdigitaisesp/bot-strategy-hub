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
    Database,
    Pause
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

    // --- TREND STATUS (New v3) ---
    const TrendStatusPanel = () => {
        const lastParity = stats.lastParity;
        const consecutive = stats.consecutiveCount || 0;
        const isPingPong = stats.isPingPong || false;
        const isOnCooldown = stats.isOnCooldown || false;
        const trendStrength = stats.trendStrength;

        return (
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        <TrendingUp size={12} className="inline mr-1.5" />
                        Tendencia Actual
                    </span>
                    {consecutive >= 3 && !isPingPong && !isOnCooldown && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 animate-pulse">
                            🎯 SEÑAL ACTIVA
                        </span>
                    )}
                </div>

                {/* Sequence Counter & Strength */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-center">
                        <div className="text-[9px] text-slate-500 uppercase mb-1">Secuencia</div>
                        <div className={cn(
                            "text-xl font-mono font-bold",
                            consecutive >= 3 ? "text-emerald-400" : "text-slate-400"
                        )}>
                            {consecutive}/3
                        </div>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-center">
                        <div className="text-[9px] text-slate-500 uppercase mb-1">Fuerza</div>
                        <div className={cn(
                            "text-sm font-mono font-bold flex items-center justify-center h-[28px]",
                            trendStrength === 'strong' ? "text-emerald-400" :
                                trendStrength === 'medium' ? "text-amber-400" : "text-slate-500"
                        )}>
                            {trendStrength === 'strong' ? 'FUERTE' :
                                trendStrength === 'medium' ? 'MEDIA' : '--'}
                        </div>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-center">
                        <div className="text-[9px] text-slate-500 uppercase mb-1">Último</div>
                        <div className={cn(
                            "text-xl font-mono font-bold",
                            lastParity === 'even' ? "text-cyan-400" : lastParity === 'odd' ? "text-violet-400" : "text-slate-400"
                        )}>
                            {lastParity === 'even' ? 'PAR' : lastParity === 'odd' ? 'IMP' : '--'}
                        </div>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-center">
                        <div className="text-[9px] text-slate-500 uppercase mb-1">Estado</div>
                        <div className={cn(
                            "text-lg font-mono font-bold flex items-center justify-center h-[28px]",
                            isOnCooldown ? "text-amber-400" : isPingPong ? "text-rose-400" : "text-emerald-400"
                        )}>
                            {isOnCooldown ? <Pause size={18} /> : isPingPong ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
                        </div>
                    </div>
                </div>

                {/* Status Messages */}
                <div className={cn(
                    "p-3 rounded-lg text-center text-sm font-mono",
                    isOnCooldown ? "bg-amber-950/30 border border-amber-500/20 text-amber-400" :
                        isPingPong ? "bg-rose-950/30 border border-rose-500/20 text-rose-400" :
                            consecutive >= 3 ? "bg-emerald-950/30 border border-emerald-500/20 text-emerald-400" :
                                "bg-slate-900/50 border border-white/5 text-slate-400"
                )}>
                    {isOnCooldown && <>⏸️ PAUSA: Esperando nuevo patrón (Reset)...</>}
                    {!isOnCooldown && isPingPong && <>🚫 PING-PONG: Mercado alternante. Bloqueado.</>}
                    {!isOnCooldown && !isPingPong && consecutive >= 3 && <>📈 TENDENCIA CONFIRMADA: Apostando {lastParity === 'even' ? 'PAR' : 'IMPAR'}</>}
                    {!isOnCooldown && !isPingPong && consecutive < 3 && <>🔍 Analizando tendencia...</>}
                </div>
            </div>
        );
    };

    // --- STRATEGY INFO PANEL ---
    const StrategyInfoPanel = () => (
        <div className="bg-black/40 rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-purple-400" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Estrategia v3 (Trend Strict)</span>
            </div>

            <div className="space-y-3">
                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
                        <TrendingUp size={14} />
                        Trigger: 3 Dígitos
                    </div>
                    <p className="text-[10px] text-slate-400">
                        3 dígitos iguales consecutivos (ej: P, P, P) + Validación de Fuerza de Tendencia.
                    </p>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                        <Shield size={14} />
                        Filtro Contextual
                    </div>
                    <p className="text-[10px] text-slate-400">
                        Analiza la ruptura anterior. Evita entrar en tenencias débiles o ruido de mercado.
                    </p>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-violet-400 text-xs font-bold mb-1">
                        <Sparkles size={14} />
                        Smart Recovery (Max 4)
                    </div>
                    <p className="text-[10px] text-slate-400">
                        Pausa OBLIGATORIA tras Loss. Espera nueva secuencia para recuperar. Max 4 Gales.
                    </p>
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
                                <span className="text-xl">📈</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    Bot Sigma
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                                        v3
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 font-mono">Trend Following | Smart Recovery</p>
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
                                        <span className="text-xs font-medium text-slate-200 block">Smart Martingale</span>
                                        <span className="text-[9px] text-slate-500">x2.1 + pausa en loss</span>
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
                                        ${(stats.totalProfit || 0).toFixed(2)}
                                    </div>
                                </div>
                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase">Gale</div>
                                    <div className="text-xl font-mono font-bold text-purple-400">{stats.martingaleLevel || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center: Analysis */}
                    <div className="lg:col-span-5 space-y-4">
                        <TrendStatusPanel />
                        <StrategyInfoPanel />
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
