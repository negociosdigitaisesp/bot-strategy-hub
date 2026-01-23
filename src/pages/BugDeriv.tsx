import React, { useState, useRef, useEffect, useMemo } from 'react';
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
    ArrowLeft,
    Wifi,
    WifiOff,
    Shield,
    ShieldCheck,
    Gauge,
    Bug,
    ChevronUp,
    ChevronDown,
    Minus,
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
    const { isConnected } = useDeriv();
    const {
        isRunning,
        stats,
        logs,
        priceHistory,
        safetyFactor,
        fortressConfig,
        startBot,
        stopBot,
        updateSafetyFactor,
    } = useBugDeriv();

    const [stake, setStake] = useState<string>(() => localStorage.getItem('bugderiv_stake') || '1.00');
    const [stopLoss, setStopLoss] = useState<string>(() => localStorage.getItem('bugderiv_stoploss') || '50.00');
    const [takeProfit, setTakeProfit] = useState<string>(() => localStorage.getItem('bugderiv_takeprofit') || '20.00');
    const [useMartingale, setUseMartingale] = useState<boolean>(() => localStorage.getItem('bugderiv_martingale') !== 'false');
    const [localSafetyFactor, setLocalSafetyFactor] = useState<number>(2.2);

    const logsContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);

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

    // --- DRAW CHART ---
    useEffect(() => {
        const canvas = chartRef.current;
        if (!canvas || priceHistory.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const padding = 10;

        // Clear
        ctx.fillStyle = '#0a0c10';
        ctx.fillRect(0, 0, width, height);

        // Get price range
        const prices = priceHistory.map(p => p.price);
        const barriers = priceHistory.filter(p => p.barrier).map(p => p.barrier as number);
        const allValues = [...prices, ...barriers];
        const minPrice = Math.min(...allValues);
        const maxPrice = Math.max(...allValues);
        const priceRange = maxPrice - minPrice || 1;

        const scaleY = (price: number) => {
            return height - padding - ((price - minPrice) / priceRange) * (height - padding * 2);
        };

        const scaleX = (index: number) => {
            return padding + (index / (priceHistory.length - 1)) * (width - padding * 2);
        };

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (i / 4) * (height - padding * 2);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw barrier line (dashed)
        if (barriers.length > 0) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            let started = false;
            priceHistory.forEach((point, i) => {
                if (point.barrier) {
                    const x = scaleX(i);
                    const y = scaleY(point.barrier);
                    if (!started) {
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw price line
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        priceHistory.forEach((point, i) => {
            const x = scaleX(i);
            const y = scaleY(point.price);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw current price point
        if (priceHistory.length > 0) {
            const lastPoint = priceHistory[priceHistory.length - 1];
            const x = scaleX(priceHistory.length - 1);
            const y = scaleY(lastPoint.price);

            ctx.fillStyle = '#22d3ee';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Glow effect
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
            gradient.addColorStop(0, 'rgba(34, 211, 238, 0.5)');
            gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw "Safe Zone" area between price and barrier
        if (priceHistory.length > 1 && barriers.length > 0) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
            ctx.beginPath();

            // Price line forward
            priceHistory.forEach((point, i) => {
                const x = scaleX(i);
                const y = scaleY(point.price);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });

            // Barrier line backward
            for (let i = priceHistory.length - 1; i >= 0; i--) {
                const point = priceHistory[i];
                if (point.barrier) {
                    const x = scaleX(i);
                    const y = scaleY(point.barrier);
                    ctx.lineTo(x, y);
                }
            }

            ctx.closePath();
            ctx.fill();
        }

    }, [priceHistory]);

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Fortress Desativada');
        } else {
            if (!isConnected) {
                toast.error('Conecte su cuenta Deriv primero');
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
                safetyFactor: localSafetyFactor,
            });

            if (success) toast.success('🛡️ Bug Deriv Ativado!');
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={13} className="text-emerald-400" />;
            case 'error': return <XCircle size={13} className="text-rose-400" />;
            case 'warning': return <AlertCircle size={13} className="text-amber-400" />;
            case 'higher': return <ChevronUp size={13} className="text-cyan-400" />;
            case 'lower': return <ChevronDown size={13} className="text-violet-400" />;
            case 'volatility': return <Activity size={13} className="text-amber-400" />;
            case 'trend': return <TrendingUp size={13} className="text-emerald-400" />;
            case 'blocked': return <Minus size={13} className="text-slate-500" />;
            default: return <ArrowRight size={13} className="text-slate-500" />;
        }
    };

    // --- TREND INDICATOR ---
    const TrendIndicator = () => {
        const direction = stats.trendDirection;
        const isUp = direction === 'up';
        const isDown = direction === 'down';
        const isNeutral = direction === 'neutral';

        return (
            <div className={cn(
                "relative p-4 rounded-xl border transition-all duration-300",
                isUp && "bg-emerald-500/10 border-emerald-500/30",
                isDown && "bg-rose-500/10 border-rose-500/30",
                isNeutral && "bg-slate-500/10 border-slate-500/30"
            )}>
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center",
                        isUp && "bg-emerald-500/20",
                        isDown && "bg-rose-500/20",
                        isNeutral && "bg-slate-500/20"
                    )}>
                        {isUp && <TrendingUp size={28} className="text-emerald-400" />}
                        {isDown && <TrendingDown size={28} className="text-rose-400" />}
                        {isNeutral && <Minus size={28} className="text-slate-400" />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-lg font-bold font-mono",
                                isUp && "text-emerald-400",
                                isDown && "text-rose-400",
                                isNeutral && "text-slate-400"
                            )}>
                                {isUp && 'HIGHER 🔼'}
                                {isDown && 'LOWER 🔽'}
                                {isNeutral && 'AGUARDANDO ⏸️'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isUp && 'Tendencia Alcista - Barrera Inferior'}
                            {isDown && 'Tendencia Bajista - Barrera Superior'}
                            {isNeutral && 'Analizando Micro-Tendencia...'}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // --- VOLATILITY GAUGE ---
    const VolatilityGauge = () => {
        const avgVol = stats.avgVolatility;
        const offset = Math.abs(stats.barrierOffset);
        const probability = stats.successProbability;

        return (
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        Volatilidad ATR
                    </span>
                    <span className="text-lg font-mono font-bold text-amber-400">
                        {avgVol.toFixed(4)}
                    </span>
                </div>

                {/* Volatility Bar */}
                <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, avgVol * 10000)}%` }}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                        <span className="text-[9px] text-slate-500 block">Offset</span>
                        <span className="text-sm font-mono font-bold text-cyan-400">
                            {offset.toFixed(4)}
                        </span>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                        <span className="text-[9px] text-slate-500 block">Factor de Seguridad</span>
                        <span className="text-sm font-mono font-bold text-violet-400">
                            {safetyFactor.toFixed(1)}x
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    // --- PROBABILITY DISPLAY ---
    const ProbabilityDisplay = () => {
        const probability = stats.successProbability;
        const barrier = stats.currentBarrier;
        const price = stats.currentPrice;

        const getColor = (prob: number) => {
            if (prob >= 85) return 'text-emerald-400';
            if (prob >= 70) return 'text-cyan-400';
            if (prob >= 55) return 'text-amber-400';
            return 'text-slate-400';
        };

        return (
            <div className="bg-black/40 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        Probabilidad de Éxito
                    </span>
                    <ShieldCheck size={16} className="text-emerald-400" />
                </div>

                <div className="text-center mb-4">
                    <span className={cn("text-4xl font-mono font-bold", getColor(probability))}>
                        {probability.toFixed(0)}%
                    </span>
                </div>

                {/* Probability Ring */}
                <div className="relative w-24 h-24 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="48"
                            cy="48"
                            r="40"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="8"
                        />
                        <circle
                            cx="48"
                            cy="48"
                            r="40"
                            fill="none"
                            stroke="url(#bugDerivProbGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${probability * 2.51} 251`}
                            className="transition-all duration-500"
                        />
                        <defs>
                            <linearGradient id="bugDerivProbGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#22d3ee" />
                                <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Shield size={32} className="text-emerald-400/50" />
                    </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Precio Actual</span>
                        <span className="text-cyan-400">{price.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Barrera</span>
                        <span className="text-amber-400">{barrier.toFixed(4)}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#080a0e] text-slate-200">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-0 left-0 w-full h-[300px] bg-cyan-600/5 blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-600/5 blur-[120px]" />
            </div>

            <div className="relative z-10 p-4 md:p-6 max-w-7xl mx-auto space-y-5 pt-20 pb-6">
                <RecentGainsTicker className="-mx-4 mb-2" />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-slate-400" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center relative">
                                <Shield size={24} className="text-cyan-400" />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                    <Bug size={12} className="text-amber-400" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    Bug Deriv
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
                                        Quant Shield
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 font-mono">
                                    Volatility Barrier | Higher/Lower | {fortressConfig.SYMBOL_NAME}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono bg-slate-900/50 border-white/10">
                            {isConnected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-rose-400" />}
                            <span className={isConnected ? "text-emerald-400" : "text-rose-400"}>{isConnected ? "LINKED" : "OFFLINE"}</span>
                        </div>
                    </div>
                </div>

                {/* Dashboard */}
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5">

                    {/* Left: Controls (Order 3 on Mobile) */}
                    <div className="order-3 lg:order-1 lg:col-span-3 space-y-4">
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-5 text-cyan-400">
                                <Settings2 size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">PARÁMETROS</span>
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
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-6 pr-3 text-sm font-mono focus:border-cyan-500/50 focus:outline-none"
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
                                        <span className="text-xs font-medium text-slate-200 block">Martingala</span>
                                        <span className="text-[9px] text-slate-500">{fortressConfig.MARTINGALE_FACTOR}x | Max {fortressConfig.MAX_MARTINGALE_LEVELS}</span>
                                    </div>
                                    <button
                                        onClick={() => setUseMartingale(!useMartingale)}
                                        disabled={isRunning}
                                        className={cn("w-8 h-4 rounded-full relative transition-colors", useMartingale ? "bg-cyan-500" : "bg-slate-700")}
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
                                        : "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20"
                                )}
                            >
                                {isRunning ? <><Square size={14} fill="currentColor" /> PARAR</> : <><Play size={14} fill="currentColor" /> INICIAR</>}
                            </button>

                            {isFree && <div className="mt-4"><FreemiumProgressBar currentProfit={currentProfit} /></div>}
                        </div>

                        {/* Shield Info */}
                        <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Shield size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-bold text-cyan-300 mb-1">Escudo Matemático</h4>
                                    <p className="text-[10px] text-cyan-200/60 leading-relaxed">
                                        La barrera dinámica se calcula usando la volatilidad real (ATR) multiplicada por el Factor de Seguridad. Cuanto mayor sea el factor, más segura será la apuesta.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center: Chart + Trend (Order 2 on Mobile) */}
                    <div className="order-2 lg:order-2 lg:col-span-6 space-y-4">
                        {/* Price Chart */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <BarChart3 size={16} className="text-cyan-400" />
                                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Gráfico de Precio</span>
                                </div>
                                <div className="flex items-center gap-3 text-[9px] font-mono">
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-0.5 bg-cyan-400 rounded" />
                                        <span className="text-slate-500">Precio</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-0.5 bg-amber-400 rounded" style={{ borderStyle: 'dashed' }} />
                                        <span className="text-slate-500">Barrera</span>
                                    </div>
                                </div>
                            </div>
                            <div className="relative h-[200px] bg-[#0a0c10] rounded-lg overflow-hidden">
                                <canvas
                                    ref={chartRef}
                                    className="w-full h-full"
                                    style={{ width: '100%', height: '100%' }}
                                />
                                {priceHistory.length < 2 && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-slate-600 text-sm">Esperando datos...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Trend Indicator */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Target size={16} className="text-cyan-400" />
                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Dirección Actual</span>
                            </div>
                            <TrendIndicator />
                        </div>

                        {/* Logs */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[200px]">
                            <div className="p-3 border-b border-white/5 flex items-center gap-2">
                                <Activity size={14} className="text-slate-500" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Log de Actividad</span>
                                <span className="ml-auto text-[9px] font-mono text-slate-600">{stats.signalsTriggered} señales</span>
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
                                                log.type === 'higher' && "text-cyan-400",
                                                log.type === 'lower' && "text-violet-400",
                                                log.type === 'volatility' && "text-amber-400",
                                                log.type === 'trend' && "text-emerald-400",
                                                log.type === 'blocked' && "text-slate-500",
                                                log.type === 'warning' && "text-amber-400",
                                                log.type === 'info' && "text-slate-400"
                                            )}>{log.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Gauges + Stats (Order 1 on Mobile) */}
                    <div className="order-1 lg:order-3 lg:col-span-3 space-y-4">
                        <VolatilityGauge />
                        <ProbabilityDisplay />

                        {/* Stats Card */}
                        <div className="bg-[#0c0e14] border border-white/5 rounded-2xl p-5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Rendimiento</span>

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
                                        <span className="text-[10px] text-slate-500 block mb-1">Ganadas</span>
                                        <div className="text-xl font-mono text-emerald-400">{stats.wins}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Perdidas</span>
                                        <div className="text-xl font-mono text-rose-400">{stats.losses}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Stake Actual</span>
                                        <div className="text-lg font-mono text-cyan-400">${stats.currentStake.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Nivel Gale</span>
                                        <div className="text-lg font-mono text-amber-400">{stats.martingaleLevel}</div>
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
