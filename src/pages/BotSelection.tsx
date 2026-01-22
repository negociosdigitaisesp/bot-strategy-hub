import React, { useState, useEffect } from 'react';
import {
    Zap,
    TrendingUp,
    TrendingDown,
    Shield,
    Activity,
    BarChart3,
    Sparkles,
    CheckCircle2,
    XCircle,
    Target,
    Wallet,
    Wifi,
    WifiOff,
    Bot,
    Power,
    Settings2,
    Radio,
    Gauge,
    CircleDot,
    ArrowLeft,
    DollarSign,
    Rocket,
    Flame,
    Atom,
    Lock,
    Unlock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePricingModal } from '../contexts/PricingModalContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { useDeriv } from '../contexts/DerivContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';

import { GainPanel } from '../components/bots/GainPanel';
import { MaquinaPanel } from '../components/bots/MaquinaPanel';
import { AstronPanel } from '../components/bots/AstronPanel';
import { XtremePanel } from '../components/bots/XtremePanel';
import { QuantumPanel } from '../components/bots/QuantumPanel';
import APIStatusIndicator from '../components/APIStatusIndicator';
import RecentGainsTicker from '../components/RecentGainsTicker';

// ============================================
// PRO TRADER HUD - PANEL DE SESIÓN
// ============================================

