import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    ArrowLeft,
    Wifi,
    WifiOff,
    Shield,
    Gauge,
    Binary,
    Percent,
    DollarSign,
    ChartPie,
    Sparkles,
    Radio,
    Atom,
    Scan,
    Timer,
    Layers,
    Flame,
    Snowflake,
    Hash,
    TrendingDown as TrendIcon,
    CircleDot
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useStatisticalBot, AVAILABLE_SYMBOLS, StatBotConfig } from '../hooks/useStatisticalBot';
import { useDeriv } from '../contexts/DerivContext';
import { useNavigate } from 'react-router-dom';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
import { FreemiumProgressBar } from '../components/FreemiumProgressBar';
import { SystemLimitModal } from '../components/SystemLimitModal';
import RecentGainsTicker from '../components/RecentGainsTicker';

// ============================================================================
// COMPONENTES AUXILIARES - MULTI-LAYER STATUS
// ============================================================================

const LayerIndicator = ({
    layer,
    label,
    isActive,
    value,
    icon: Icon
}: {
    layer: number;
    label: string;
    isActive: boolean;
    value: string;
    icon: React.ElementType;
}) => (
    <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: layer * 0.1 }}
        className={cn(
            "relative flex items-center gap-2 p-3 rounded-xl border transition-all duration-300",
            isActive
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 border-emerald-500/40"
                : "bg-white/[0.02] border-white/5"
        )}
    >
        <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono font-bold",
            isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800/50 text-slate-500"
        )}>
            {isActive ? <CheckCircle2 size={16} /> : layer}
        </div>
        <div className="flex-1 min-w-0">
            <span className={cn(
                "text-[10px] uppercase tracking-wider font-bold block truncate",
                isActive ? "text-emerald-400" : "text-slate-500"
            )}>
                {label}
            </span>
            <span className={cn(
                "text-xs font-mono truncate block",
                isActive ? "text-emerald-300/80" : "text-slate-600"
            )}>
                {value}
            </span>
        </div>
        <Icon size={14} className={isActive ? "text-emerald-400" : "text-slate-600"} />
    </motion.div>
);

// Celda de dígito con heatmap de frecuencia
const DigitHeatmapCell = ({
    digit,
    frequency,
    isSignal,
    isEven
}: {
    digit: number;
    frequency: { count: number; percentage: number; deviation: number; zScore: number };
    isSignal: boolean;
    isEven: boolean;
}) => {
    const intensity = Math.min(frequency.percentage / 15, 1);
    const isHot = frequency.percentage >= 12; // >=12% es "hot" (green bar)
    const isCold = frequency.percentage <= 7.7; // <=7.7% es "cold" (red bar)

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: digit * 0.05 }}
            className={cn(
                "relative flex flex-col items-center justify-center w-10 h-14 md:w-14 md:h-20 rounded-xl transition-all duration-300",
                isSignal && "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0c10]"
            )}
        >
            {/* Background con gradiente de calor */}
            <div
                className={cn(
                    "absolute inset-0 rounded-xl transition-all duration-500",
                    isHot && "bg-gradient-to-b from-emerald-500/30 to-emerald-900/20 border border-emerald-500/40",
                    isCold && "bg-gradient-to-b from-rose-500/30 to-rose-900/20 border border-rose-500/40",
                    !isHot && !isCold && "bg-white/[0.03] border border-white/[0.08]"
                )}
                style={{
                    opacity: 0.3 + intensity * 0.7
                }}
            />

            {/* Hot/Cold icon */}
            {isHot && (
                <Flame size={10} className="absolute top-1 right-1 text-emerald-400" />
            )}
            {isCold && (
                <Snowflake size={10} className="absolute top-1 right-1 text-rose-400" />
            )}

            {/* Pulso para señal */}
            {isSignal && (
                <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-cyan-400/60"
                    animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            )}

            {/* Número */}
            <span className={cn(
                "relative z-10 text-lg md:text-2xl font-mono font-bold transition-colors duration-300",
                isSignal ? "text-cyan-300" :
                    isHot ? "text-emerald-400" :
                        isCold ? "text-rose-400" :
                            isEven ? "text-violet-400/80" : "text-amber-400/80"
            )}>
                {digit}
            </span>

            {/* Porcentaje */}
            <span className={cn(
                "relative z-10 text-[9px] md:text-[10px] font-mono mt-1 transition-colors",
                isSignal ? "text-cyan-400" :
                    isHot ? "text-emerald-400" :
                        isCold ? "text-rose-400" : "text-white/40"
            )}>
                {frequency.percentage.toFixed(1)}%
            </span>

            {/* Barra de frecuencia */}
            <div className="relative z-10 w-8 md:w-10 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                <motion.div
                    className={cn(
                        "h-full rounded-full",
                        isHot ? "bg-emerald-500" :
                            isCold ? "bg-rose-500" :
                                "bg-violet-500/50"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(frequency.percentage * 8, 100)}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
        </motion.div>
    );
};

