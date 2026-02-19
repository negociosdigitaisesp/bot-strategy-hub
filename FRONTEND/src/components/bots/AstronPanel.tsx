import React, { useState, useEffect, useRef } from 'react';
import {
    Settings2,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    Terminal,
    Code,
    Atom,
    Wifi,
    Lock,
    Snowflake,
    Zap,
    TrendingUp,
    TrendingDown,
    Target,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useBotAstron, LogEntry } from '../../hooks/useBotAstron';
import { StrategyGrid } from './StrategyGrid';
import { useDeriv } from '../../contexts/DerivContext';
import { useFreemiumLimiter, FREEMIUM_LIMITS } from '../../hooks/useFreemiumLimiter';
import { LossAversionModal } from '../LossAversionModal';

// ─── Slim Progress Bar ───
const ProgressBar = ({ value, color }: { value: number; color: string }) => (
    <div className="w-full bg-white/[0.06] h-1 rounded-full mt-2.5 overflow-hidden">
        <div
            className="h-full rounded-full transition-all duration-1000 ease-out will-change-transform"
            style={{
                width: `${Math.max(value, 2)}%`,
                background: `linear-gradient(90deg, ${color}, ${color}88)`,
            }}
        />
    </div>
);

interface AstronPanelProps {
    isActive: boolean;
    onToggle: () => void;
    onBack: () => void;
}

