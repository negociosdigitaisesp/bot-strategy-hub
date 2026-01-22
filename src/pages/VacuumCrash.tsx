import React, { useState, useRef, useEffect } from 'react';
import {
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
    Terminal,
    Cpu,
    Timer,
    Crosshair,
    Flame,
    Eye,
    Radar,
    Waves
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useVacuumCrash } from '../hooks/useVacuumCrash';
import { useDeriv } from '../contexts/DerivContext';
import { useNavigate } from 'react-router-dom';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
import { FreemiumProgressBar } from '../components/FreemiumProgressBar';
import { SystemLimitModal } from '../components/SystemLimitModal';
import RecentGainsTicker from '../components/RecentGainsTicker';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ============================================================================
// VACUUM CRASH - El Cazador de Vacíos
// CRASH 500 Accumulators | Gap Analysis Strategy
// ============================================================================

const VacuumCrash = () => {
    const navigate = useNavigate();
    const { isConnected, account } = useDeriv();
    const {
        isRunning,
        stats,
        logs,
        startBot,
        stopBot,
        manualExit,
    } = useVacuumCrash();

    // Config State
    const [stake, setStake] = useState<string>(() => localStorage.getItem('vacuum_stake') || '1.00');
    const [growthRate, setGrowthRate] = useState<number>(() => parseInt(localStorage.getItem('vacuum_growth') || '3'));
    const [stopLoss, setStopLoss] = useState<string>(() => localStorage.getItem('vacuum_stoploss') || '25.00');
    const [stopWin, setStopWin] = useState<string>(() => localStorage.getItem('vacuum_stopwin') || '10.00');

    const logsContainerRef = useRef<HTMLDivElement>(null);

    const { isFree, checkStakeLimit, isLimitReached, currentProfit } = useFreemiumLimiter();
    const [showLimitModal, setShowLimitModal] = useState(false);

    // Persist settings
    useEffect(() => {
        localStorage.setItem('vacuum_stake', stake);
        localStorage.setItem('vacuum_growth', String(growthRate));
        localStorage.setItem('vacuum_stoploss', stopLoss);
        localStorage.setItem('vacuum_stopwin', stopWin);
    }, [stake, growthRate, stopLoss, stopWin]);

    // Auto-scroll logs
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = 0;
        }
    }, [logs]);

    // Handle limit reached
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
            toast.info('Vacuum Crash Detenido');
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
                growthRate,
                stopLoss: parseFloat(stopLoss) || 25,
                stopWin: parseFloat(stopWin) || 0,
                emergencyStopLoss: parseFloat(stopLoss) * 2,
            });
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={13} className="text-emerald-400" />;
            case 'error': return <XCircle size={13} className="text-rose-400" />;
            case 'warning': return <AlertCircle size={13} className="text-amber-400" />;
            case 'crash': return <Flame size={13} className="text-orange-500" />;
            case 'entry': return <Crosshair size={13} className="text-cyan-400" />;
            case 'exit': return <ArrowRight size={13} className="text-violet-400" />;
            default: return <Terminal size={13} className="text-slate-500" />;
        }
    };

    const getZoneColor = (zone: 'safe' | 'caution' | 'danger') => {
        switch (zone) {
            case 'safe': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            case 'caution': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
            case 'danger': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
        }
    };

    const getStatusText = () => {
        switch (stats.status) {
            case 'hunting': return '🔍 Cazando Vacío...';
            case 'in_position': return `📈 En Operación (${stats.ticksSinceEntry}/${stats.targetTicks} ticks)`;
            case 'waiting': return '⏳ Esperando Crash...';
            default: return '⏹️ Inactivo';
        }
    };

    // --- HISTOGRAM CHART ---
    const IntervalHistogram = () => (
        <div className="bg-black/40 rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-cyan-400" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        Distribución de Intervalos
                    </span>
                </div>
                <span className="text-[9px] font-mono text-slate-600">
                    {stats.intervalHistogram.length} eventos
                </span>
            </div>

            <div className="h-[160px]">
                {stats.intervalHistogram.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.intervalHistogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis
                                dataKey="interval"
                                tick={{ fill: '#64748b', fontSize: 9 }}
                                axisLine={{ stroke: '#1e293b' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#64748b', fontSize: 9 }}
                                axisLine={{ stroke: '#1e293b' }}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#0f172a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                                {stats.intervalHistogram.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.interval <= stats.percentile10 ? '#22c55e' : '#3b82f6'}
                                        opacity={0.8}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                        <div className="text-center">
                            <Waves size={32} className="mx-auto mb-2 opacity-30" />
                            Recopilando datos...
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3 text-[9px] text-slate-500">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    Zona Segura (P10)
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                    Zona Normal
                </div>
            </div>
        </div>
    );

    // --- LIVE STATUS PANEL ---
    const LiveStatusPanel = () => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 rounded-xl border border-white/5 p-4"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{ scale: isRunning ? [1, 1.2, 1] : 1 }}
                        transition={{ repeat: isRunning ? Infinity : 0, duration: 1.5 }}
                    >
                        <Radar size={16} className={isRunning ? "text-cyan-400" : "text-slate-500"} />
                    </motion.div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        Estado en Tiempo Real
                    </span>
                </div>
                {isRunning && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[9px] font-bold text-cyan-400"
                    >
                        LIVE
                    </motion.span>
                )}
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {/* Last Crash */}
                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-center">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Último Crash</div>
                    <motion.div
                        key={stats.lastCrashTicksAgo}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className={cn(
                            "text-2xl font-mono font-bold",
                            stats.lastCrashTicksAgo < 5 ? "text-emerald-400" :
                                stats.lastCrashTicksAgo < 15 ? "text-amber-400" : "text-rose-400"
                        )}
                    >
                        {stats.lastCrashTicksAgo}
                    </motion.div>
                    <div className="text-[9px] text-slate-600 mt-0.5">ticks atrás</div>
                </div>

                {/* Percentile 10 */}
                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-center">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Percentil 10</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400">
                        {stats.percentile10 || '--'}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">ticks mínimos</div>
                </div>

                {/* Safe Window */}
                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-center">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Ventana Segura</div>
                    <div className="text-2xl font-mono font-bold text-blue-400">
                        {stats.safeWindow || '--'}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">ticks</div>
                </div>

                {/* Target */}
                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-center">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Objetivo</div>
                    <div className="text-2xl font-mono font-bold text-violet-400">
                        {stats.targetTicks || '--'}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">ticks TP</div>
                </div>
            </div>

            {/* Zone Indicator */}
            <motion.div
                layout
                className={cn(
                    "p-4 rounded-lg border text-center",
                    getZoneColor(stats.currentZone)
                )}
            >
                <div className="text-sm font-mono font-bold">
                    {stats.currentZone === 'safe' && '🟢 ZONA SEGURA'}
                    {stats.currentZone === 'caution' && '🟡 ZONA DE PRECAUCIÓN'}
                    {stats.currentZone === 'danger' && '🔴 ZONA DE PELIGRO'}
                </div>
                <div className="text-xs mt-1 opacity-70">
                    {stats.currentZone === 'safe' && 'Probabilidad baja de crash inminente'}
                    {stats.currentZone === 'caution' && 'Monitoreo activo recomendado'}
                    {stats.currentZone === 'danger' && 'Alto riesgo de crash - Evitar entradas'}
                </div>
            </motion.div>

            {/* Status Bar */}
            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{getStatusText()}</span>
                    {stats.isInPosition && (
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((stats.ticksSinceEntry / stats.targetTicks) * 100, 100)}%` }}
                                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                                />
                            </div>
                            <button
                                onClick={manualExit}
                                className="px-2 py-1 text-[9px] bg-rose-500/20 text-rose-400 rounded border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                            >
                                SALIR
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );

    // --- STRATEGY INFO ---
    const StrategyInfoPanel = () => (
        <div className="bg-black/40 rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Cpu size={14} className="text-violet-400" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    Lógica de Gap Analysis
                </span>
            </div>

            <div className="space-y-3">
                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-orange-400 text-xs font-bold mb-1">
                        <Flame size={14} />
                        Detección de Crash
                    </div>
                    <p className="text-[10px] text-slate-400">
                        Identifica caídas bruscas (&gt;3 pts) en CRASH 500 para señalizar "eventos de estrés".
                    </p>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
                        <Target size={14} />
                        Entrada Post-Crash
                    </div>
                    <p className="text-[10px] text-slate-400">
                        Compra Accumulator inmediatamente después del crash para capturar el "vacío" estadístico.
                    </p>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                        <Timer size={14} />
                        Salida por Ticks
                    </div>
                    <p className="text-[10px] text-slate-400">
                        Take-profit basado en conteo de ticks (no $). Sale antes del próximo crash probable.
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#080a0e] text-slate-200">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
                <motion.div
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                    className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[150px]"
                />
                <motion.div
                    animate={{
                        opacity: [0.2, 0.5, 0.2],
                        scale: [1.1, 1, 1.1],
                    }}
                    transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px]"
                />
            </div>

            <div className="relative z-10 p-4 md:p-6 max-w-7xl mx-auto space-y-5">
                <RecentGainsTicker />

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-slate-400" />
                        </button>
                        <div className="flex items-center gap-3">
                            <motion.div
                                whileHover={{ rotate: 180 }}
                                transition={{ duration: 0.5 }}
                                className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center"
                            >
                                <Zap size={24} className="text-cyan-400" />
                            </motion.div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                                    Vacuum Crash
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
                                        v1
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 font-mono">El Cazador de Vacíos | CRASH 500</p>
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono",
                        isConnected ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" : "bg-rose-950/30 border-rose-500/30 text-rose-400"
                    )}>
                        {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {isConnected ? "CONECTADO" : "DESCONECTADO"}
                    </div>
                </motion.div>

                {/* Freemium Bar */}
                {isFree && <FreemiumProgressBar currentProfit={currentProfit} />}

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                    {/* Left: Controls */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-3 space-y-4"
                    >
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-5 text-cyan-400">
                                <Settings2 size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Parámetros</span>
                            </div>

                            <div className="space-y-4">
                                {/* Stake */}
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">
                                        Stake
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            value={stake}
                                            onChange={(e) => setStake(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-6 pr-3 text-sm font-mono focus:border-cyan-500/50 focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Growth Rate */}
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">
                                        Tasa de Crecimiento
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[3, 5].map((rate) => (
                                            <button
                                                key={rate}
                                                onClick={() => setGrowthRate(rate)}
                                                disabled={isRunning}
                                                className={cn(
                                                    "py-2.5 rounded-lg font-mono text-sm font-bold transition-all",
                                                    growthRate === rate
                                                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                                                        : "bg-black/20 text-slate-400 border border-white/10 hover:border-white/20"
                                                )}
                                            >
                                                {rate}%
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Stop Loss */}
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">
                                        Stop Loss
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            value={stopLoss}
                                            onChange={(e) => setStopLoss(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-6 pr-3 text-sm font-mono text-rose-400 focus:border-rose-500/50 focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Stop Win */}
                                <div>
                                    <label className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold mb-2 block">
                                        Stop Win 🏆
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            value={stopWin}
                                            onChange={(e) => setStopWin(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-black/20 border border-emerald-500/20 rounded-lg py-2 pl-6 pr-3 text-sm font-mono text-emerald-400 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50"
                                            placeholder="0 = desativado"
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-600 mt-1">0 = desactivado</p>
                                </div>
                            </div>

                            {/* Start Button */}
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={handleToggleBot}
                                className={cn(
                                    "w-full mt-5 py-4 rounded-xl font-bold flex items-center justify-center gap-2.5 text-sm uppercase tracking-wider transition-all",
                                    isRunning
                                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
                                        : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/30 hover:shadow-cyan-900/50"
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
                                        Cazar Vacío
                                    </>
                                )}
                            </motion.button>
                        </div>

                        {/* Stats */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4 text-slate-400">
                                <BarChart3 size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Resultados</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase">Ganadas</div>
                                    <div className="text-xl font-mono font-bold text-emerald-400">{stats.wins}</div>
                                </div>
                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase">Perdidas</div>
                                    <div className="text-xl font-mono font-bold text-rose-400">{stats.losses}</div>
                                </div>
                                <div className="col-span-2 p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="text-[9px] text-slate-500 uppercase">Lucro Total</div>
                                    <div className={cn(
                                        "text-2xl font-mono font-bold",
                                        stats.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        ${(stats.totalProfit || 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Center: Analysis */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-5 space-y-4"
                    >
                        <LiveStatusPanel />
                        <IntervalHistogram />
                    </motion.div>

                    {/* Right: Logs & Strategy */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-4 space-y-4"
                    >
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Terminal size={16} className="text-cyan-400" />
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Terminal</span>
                                <span className="ml-auto text-[9px] font-mono text-slate-600">{logs.length} eventos</span>
                            </div>

                            <div ref={logsContainerRef} className="h-[200px] overflow-y-auto space-y-1.5 scrollbar-thin">
                                {logs.length === 0 ? (
                                    <div className="text-center text-slate-600 text-xs py-8 font-mono">
                                        <Eye size={24} className="mx-auto mb-2 opacity-30" />
                                        Esperando actividad...
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {logs.map((log) => (
                                            <motion.div
                                                key={log.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-start gap-2 py-1.5 px-2 rounded bg-black/30 text-[11px] font-mono border border-white/5"
                                            >
                                                {getLogIcon(log.type)}
                                                <span className="text-slate-600">{log.time}</span>
                                                <span className="text-slate-300 flex-1">{log.message}</span>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>

                        <StrategyInfoPanel />
                    </motion.div>
                </div>
            </div>

            {/* Limit Modal */}
            {showLimitModal && (
                <SystemLimitModal onClose={() => setShowLimitModal(false)} />
            )}
        </div>
    );
};

export default VacuumCrash;