// Streak Counter Display
const StreakCounter = ({ streakCount, streakType, isActive }: {
    streakCount: number;
    streakType: 'EVEN' | 'ODD' | null;
    isActive: boolean;
}) => (
    <div className={cn(
        "bg-black/40 rounded-xl border p-4 transition-all",
        isActive ? "border-amber-500/40" : "border-white/5"
    )}>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Hash size={16} className={cn(isActive ? "text-amber-400" : "text-slate-400")} />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    Streak Actual
                </span>
            </div>
            {isActive && (
                <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                    TRIGGER
                </span>
            )}
        </div>

        <div className="flex items-center gap-4">
            <motion.div
                className={cn(
                    "text-4xl font-mono font-bold",
                    isActive ? "text-amber-400" : "text-slate-500"
                )}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
            >
                {streakCount}
            </motion.div>
            <div className="flex-1">
                <span className={cn(
                    "text-sm font-bold block",
                    streakType === 'EVEN' ? "text-violet-400" :
                        streakType === 'ODD' ? "text-amber-400" : "text-slate-500"
                )}>
                    {streakType === 'EVEN' ? 'PARES' : streakType === 'ODD' ? 'IMPARES' : '-'}
                </span>
                <span className="text-[10px] text-slate-500">consecutivos</span>
            </div>
        </div>
    </div>
);

// Barra Even/Odd con indicador de apuesta
const EvenOddBar = ({ evenPct, oddPct, signal, weakSide }: {
    evenPct: number;
    oddPct: number;
    signal: 'EVEN' | 'ODD' | null;
    weakSide: 'EVEN' | 'ODD' | null;
}) => {
    const diff = Math.abs(evenPct - 50);
    const hasDesbalance = diff > 10;

    return (
        <div className="bg-black/40 rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Binary size={16} className="text-cyan-400" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    Distribución Par/Impar
                </span>
                {hasDesbalance && (
                    <span className="ml-auto px-2 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                        {diff.toFixed(1)}% DESBALANCE
                    </span>
                )}
            </div>

            <div className="flex gap-2 mb-3">
                {/* Even */}
                <motion.div
                    className={cn(
                        "flex-1 py-3 rounded-lg text-center transition-all relative overflow-hidden",
                        weakSide === 'EVEN'
                            ? "bg-gradient-to-r from-violet-500/30 to-violet-500/10 border-2 border-violet-400"
                            : "bg-violet-500/10 border border-violet-500/20"
                    )}
                    animate={weakSide === 'EVEN' ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 1, repeat: weakSide === 'EVEN' ? Infinity : 0 }}
                >
                    {weakSide === 'EVEN' && (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] bg-violet-500/50 text-white font-bold">
                            🎯 APOSTAR
                        </span>
                    )}
                    <span className="text-2xl font-mono font-bold text-violet-400">
                        {evenPct.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-violet-300/60 block mt-1">PAR (0,2,4,6,8)</span>
                </motion.div>

                {/* Odd */}
                <motion.div
                    className={cn(
                        "flex-1 py-3 rounded-lg text-center transition-all relative overflow-hidden",
                        weakSide === 'ODD'
                            ? "bg-gradient-to-r from-amber-500/30 to-amber-500/10 border-2 border-amber-400"
                            : "bg-amber-500/10 border border-amber-500/20"
                    )}
                    animate={weakSide === 'ODD' ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 1, repeat: weakSide === 'ODD' ? Infinity : 0 }}
                >
                    {weakSide === 'ODD' && (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] bg-amber-500/50 text-white font-bold">
                            🎯 APOSTAR
                        </span>
                    )}
                    <span className="text-2xl font-mono font-bold text-amber-400">
                        {oddPct.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-amber-300/60 block mt-1">IMPAR (1,3,5,7,9)</span>
                </motion.div>
            </div>

            {/* Balance bar */}
            <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-violet-400 rounded-l-full"
                    animate={{ width: `${evenPct}%` }}
                    transition={{ duration: 0.3 }}
                />
                <motion.div
                    className="absolute inset-y-0 right-0 bg-gradient-to-l from-amber-500 to-amber-400 rounded-r-full"
                    animate={{ width: `${oddPct}%` }}
                    transition={{ duration: 0.3 }}
                />
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 -translate-x-1/2" />
            </div>
        </div>
    );
};