export const AstronPanel: React.FC<AstronPanelProps> = ({ isActive, onToggle, onBack }) => {
    const { isConnected, account } = useDeriv();
    const {
        isRunning,
        stats,
        logs,
        startBot,
        stopBot,
        connectionStatus,
        latency,
        strategies,
        toggleStrategy,
    } = useBotAstron();
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // Freemium limiter
    const { isFree, isLoading, checkStakeLimit, isLimitReached, currentProfit, daysLeft, isOnSessionCooldown } = useFreemiumLimiter();
    const [showLossAversionModal, setShowLossAversionModal] = useState(false);
    const isExpired = daysLeft !== null && daysLeft <= 0;

    // Config States
    const [stake, setStake] = useState<string>('0.35');
    const [stopLoss, setStopLoss] = useState<string>('50.00');
    const [takeProfit, setTakeProfit] = useState<string>('50.00');
    const [useMartingale, setUseMartingale] = useState<boolean>(true);
    const [maxGale, setMaxGale] = useState<string>('3');
    const [martingaleFactor, setMartingaleFactor] = useState<string>('2.5');
    const [useSoros, setUseSoros] = useState<boolean>(false);
    const [sorosLevels, setSorosLevels] = useState<number>(1);
    const [profitTarget, setProfitTarget] = useState<string>('3.00');
    const [maxLosses, setMaxLosses] = useState<string>('2');
    const [showTrafficLock, setShowTrafficLock] = useState(false);

    // Auto-scroll logs
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // Check if profit limit reached
    useEffect(() => {
        if (isLimitReached && isRunning) {
            stopBot();
            setShowLossAversionModal(true);
            toast.warning('¡Límite de prueba alcanzado! Bot detenido.');
        }
    }, [isLimitReached, isRunning, stopBot]);

    // Show loss aversion modal on cooldown
    useEffect(() => {
        if (isOnSessionCooldown && isFree && !isRunning) {
            setShowLossAversionModal(true);
        }
    }, [isOnSessionCooldown, isFree, isRunning]);

    // Dopamine triggers (Free users)
    useEffect(() => {
        if (!isFree) return;
        if (stats.wins > 0 && stats.lastProfit > 0) {
            toast.custom((t) => (
                <div className="bg-[#0d1117] border border-amber-500/20 rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center gap-3 astron-slide-in">
                    <div className="bg-amber-500/10 p-2.5 rounded-lg">
                        <Zap size={18} className="text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-amber-400 font-bold text-xs font-mono uppercase tracking-wider">⚡ Precisión de Élite</h4>
                        <p className="text-white font-mono font-bold text-sm">+${stats.lastProfit.toFixed(2)}</p>
                    </div>
                </div>
            ), { duration: 3000 });
        }
    }, [stats.wins, stats.vaultAccumulated, isFree]);

    const handleToggleBot = (manualStart: boolean = true, overrideStrategies?: string[]) => {
        console.log('🔘 handleToggleBot called:', { manualStart, isRunning, isConnected });

        // Stop bot if already running
        if (isRunning && manualStart) {
            console.log('🛑 Stopping bot...');
            try {
                stopBot();
                toast.info('Bug Deriv Scanner detenido');
            } catch (error) {
                console.error('❌ Error stopping bot:', error);
                toast.error('Error al detener el bot');
            }
            return;
        }

        // Validation checks
        if (!isConnected) {
            console.warn('⚠️ Not connected to Deriv');
            toast.error('Primero debe conectar su cuenta Deriv');
            return;
        }

        if (!isLoading && isFree) {
            console.log('🔒 Free user - showing traffic lock');
            setShowTrafficLock(true);
            return;
        }

        if (isFree && isExpired) {
            console.log('⏰ Trial expired');
            setShowLossAversionModal(true);
            toast.warning('Tu período de prueba ha expirado.');
            return;
        }

        if (isFree && isOnSessionCooldown) {
            console.log('❄️ Session cooldown active');
            setShowLossAversionModal(true);
            toast.warning('Sistema en recarga. Espera o actualiza a PRO.');
            return;
        }

        // Parse and validate config
        const stakeVal = parseFloat(stake);
        const stopLossVal = parseFloat(stopLoss);
        const takeProfitVal = parseFloat(takeProfit);
        const maxGaleVal = parseInt(maxGale);

        if (isNaN(stakeVal) || stakeVal <= 0) {
            console.error('❌ Invalid stake:', stake);
            toast.error('Stake inválido');
            return;
        }

        const stakeCheck = checkStakeLimit(stakeVal);
        if (!stakeCheck.allowed) {
            console.error('❌ Stake limit exceeded:', stakeCheck.message);
            toast.error(stakeCheck.message);
            return;
        }

        if (isNaN(maxGaleVal) || maxGaleVal < 0) {
            console.error('❌ Invalid martingale level:', maxGale);
            toast.error('Nivel de Martingala inválido');
            return;
        }

        const martingaleFactorVal = parseFloat(martingaleFactor) || 2.5;

        let finalStartConfig = {
            stake: stakeVal,
            stopLoss: stopLossVal,
            takeProfit: takeProfitVal,
            useMartingale: useMartingale,
            maxMartingaleLevel: maxGaleVal,
            martingaleFactor: martingaleFactorVal,
            profitTarget: parseFloat(profitTarget) || 3.0,
            maxConsecutiveLosses: parseInt(maxLosses) || 2,
            strategies: undefined as string[] | undefined,
        };

        if (isFree) {
            finalStartConfig = {
                ...finalStartConfig,
                stake: 1.00,
                maxMartingaleLevel: 2,
                martingaleFactor: 2.5,
                stopLoss: 50.00,
                takeProfit: 50.00,
                useSoros: true,
                maxSorosLevels: 1
            } as typeof finalStartConfig;
            toast.success('⚡ MODO TURBO-SCALP ACTIVADO: Alta Velocidad.');
        }

        // Get active strategies
        const activeStrategyNames = overrideStrategies || strategies.filter(s => s.active).map(s => s.name);
        console.log('🎯 Tentando iniciar bot com estratégias:', activeStrategyNames);

        // Add strategies to config
        finalStartConfig = {
            ...finalStartConfig,
            strategies: activeStrategyNames
        };

        // Try to start bot with error handling
        try {
            console.log('🚀 Calling startBot with config:', finalStartConfig);
            const success = startBot(finalStartConfig);

            if (success) {
                console.log('✅ Bot started successfully');
                toast.success('🚀 Bug Deriv Scanner iniciado — Esperando Señales');
            } else {
                console.error('❌ startBot returned false');
                toast.error('Falha ao iniciar o bot. Verifique a conexão.');
            }
        } catch (error) {
            console.error('❌ Exception in startBot:', error);
            toast.error(`Erro ao iniciar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    };

    const handleStrategyToggle = (id: number) => {
        toggleStrategy(id);
        const strategy = strategies.find(s => s.id === id);
        if (strategy) {
            if (strategy.active && isRunning) {
                stopBot();
                return;
            }
            if (!strategy.active && !isRunning) {
                handleToggleBot(false);
            }
        }
    };

    const handleMasterToggle = () => {
        const sorted = [...strategies].sort((a, b) => b.syncScore - a.syncScore);
        const top3 = sorted.slice(0, 3);
        const top3Ids = top3.map(s => s.id);

        strategies.forEach(s => {
            // Stop if active and not in top 3
            if (s.active && !top3Ids.includes(s.id)) {
                toggleStrategy(s.id);
            }
            // Start if not active and in top 3
            if (!s.active && top3Ids.includes(s.id)) {
                toggleStrategy(s.id);
            }
        });

        if (!isRunning) {
            const top3Names = top3.map(s => s.name);
            handleToggleBot(false, top3Names);
        }

        toast.success('🏆 ¡Top 3 Mejores Bots Activados!');
    };

    const winRate = (stats.wins + stats.losses) > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : '0.0';

    const totalOps = stats.wins + stats.losses;

    // ─── Toggle switch component ───
    const ToggleSwitch = ({ enabled, onToggle: onSwitchToggle, color, disabled }: { enabled: boolean; onToggle: () => void; color: string; disabled?: boolean }) => (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => !disabled && onSwitchToggle()}
            className={`
                relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0
                ${enabled ? '' : 'bg-white/[0.08]'}
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={enabled ? { backgroundColor: color } : undefined}
        >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
    );

    return (
        <div className="min-h-screen bg-transparent text-white p-4 pt-20 sm:p-6 font-sans">
            <div className="max-w-[1600px] mx-auto">

                {/* ═══════════════════════════════════════════
                    HEADER
                ═══════════════════════════════════════════ */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-[#0d1117]/60 p-4 sm:p-5 rounded-2xl border border-white/[0.06] backdrop-blur-md gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="relative">
                            <div className="p-2.5 sm:p-3 bg-amber-500/10 rounded-xl border border-amber-500/15">
                                <Atom className="text-amber-400" size={22} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase flex items-center gap-2.5">
                                Bug Deriv Scanner
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/15 font-mono tracking-widest astron-shimmer-badge">
                                    2.2X
                                </span>
                            </h1>
                            <p className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono font-medium mt-0.5">
                                Algoritmo de Apalancamiento Cuántico v5.0
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button
                            onClick={handleMasterToggle}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold font-mono rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105 transition-transform flex items-center gap-2 border border-amber-400/20"
                        >
                            <Sparkles size={14} className="text-white" />
                            ACTIVAR MEJORES BOTS
                        </button>

                        <div className="text-left sm:text-right flex-1 sm:flex-none">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-medium font-mono mb-1">Estado</span>
                            <div className="flex items-center gap-1.5">
                                <Wifi size={11} className={isConnected ? "text-emerald-400" : "text-red-400"} />
                                <span className="text-xs font-semibold text-white">{isConnected ? 'Conectado' : 'Desconectado'}</span>
                            </div>
                        </div>
                        <div className={`
                            px-4 py-2 rounded-xl border text-xs font-bold font-mono transition-all duration-300 flex items-center gap-2
                            ${isRunning
                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                                : 'bg-white/[0.03] border-white/[0.08] text-gray-500'
                            }
                        `}>
                            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-cyan-400 astron-dot-pulse' : 'bg-gray-600'}`} />
                            {isRunning ? '📡 NUBE ACTIVA' : 'EN REPOSO'}
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    MAIN GRID
                ═══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">

                    {/* ─── LEFT COLUMN: Stats + Config ─── */}
                    <div className="lg:col-span-4 flex flex-col gap-5 order-1">

                        {/* ── Resultado Global ── */}
                        <div className="bg-[#0d1117]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-white/[0.06] astron-card">
                            <div className="flex justify-between items-center mb-5">
                                <div className="flex items-center gap-2">
                                    <Terminal size={16} className="text-cyan-400" />
                                    <h3 className="text-white font-bold text-xs tracking-wider font-mono uppercase">Resultado Global</h3>
                                </div>
                                <Shield size={13} className="text-gray-600" />
                            </div>

                            {/* Total Profit */}
                            <div className="text-center mb-6">
                                <p className="text-[10px] font-semibold text-gray-500 tracking-widest uppercase mb-2">Beneficio Total</p>
                                <div className={`text-4xl sm:text-5xl font-black tracking-tight transition-colors duration-500 ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                                    <span className="text-base opacity-40 ml-1">$</span>
                                </div>
                            </div>

                            {/* Win / Rate / Loss mini-cards */}
                            <div className="grid grid-cols-3 gap-2.5">
                                {/* Wins */}
                                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                                    <TrendingUp size={14} className="text-emerald-400 mx-auto mb-1.5 opacity-70" />
                                    <span className="text-xl font-bold text-emerald-400 block">{stats.wins}</span>
                                    <ProgressBar
                                        value={totalOps > 0 ? (stats.wins / totalOps) * 100 : 0}
                                        color="#34d399"
                                    />
                                    <span className="text-[9px] text-gray-500 mt-2 block font-semibold tracking-wider uppercase">Ganadas</span>
                                </div>

                                {/* Win Rate */}
                                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                                    <Target size={14} className="text-blue-400 mx-auto mb-1.5 opacity-70" />
                                    <span className="text-xl font-bold text-blue-400 block">{winRate}%</span>
                                    <ProgressBar
                                        value={parseFloat(winRate)}
                                        color="#60a5fa"
                                    />
                                    <span className="text-[9px] text-gray-500 mt-2 block font-semibold tracking-wider uppercase">Precisión</span>
                                </div>

                                {/* Losses */}
                                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                                    <TrendingDown size={14} className="text-red-400 mx-auto mb-1.5 opacity-70" />
                                    <span className="text-xl font-bold text-red-400 block">{stats.losses}</span>
                                    <ProgressBar
                                        value={totalOps > 0 ? (stats.losses / totalOps) * 100 : 0}
                                        color="#f87171"
                                    />
                                    <span className="text-[9px] text-gray-500 mt-2 block font-semibold tracking-wider uppercase">Perdidas</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Configuración ── */}
                        <div className="bg-[#0d1117]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-6 flex flex-col border border-white/[0.06] astron-card relative">
                            <div className="flex items-center gap-2 mb-5">
                                <Code size={15} className="text-cyan-400" />
                                <h3 className="text-white font-bold text-xs tracking-wider font-mono uppercase">Configuración</h3>
                            </div>

                            {/* FREE USER LOCK OVERLAY */}
                            {isFree && (
                                <div className="absolute inset-0 z-50 bg-[#0d1117]/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 rounded-2xl">
                                    <div className="bg-amber-500/10 p-3.5 rounded-full mb-4 border border-amber-500/15">
                                        <Lock size={28} className="text-amber-400" />
                                    </div>
                                    <h4 className="text-amber-400 font-black text-sm uppercase tracking-widest mb-2">
                                        ⚡ Modo Turbo-Scalp
                                    </h4>
                                    <p className="text-gray-400 text-xs max-w-[240px] leading-relaxed">
                                        Configuración de alta velocidad para crecimiento rápido y máxima adrenalina.
                                    </p>
                                    <div className="mt-3 flex items-center gap-1.5 text-[9px] text-gray-600 font-mono">
                                        <Zap size={9} className="text-amber-500" />
                                        <span>MODE: AGGRESSIVE_GROWTH_V2</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 space-y-5">
                                {/* Stake */}
                                <div>
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2 block pl-0.5 font-mono">Apuesta Inicial ($)</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors font-mono text-sm">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={stake}
                                            onChange={(e) => setStake(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-[#080b12] border border-white/[0.08] rounded-xl py-3 pl-8 pr-4 text-white font-mono text-base font-bold focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all disabled:opacity-40"
                                        />
                                    </div>
                                </div>

                                {/* Stop Loss / Take Profit */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-red-400/80 font-semibold uppercase tracking-wider mb-2 block pl-0.5 font-mono">Límite Pérdida ($)</label>
                                        <input
                                            type="number"
                                            value={stopLoss}
                                            onChange={(e) => setStopLoss(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-[#080b12] border border-red-500/15 rounded-xl py-3 px-4 text-red-400 font-mono font-bold text-sm focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-all disabled:opacity-40"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-cyan-400/80 font-semibold uppercase tracking-wider mb-2 block pl-0.5 font-mono">Meta Ganancia ($)</label>
                                        <input
                                            type="number"
                                            value={takeProfit}
                                            onChange={(e) => setTakeProfit(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-[#080b12] border border-cyan-500/15 rounded-xl py-3 px-4 text-cyan-400 font-mono font-bold text-sm focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all disabled:opacity-40"
                                        />
                                    </div>
                                </div>

                                {/* ── Martingale ── */}
                                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-white font-mono">Protocolo Martingala</span>
                                        <ToggleSwitch enabled={useMartingale} onToggle={() => setUseMartingale(!useMartingale)} color="#22d3ee" disabled={isRunning} />
                                    </div>
                                    {useMartingale && (
                                        <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-3">
                                            <div>
                                                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5 block font-mono">Max Gale (Niveles)</label>
                                                <input type="number" value={maxGale} onChange={(e) => setMaxGale(e.target.value)} disabled={isRunning}
                                                    className="w-full bg-[#080b12] border border-white/[0.08] rounded-lg py-2.5 px-3 text-white font-mono text-sm focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-40"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5 block font-mono">Factor Multiplicador</label>
                                                <input type="number" step="0.1" min="1.5" max="15" value={martingaleFactor} onChange={(e) => setMartingaleFactor(e.target.value)} disabled={isRunning}
                                                    className="w-full bg-[#080b12] border border-white/[0.08] rounded-lg py-2.5 px-3 text-white font-mono text-sm focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-40"
                                                />
                                                <p className="text-[9px] text-gray-600 mt-1 font-mono">Ej: 2.5 = dobla + 50%. 11 = payout DIFF</p>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-gray-600 leading-relaxed font-mono mt-3">
                                        Factor configurable. Stake inicial: ${stake}
                                    </p>
                                </div>

                                {/* ── Soros Strategy ── */}
                                <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${useSoros
                                    ? 'bg-purple-500/[0.06] border-purple-500/25'
                                    : 'bg-white/[0.02] border-white/[0.06]'
                                    }`}>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`p-2 rounded-lg transition-colors duration-300 ${useSoros ? 'bg-purple-500/15 text-purple-400' : 'bg-white/[0.04] text-gray-500'}`}>
                                                    <Zap size={16} />
                                                </div>
                                                <div>
                                                    <span className={`text-sm font-bold font-mono block ${useSoros ? 'text-white' : 'text-gray-400'}`}>
                                                        Estrategia Soros
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                                                        {useSoros ? `Nivel ${sorosLevels} Activo` : 'Desactivado'}
                                                    </span>
                                                </div>
                                            </div>
                                            <ToggleSwitch enabled={useSoros} onToggle={() => setUseSoros(!useSoros)} color="#a855f7" disabled={isRunning} />
                                        </div>

                                        {/* Expandable Area */}
                                        <div className={`transition-all duration-400 ease-out ${useSoros ? 'max-h-52 opacity-100 mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                            {/* Level Slider */}
                                            <div className="pb-3">
                                                <div className="flex justify-between text-[9px] text-purple-400/60 font-mono mb-2 uppercase font-semibold">
                                                    <span>Conservador (1)</span>
                                                    <span>Agresivo (5)</span>
                                                </div>
                                                <div className="relative h-1.5 bg-white/[0.06] rounded-full cursor-pointer group">
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                                                        style={{ width: `${(sorosLevels / 5) * 100}%` }}
                                                    />
                                                    <input type="range" min="1" max="5" step="1" disabled={isRunning} value={sorosLevels} onChange={(e) => setSorosLevels(parseInt(e.target.value))}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-purple-500 transition-all duration-300 pointer-events-none"
                                                        style={{ left: `calc(${(sorosLevels / 5) * 100}% - 7px)` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Cycle Feedback */}
                                            <div className="bg-black/30 rounded-lg p-3 border border-purple-500/10 flex items-center justify-between text-[10px] font-mono">
                                                <div className="text-center">
                                                    <span className="block text-gray-500 text-[8px] uppercase mb-0.5">Base</span>
                                                    <span className="text-white font-bold">${stake}</span>
                                                </div>
                                                <div className="flex-1 mx-3 relative h-px bg-purple-500/20">
                                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500/15 px-2 rounded-full text-[8px] text-purple-400 font-bold whitespace-nowrap border border-purple-500/20">
                                                        {sorosLevels} {sorosLevels === 1 ? 'Nivel' : 'Niveles'}
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <span className="block text-gray-500 text-[8px] uppercase mb-0.5">Meta</span>
                                                    <span className="text-purple-400 font-bold">Max Power</span>
                                                </div>
                                            </div>

                                            <p className="text-[9px] text-gray-600 mt-2.5 text-center leading-relaxed">
                                                Reinicia a la base después de <strong className="text-purple-400">{sorosLevels}</strong> victorias consecutivas.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Bóveda Inteligente ── */}
                                <div className="bg-cyan-500/[0.04] rounded-xl p-4 border border-cyan-500/15">
                                    <div className="flex items-center gap-2 mb-3.5">
                                        <Snowflake size={14} className="text-cyan-400" />
                                        <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider font-mono">Bóveda Inteligente</label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-mono mb-1 block uppercase">🏦 Meta Ganancia ($)</label>
                                            <input type="number" step="0.50" min="1" value={profitTarget} onChange={(e) => setProfitTarget(e.target.value)} disabled={isRunning}
                                                className="w-full bg-[#080b12] border border-cyan-500/15 rounded-lg py-2.5 px-3 text-cyan-300 font-mono text-sm focus:border-cyan-400/50 focus:outline-none transition-all disabled:opacity-40"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-mono mb-1 block uppercase">🛡️ Máx Pérdidas</label>
                                            <input type="number" step="1" min="1" max="5" value={maxLosses} onChange={(e) => setMaxLosses(e.target.value)} disabled={isRunning}
                                                className="w-full bg-[#080b12] border border-cyan-500/15 rounded-lg py-2.5 px-3 text-cyan-300 font-mono text-sm focus:border-cyan-400/50 focus:outline-none transition-all disabled:opacity-40"
                                            />
                                        </div>
                                    </div>

                                    <p className="text-[9px] text-cyan-400/40 mt-2.5 font-mono leading-relaxed">
                                        Al alcanzar la meta o pérdidas consecutivas, la Bóveda se activa por 60-90s para proteger tu capital.
                                    </p>
                                </div>

                                {/* Strategy label */}
                                <div className="pt-4 border-t border-white/[0.06]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500 font-medium font-mono">Estrategia</span>
                                        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-lg border border-cyan-400/15 font-mono tracking-wide">
                                            SHADOW + INERTIA
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── RIGHT COLUMN: Strategy Grid + Logs ─── */}
                    <div className="lg:col-span-8 flex flex-col gap-5 order-2">

                        {/* Strategy Grid */}
                        <StrategyGrid
                            strategies={strategies}
                            isRunning={isRunning}
                            onToggleStrategy={handleStrategyToggle}
                        />

                        {/* ── Log Area ── */}
                        <div className="bg-[#0d1117]/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 flex flex-col h-[280px] lg:h-[400px] border border-white/[0.06] astron-card">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                                <div className="flex items-center gap-2">
                                    <Terminal size={15} className="text-cyan-400" />
                                    <h3 className="text-white font-bold text-xs tracking-wider font-mono uppercase">Registro</h3>
                                </div>
                                <div className="flex gap-6 text-[10px] font-semibold text-gray-500 tracking-wider bg-white/[0.03] px-3.5 py-1.5 rounded-lg border border-white/[0.04] font-mono">
                                    <span className="hidden sm:block w-16">Hora</span>
                                    <span className="flex-1 text-gray-400">Proceso</span>
                                    <span className="w-16 text-right">Estado</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar flex flex-col" ref={logsContainerRef}>
                                {logs.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-25">
                                        <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3">
                                            <Terminal size={28} className="text-cyan-400" />
                                        </div>
                                        <p className="text-sm font-medium tracking-wide font-mono text-gray-400">Esperando inicio...</p>
                                    </div>
                                )}
                                {logs.map((log, index) => {
                                    const typeStyles = {
                                        success: { row: 'bg-cyan-500/[0.04] border-cyan-500/15', icon: 'bg-cyan-500/10 text-cyan-400', badge: 'text-cyan-400' },
                                        error: { row: 'bg-red-500/[0.04] border-red-500/15', icon: 'bg-red-500/10 text-red-400', badge: 'text-red-400' },
                                        gold: { row: 'bg-amber-500/[0.04] border-amber-500/15', icon: 'bg-amber-500/10 text-amber-400', badge: 'text-amber-400' },
                                        info: { row: 'bg-white/[0.02] border-white/[0.06]', icon: 'bg-blue-500/10 text-blue-400', badge: 'text-gray-500' },
                                    };
                                    const style = typeStyles[log.type as keyof typeof typeStyles] || typeStyles.info;

                                    return (
                                        <div key={`${log.id}-${index}`} className={`astron-log-enter group flex items-center justify-between p-3 rounded-xl border transition-all duration-200 hover:brightness-110 ${style.row}`}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`p-1.5 rounded-lg shrink-0 ${style.icon}`}>
                                                    {log.type === 'success' ? <ArrowUpRight size={15} strokeWidth={2.5} /> :
                                                        log.type === 'error' ? <ArrowDownRight size={15} strokeWidth={2.5} /> :
                                                            log.type === 'gold' ? <Sparkles size={15} /> :
                                                                <Code size={15} />}
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 flex-1 min-w-0">
                                                    <span className="text-[10px] font-mono text-gray-500 w-16 shrink-0">{log.time}</span>
                                                    <h4 className="text-xs font-semibold tracking-wide font-mono text-white/80 truncate">{log.message}</h4>
                                                </div>
                                            </div>
                                            <div className="text-right w-16 shrink-0">
                                                <span className={`font-mono font-black text-xs ${style.badge}`}>
                                                    {log.type === 'success' ? 'WIN' : log.type === 'error' ? 'LOSS' : log.type === 'gold' ? '⭐' : 'INFO'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loss Aversion Modal */}
            <LossAversionModal
                isOpen={showLossAversionModal}
                onClose={() => setShowLossAversionModal(false)}
            />
        </div>
    );
};

export default AstronPanel;