const SessionDashboard = () => {
    const { sessionProfit, totalTrades, totalWins, totalLosses, winRate, activeBot } = useTradingSession();
    const { isConnected, account } = useDeriv();

    const isProfitable = sessionProfit >= 0;
    const displayBot = activeBot || 'En espera';
    const isWinRateGood = winRate >= 50;

    return (
        <div className="relative mb-8">
            {/* Efectos de Brillo Ambiental */}
            <div className="absolute -top-32 left-1/3 w-96 h-96 bg-primary/10 blur-[150px] rounded-full opacity-50 pointer-events-none" />
            <div className="absolute -top-20 right-1/4 w-64 h-64 bg-emerald-500/10 blur-[120px] rounded-full opacity-40 pointer-events-none" />

            {/* ===== LAYOUT BENTO GRID ===== */}
            <div className="grid grid-cols-12 gap-3 md:gap-4">

                {/* ===== HERO CARD: GANANCIA TOTAL ===== */}
                <div className={cn(
                    "col-span-12 md:col-span-4 lg:col-span-4 row-span-2",
                    "relative overflow-hidden rounded-2xl p-6",
                    "backdrop-blur-xl border transition-all duration-500",
                    isProfitable
                        ? "bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-black/60 border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                        : "bg-gradient-to-br from-rose-950/40 via-rose-900/20 to-black/60 border-rose-500/20 shadow-lg shadow-rose-500/5"
                )}>
                    {/* Overlay de Gradiente */}
                    <div className={cn(
                        "absolute inset-0 opacity-20",
                        isProfitable
                            ? "bg-gradient-to-t from-emerald-500/10 via-transparent to-transparent"
                            : "bg-gradient-to-t from-rose-500/10 via-transparent to-transparent"
                    )} />

                    {/* Contenido */}
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    {isProfitable ? (
                                        <TrendingUp size={18} className="text-emerald-400" />
                                    ) : (
                                        <TrendingDown size={18} className="text-rose-400" />
                                    )}
                                    <span className={cn(
                                        "text-xs font-bold uppercase tracking-widest",
                                        isProfitable ? "text-emerald-400/70" : "text-rose-400/70"
                                    )}>
                                        Ganancia de Sesión
                                    </span>
                                </div>
                                <div className={cn(
                                    "w-2 h-2 rounded-full animate-pulse",
                                    isProfitable ? "bg-emerald-400 shadow-lg shadow-emerald-400/50" : "bg-rose-400 shadow-lg shadow-rose-400/50"
                                )} />
                            </div>

                            {/* Número Grande */}
                            <div className={cn(
                                "text-4xl md:text-5xl font-black font-mono tracking-tight",
                                isProfitable ? "text-emerald-300" : "text-rose-300"
                            )}>
                                {isProfitable ? '+' : ''}{sessionProfit.toFixed(2)}
                                <span className="text-lg ml-2 opacity-50 font-sans font-medium">USD</span>
                            </div>
                        </div>

                        {/* Fila de Mini Stats */}
                        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <CircleDot size={12} className="text-emerald-400" />
                                <span className="text-emerald-400 font-mono text-sm font-bold">{totalWins}</span>
                                <span className="text-white/30 text-[10px] uppercase">ganadas</span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-2">
                                <CircleDot size={12} className="text-rose-400" />
                                <span className="text-rose-400 font-mono text-sm font-bold">{totalLosses}</span>
                                <span className="text-white/30 text-[10px] uppercase">perdidas</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== ESTADO DE CONEXIÓN ===== */}
                <div className={cn(
                    "col-span-6 md:col-span-4 lg:col-span-2",
                    "relative overflow-hidden rounded-xl p-4",
                    "bg-slate-900/50 backdrop-blur-xl border border-white/10",
                    "hover:border-white/20 transition-all duration-300"
                )}>
                    <div className="flex items-center gap-2 mb-3">
                        {isConnected ? (
                            <>
                                <div className="relative">
                                    <Wifi size={14} className="text-cyan-400" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/70">Conexión</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={14} className="text-rose-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400/70">Conexión</span>
                            </>
                        )}
                    </div>
                    <p className={cn(
                        "text-lg font-bold font-mono",
                        isConnected ? "text-cyan-300" : "text-rose-300"
                    )}>
                        {isConnected ? 'EN VIVO' : 'FUERA'}
                    </p>
                </div>

                {/* ===== BOT ACTIVO ===== */}
                <div className={cn(
                    "col-span-6 md:col-span-4 lg:col-span-3",
                    "relative overflow-hidden rounded-xl p-4",
                    "bg-slate-900/50 backdrop-blur-xl border border-white/10",
                    "hover:border-violet-500/30 transition-all duration-300"
                )}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="relative">
                            <Bot size={14} className="text-violet-400" />
                            {activeBot && (
                                <>
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-400 rounded-full animate-ping" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-400 rounded-full" />
                                </>
                            )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400/70">Bot Activo</span>
                    </div>
                    <p className="text-lg font-bold text-violet-300 truncate font-mono">
                        {displayBot}
                    </p>
                </div>

                {/* ===== SALDO ===== */}
                <div className={cn(
                    "col-span-12 md:col-span-4 lg:col-span-3",
                    "relative overflow-hidden rounded-xl p-4",
                    "bg-gradient-to-br from-amber-950/30 via-amber-900/10 to-black/40",
                    "backdrop-blur-xl border border-amber-500/20",
                    "hover:border-amber-500/40 transition-all duration-300"
                )}>
                    <div className="flex items-center gap-2 mb-3">
                        <Wallet size={14} className="text-amber-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">Saldo</span>
                    </div>
                    <p className="text-xl font-black text-amber-300 font-mono">
                        {isConnected && account ? account.balance : '----'}
                        <span className="text-xs ml-1.5 text-amber-400/50 font-sans">{account?.currency || 'USD'}</span>
                    </p>
                </div>

                {/* ===== TASA DE ACIERTO ===== */}
                <div className={cn(
                    "col-span-12 md:col-span-4 lg:col-span-4",
                    "relative overflow-hidden rounded-xl p-4",
                    "bg-slate-900/50 backdrop-blur-xl border border-white/10",
                    "hover:border-white/20 transition-all duration-300"
                )}>
                    <div className="flex items-center gap-2 mb-3">
                        <Gauge size={14} className={isWinRateGood ? "text-yellow-400" : "text-slate-400"} />
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            isWinRateGood ? "text-yellow-400/70" : "text-slate-400/70"
                        )}>Tasa de Acierto</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={cn(
                            "text-2xl font-black font-mono",
                            isWinRateGood ? "text-yellow-300" : "text-slate-400"
                        )}>
                            {winRate > 0 ? winRate.toFixed(1) : '0.0'}
                        </span>
                        <span className={cn(
                            "text-sm font-bold",
                            isWinRateGood ? "text-yellow-400/60" : "text-slate-500"
                        )}>%</span>
                    </div>
                    {/* Barra de Progreso */}
                    <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isWinRateGood
                                    ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                                    : "bg-slate-600"
                            )}
                            style={{ width: `${Math.min(winRate, 100)}%` }}
                        />
                    </div>
                </div>

                {/* ===== GANADAS ===== */}
                <div className={cn(
                    "col-span-6 md:col-span-6 lg:col-span-2",
                    "relative overflow-hidden rounded-xl p-4",
                    "bg-slate-900/50 backdrop-blur-xl border border-emerald-500/10",
                    "hover:border-emerald-500/30 transition-all duration-300"
                )}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Ganadas</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-400 font-mono">{totalWins}</p>
                </div>

                {/* ===== PERDIDAS ===== */}
                <div className={cn(
                    "col-span-6 md:col-span-6 lg:col-span-2",
                    "relative overflow-hidden rounded-xl p-4",
                    "bg-slate-900/50 backdrop-blur-xl border border-rose-500/10",
                    "hover:border-rose-500/30 transition-all duration-300"
                )}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <XCircle size={12} className="text-rose-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400/60">Perdidas</span>
                    </div>
                    <p className="text-2xl font-black text-rose-400 font-mono">{totalLosses}</p>
                </div>

            </div>
        </div >
    );
};

