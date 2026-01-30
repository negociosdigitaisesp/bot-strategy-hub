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
    Eye,
    EyeOff,
    Shield,
    Coins,
    Sparkles,
    Radio,
    Crown,
    Gem,
    ArrowLeft,
    Wifi,
    WifiOff,
    Scan,
    Lock,
    Snowflake,
    RotateCcw,
    Flame,
    HeartPulse
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useEfectoMidas } from '../hooks/useEfectoMidas';
import { useDeriv } from '../contexts/DerivContext';
import { useNavigate } from 'react-router-dom';
import { useFreemiumLimiter, FREEMIUM_LIMITS } from '../hooks/useFreemiumLimiter';
import { useMarketingMode } from '../hooks/useMarketingMode';
import { FreemiumProgressBar } from '../components/FreemiumProgressBar';
import { SystemLimitModal } from '../components/SystemLimitModal';
import RecentGainsTicker from '../components/RecentGainsTicker';
import { SpecialOfferModal } from '../components/SpecialOfferModal';

const EfectoMidas = () => {
    const navigate = useNavigate();
    const { isConnected, account } = useDeriv();
    const { getDisplayLoginId } = useMarketingMode();
    const {
        isRunning,
        isShadowMode,
        stats,
        logs,
        lastDigits,
        digitFrequencies,
        selectedDigit,
        anomalyDetected,
        repeatedDigit,
        startBot,
        stopBot,
        trendStatus,
        // Bóveda Inteligente
        vaultAccumulated,
        isVaultCooldown,
        cooldownRemaining,
        // 📊 Session Accumulator
        sessionData,
        resetSession,
        // 🔥 WARM-UP & MARKET HEALTH
        isWarmingUp,
        warmUpRemaining,
        warmUpTicks,
        marketHealth,
        lastEntryScore,
        // ⚡ KINETIC ACCELERATION FILTER
        kineticAcceleration,
        isKineticBlocked,
        kineticCooldown
    } = useEfectoMidas();

    // Estados de configuración
    const [stake, setStake] = useState<string>(() => localStorage.getItem('midas_stake') || '0.35');
    const [stopLoss, setStopLoss] = useState<string>(() => localStorage.getItem('midas_stoploss') || '10.00');
    const [takeProfit, setTakeProfit] = useState<string>(() => localStorage.getItem('midas_takeprofit') || '5.00');
    const [maxLosses, setMaxLosses] = useState<string>(() => localStorage.getItem('midas_maxlosses') || '2');
    const [useMartingale, setUseMartingale] = useState<boolean>(() => localStorage.getItem('midas_martingale') !== 'false');
    const [martingaleFactor, setMartingaleFactor] = useState<string>(() => localStorage.getItem('midas_factor') || '11.0');

    // 🔒 Bóveda Inteligente config
    const [vaultEnabled, setVaultEnabled] = useState<boolean>(() => localStorage.getItem('midas_vault_enabled') !== 'false');
    const [vaultTarget, setVaultTarget] = useState<string>(() => localStorage.getItem('midas_vault_target') || '3.00');

    const logsEndRef = useRef<HTMLDivElement>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // Freemium limiter
    const { isFree, checkStakeLimit, isLimitReached, currentProfit, daysLeft } = useFreemiumLimiter();
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);

    // Check if trial expired
    const isExpired = daysLeft !== null && daysLeft <= 0;

    // Check if profit limit reached and show modal
    useEffect(() => {
        if (isLimitReached && isRunning) {
            stopBot();
            setShowLimitModal(true);
            toast.warning('¡Meta diaria alcanzada! Bot detenido.');
        }
    }, [isLimitReached, isRunning, stopBot]);

    // Persist config
    useEffect(() => {
        localStorage.setItem('midas_stake', stake);
        localStorage.setItem('midas_stoploss', stopLoss);
        localStorage.setItem('midas_takeprofit', takeProfit);
        localStorage.setItem('midas_maxlosses', maxLosses);
        localStorage.setItem('midas_martingale', String(useMartingale));
        localStorage.setItem('midas_factor', martingaleFactor);
        localStorage.setItem('midas_vault_enabled', String(vaultEnabled));
        localStorage.setItem('midas_vault_target', vaultTarget);
    }, [stake, stopLoss, takeProfit, maxLosses, useMartingale, martingaleFactor, vaultEnabled, vaultTarget]);

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
            toast.info('Efecto Midas desactivado');
        } else {
            if (!isConnected) {
                toast.error('Primero debe conectar su cuenta Deriv');
                return;
            }

            // 🚀 TRIAL EXPIRED: Block users whose free trial has ended
            if (isFree && isExpired) {
                setShowOfferModal(true);
                toast.warning('Tu período de prueba ha expirado. Activa tu plan para continuar.', {
                    duration: 5000,
                });
                return; // Stop bot start - trial expired, user must upgrade
            }

            const stakeVal = parseFloat(stake);
            const stopLossVal = parseFloat(stopLoss);
            const takeProfitVal = parseFloat(takeProfit);
            const maxLossesVal = parseInt(maxLosses);
            const martingaleFactorVal = parseFloat(martingaleFactor);

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
                maxConsecutiveLosses: maxLossesVal || 2,
                symbol: '1HZ100V',
                useMartingale,
                martingaleMultiplier: martingaleFactorVal || 11,
                vaultEnabled,
                vaultTarget: parseFloat(vaultTarget) || 3.0,
            });

            if (success) {
                toast.success('¡Efecto Midas activado!');
            }
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={14} className="text-emerald-400" />;
            case 'error': return <XCircle size={14} className="text-rose-400" />;
            case 'warning': return <AlertCircle size={14} className="text-amber-400" />;
            case 'gold': return <Coins size={14} className="text-amber-400" />;
            default: return <ArrowRight size={14} className="text-white/40" />;
        }
    };

    const winRate = stats.wins + stats.losses > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : '0.0';

    // Elegant digit cell with gold accent
    const DigitCell = ({ digit, index }: { digit: number; index: number }) => {
        const isSelected = selectedDigit === digit;
        const isRepeated = repeatedDigit === digit && anomalyDetected;
        const frequency = digitFrequencies.find(f => f.digit === digit)?.count || 0;
        const isLowFrequency = frequency <= 1;

        return (
            <div
                className={cn(
                    "relative flex flex-col items-center justify-center w-8 h-12 md:w-12 md:h-16 rounded-xl transition-all duration-300",
                    isSelected && "scale-105 -translate-y-0.5",
                    isRepeated && "scale-110"
                )}
            >
                {/* Background with gold gradient border */}
                <div className={cn(
                    "absolute inset-0 rounded-xl transition-all duration-300",
                    isSelected
                        ? "bg-gradient-to-b from-amber-500/15 to-amber-900/10 border border-amber-500/40"
                        : isLowFrequency
                            ? "bg-emerald-500/5 border border-emerald-500/20"
                            : "bg-white/[0.02] border border-white/[0.08]"
                )} />

                {/* Gold glow for selected */}
                {isSelected && (
                    <div className="absolute inset-0 rounded-xl bg-amber-400/5 blur-sm" />
                )}

                {/* Pulse for anomaly */}
                {isRepeated && (
                    <div className="absolute inset-0 rounded-xl border-2 border-amber-400/60 animate-pulse" />
                )}

                {/* Shield for selected */}
                {isSelected && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <Shield size={14} className="text-amber-400 fill-amber-400/30" />
                    </div>
                )}

                {/* Number */}
                <span className={cn(
                    "relative z-10 text-base md:text-xl font-mono font-bold transition-colors duration-300",
                    isSelected ? "text-amber-300" :
                        isLowFrequency ? "text-emerald-400/80" :
                            "text-white/50"
                )}>
                    {digit}
                </span>

                {/* Frequency bar with gradient */}
                <div className="relative z-10 w-6 h-0.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isSelected ? "bg-gradient-to-r from-amber-400 to-amber-600" :
                                isLowFrequency ? "bg-emerald-400" : "bg-white/30"
                        )}
                        style={{ width: `${Math.min((frequency / 5) * 100, 100)}%` }}
                    />
                </div>

                {/* Frequency count */}
                <span className={cn(
                    "relative z-10 text-[9px] font-mono mt-1 transition-colors",
                    isSelected ? "text-amber-400/70" : "text-white/30"
                )}>
                    {frequency}×
                </span>
            </div>
        );
    };

    // Matrix stream with decode effect
    const MatrixStream = () => {
        const [glitchIndex, setGlitchIndex] = useState(-1);

        useEffect(() => {
            if (!isRunning) return;
            const interval = setInterval(() => {
                setGlitchIndex(Math.floor(Math.random() * 20));
                setTimeout(() => setGlitchIndex(-1), 150);
            }, 800);
            return () => clearInterval(interval);
        }, [isRunning]);

        return (
            <div className="flex items-center gap-0.5 overflow-hidden py-1">
                {lastDigits.slice(-20).map((digit, idx) => {
                    const isLast = idx === lastDigits.slice(-20).length - 1;
                    const isAnomaly = idx >= lastDigits.slice(-20).length - 2 &&
                        lastDigits[lastDigits.length - 1] === lastDigits[lastDigits.length - 2];
                    const isGlitching = glitchIndex === idx;

                    return (
                        <span
                            key={idx}
                            className={cn(
                                "w-6 h-6 flex items-center justify-center font-mono text-xs rounded transition-all",
                                isAnomaly && isLast
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                                    : isLast
                                        ? "bg-white/10 text-white/80 border border-white/10"
                                        : isGlitching
                                            ? "text-amber-400 scale-110"
                                            : "text-white/30",
                                isGlitching && "animate-pulse"
                            )}
                            style={{
                                opacity: 0.4 + (idx / 25) * 0.6,
                                animationDuration: '0.15s'
                            }}
                        >
                            {isGlitching ? String.fromCharCode(48 + Math.floor(Math.random() * 10)) : digit}
                        </span>
                    );
                })}
                {lastDigits.length === 0 && (
                    <span className="text-xs text-white/20">Esperando datos...</span>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#08090c] via-[#0a0b10] to-[#08090c] pt-16 pb-6 px-4 md:p-6">
            {/* Ambient gold glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-20 left-1/3 w-[500px] h-[300px] bg-amber-500/[0.015] rounded-full blur-[120px]" />
                <div className="absolute bottom-20 right-1/4 w-[400px] h-[250px] bg-amber-600/[0.01] rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-5">
                {/* Recent Gains Ticker */}
                <RecentGainsTicker className="mb-4 -mx-4 md:-mx-6 lg:col-span-12" />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 lg:col-span-12">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:border-amber-500/20 transition-all"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        {/* Logo with gold gradient */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-xl" />
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <Coins className="text-white drop-shadow" size={22} />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent">
                                    Efecto Midas
                                </h1>
                                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-gradient-to-r from-amber-500/10 to-amber-600/10 text-amber-400 border border-amber-500/20 rounded">
                                    Élite
                                </span>
                            </div>
                            <p className="text-xs text-white/40">Modo Sombra • Dígitos Diferentes</p>
                        </div>
                    </div>

                    {/* Status Pills */}
                    <div className="flex items-center gap-2">
                        {/* Trend Shield */}
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                            trendStatus === 'neutral'
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-rose-500/5 border-rose-500/20"
                        )}>
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                trendStatus === 'neutral' ? "bg-emerald-400" : "bg-rose-400"
                            )} />
                            <span className={cn(
                                "text-[10px] font-medium uppercase tracking-wider",
                                trendStatus === 'neutral' ? "text-emerald-400" : "text-rose-400"
                            )}>
                                {trendStatus === 'neutral' ? 'Seguro' : 'Volátil'}
                            </span>
                        </div>

                        {/* Bot Status */}
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                            isRunning
                                ? isShadowMode
                                    ? "bg-slate-500/5 border-slate-500/20"
                                    : "bg-amber-500/5 border-amber-500/30"
                                : "bg-white/[0.02] border-white/[0.08]"
                        )}>
                            {isRunning ? (
                                isShadowMode ? <Eye size={14} className="text-slate-400" /> : <Zap size={14} className="text-amber-400" />
                            ) : (
                                <EyeOff size={14} className="text-white/40" />
                            )}
                            <span className={cn(
                                "text-[10px] font-medium uppercase tracking-wider",
                                isRunning
                                    ? isShadowMode ? "text-slate-400" : "text-amber-400"
                                    : "text-white/40"
                            )}>
                                {isRunning ? (isShadowMode ? 'Sombra' : 'Activo') : 'Inactivo'}
                            </span>
                        </div>

                        {/* Connection */}
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border",
                            isConnected ? "bg-white/[0.02] border-white/[0.08]" : "bg-rose-500/5 border-rose-500/20"
                        )}>
                            {isConnected ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-rose-400" />}
                            <span className="text-[10px] font-mono text-white/60">
                                {isConnected ? getDisplayLoginId(account?.loginid || '') : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Scanner Panel with gold accents */}
                <div className={cn(
                    "relative rounded-2xl transition-all duration-500 overflow-hidden lg:col-span-12 order-1 lg:order-1",
                    anomalyDetected
                        ? "bg-gradient-to-b from-amber-950/20 to-[#0a0b10] border border-amber-500/30"
                        : "bg-white/[0.015] border border-white/[0.08]"
                )}>
                    {/* Gold gradient top border accent */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

                    {/* Decode scan lines when running */}
                    {isRunning && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {/* Primary scan */}
                            <div
                                className="absolute w-full h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
                                style={{ animation: 'decodeScan 3s ease-in-out infinite' }}
                            />
                            {/* Secondary scan (faster, dimmer) */}
                            <div
                                className="absolute w-full h-px bg-gradient-to-r from-transparent via-amber-300/20 to-transparent"
                                style={{ animation: 'decodeScan 2s ease-in-out infinite', animationDelay: '1s' }}
                            />
                            {/* Vertical scan effect */}
                            <div
                                className="absolute h-full w-px bg-gradient-to-b from-transparent via-amber-400/20 to-transparent left-0"
                                style={{ animation: 'decodeScanH 4s ease-in-out infinite' }}
                            />
                        </div>
                    )}

                    <div className="relative p-3 md:p-6">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                                    isWarmingUp
                                        ? "bg-orange-500/10 border-orange-500/30"
                                        : anomalyDetected
                                            ? "bg-amber-500/10 border-amber-500/30"
                                            : "bg-white/[0.03] border-white/[0.08]"
                                )}>
                                    {isWarmingUp ? (
                                        <Flame size={18} className="text-orange-400" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                                    ) : (
                                        <Scan size={18} className={cn(
                                            "transition-colors",
                                            anomalyDetected ? "text-amber-400" : "text-white/50",
                                            isRunning && "animate-pulse"
                                        )} />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                        {isWarmingUp ? (
                                            <>
                                                <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                                                    Calibrando Sistema
                                                </span>
                                                <span className="flex items-center gap-0.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" style={{ animation: 'pulse 0.8s ease-in-out infinite' }} />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" style={{ animation: 'pulse 0.8s ease-in-out infinite 0.2s' }} />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400/30" style={{ animation: 'pulse 0.8s ease-in-out infinite 0.4s' }} />
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                Scanner de Anomalías
                                                {isRunning && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                                                        <span className="w-1 h-1 rounded-full bg-amber-400/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
                                                        <span className="w-1 h-1 rounded-full bg-amber-400/30 animate-pulse" style={{ animationDelay: '0.4s' }} />
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </h3>
                                    <p className="text-[11px] text-white/40 font-mono">
                                        {isWarmingUp ? 'ANÁLISIS_PRE_MERCADO' : 'DECODE_PROTOCOL_25'}
                                    </p>
                                </div>
                            </div>

                            {/* Warm-Up Status Badge */}
                            {isWarmingUp && (
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-500/30 rounded-xl">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-orange-300/70 uppercase tracking-wider font-medium">
                                            Recopilando datos
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-mono font-bold text-orange-400">
                                                {warmUpRemaining}s
                                            </span>
                                            <span className="text-[10px] text-white/40 font-mono">
                                                ({warmUpTicks} ticks)
                                            </span>
                                        </div>
                                    </div>
                                    {/* Mini progress bar */}
                                    <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-1000"
                                            style={{ width: `${Math.min(((45 - warmUpRemaining) / 45) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Market Health Badge */}
                            {isRunning && !isWarmingUp && marketHealth !== 'unknown' && (
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl border",
                                    marketHealth === 'healthy'
                                        ? "bg-emerald-500/10 border-emerald-500/30"
                                        : marketHealth === 'caution'
                                            ? "bg-amber-500/10 border-amber-500/30"
                                            : "bg-rose-500/10 border-rose-500/30"
                                )}>
                                    <HeartPulse size={14} className={cn(
                                        marketHealth === 'healthy' ? "text-emerald-400" :
                                            marketHealth === 'caution' ? "text-amber-400" : "text-rose-400"
                                    )} />
                                    <span className={cn(
                                        "text-[10px] font-medium uppercase tracking-wider",
                                        marketHealth === 'healthy' ? "text-emerald-300" :
                                            marketHealth === 'caution' ? "text-amber-300" : "text-rose-300"
                                    )}>
                                        {marketHealth === 'healthy' ? 'Mercado Óptimo' :
                                            marketHealth === 'caution' ? 'Precaución' : 'Peligro'}
                                    </span>
                                    {lastEntryScore > 0 && (
                                        <span className="text-[9px] font-mono text-white/40 ml-1">
                                            {lastEntryScore}/8
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* ⚡ Kinetic Veto Badge - Bloqueo Cinético */}
                            {isRunning && !isWarmingUp && isKineticBlocked && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-500/15 to-purple-500/10 border border-violet-500/30 rounded-xl relative overflow-hidden">
                                    {/* Animated pulse background */}
                                    <div className="absolute inset-0 bg-violet-400/5" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                                    <Zap size={14} className="text-violet-400 relative" style={{ animation: 'pulse 0.6s ease-in-out infinite' }} />
                                    <div className="relative flex flex-col">
                                        <span className="text-[9px] text-violet-300/70 uppercase tracking-wider">
                                            Veto Cinético
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-mono font-bold text-violet-400">
                                                {kineticCooldown}s
                                            </span>
                                            <span className="text-[9px] text-white/30 font-mono">
                                                A={kineticAcceleration.toFixed(1)}x
                                            </span>
                                        </div>
                                    </div>
                                    {/* Mini cooldown bar */}
                                    <div className="w-12 h-1 bg-black/30 rounded-full overflow-hidden ml-1">
                                        <div
                                            className="h-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-200"
                                            style={{ width: `${Math.max(0, (kineticCooldown / 8) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Kinetic Acceleration Display (subtle when not blocked) */}
                            {isRunning && !isWarmingUp && !isKineticBlocked && kineticAcceleration > 0 && (
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-lg border",
                                    kineticAcceleration < 1.5
                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                        : kineticAcceleration < 2.0
                                            ? "bg-amber-500/5 border-amber-500/20"
                                            : "bg-violet-500/5 border-violet-500/20"
                                )}>
                                    <Zap size={10} className={cn(
                                        kineticAcceleration < 1.5 ? "text-emerald-400/60" :
                                            kineticAcceleration < 2.0 ? "text-amber-400/60" : "text-violet-400/60"
                                    )} />
                                    <span className={cn(
                                        "text-[9px] font-mono",
                                        kineticAcceleration < 1.5 ? "text-emerald-300/50" :
                                            kineticAcceleration < 2.0 ? "text-amber-300/50" : "text-violet-300/50"
                                    )}>
                                        {kineticAcceleration.toFixed(2)}x
                                    </span>
                                </div>
                            )}
                            {anomalyDetected && !isWarmingUp && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl">
                                    <Sparkles size={16} className="text-amber-400" />
                                    <span className="text-xs font-medium text-amber-300">
                                        Anomalía: [{repeatedDigit}] × 2
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 🔥 WARM-UP OVERLAY - Profesional con animaciones suaves */}
                        {isWarmingUp && (
                            <div className="mb-6 p-4 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 rounded-xl relative overflow-hidden">
                                {/* Subtle scan effect */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/5 to-transparent"
                                    style={{ animation: 'warmupScan 2s ease-in-out infinite' }}
                                />

                                <div className="relative">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="p-2 bg-orange-500/20 rounded-lg">
                                            <Activity size={16} className="text-orange-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-orange-300 mb-1">
                                                🔥 Sistema en Calibración
                                            </h4>
                                            <p className="text-[11px] text-white/50 leading-relaxed">
                                                Analizando patrones del mercado para máxima precisión.
                                                Por favor espere mientras el algoritmo se sincroniza.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress section */}
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="p-2 bg-black/20 rounded-lg">
                                            <span className="text-lg font-mono font-bold text-orange-400">{warmUpTicks}</span>
                                            <p className="text-[9px] text-white/40 uppercase tracking-wider">Ticks</p>
                                        </div>
                                        <div className="p-2 bg-black/20 rounded-lg">
                                            <span className="text-lg font-mono font-bold text-amber-400">{warmUpRemaining}s</span>
                                            <p className="text-[9px] text-white/40 uppercase tracking-wider">Restante</p>
                                        </div>
                                        <div className="p-2 bg-black/20 rounded-lg">
                                            <span className="text-lg font-mono font-bold text-white/60">
                                                {Math.min(Math.round((warmUpTicks / 50) * 100), 100)}%
                                            </span>
                                            <p className="text-[9px] text-white/40 uppercase tracking-wider">Datos</p>
                                        </div>
                                    </div>

                                    {/* Full progress bar */}
                                    <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 transition-all duration-500"
                                            style={{
                                                width: `${Math.min(((45 - warmUpRemaining) / 45) * 100, 100)}%`,
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 2s linear infinite'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Digit Matrix */}
                        <div className="flex justify-center gap-1.5 md:gap-2 mb-4 flex-wrap">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit, index) => (
                                <DigitCell key={digit} digit={digit} index={index} />
                            ))}
                        </div>

                        {/* Matrix Stream */}
                        <div className="bg-black/30 rounded-xl p-3 border border-white/[0.05]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[9px] text-amber-400/60 uppercase tracking-widest font-mono">STREAM</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-amber-500/20 to-transparent" />
                                <span className="text-[9px] text-white/20 font-mono">{lastDigits.length}/25</span>
                            </div>
                            <MatrixStream />
                        </div>
                    </div>

                    {/* Bottom gold accent */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                </div>

                {/* Left Panel - Config */}
                <div className="lg:col-span-3 space-y-4 order-3 lg:order-2">
                    {/* Config Card */}
                    <div className="bg-white/[0.015] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden">
                        {/* Subtle gold accent */}
                        <div className="absolute top-0 left-0 w-1/2 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />

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
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/60 font-mono text-sm">$</span>
                                    <input
                                        type="number"
                                        value={stake}
                                        onChange={(e) => setStake(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full pl-7 pr-3 py-2.5 bg-black/30 border border-white/[0.08] rounded-lg text-white font-mono focus:border-amber-500/40 focus:outline-none transition-colors disabled:opacity-50"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            {/* Martingale Recovery Levels */}
                            <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block font-medium">
                                    Níveis de Recuperação (Gale)
                                </label>
                                <select
                                    value={maxLosses}
                                    onChange={(e) => setMaxLosses(e.target.value)}
                                    disabled={isRunning}
                                    className="w-full px-3 py-2.5 bg-black/30 border border-white/[0.08] rounded-lg text-white font-mono focus:border-amber-500/40 focus:outline-none transition-colors disabled:opacity-50 appearance-none cursor-pointer"
                                >
                                    <option value="1">1 Martingale (Conservador)</option>
                                    <option value="2">2 Martingales (Moderado)</option>
                                    <option value="3">3 Martingales (Agressivo)</option>
                                </select>
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
                            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Martingala</span>
                                    <button
                                        onClick={() => setUseMartingale(!useMartingale)}
                                        disabled={isRunning}
                                        className={cn(
                                            "relative w-10 h-5 rounded-full transition-colors disabled:opacity-50",
                                            useMartingale ? "bg-gradient-to-r from-amber-500/40 to-amber-600/40" : "bg-white/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow",
                                            useMartingale ? "left-5" : "left-0.5"
                                        )} />
                                    </button>
                                </div>

                                {useMartingale && (
                                    <div className="pt-2">
                                        <label className="text-[9px] text-white/40 uppercase tracking-wider mb-1 block">
                                            Factor ×
                                        </label>
                                        <input
                                            type="number"
                                            value={martingaleFactor}
                                            onChange={(e) => setMartingaleFactor(e.target.value)}
                                            disabled={isRunning}
                                            step="0.1"
                                            className="w-full px-2.5 py-1.5 bg-black/30 border border-white/[0.08] rounded text-white/80 font-mono text-xs focus:border-amber-500/30 focus:outline-none transition-colors disabled:opacity-50"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 🔒 Bóveda Inteligente */}
                            <div className="p-3 bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/20 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Lock size={14} className="text-amber-400" />
                                        <span className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Bóveda Inteligente</span>
                                    </div>
                                    <button
                                        onClick={() => setVaultEnabled(!vaultEnabled)}
                                        disabled={isRunning}
                                        className={cn(
                                            "relative w-10 h-5 rounded-full transition-colors disabled:opacity-50",
                                            vaultEnabled ? "bg-gradient-to-r from-amber-500/40 to-amber-600/40" : "bg-white/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow",
                                            vaultEnabled ? "left-5" : "left-0.5"
                                        )} />
                                    </button>
                                </div>

                                {vaultEnabled && (
                                    <div className="pt-2">
                                        <label className="text-[9px] text-amber-400/60 uppercase tracking-wider mb-1 block">
                                            Meta de Bóveda ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={vaultTarget}
                                            onChange={(e) => setVaultTarget(e.target.value)}
                                            disabled={isRunning}
                                            step="0.5"
                                            min="1"
                                            className="w-full px-2.5 py-1.5 bg-black/30 border border-amber-500/20 rounded text-amber-400 font-mono text-xs focus:border-amber-500/40 focus:outline-none transition-colors disabled:opacity-50"
                                        />
                                        <p className="text-[9px] text-white/30 mt-1.5 leading-relaxed">
                                            Pausa cada ${parseFloat(vaultTarget || '3').toFixed(2)} para asegurar ganancias y enfriar el algoritmo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Control Button */}
                    <button
                        onClick={handleToggleBot}
                        disabled={!isConnected || isVaultCooldown}
                        className={cn(
                            "w-full py-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group",
                            isRunning
                                ? "bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                : isVaultCooldown
                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 cursor-wait"
                                    : "bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/35"
                        )}
                    >
                        {/* Shine effect */}
                        {!isRunning && !isVaultCooldown && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
                        )}
                        {isVaultCooldown ? (
                            <>
                                <Snowflake size={16} className="animate-pulse" />
                                <span>ENFRIANDO...</span>
                            </>
                        ) : isRunning ? (
                            <>
                                <Square fill="currentColor" size={16} />
                                <span>DETENER</span>
                            </>
                        ) : (
                            <>
                                <Gem size={18} className="drop-shadow" />
                                <span className="tracking-wide">ACTIVAR MIDAS</span>
                            </>
                        )}
                    </button>

                    {/* 🔒 Vault Progress Bar */}
                    {vaultEnabled && isRunning && (
                        <div className="relative bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl p-4 overflow-hidden">
                            {/* Shimmer effect when near full */}
                            {vaultAccumulated >= parseFloat(vaultTarget) * 0.8 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-pulse" />
                            )}

                            <div className="relative flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Lock size={14} className={cn(
                                        "text-amber-400 transition-all",
                                        vaultAccumulated >= parseFloat(vaultTarget) * 0.8 && "animate-bounce"
                                    )} />
                                    <span className="text-xs text-amber-300 font-medium">Progreso de Bóveda</span>
                                </div>
                                <span className="text-xs font-mono text-amber-400 font-bold">
                                    ${vaultAccumulated.toFixed(2)} / ${parseFloat(vaultTarget).toFixed(2)}
                                </span>
                            </div>

                            <div className="relative h-2.5 bg-black/40 rounded-full overflow-hidden border border-amber-500/20">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-500 ease-out"
                                    style={{ width: `${Math.min((vaultAccumulated / parseFloat(vaultTarget)) * 100, 100)}%` }}
                                />
                                {/* Glow effect on bar */}
                                <div
                                    className="absolute top-0 h-full bg-gradient-to-r from-amber-300/50 to-transparent blur-sm"
                                    style={{ width: `${Math.min((vaultAccumulated / parseFloat(vaultTarget)) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ❄️ Vault Cooldown Display */}
                    {isVaultCooldown && (
                        <div className="relative bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 rounded-xl p-4 overflow-hidden">
                            {/* Frost animation */}
                            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 to-transparent animate-pulse" />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Snowflake size={20} className="text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                                        <div className="absolute inset-0 bg-cyan-400/20 blur-md rounded-full" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-cyan-300">❄️ Enfriando Algoritmo</p>
                                        <p className="text-[10px] text-cyan-400/60">Ganancias aseguradas. Reinicio automático...</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-mono font-bold text-cyan-400">{cooldownRemaining}s</span>
                                </div>
                            </div>

                            {/* Progress bar for cooldown */}
                            <div className="relative h-1.5 bg-black/40 rounded-full overflow-hidden mt-3">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-1000 ease-linear"
                                    style={{ width: `${((60 - cooldownRemaining) / 60) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Freemium Progress Bar - only for free users */}
                    {isFree && (
                        <FreemiumProgressBar currentProfit={currentProfit} />
                    )}

                    {/* Info */}
                    <div className="bg-white/[0.015] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl" />
                        <div className="relative flex items-start gap-3">
                            <Shield size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-medium text-white mb-1">Modo Sombra</h4>
                                <p className="text-[11px] text-white/40 leading-relaxed">
                                    Monitorea de forma invisible. Ejecuta solo al detectar anomalía estadística.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Stats & Logs */}
                <div className="lg:col-span-9 space-y-4 order-2 lg:order-3">
                    {/* 🏦 BÓVEDA TOTAL - Acumulado Sagrado (Visualmente removido, lógica mantida) */}
                    {/* {vaultEnabled && sessionData.vaultCount > 0 && ( ... )} */}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Total Profit */}
                        <div className="col-span-2 bg-white/[0.015] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/30 via-amber-500/10 to-transparent" />
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 size={16} className="text-amber-400/60" />
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
                                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Ganadas</span>
                            </div>
                            <div className="text-2xl font-bold font-mono text-emerald-400">{stats.wins}</div>
                        </div>

                        {/* Losses */}
                        <div className="bg-white/[0.015] border-l-2 border-l-rose-500/50 border-y border-r border-white/[0.08] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingDown size={14} className="text-rose-400" />
                                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Perdidas</span>
                            </div>
                            <div className="text-2xl font-bold font-mono text-rose-400">{stats.losses}</div>
                        </div>

                        {/* Win Rate */}
                        <div className="bg-white/[0.015] border border-white/[0.08] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Target size={14} className="text-white/40" />
                                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Tasa</span>
                            </div>
                            <div className="text-2xl font-bold font-mono text-white/80">
                                {winRate}<span className="text-sm text-white/40">%</span>
                            </div>
                        </div>

                        {/* Stake */}
                        <div className="bg-white/[0.015] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-8 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
                            <div className="flex items-center gap-2 mb-2">
                                <Coins size={14} className="text-amber-400" />
                                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Stake</span>
                            </div>
                            <div className="text-xl font-bold font-mono text-amber-400">
                                ${stats.currentStake.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Activity Log */}
                    <div className="bg-white/[0.015] border border-white/[0.08] rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity size={16} className="text-white/40" />
                                <span className="text-sm font-medium text-white">Operaciones</span>
                            </div>
                            <span className="text-[10px] text-white/40 font-mono">{logs.length}</span>
                        </div>

                        <div ref={logsContainerRef} className="h-[280px] overflow-y-auto">
                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-8">
                                    <Eye size={24} className="text-white/20 mb-2" />
                                    <p className="text-white/30 text-sm">Esperando actividad...</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-1.5">
                                    {logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className={cn(
                                                "flex items-start gap-2.5 p-2.5 rounded-lg transition-all",
                                                log.type === 'gold' && "bg-amber-500/5 border-l-2 border-l-amber-500/50",
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
                                                <span className="text-[10px] font-mono text-white/30 block mb-0.5">
                                                    {log.time}
                                                </span>
                                                <p className="text-xs text-white/70 leading-relaxed">
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

            {/* CSS Animations */}
            <style>{`
                @keyframes decodeScan {
                    0%, 100% { top: 0%; opacity: 0; }
                    5% { opacity: 1; }
                    50% { opacity: 0.6; }
                    95% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                @keyframes decodeScanH {
                    0%, 100% { left: 0%; opacity: 0; }
                    5% { opacity: 0.5; }
                    50% { opacity: 0.3; }
                    95% { opacity: 0.5; }
                    100% { left: 100%; opacity: 0; }
                }
            `}</style>

            {/* System Limit Modal */}
            <SystemLimitModal
                isOpen={showLimitModal}
                limitAmount={currentProfit}
                onClose={() => setShowLimitModal(false)}
            />

            {/* Special Offer Modal for Expired Trial */}
            <SpecialOfferModal
                isOpen={showOfferModal}
                onClose={() => setShowOfferModal(false)}
                onContinueFree={() => setShowOfferModal(false)}
                isExpired={isExpired}
                showDiscount={true}
            />
        </div >
    );
};

export default EfectoMidas;