// Stream de dígitos Matrix-style
const DigitStream = ({ digits, isRunning }: { digits: number[]; isRunning: boolean }) => {
    const [glitchIndex, setGlitchIndex] = useState(-1);

    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            setGlitchIndex(Math.floor(Math.random() * 25));
            setTimeout(() => setGlitchIndex(-1), 100);
        }, 500);
        return () => clearInterval(interval);
    }, [isRunning]);

    return (
        <div className="flex items-center gap-0.5 overflow-hidden py-1">
            <AnimatePresence mode="popLayout">
                {digits.slice(-25).map((digit, idx) => {
                    const isLast = idx === digits.slice(-25).length - 1;
                    const isGlitch = glitchIndex === idx;
                    const isEven = digit % 2 === 0;

                    return (
                        <motion.span
                            key={`${idx}-${digit}`}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{
                                opacity: 0.3 + (idx / 25) * 0.7,
                                y: 0,
                                scale: isGlitch ? 1.2 : 1
                            }}
                            exit={{ opacity: 0, y: 10 }}
                            className={cn(
                                "w-5 h-6 flex items-center justify-center font-mono text-xs rounded transition-all",
                                isLast && "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40",
                                !isLast && isGlitch && "text-cyan-400",
                                !isLast && !isGlitch && (isEven ? "text-violet-400/60" : "text-amber-400/60")
                            )}
                        >
                            {isGlitch && !isLast ? String.fromCharCode(48 + Math.floor(Math.random() * 10)) : digit}
                        </motion.span>
                    );
                })}
            </AnimatePresence>
            {digits.length === 0 && (
                <span className="text-xs text-slate-600">Esperando datos...</span>
            )}
        </div>
    );
};

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

