import React, { useState, useEffect, useRef } from 'react';
import {
    Rocket,
    Settings2,
    Play,
    Square,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Layers,
    List,
    Terminal,
    ShieldAlert,
    Wifi,
    Code,
    Bug,
    Radio,
    Radar,
    Zap,
    Target,
    Sparkles,
    BrainCircuit,
    Trophy,
    Lock,
    Crown,
    Snowflake,
    AlertCircle,
    Shield,
    ChevronUp,
    ChevronDown,
    Info,
    MoveUp,
    MoveDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useBotAstron, LogEntry, ScannerSymbol, AssetState } from '../../hooks/useBotAstron';
import { useDeriv } from '../../contexts/DerivContext';
import { useFreemiumLimiter, FREEMIUM_LIMITS } from '../../hooks/useFreemiumLimiter';
import { LossAversionModal } from '../LossAversionModal';

// ============================================
// QUANT SHIELD GAUGE WIDGET
// ============================================
const ShieldGauge = ({ score, isRunning, direction }: { score: number, isRunning: boolean, direction?: 'up' | 'down' }) => {
    // 0 to 180 degrees mapping
    // score 0 = 0deg, 100 = 180deg
    const rotation = (score / 100) * 180;

    // Determine color based on score
    let strokeColor = '#374151'; // gray-700
    if (score >= 70) strokeColor = '#00E5FF'; // Cyan for high probability
    else if (score >= 50) strokeColor = '#FBBF24'; // Amber
    else strokeColor = '#EF4444'; // Red

    return (
        <div className="relative w-48 h-24 sm:w-64 sm:h-32 flex justify-center overflow-hidden">
            {/* Background Arch */}
            <div className="absolute top-0 left-0 w-full h-full rounded-t-full border-[12px] sm:border-[16px] border-slate-800 box-border"></div>

            {/* Active Arch (Rotated) */}
            <div
                className="absolute top-0 left-0 w-full h-full rounded-t-full border-[12px] sm:border-[16px] border-transparent box-border transition-all duration-1000 ease-out origin-bottom"
                style={{
                    borderColor: `${strokeColor} transparent transparent transparent`,
                    transform: `rotate(${rotation - 180}deg)`
                }}
            ></div>

            {/* Shield Icon Center */}
            <div className="absolute bottom-0 flex flex-col items-center">
                <Shield className={`w-8 h-8 sm:w-12 sm:h-12 ${isRunning ? 'text-[#00E5FF] animate-pulse' : 'text-slate-600'} transition-colors duration-500`} fill={isRunning ? "#00E5FF20" : "none"} strokeWidth={1.5} />
                <div className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-wider mt-1 uppercase">Probabilidad</div>
                <div className={`text-2xl sm:text-3xl font-black font-mono leading-none ${isRunning ? 'text-white' : 'text-slate-600'}`}>
                    {score.toFixed(0)}%
                </div>
            </div>

            {/* Direction Indicator */}
            {direction && isRunning && (
                <div className={`absolute top-2 right-4 flex items-center gap-1 ${direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {direction === 'up' ? <MoveUp size={16} /> : <MoveDown size={16} />}
                    <span className="text-[10px] font-bold font-mono uppercase">{direction === 'up' ? 'CALL' : 'PUT'}</span>
                </div>
            )}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

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
        recentTicks,
        startBot,
        stopBot,

        // Multi-asset specific
        assetStates,
        activeAsset,
        leaderAsset,
        opportunityMessage,
        isWarmingUp,
        warmUpProgress,
        SCANNER_SYMBOLS,
        SYMBOL_NAMES,
        // Cooldown states
        isCoolingDown,
        cooldownTime,
        cooldownReason,
        // Anomaly Detection v3.0
        isAnomalyDetected,
        currentAutocorr
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
    const [autoSwitch, setAutoSwitch] = useState<boolean>(true);
    const [assertivityLevel, setAssertivityLevel] = useState<'conservative' | 'balanced' | 'aggressive'>('aggressive');
    const [useSoros, setUseSoros] = useState<boolean>(false);
    const [sorosLevels, setSorosLevels] = useState<number>(1);

    // Safety Factor Slider (UI Placeholder for now)
    const [safetyFactor, setSafetyFactor] = useState<number>(1.2);

    // Cooldown Config States
    const [profitTarget, setProfitTarget] = useState<string>('3.00');
    const [maxLosses, setMaxLosses] = useState<string>('2');
    // Anomaly Detection v3.0
    const [anomalyOnlyMode, setAnomalyOnlyMode] = useState<boolean>(false);
    // SOFT LOCK: Traffic Management
    const [showTrafficLock, setShowTrafficLock] = useState(false);

    // UI State
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Auto-scroll logs
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // Check if profit limit reached and show modal
    useEffect(() => {
        if (isLimitReached && isRunning) {
            stopBot();
            setShowLossAversionModal(true);
            toast.warning('¡Límite de prueba alcanzado! Bot detenido.');
        }
    }, [isLimitReached, isRunning, stopBot]);

    // Show loss aversion modal when cooldown starts
    useEffect(() => {
        if (isOnSessionCooldown && isFree && !isRunning) {
            setShowLossAversionModal(true);
        }
    }, [isOnSessionCooldown, isFree, isRunning]);

    // DOPAMINE TRIGGERS (ELITE CALIBRATION)
    useEffect(() => {
        if (!isFree) return; // Only for Free users

        // Win Trigger
        if (stats.wins > 0 && stats.lastProfit > 0) {
            toast.custom((t) => (
                <div className="bg-[#0B0E14] border border-[#FFD700]/30 rounded-xl p-4 shadow-[0_0_30px_rgba(255,215,0,0.2)] flex items-center gap-3 animate-in slide-in-from-top-2">
                    <div className="bg-[#FFD700]/10 p-2 rounded-full">
                        <Zap size={20} className="text-[#FFD700]" />
                    </div>
                    <div>
                        <h4 className="text-[#FFD700] font-bold text-sm font-mono uppercase tracking-wider">⚡ PRECISIÓN DE ÉLITE</h4>
                        <p className="text-white font-mono font-bold">+${stats.lastProfit.toFixed(2)}</p>
                    </div>
                </div>
            ), { duration: 3000 });
        }

    }, [stats.wins, stats.vaultAccumulated, isFree]);

    // DEBUG: Monitor Asset States for Corruption
    useEffect(() => {
        if (Object.keys(assetStates).length === 0) return;

        const corrupted = Object.entries(assetStates).find(([key, val]) => {
            return !val || !val.score || typeof val.score.volatility === 'undefined';
        });

        if (corrupted) {
            console.error('🔥 DATA INTEGRITY ERROR: Asset state corrupted:', corrupted);
        }
    }, [assetStates]);

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Bug Deriv Scanner detenido');
        } else {
            if (!isConnected) {
                toast.error('Primero debe conectar su cuenta Deriv');
                return;
            }

            // 🚦 TRAFFIC MANAGEMENT (SOFT LOCK) - Only block FREE users AFTER loading
            if (!isLoading && isFree) {
                setShowTrafficLock(true);
                return; // BLOCK EXECUTION
            }

            // Check if trial expired
            if (isFree && isExpired) {
                setShowLossAversionModal(true);
                toast.warning('Tu período de prueba ha expirado.');
                return;
            }

            // Check if on cooldown
            if (isFree && isOnSessionCooldown) {
                setShowLossAversionModal(true);
                toast.warning('Sistema en recarga. Espera o actualiza a PRO.');
                return;
            }

            const stakeVal = parseFloat(stake);
            const stopLossVal = parseFloat(stopLoss);
            const takeProfitVal = parseFloat(takeProfit);
            const maxGaleVal = parseInt(maxGale);

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

            if (isNaN(maxGaleVal) || maxGaleVal < 0) {
                toast.error('Nivel de Martingala inválido');
                return;
            }

            // Map assertivity level to minScore (lowered for more signals)
            const minScoreMap = { conservative: 70, balanced: 55, aggressive: 40 };
            const minScore = minScoreMap[assertivityLevel];
            const martingaleFactorVal = parseFloat(martingaleFactor) || 2.5;

            let finalStartConfig = {
                stake: stakeVal,
                stopLoss: stopLossVal,
                takeProfit: takeProfitVal,
                useMartingale: useMartingale,
                maxMartingaleLevel: maxGaleVal,
                martingaleFactor: martingaleFactorVal,
                autoSwitchEnabled: autoSwitch,
                minScore: minScore,
                // Cooldown Config
                profitTarget: parseFloat(profitTarget) || 3.0,
                maxConsecutiveLosses: parseInt(maxLosses) || 2,
                // Anomaly Detection v3.0
                anomalyOnlyMode: anomalyOnlyMode
            };

            if (isFree) {
                // FORCE TURBO-SCALP LOGIC (AGGRESSIVE)
                finalStartConfig = {
                    ...finalStartConfig,
                    stake: 1.00,
                    minScore: 40,
                    maxMartingaleLevel: 2,
                    martingaleFactor: 2.5,
                    stopLoss: 50.00,
                    takeProfit: 50.00,
                    useSoros: true,
                    maxSorosLevels: 1
                };

                toast.success('⚡ MODO TURBO-SCALP ACTIVADO: Alta Velocidad.');
            }

            const success = startBot(finalStartConfig);

            if (success) {
                toast.success('🛡️ QUANT SHIELD ACTIVADO - Protección de Capital Iniciada');
            }
        }
    };

    const winRate = (stats.wins + stats.losses) > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : '0.0';

    const activeAssetState = activeAsset ? assetStates[activeAsset] : null;
    const activeScore = activeAssetState ? activeAssetState.score.total : 0;
    const isUp = activeAssetState?.score?.direction === 'up';

    return (
        <div className="min-h-screen bg-slate-950 text-white p-3 pt-20 sm:p-6 font-sans">
            <div className="max-w-[1200px] mx-auto space-y-4 sm:space-y-6">

                {/* 1. HEADER UPGRADE */}
                <header className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/5 relative overflow-hidden">
                    {/* Glow effect behind header */}
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#00E5FF]/10 rounded-full blur-[80px] pointer-events-none"></div>

                    <div className="flex items-center gap-4 z-10">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-[#00E5FF]/20 rounded-full blur-md group-hover:bg-[#00E5FF]/40 transition-all duration-500"></div>
                            <div className="relative p-3 bg-slate-900 rounded-xl border border-[#00E5FF]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                                <Shield className="text-[#00E5FF]" size={28} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-white tracking-tight">BUG DERIV</h1>
                                <span className="px-2 py-0.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(0,229,255,0.3)] animate-pulse-glow">
                                    QUANT SHIELD
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 uppercase">
                                Volatility Barrier | Higher/Lower | Volatility 100 (1s)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 sm:mt-0 z-10 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                            <span className="text-xs font-mono font-bold text-slate-300">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${isRunning
                            ? 'bg-[#00E5FF]/10 border-[#00E5FF]/50 text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}>
                            {isRunning ? 'SHIELD ACTIVE' : 'SYSTEM STANDBY'}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                    {/* LEFT COLUMN: Controls & Gauge */}
                    <div className="lg:col-span-5 flex flex-col gap-4">

                        {/* 2. SHIELD GAUGE & FLEET MONITOR */}
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 relative overflow-hidden group hover:border-[#00E5FF]/20 transition-all duration-500">
                            {/* Direction Indicator Arrow (Background) */}
                            {isRunning && activeAssetState && (
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none transition-all duration-1000 ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isUp ? <MoveUp size={200} /> : <MoveDown size={200} />}
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                                    <Target size={16} className="text-[#00E5FF]" />
                                    Probabilidad de Éxito
                                </h2>
                                {activeAssetState && (
                                    <div className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold uppercase border ${isUp ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                        {isUp ? 'Protección Inferior' : 'Proteção Superior'}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-center justify-center py-4 relative z-10">
                                <ShieldGauge score={activeScore} isRunning={isRunning} direction={isUp ? 'up' : 'down'} />

                                {/* Barrier Info */}
                                {isRunning && (
                                    <div className="mt-4 flex items-center gap-4">
                                        <div className="text-center">
                                            <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Barrera</div>
                                            <div className="text-sm font-black text-white font-mono bg-slate-800/50 px-3 py-1 rounded-md border border-white/5">
                                                {isUp ? '+' : '-'}{Math.abs(stats.lastProfit).toFixed(4) || '0.0000'} <span className="text-[#00E5FF] text-[9px]">SOLO EJEMPLO UI</span>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Distancia</div>
                                            <div className="text-sm font-black text-[#00E5FF] font-mono bg-[#00E5FF]/5 px-3 py-1 rounded-md border border-[#00E5FF]/20">
                                                Safe
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mini Fleet Strip (Replaces old Grid) */}
                            <div className="mt-6 pt-4 border-t border-white/5">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-mono">Monitoreo de Flota</div>
                                <div className="grid grid-cols-5 gap-1">
                                    {SCANNER_SYMBOLS.map(symbol => {
                                        const asset = assetStates[symbol];
                                        const isLeader = leaderAsset === symbol;
                                        const isActiveSymbol = activeAsset === symbol;

                                        return (
                                            <div key={symbol} className={`h-1.5 rounded-full transition-all duration-300 relative group/tooltip ${isActiveSymbol ? 'bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]' :
                                                isLeader ? 'bg-amber-400' :
                                                    'bg-slate-700'
                                                }`}>
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[9px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none border border-slate-700">
                                                    {SYMBOL_NAMES[symbol]} ({asset?.score?.total.toFixed(0)}%)
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 3. ELITE PARAMETERS */}
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 relative">
                            <div className="flex items-center gap-2 mb-6">
                                <Settings2 size={16} className="text-[#00E5FF]" />
                                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Configuración Elite</h3>
                            </div>

                            {/* Safety Factor Slider */}
                            <div className="mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Safety Factor (Factor de Seguridad)</label>
                                    <span className="text-[#00E5FF] font-black font-mono text-lg">{safetyFactor}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3.0"
                                    step="0.1"
                                    value={safetyFactor}
                                    onChange={(e) => setSafetyFactor(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
                                />
                                <div className="flex justify-between mt-2 text-[9px] font-mono text-slate-500 uppercase font-medium">
                                    <span>[0.5x Arriesgado]</span>
                                    <span>[1.2x Recomendado]</span>
                                    <span>[3.0x Ultra Seguro]</span>
                                </div>

                                <div className="mt-3 bg-[#00E5FF]/5 border border-[#00E5FF]/20 rounded-lg p-3 flex gap-2 items-start">
                                    <Info size={14} className="text-[#00E5FF] shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-slate-300 leading-snug">
                                        <span className="font-bold text-[#00E5FF]">Escudo Matemático:</span> La barrera se aleja automáticamente según la volatilidad real del mercado (ATR).
                                    </p>
                                </div>
                            </div>

                            {/* Basic Controls (Stake & Switch) */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 block font-mono">Stake ($)</label>
                                    <input
                                        type="number"
                                        value={stake}
                                        onChange={(e) => setStake(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white font-mono font-bold focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/50 transition-all"
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <div
                                        onClick={() => !isRunning && setAutoSwitch(!autoSwitch)}
                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${autoSwitch ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800 border-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <BrainCircuit size={14} className={autoSwitch ? 'text-amber-400' : 'text-slate-500'} />
                                            <span className={`text-[10px] font-bold uppercase ${autoSwitch ? 'text-amber-400' : 'text-slate-400'}`}>Smart AI</span>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${autoSwitch ? 'bg-amber-400 shadow-[0_0_5px_orange]' : 'bg-slate-600'}`}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Toggle */}
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {showAdvanced ? 'Ocultar Avanzado' : 'Mostrar Configuración Avanzada'}
                                {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            {/* Advanced Config Section */}
                            {showAdvanced && (
                                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    {/* Stop/Take */}
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <label className="text-slate-400 font-mono block mb-1">Stop Loss ($)</label>
                                            <input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded" />
                                        </div>
                                        <div>
                                            <label className="text-slate-400 font-mono block mb-1">Take Profit ($)</label>
                                            <input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded" />
                                        </div>
                                    </div>
                                    {/* Martingale */}
                                    <div className="p-3 bg-slate-950 rounded border border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-slate-300">Martingala</span>
                                            <input type="checkbox" checked={useMartingale} onChange={() => setUseMartingale(!useMartingale)} className="accent-[#00E5FF]" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="number" placeholder="Max Levels" value={maxGale} onChange={e => setMaxGale(e.target.value)} className="bg-slate-900 border border-slate-700 p-1.5 rounded text-xs text-white" />
                                            <input type="number" placeholder="Factor" value={martingaleFactor} onChange={e => setMartingaleFactor(e.target.value)} className="bg-slate-900 border border-slate-700 p-1.5 rounded text-xs text-white" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 🚨 TRAFFIC LOCK BANNER - Only shows if blocked */}
                            {showTrafficLock && (
                                <div className="mt-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl animate-pulse">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle size={16} className="text-red-500" />
                                        <span className="text-xs font-bold text-red-400 uppercase">Tráfico Elevado</span>
                                    </div>
                                    <p className="text-[10px] text-red-200 mb-2 leading-relaxed">
                                        Servidores gratuitos saturados. Riesgo de latencia.
                                    </p>
                                    <a href="https://pay.hotmart.com/Q103866199O?off=itafpp2z" target="_blank" rel="noopener noreferrer" className="block w-full py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase rounded text-center transition-colors">
                                        🚀 Prioridad PRO ($24/año)
                                    </a>
                                </div>
                            )}

                            {/* ACTION BUTTON */}
                            <button
                                onClick={handleToggleBot}
                                disabled={!isConnected}
                                className={`w-full mt-6 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] active:scale-[0.98] ${isRunning
                                    ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-rose-900/50'
                                    : 'bg-gradient-to-r from-[#00E5FF] to-cyan-600 text-slate-950 shadow-cyan-900/50'
                                    }`}
                            >
                                {isRunning ? 'DESACTIVAR ESCUDO' : 'ACTIVAR BLINDAJE QUANT'}
                            </button>

                        </div>
                    </div>

                    {/* RIGHT COLUMN: Logs & Results */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        {/* RESULT CARD */}
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">Beneficio Neto</h3>
                                <div className={`text-4xl sm:text-5xl font-black tracking-tight ${stats.totalProfit >= 0 ? 'text-[#00FF88] drop-shadow-[0_0_10px_rgba(0,255,136,0.3)]' : 'text-rose-500'}`}>
                                    {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}<span className="text-base text-slate-500 ml-1">$</span>
                                </div>
                            </div>
                            <div className="flex gap-4 sm:gap-8">
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Wins</div>
                                    <div className="text-xl font-bold text-[#00FF88]">{stats.wins}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Losses</div>
                                    <div className="text-xl font-bold text-rose-500">{stats.losses}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Winrate</div>
                                    <div className="text-xl font-bold text-[#00E5FF]">{winRate}%</div>
                                </div>
                            </div>
                        </div>

                        {/* 5. LOGS UPGRADE */}
                        <div className="flex-1 bg-slate-950 rounded-2xl border border-white/5 flex flex-col overflow-hidden min-h-[400px]">
                            <div className="p-4 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Terminal size={14} className="text-[#00E5FF]" />
                                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">Registro de Defensa</h3>
                                </div>
                                <div className="flex gap-2 text-[9px] font-mono text-slate-500">
                                    <span>SYNC: OK</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar" ref={logsContainerRef}>
                                {logs.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                        <Shield size={48} className="mb-2" />
                                        <p className="text-xs font-mono">Esperando amenazas de mercado...</p>
                                    </div>
                                )}
                                {logs.map((log, index) => (
                                    <div key={`${log.id}-${index}`} className={`
                                        p-3 rounded-lg border text-xs font-mono transition-all animate-in slide-in-from-bottom-2
                                        ${log.type === 'success'
                                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                                            : log.type === 'error'
                                                ? 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                                                : log.type === 'gold'
                                                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                                                    : 'bg-slate-900 border-white/5 text-slate-400'
                                        }
                                    `}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-3">
                                                <span className="opacity-50 min-w-[50px]">{log.time}</span>
                                                <span className="font-medium">
                                                    {log.message.includes('Sincronizado')
                                                        ? '⚡ Sincronización de Latencia OK'
                                                        : log.message.replace('Contrato abierto', '🛡️ Escudo Desplegado').replace('Win', '✅ Amenaza Neutralizada').replace('Loss', '⚠️ Brecha en Escudo')}
                                                </span>
                                            </div>
                                            {log.type === 'success' && <Shield size={14} className="text-emerald-400" />}
                                            {log.type === 'error' && <ShieldAlert size={14} className="text-rose-400" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <LossAversionModal
                    isOpen={showLossAversionModal}
                    onClose={() => setShowLossAversionModal(false)}
                />
            </div>
        </div>
    );
};

export default AstronPanel;