// ============================================
// TARJETA DE BOT - COMPONENTE REUTILIZABLE
// ============================================


// ============================================
// STRATEGY CARD - PREMIUM DESIGN
// ============================================

interface BotCardProps {
    name: string;
    symbol: string;
    description: string;
    icon: React.ReactNode;
    colorClass: string;
    color: 'purple' | 'emerald' | 'amber' | 'cyan' | 'fuchsia' | 'violet';
    onSelect: () => void;
    isLocked?: boolean;
    openPricingModal: () => void;
}

const colorThemes = {
    purple: {
        iconBg: 'bg-purple-500/20',
        iconText: 'text-purple-400',
        badgeBg: 'bg-slate-800/80',
        badgeText: 'text-purple-300',
        buttonBg: 'bg-purple-500/10',
        buttonText: 'text-purple-400',
        buttonHoverBg: 'hover:bg-purple-500/90',
        buttonHoverText: 'hover:text-white',
        borderHover: 'hover:border-purple-500/30',
    },
    emerald: {
        iconBg: 'bg-emerald-500/20',
        iconText: 'text-emerald-400',
        badgeBg: 'bg-slate-800/80',
        badgeText: 'text-emerald-300',
        buttonBg: 'bg-emerald-500/10',
        buttonText: 'text-emerald-400',
        buttonHoverBg: 'hover:bg-emerald-500/90',
        buttonHoverText: 'hover:text-white',
        borderHover: 'hover:border-emerald-500/30',
    },
    amber: {
        iconBg: 'bg-amber-500/20',
        iconText: 'text-amber-400',
        badgeBg: 'bg-slate-800/80',
        badgeText: 'text-amber-300',
        buttonBg: 'bg-amber-500/10',
        buttonText: 'text-amber-400',
        buttonHoverBg: 'hover:bg-amber-500/90',
        buttonHoverText: 'hover:text-white',
        borderHover: 'hover:border-amber-500/30',
    },
    cyan: {
        iconBg: 'bg-cyan-500/20',
        iconText: 'text-cyan-400',
        badgeBg: 'bg-slate-800/80',
        badgeText: 'text-cyan-300',
        buttonBg: 'bg-cyan-500/10',
        buttonText: 'text-cyan-400',
        buttonHoverBg: 'hover:bg-cyan-500/90',
        buttonHoverText: 'hover:text-white',
        borderHover: 'hover:border-cyan-500/30',
    },
    fuchsia: {
        iconBg: 'bg-fuchsia-500/20',
        iconText: 'text-fuchsia-400',
        badgeBg: 'bg-slate-800/80',
        badgeText: 'text-fuchsia-300',
        buttonBg: 'bg-fuchsia-500/10',
        buttonText: 'text-fuchsia-400',
        buttonHoverBg: 'hover:bg-fuchsia-500/90',
        buttonHoverText: 'hover:text-white',
        borderHover: 'hover:border-fuchsia-500/30',
    },
    violet: {
        iconBg: 'bg-violet-500/20',
        iconText: 'text-violet-400',
        badgeBg: 'bg-slate-800/80',
        badgeText: 'text-violet-300',
        buttonBg: 'bg-violet-500/10',
        buttonText: 'text-violet-400',
        buttonHoverBg: 'hover:bg-violet-500/90',
        buttonHoverText: 'hover:text-white',
        borderHover: 'hover:border-violet-500/30',
    },
};