const BugDeriv = () => {
    const navigate = useNavigate();
    const { isConnected, account } = useDeriv();
    const {
        isRunning,
        isWaitingForContract,
        analysis,
        riskStatus,
        logs,
        lastDigits,
        currentPrice,
        pendingContract,
        multiLayerStatus,
        startBot,
        stopBot,
        availableSymbols
    } = useStatisticalBot();

    // Estado de configuración
    const [symbol, setSymbol] = useState<string>('1HZ100V');
    const [stakePercent, setStakePercent] = useState<string>('3');
    const [stopLossPercent, setStopLossPercent] = useState<string>('8');
    const [takeProfitPercent, setTakeProfitPercent] = useState<string>('15');
    const [maxLosses, setMaxLosses] = useState<string>('2');
    const [contractType, setContractType] = useState<'EVENODD' | 'DIFFERS' | 'AUTO'>('AUTO');
    const [initialCapital, setInitialCapital] = useState<string>('100');

    const logsContainerRef = useRef<HTMLDivElement>(null);

    // Freemium
    const { isFree, checkStakeLimit, isLimitReached, currentProfit } = useFreemiumLimiter();
    const [showLimitModal, setShowLimitModal] = useState(false);

    // Persistir configuración
    useEffect(() => {
        const saved = localStorage.getItem('statbot_config_v2');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                setSymbol(config.symbol || '1HZ100V');
                setStakePercent(config.stakePercent || '3');
                setStopLossPercent(config.stopLossPercent || '8');
                setTakeProfitPercent(config.takeProfitPercent || '15');
                setMaxLosses(config.maxLosses || '2');
                setContractType(config.contractType || 'AUTO');
                setInitialCapital(config.initialCapital || '100');
            } catch { }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('statbot_config_v2', JSON.stringify({
            symbol, stakePercent, stopLossPercent, takeProfitPercent, maxLosses, contractType, initialCapital
        }));
    }, [symbol, stakePercent, stopLossPercent, takeProfitPercent, maxLosses, contractType, initialCapital]);

    // Auto-scroll logs
    useEffect(() => {
        if (logsContainerRef.current) {
            const container = logsContainerRef.current;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            if (isNearBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [logs]);

    // Check limit
    useEffect(() => {
        if (isLimitReached && isRunning) {
            stopBot();
            setShowLimitModal(true);
            toast.warning('¡Límite diario alcanzado!');
        }
    }, [isLimitReached, isRunning, stopBot]);

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Bot detenido');
        } else {
            if (!isConnected) {
                toast.error('Conecte su cuenta Deriv primero');
                return;
            }

            const config: StatBotConfig = {
                symbol,
                initialCapital: parseFloat(initialCapital) || 100,
                stakePercentage: 3, // Fijo 3%
                stopLossPercentage: parseFloat(stopLossPercent) || 8,
                takeProfitPercentage: parseFloat(takeProfitPercent) || 15,
                maxConsecutiveLosses: parseInt(maxLosses) || 2,
                preferredContractType: contractType
            };

            const stake = (config.initialCapital * config.stakePercentage) / 100;
            const stakeCheck = checkStakeLimit(stake);
            if (!stakeCheck.allowed) {
                toast.error(stakeCheck.message);
                return;
            }

            const success = startBot(config);
            if (success) {
                toast.success('🎯 Sistema Multi-Layer ACTIVADO');
            }
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={13} className="text-emerald-400" />;
            case 'error': return <XCircle size={13} className="text-rose-400" />;
            case 'warning': return <AlertCircle size={13} className="text-amber-400" />;
            case 'signal': return <Zap size={13} className="text-cyan-400" />;
            case 'trade': return <Target size={13} className="text-violet-400" />;
            case 'analysis': return <Scan size={13} className="text-blue-400" />;
            case 'layer': return <Layers size={13} className="text-emerald-400" />;
            default: return <ArrowRight size={13} className="text-slate-500" />;
        }
    };

    // Datos para heatmap
    const frequencies = analysis?.statistical?.frequencies || Array(10).fill(0).map((_, i) => ({
        digit: i,
        count: 0,
        percentage: 0,
        deviation: 0,
        zScore: 0
    }));

    return (
        <div className="min-h-screen bg-[#080a0e] text-slate-200">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:50px_50px]" />
                <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-cyan-600/5 blur-[150px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[350px] bg-violet-600/5 blur-[150px]" />

                {isRunning && (
                    <>
                        <motion.div
                            className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
                            animate={{ top: ['0%', '100%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />
                        <motion.div
                            className="absolute w-full h-px bg-gradient-to-r from-transparent via-violet-400/10 to-transparent"
                            animate={{ top: ['100%', '0%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                    </>
                )}
            </div>

            <div className="relative z-10 p-4 md:p-6 max-w-7xl mx-auto space-y-5 pt-20 pb-6">
                <RecentGainsTicker className="-mx-4 mb-2" />

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
                >
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-slate-400" />
                        </button>
                        <div className="flex items-center gap-3">
                            <motion.div
                                className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center relative"
                                animate={isRunning ? {
                                    boxShadow: ['0 0 0 rgba(34,211,238,0)', '0 0 20px rgba(34,211,238,0.3)', '0 0 0 rgba(34,211,238,0)']
                                } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Layers size={24} className={cn("transition-colors", isRunning ? "text-cyan-400" : "text-slate-400")} />
                                {isRunning && (
                                    <motion.div
                                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                )}
                            </motion.div>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    Sistema Multi-Layer
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-gradient-to-r from-cyan-500/10 to-violet-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
                                        Pro
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 font-mono">
                                    Even/Odd/Differs | {availableSymbols.find(s => s.id === symbol)?.name || symbol}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {analysis && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-slate-900/50 border-white/10">
                                <Timer size={12} className="text-slate-400" />
                                <span className="text-xs font-mono text-slate-400">
                                    {analysis.tickCount}/200 ticks
                                </span>
                            </div>
                        )}

                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono",
                            isConnected ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"
                        )}>
                            {isConnected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-rose-400" />}
                            <span className={isConnected ? "text-emerald-400" : "text-rose-400"}>
                                {isConnected ? account?.loginid : "OFFLINE"}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Multi-Layer Status Panel */}
                {isRunning && multiLayerStatus && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-[#0c0e14] border border-white/5 rounded-2xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Layers size={16} className="text-cyan-400" />
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                                Estados de Capas
                            </span>
                            {multiLayerStatus.allLayersMet && (
                                <motion.span
                                    className="ml-auto px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                >
                                    ⚡ TODAS ACTIVAS
                                </motion.span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <LayerIndicator
                                layer={1}
                                label="Distribución"
                                isActive={multiLayerStatus.layer1_distribution}
                                value={`${multiLayerStatus.distributionDiff.toFixed(1)}% > 10%`}
                                icon={ChartPie}
                            />
                            <LayerIndicator
                                layer={2}
                                label="Streak"
                                isActive={multiLayerStatus.layer2_streak}
                                value={`${multiLayerStatus.streakCount} >= 3`}
                                icon={Hash}
                            />
                            <LayerIndicator
                                layer={3}
                                label="Pattern"
                                isActive={multiLayerStatus.layer3_pattern}
                                value={`${multiLayerStatus.patternConfidence.toFixed(0)}% > 70%`}
                                icon={BarChart3}
                            />
                            <LayerIndicator
                                layer={4}
                                label="Trigger"
                                isActive={multiLayerStatus.layer4_trigger}
                                value={multiLayerStatus.layer4_trigger ? "3º Consecutivo" : "Esperando..."}
                                icon={Target}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Main Grid */}
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5">

                    {/* LEFT PANEL - Config */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="order-3 lg:order-1 lg:col-span-3 space-y-4"
                    >
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-5 text-cyan-400">
                                <Settings2 size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Configuración</span>
                            </div>

                            <div className="space-y-4">
                                {/* Symbol */}
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">
                                        Índice (Solo 1s)
                                    </label>
                                    <select
                                        value={symbol}
                                        onChange={(e) => setSymbol(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-3 text-sm font-mono text-slate-200 focus:border-cyan-500/50 focus:outline-none disabled:opacity-50"
                                    >
                                        {availableSymbols.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Capital */}
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">
                                        Capital Inicial
                                    </label>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="number"
                                            value={initialCapital}
                                            onChange={(e) => setInitialCapital(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-8 pr-3 text-sm font-mono focus:border-cyan-500/50 focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Stake Fijo */}
                                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-cyan-400/70 uppercase font-bold">Stake Fijo</span>
                                        <span className="text-lg font-mono font-bold text-cyan-400">3%</span>
                                    </div>
                                    <span className="text-[9px] text-cyan-400/50">Sin Martingale</span>
                                </div>

                                {/* SL / TP */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-rose-400/70 uppercase tracking-wider font-bold mb-2 block">SL %</label>
                                        <input
                                            type="number"
                                            value={stopLossPercent}
                                            onChange={(e) => setStopLossPercent(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-rose-500/5 border border-rose-500/20 rounded-lg py-2 px-3 text-sm font-mono text-rose-400 focus:border-rose-500/50 focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-bold mb-2 block">TP %</label>
                                        <input
                                            type="number"
                                            value={takeProfitPercent}
                                            onChange={(e) => setTakeProfitPercent(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg py-2 px-3 text-sm font-mono text-emerald-400 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Max Losses */}
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">
                                        Stop en Pérdidas
                                    </label>
                                    <select
                                        value={maxLosses}
                                        onChange={(e) => setMaxLosses(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-3 text-sm font-mono focus:border-cyan-500/50 focus:outline-none disabled:opacity-50"
                                    >
                                        <option value="2">2 consecutivas → Stop</option>
                                        <option value="3">3 consecutivas → Stop</option>
                                    </select>
                                </div>

                                {/* Contract Type */}
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">
                                        Modo de Trading
                                    </label>
                                    <div className="grid grid-cols-3 gap-1">
                                        {(['AUTO', 'EVENODD', 'DIFFERS'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setContractType(type)}
                                                disabled={isRunning}
                                                className={cn(
                                                    "py-2 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50",
                                                    contractType === type
                                                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                                                        : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                                                )}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Start/Stop Button */}
                            <motion.button
                                onClick={handleToggleBot}
                                disabled={!isConnected}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                    "w-full mt-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                                    isRunning
                                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                                        : "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                                )}
                            >
                                {isRunning ? (
                                    <>
                                        <Square size={14} fill="currentColor" />
                                        DETENER
                                    </>
                                ) : (
                                    <>
                                        <Play size={14} fill="currentColor" />
                                        ACTIVAR MULTI-LAYER
                                    </>
                                )}
                            </motion.button>

                            {isFree && <div className="mt-4"><FreemiumProgressBar currentProfit={currentProfit} /></div>}
                        </div>

                        {/* Info Card */}
                        <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-bold text-cyan-300 mb-1">Sistema Multi-Layer</h4>
                                    <p className="text-[10px] text-cyan-200/60 leading-relaxed">
                                        Opera solo cuando las 4 capas se activan simultáneamente.
                                        Apuesta al lado DÉBIL por regresión a la media.
                                        Zero Martingale, 3% stake fijo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* CENTER - Heatmap & Analysis */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="order-1 lg:order-2 lg:col-span-6 space-y-4"
                    >
                        {/* Digit Heatmap */}
                        <div className={cn(
                            "bg-[#0c0e14] border rounded-2xl p-5 transition-all duration-500",
                            multiLayerStatus?.allLayersMet
                                ? "border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                                : "border-white/5"
                        )}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <BarChart3 size={16} className="text-cyan-400" />
                                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                                        Mapa de Frecuencias
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                                        <Flame size={10} /> ≥12%
                                    </span>
                                    <span className="flex items-center gap-1 text-[9px] text-rose-400">
                                        <Snowflake size={10} /> ≤7.7%
                                    </span>
                                </div>
                            </div>

                            {/* Digit Grid */}
                            <div className="flex justify-center gap-1.5 md:gap-2 flex-wrap">
                                {frequencies.map((freq, idx) => (
                                    <DigitHeatmapCell
                                        key={idx}
                                        digit={freq.digit}
                                        frequency={freq}
                                        isSignal={analysis?.statistical?.signalType === 'DIGIT' && analysis.statistical.signalDigit === freq.digit}
                                        isEven={freq.digit % 2 === 0}
                                    />
                                ))}
                            </div>

                            {/* Stream */}
                            <div className="mt-4 bg-black/30 rounded-xl p-3 border border-white/[0.05]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[9px] text-cyan-400/60 uppercase tracking-widest font-mono">STREAM</span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-transparent" />
                                    <span className="text-[9px] text-slate-500 font-mono">{lastDigits.length}/25</span>
                                </div>
                                <DigitStream digits={lastDigits} isRunning={isRunning} />
                            </div>
                        </div>

                        {/* Streak & Even/Odd */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StreakCounter
                                streakCount={analysis?.streak?.currentStreak || 0}
                                streakType={analysis?.streak?.streakType || null}
                                isActive={multiLayerStatus?.layer2_streak || false}
                            />
                            <EvenOddBar
                                evenPct={analysis?.statistical?.evenPercentage || 50}
                                oddPct={analysis?.statistical?.oddPercentage || 50}
                                signal={null}
                                weakSide={multiLayerStatus?.weakSide || null}
                            />
                        </div>

                        {/* Logs Terminal */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[200px]">
                            <div className="p-3 border-b border-white/5 flex items-center gap-2">
                                <Activity size={14} className="text-slate-500" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Terminal</span>
                                <span className="ml-auto text-[9px] font-mono text-slate-600">{logs.length} logs</span>
                            </div>
                            <div ref={logsContainerRef} className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px]">
                                {logs.length === 0 ? (
                                    <div className="h-full flex items-center justify-center opacity-20">
                                        <Scan size={24} />
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {logs.map((log) => (
                                            <motion.div
                                                key={log.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-start gap-2 p-1.5 hover:bg-white/5 rounded"
                                            >
                                                <span className="text-slate-600 shrink-0">{log.time}</span>
                                                {getLogIcon(log.type)}
                                                <span className={cn(
                                                    log.type === 'error' && "text-rose-400",
                                                    log.type === 'success' && "text-emerald-400",
                                                    log.type === 'warning' && "text-amber-400",
                                                    log.type === 'signal' && "text-cyan-400",
                                                    log.type === 'trade' && "text-violet-400",
                                                    log.type === 'analysis' && "text-blue-400",
                                                    log.type === 'layer' && "text-emerald-300",
                                                    log.type === 'info' && "text-slate-400"
                                                )}>{log.message}</span>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT - Stats */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="order-2 lg:order-3 lg:col-span-3 space-y-4"
                    >
                        {/* P&L Card */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Rendimiento</span>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] text-slate-500 block mb-1">Total P/L</span>
                                    <div className={cn(
                                        "text-3xl font-mono font-bold",
                                        (riskStatus?.totalProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        {(riskStatus?.totalProfit || 0) >= 0 ? '+' : ''}
                                        {(riskStatus?.totalProfit || 0).toFixed(2)}
                                        <span className="text-sm ml-1 text-slate-500">USD</span>
                                    </div>
                                    <div className={cn(
                                        "text-sm font-mono mt-1",
                                        (riskStatus?.profitPercentage || 0) >= 0 ? "text-emerald-400/70" : "text-rose-400/70"
                                    )}>
                                        ({(riskStatus?.profitPercentage || 0).toFixed(2)}%)
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Ganadas</span>
                                        <div className="text-xl font-mono text-emerald-400">{riskStatus?.wins || 0}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Perdidas</span>
                                        <div className="text-xl font-mono text-rose-400">{riskStatus?.losses || 0}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Win Rate</span>
                                        <div className="text-lg font-mono text-cyan-400">
                                            {(riskStatus?.winRate || 0).toFixed(1)}%
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Balance</span>
                                        <div className="text-lg font-mono text-violet-400">
                                            ${(riskStatus?.currentCapital || parseFloat(initialCapital)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Risk Indicators */}
                                <div className="pt-3 border-t border-white/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500">Trades Sesión</span>
                                        <span className="text-sm font-mono text-amber-400">
                                            {riskStatus?.totalTrades || 0}/10
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500">Pérdidas Seguidas</span>
                                        <span className={cn(
                                            "text-sm font-mono",
                                            (riskStatus?.consecutiveLosses || 0) >= 2 ? "text-rose-400" : "text-slate-400"
                                        )}>
                                            {riskStatus?.consecutiveLosses || 0}/2
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500">Victorias Seguidas</span>
                                        <span className={cn(
                                            "text-sm font-mono",
                                            (riskStatus?.consecutiveWins || 0) >= 5 ? "text-emerald-400" : "text-slate-400"
                                        )}>
                                            {riskStatus?.consecutiveWins || 0}/7
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Signal Status */}
                        <div className={cn(
                            "rounded-xl border p-4 transition-all",
                            isWaitingForContract
                                ? "bg-violet-500/10 border-violet-500/30"
                                : multiLayerStatus?.allLayersMet
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : "bg-white/[0.02] border-white/5"
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    isWaitingForContract
                                        ? "bg-violet-500/20"
                                        : multiLayerStatus?.allLayersMet
                                            ? "bg-emerald-500/20"
                                            : "bg-slate-800/50"
                                )}>
                                    {isWaitingForContract ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Target size={20} className="text-violet-400" />
                                        </motion.div>
                                    ) : multiLayerStatus?.allLayersMet ? (
                                        <Zap size={20} className="text-emerald-400" />
                                    ) : (
                                        <Scan size={20} className="text-slate-500" />
                                    )}
                                </div>
                                <div>
                                    <span className={cn(
                                        "text-sm font-bold block",
                                        isWaitingForContract ? "text-violet-300" :
                                            multiLayerStatus?.allLayersMet ? "text-emerald-300" : "text-slate-400"
                                    )}>
                                        {isWaitingForContract ? 'En Ejecución' :
                                            multiLayerStatus?.allLayersMet ? '¡Señal Multi-Layer!' : 'Analizando'}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        {isWaitingForContract && pendingContract
                                            ? `${pendingContract.type} | $${pendingContract.stake.toFixed(2)}`
                                            : multiLayerStatus?.allLayersMet && multiLayerStatus.weakSide
                                                ? `Apostar ${multiLayerStatus.weakSide} (lado débil)`
                                                : `${[
                                                    multiLayerStatus?.layer1_distribution,
                                                    multiLayerStatus?.layer2_streak,
                                                    multiLayerStatus?.layer3_pattern,
                                                    multiLayerStatus?.layer4_trigger
                                                ].filter(Boolean).length}/4 capas activas`
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Session Info */}
                        {riskStatus?.bestPattern && (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                                <span className="text-[10px] text-amber-400/70 uppercase font-bold block mb-1">Mejor Pattern</span>
                                <span className="text-lg font-mono font-bold text-amber-400">{riskStatus.bestPattern}</span>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            <SystemLimitModal
                isOpen={showLimitModal}
                limitAmount={currentProfit}
                onClose={() => setShowLimitModal(false)}
            />
        </div>
    );
};

export default BugDeriv;