const BotCard = ({ name, symbol, description, icon, color, onSelect, isLocked = false, openPricingModal }: BotCardProps) => {
    const theme = colorThemes[color];

    const handleClick = () => {
        if (isLocked) return;
        onSelect();
    };

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl border transition-all duration-300 group",
            "bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border-white/5",
            isLocked
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:bg-slate-800/70",
            !isLocked && theme.borderHover
        )}>
            {/* Blurry Glass Locked Overlay with Gamified Unlock */}
            {isLocked && (
                <div className="absolute inset-0 z-10 backdrop-blur-md bg-slate-900/40 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 text-center p-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center animate-pulse">
                            <Lock size={20} strokeWidth={1.5} className="text-violet-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-400 tracking-wide">
                            Acceso Restringido (PRO)
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openPricingModal();
                            }}
                            className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold hover:from-violet-600/40 hover:to-fuchsia-600/40 hover:border-violet-400/50 hover:text-violet-200 transition-all duration-300 shadow-lg shadow-violet-500/10"
                        >
                            <Unlock size={14} className="group-hover:animate-bounce" />
                            Desbloquear Ahora
                        </button>
                    </div>
                </div>
            )}

            <div className="p-6 space-y-5">
                {/* Header with Icon and Info */}
                <div className="flex items-start gap-4">
                    {/* Icon - Circular Premium */}
                    <div className={cn(
                        "relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300",
                        !isLocked && "group-hover:scale-105",
                        theme.iconBg
                    )}>
                        <div className={theme.iconText}>
                            {icon}
                        </div>
                    </div>

                    {/* Bot Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-white tracking-tight">
                                {name}
                            </h3>
                            <span className={cn(
                                "text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                                theme.badgeBg,
                                theme.badgeText
                            )}>
                                {symbol}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed font-normal">
                            {description}
                        </p>
                    </div>
                </div>

                {/* Action Button - Solid Premium */}
                <button
                    onClick={handleClick}
                    disabled={isLocked}
                    className={cn(
                        "w-full px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300",
                        "flex items-center justify-center gap-2",
                        isLocked
                            ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                            : cn(
                                theme.buttonBg,
                                theme.buttonText,
                                theme.buttonHoverBg,
                                theme.buttonHoverText,
                                "shadow-lg hover:shadow-xl"
                            )
                    )}
                >
                    {isLocked ? (
                        <>
                            <Lock size={14} className="shrink-0" />
                            BLOQUEADO
                        </>
                    ) : (
                        <>
                            <Power size={14} className="shrink-0" />
                            SELECCIONAR
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};


// ============================================
// COMPONENTE PRINCIPAL DE LA PÁGINA
// ============================================

const BotSelection = () => {
    const [selectedBot, setSelectedBot] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const { isFree, isLoading: freemiumLoading } = useFreemiumLimiter();
    const { isConnected } = useDeriv();
    const { openPricingModal } = usePricingModal();

    // Auto-selección de bot desde URL (desde Ranking de Asertividad)
    useEffect(() => {
        const selectParam = searchParams.get('select');
        const validBots = ['gain', 'maquina', 'astron', 'xtreme', 'quantum'];

        if (selectParam && validBots.includes(selectParam)) {
            console.log(`Auto-seleccionando bot desde URL: ${selectParam}`);
            setSelectedBot(selectParam);
            // Limpiar el parámetro de la URL para evitar re-selección
            searchParams.delete('select');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#030305] via-[#0a0a0f] to-[#030305]">
            {/* Fondo con Cuadrícula Sutil */}
            <div
                className="fixed inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            />

            <div className="relative max-w-6xl mx-auto py-6 px-4 animate-in fade-in duration-700">
                {/* Recent Gains Ticker */}
                <RecentGainsTicker className="mb-6 -mx-4" />

                {/* Encabezado de Página */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-pulse" />
                                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
                                    <Sparkles className="text-primary" size={20} />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                    Centro de Comando
                                </h1>
                                <p className="text-slate-500 text-xs font-medium">
                                    Terminal de Trading Automatizado
                                </p>
                            </div>
                        </div>
                        {/* API Status Indicator */}
                        <APIStatusIndicator
                            status={isConnected ? 'connected' : 'disconnected'}
                            showLabel={true}
                        />
                    </div>
                </div>

                {/* Panel de Sesión - PRO HUD (Siempre visible) */}
                <SessionDashboard />

                {/* ===== RENDERIZACIÓN CONDICIONAL: LISTA vs DETALLE ===== */}
                {selectedBot === null ? (
                    /* VISTA DE LISTA (Master) */
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 size={16} className="text-slate-400" />
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                Estrategias Disponibles
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                            {/* Gain Bot Card - LOCKED for free users */}
                            <BotCard
                                name="Gain Bot"
                                symbol="R_100"
                                description="Estrategia Smart Recovery • Smart Martingale"
                                icon={<DollarSign size={26} className="text-emerald-400" />}
                                colorClass="bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                color="emerald"
                                onSelect={() => setSelectedBot('gain')}
                                isLocked={isFree}
                                openPricingModal={openPricingModal}
                            />

                            {/* Maquina del Ganancias Bot Card - LOCKED for free users */}
                            <BotCard
                                name="Maquina del Ganancias"
                                symbol="R_75"
                                description="Estrategia Even/Odd basada en análisis de 3 dígitos"
                                icon={<Zap size={26} className="text-amber-400" />}
                                colorClass="bg-amber-500/10 border-amber-500/30 text-amber-400"
                                color="amber"
                                onSelect={() => setSelectedBot('maquina')}
                                isLocked={isFree}
                                openPricingModal={openPricingModal}
                            />

                            {/* Astron Bot Card - LOCKED for free users */}
                            <BotCard
                                name="Astron Bot"
                                symbol="R_100"
                                description="Estrategia Over/Under con alternancia automática"
                                icon={<Rocket size={26} className="text-cyan-400" />}
                                colorClass="bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                color="cyan"
                                onSelect={() => setSelectedBot('astron')}
                                isLocked={isFree}
                                openPricingModal={openPricingModal}
                            />

                            {/* Xtreme Bot Card - LOCKED for free users */}
                            <BotCard
                                name="Xtreme Bot"
                                symbol="R_100"
                                description="Estrategia DIGITDIFF de alto rendimiento"
                                icon={<Flame size={26} className="text-fuchsia-400" />}
                                colorClass="bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400"
                                color="fuchsia"
                                onSelect={() => setSelectedBot('xtreme')}
                                isLocked={isFree}
                                openPricingModal={openPricingModal}
                            />

                            {/* Quantum Bot Card - LOCKED for free users */}
                            <BotCard
                                name="Quantum Bot"
                                symbol="R_100"
                                description="Estrategia avanzada con Soros + Martingale"
                                icon={<Atom size={26} className="text-violet-400" />}
                                colorClass="bg-violet-500/10 border-violet-500/30 text-violet-400"
                                color="violet"
                                onSelect={() => setSelectedBot('quantum')}
                                isLocked={isFree}
                                openPricingModal={openPricingModal}
                            />
                        </div>
                    </div>
                ) : (
                    /* VISTA DE DETALLE (Detail) */
                    <div className="space-y-4">
                        {/* Botón Volver */}
                        <button
                            onClick={() => setSelectedBot(null)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300",
                                "bg-slate-900/50 backdrop-blur-xl border border-white/10 text-slate-300",
                                "hover:bg-slate-800/50 hover:border-white/20 hover:text-white"
                            )}
                        >
                            <ArrowLeft size={16} />
                            Volver a Estrategias
                        </button>

                        {/* Panel del Bot Seleccionado */}
                        <div className="relative overflow-hidden rounded-2xl border bg-slate-900/50 backdrop-blur-xl border-white/10">

                            {selectedBot === 'gain' && (
                                <GainPanel
                                    isActive={true}
                                    onToggle={() => { }}
                                    onBack={() => setSelectedBot(null)}
                                />
                            )}
                            {selectedBot === 'maquina' && (
                                <MaquinaPanel
                                    isActive={true}
                                    onToggle={() => { }}
                                    onBack={() => setSelectedBot(null)}
                                />
                            )}
                            {selectedBot === 'astron' && (
                                <AstronPanel
                                    isActive={true}
                                    onToggle={() => { }}
                                    onBack={() => setSelectedBot(null)}
                                />
                            )}
                            {selectedBot === 'xtreme' && (
                                <XtremePanel
                                    isActive={true}
                                    onToggle={() => { }}
                                    onBack={() => setSelectedBot(null)}
                                />
                            )}
                            {selectedBot === 'quantum' && (
                                <QuantumPanel
                                    isActive={true}
                                    onToggle={() => { }}
                                    onBack={() => setSelectedBot(null)}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Pie de Página */}
                <div className="border-t border-white/5 pt-6 mt-10 grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Shield size={12} />
                        <span>Encriptación AES-256</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
                        <Zap size={12} />
                        <span>Latencia &lt;15ms</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-slate-500 text-xs">
                        <BarChart3 size={12} />
                        <span>Monitoreo 24/7</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BotSelection;
