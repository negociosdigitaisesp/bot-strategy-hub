import React, { useState, useEffect, useRef } from 'react';
import {
    Rocket,
    Settings2,
    Play,
    Square,
    ArrowUpRight,
    Settings,
    Volume2,
    Cpu,
    Zap,
    Layers,
    ArrowDownRight,
    Sparkles,
    AlertCircle,
    Terminal,
    Code,
    Atom,
    Wifi,
    ShieldAlert,
    Lock,
    Snowflake
} from 'lucide-react';
import { toast } from 'sonner';
import { useBotAstron, LogEntry } from '../../hooks/useBotAstron';
import { StrategyGrid } from './StrategyGrid';
import { useDeriv } from '../../contexts/DerivContext';
import { useFreemiumLimiter, FREEMIUM_LIMITS } from '../../hooks/useFreemiumLimiter';
import { LossAversionModal } from '../LossAversionModal';

// Enhanced Progress Bar with Glow
const ProgressBar = ({ value, color, glowColor, height = "h-1.5" }: { value: number, color: string, glowColor: string, height?: string }) => (
    <div className={`w-full bg-[#0B0E14] ${height} rounded-full mt-3 overflow-hidden relative shadow-inner border border-white/5`}>
        <div
            className="h-full rounded-full relative transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)"
            style={{
                width: `${Math.max(value, 2)}%`, // Minimum visible width
                backgroundColor: color,
                boxShadow: `0 0 12px ${glowColor}`
            }}
        >
            <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-white/80 opacity-50 shadow-[0_0_5px_white]"></div>
        </div>
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

        // Cloud-specific
        connectionStatus,
        latency,
        // Strategies
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
    const [martingaleFactor, setMartingaleFactor] = useState<string>('2.5'); // NEW: Configurable factor
    const [useSoros, setUseSoros] = useState<boolean>(false);
    const [sorosLevels, setSorosLevels] = useState<number>(1);
    // Cooldown Config States
    const [profitTarget, setProfitTarget] = useState<string>('3.00');
    const [maxLosses, setMaxLosses] = useState<string>('2');
    // SOFT LOCK: Traffic Management
    const [showTrafficLock, setShowTrafficLock] = useState(false);

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

    const handleToggleBot = (manualStart: boolean = true) => {
        // If stopping
        if (isRunning && manualStart) {
            stopBot();
            toast.info('Bug Deriv Scanner detenido');
            return;
        }

        // If starting
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

        const martingaleFactorVal = parseFloat(martingaleFactor) || 2.5;

        let finalStartConfig = {
            stake: stakeVal,
            stopLoss: stopLossVal,
            takeProfit: takeProfitVal,
            useMartingale: useMartingale,
            maxMartingaleLevel: maxGaleVal,
            martingaleFactor: martingaleFactorVal,
            // Cooldown Config
            profitTarget: parseFloat(profitTarget) || 3.0,
            maxConsecutiveLosses: parseInt(maxLosses) || 2,
        };

        if (isFree) {
            // FORCE TURBO-SCALP LOGIC (AGGRESSIVE)
            finalStartConfig = {
                ...finalStartConfig,
                stake: 1.00,
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
            toast.success('🚀 Bug Deriv Scanner iniciado - Aguardando Sinais');
        }
    };

    const handleStrategyToggle = (id: number) => {
        toggleStrategy(id);

        // Find if we are activating or deactivating
        const strategy = strategies.find(s => s.id === id);
        if (strategy) {
            // If currently active and we click it, we are deactivating -> Stop Bot
            if (strategy.active && isRunning) {
                stopBot();
                return;
            }
            // If currently inactive, we are activating -> Start Bot
            if (!strategy.active && !isRunning) {
                handleToggleBot(false); // Start without toggling stop
            }
        }
    };

    const winRate = (stats.wins + stats.losses) > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : '0.0';

    const totalOps = stats.wins + stats.losses;

    return (
        <div className="min-h-screen bg-transparent text-white p-3 pt-20 sm:p-6 font-sans">
            <div className="max-w-[1600px] mx-auto px-2 sm:px-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 bg-[#0B0E14]/50 p-3 sm:p-4 rounded-2xl border border-white/5 backdrop-blur-md gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative p-2 sm:p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                <Atom className="text-amber-500" size={24} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                                BUG DERIV SCANNER
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono tracking-widest">
                                    2.2X
                                </span>
                            </h1>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] font-mono font-bold">
                                Algoritmo de Apalancamiento Cuántico v5.0
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="text-left sm:text-right flex-1 sm:flex-none">
                            <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider block font-bold font-mono">Estado</span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Wifi size={12} className={isConnected ? "text-green-500" : "text-red-500"} />
                                <span className="text-xs font-bold text-white">{isConnected ? 'Conectado' : 'Desconectado'}</span>
                            </div>
                        </div>
                        <div className={`px-4 py-2 rounded-lg border ${isRunning ? 'bg-[#00E5FF]/10 border-[#00E5FF] text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.3)]' : 'bg-gray-800 border-gray-700 text-gray-400'} flex items-center gap-2 text-xs font-bold font-mono transition-all duration-300`}>
                            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#00E5FF] animate-ping' : 'bg-gray-500'}`}></div>
                            {isRunning ? '📡 MODO CLOUD ATIVO' : 'SISTEMA EN REPOSO'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">

                    {/* LEFT COLUMN: Controls & Key Stats - FIRST ON MOBILE */}

                    <div className="lg:col-span-4 flex flex-col gap-3 lg:gap-4 order-1">

                        {/* Market Result (Overview) */}
                        <div className="bg-[#0B0E14]/80 backdrop-blur-xl rounded-2xl p-6 relative flex flex-col justify-between group overflow-hidden transition-all duration-500 border border-white/5 hover:border-[#00E5FF]/30">
                            {/* Ambient Background Glow */}



                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-2">
                                    <Terminal size={18} className="text-[#00E5FF]" />
                                    <h3 className="text-white font-bold text-sm tracking-wide font-mono">RESULTADO GLOBAL</h3>
                                </div>
                                <ShieldAlert size={14} className="text-gray-500 cursor-pointer hover:text-white transition-colors" />
                            </div>

                            <div className="text-center mb-6 relative z-10">
                                <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-1">Beneficio Total</p>
                                <div className={`text-4xl font-black flex items-center justify-center gap-2 ${stats.totalProfit >= 0 ? 'text-[#00FF88]' : 'text-[#FF3D00]'} transition-all duration-300 scale-100`}>
                                    {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)} <span className="text-lg opacity-50">$</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-2 relative z-10">
                                {/* Wins Block */}
                                <div className="flex flex-col items-center group/item">
                                    <div className="bg-[#111625]/80 backdrop-blur-sm rounded-xl p-3 w-full border border-gray-800 relative overflow-hidden group-hover/item:border-[#00E5FF]/30 transition-all duration-300 shadow-lg">
                                        <div className="text-center mb-1">
                                            <span className="text-xl font-bold text-[#00FF88]">{stats.wins}</span>
                                        </div>
                                        <ProgressBar
                                            value={totalOps > 0 ? (stats.wins / totalOps) * 100 : 0}
                                            color="#00FF88"
                                            glowColor="rgba(0, 255, 136, 0.5)"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-2 font-bold tracking-wider uppercase font-mono">Ganadas</span>
                                </div>

                                {/* Win Rate Block */}
                                <div className="flex flex-col items-center group/item">
                                    <div className="bg-[#111625]/80 backdrop-blur-sm rounded-xl p-3 w-full border border-gray-800 relative overflow-hidden group-hover/item:border-[#2F80ED]/30 transition-all duration-300 shadow-lg">
                                        <div className="text-center mb-1">
                                            <span className="text-xl font-bold text-[#2F80ED]">{winRate}%</span>
                                        </div>
                                        <ProgressBar
                                            value={parseFloat(winRate)}
                                            color="#2F80ED"
                                            glowColor="rgba(47, 128, 237, 0.5)"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-2 font-bold tracking-wider uppercase font-mono">Precisión</span>
                                </div>

                                {/* Losses Block */}
                                <div className="flex flex-col items-center group/item">
                                    <div className="bg-[#111625]/80 backdrop-blur-sm rounded-xl p-3 w-full border border-gray-800 relative overflow-hidden group-hover/item:border-[#FF3D00]/30 transition-all duration-300 shadow-lg">
                                        <div className="text-center mb-1">
                                            <span className="text-xl font-bold text-[#FF3D00]">{stats.losses}</span>
                                        </div>
                                        <ProgressBar
                                            value={totalOps > 0 ? (stats.losses / totalOps) * 100 : 0}
                                            color="#FF3D00"
                                            glowColor="rgba(255, 61, 0, 0.5)"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-2 font-bold tracking-wider uppercase font-mono">Perdidas</span>
                                </div>
                            </div>
                        </div>

                        {/* Strategy Configuration - MOBILE OPTIMIZED */}
                        <div className="bg-[#0B0E14]/80 backdrop-blur-xl rounded-xl lg:rounded-2xl p-4 lg:p-6 flex flex-col shadow-2xl transition-transform hover:scale-[1.005] duration-300 border-t border-t-[#00E5FF]/10 border border-white/5">
                            <div className="flex items-center gap-2 mb-4 lg:mb-6">
                                <Code size={16} className="text-[#00E5FF]" />
                                <h3 className="text-white font-bold text-xs lg:text-sm tracking-wide font-mono">CONFIGURACIÓN</h3>
                            </div>

                            {/* ELITE CALIBRATION OVERLAY (FREE USER LOCK) */}
                            {isFree && (
                                <div className="absolute inset-0 z-50 bg-[#0B0E14]/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 border border-[#FFD700]/20 rounded-xl lg:rounded-2xl transition-all duration-500">
                                    <div className="bg-[#FFD700]/10 p-4 rounded-full mb-4 ring-1 ring-[#FFD700]/30 shadow-[0_0_20px_rgba(255,215,0,0.1)]">
                                        <Lock size={32} className="text-[#FFD700]" />
                                    </div>
                                    <h4 className="text-[#FFD700] font-black text-sm uppercase tracking-widest mb-2">
                                        ⚡ MODO TURBO-SCALP
                                    </h4>
                                    <p className="text-gray-400 text-xs max-w-[250px] leading-relaxed">
                                        Configuración de alta velocidad para crecimiento rápido y máxima adrenalina.
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                        <Zap size={10} className="text-[#FFD700]" />
                                        <span>MODE: AGGRESSIVE_GROWTH_V2</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 space-y-4 lg:space-y-6">
                                <div>
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 block pl-1 font-mono">Apuesta Inicial ($)</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00E5FF] transition-colors font-medium font-mono">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={stake}
                                            onChange={(e) => setStake(e.target.value)}
                                            disabled={isRunning}
                                            className="w-full bg-[#05050F] border border-gray-800 rounded-xl py-3 lg:py-4 pl-8 pr-4 text-white font-mono text-base lg:text-lg font-bold focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/50 focus:outline-none transition-all disabled:opacity-50 shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 lg:gap-6">
                                    <div>
                                        <label className="text-[10px] text-[#FF782C] font-bold uppercase tracking-wider mb-2 block pl-1 font-mono">Límite de Pérdida ($)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={stopLoss}
                                                onChange={(e) => setStopLoss(e.target.value)}
                                                disabled={isRunning}
                                                className="w-full bg-[#05050F] border border-[#FF3D00]/20 rounded-xl py-3 px-4 text-[#FF3D00] font-mono font-bold focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00]/50 focus:outline-none transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[#00D1FF] font-bold uppercase tracking-wider mb-2 block pl-1 font-mono">Meta de Ganancia ($)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={takeProfit}
                                                onChange={(e) => setTakeProfit(e.target.value)}
                                                disabled={isRunning}
                                                className="w-full bg-[#05050F] border border-[#00D1FF]/20 rounded-xl py-3 px-4 text-[#00D1FF] font-mono font-bold focus:border-[#00D1FF] focus:ring-1 focus:ring-[#00D1FF]/50 focus:outline-none transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>



                                <div className="bg-[#0B0E14] rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors shadow-inner">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-white font-mono">Protocolo Martingala</span>
                                        <div
                                            onClick={() => !isRunning && setUseMartingale(!useMartingale)}
                                            className={`w-12 h-7 rounded-full relative cursor-pointer transition-all duration-300 ${useMartingale ? 'bg-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.4)]' : 'bg-gray-700'} ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${useMartingale ? 'left-6' : 'left-1'}`}></div>
                                        </div>
                                    </div>
                                    {useMartingale && (
                                        <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
                                            <div>
                                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 block font-mono">Max Gale (Niveles)</label>
                                                <input
                                                    type="number"
                                                    value={maxGale}
                                                    onChange={(e) => setMaxGale(e.target.value)}
                                                    disabled={isRunning}
                                                    className="w-full bg-[#05050F] border border-gray-800 rounded-lg py-2 px-3 text-white font-mono text-sm focus:border-[#00E5FF] focus:outline-none transition-all disabled:opacity-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 block font-mono">Factor Multiplicador</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="1.5"
                                                    max="15"
                                                    value={martingaleFactor}
                                                    onChange={(e) => setMartingaleFactor(e.target.value)}
                                                    disabled={isRunning}
                                                    className="w-full bg-[#05050F] border border-gray-800 rounded-lg py-2 px-3 text-white font-mono text-sm focus:border-[#00E5FF] focus:outline-none transition-all disabled:opacity-50"
                                                />
                                                <p className="text-[9px] text-gray-500 mt-1 font-mono">Ej: 2.5 = dobla + 50%. 11 = payout DIFF</p>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-[11px] text-gray-500 leading-relaxed opacity-80 font-mono mt-3">
                                        Factor configurable. Stake inicial: ${stake}
                                    </p>
                                </div>


                                {/* Soros Strategy with Motion UI */}
                                <div className={`rounded-xl border transition-all duration-500 ease-out overflow-hidden ${useSoros
                                    ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                    : 'bg-gray-900/40 border-gray-800'
                                    }`}>
                                    <div className="p-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg transition-colors duration-300 ${useSoros ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-500'}`}>
                                                    <Zap size={18} />
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

                                            <div
                                                onClick={() => !isRunning && setUseSoros(!useSoros)}
                                                className={`w-12 h-7 rounded-full relative cursor-pointer transition-all duration-300 ${useSoros
                                                    ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                                    : 'bg-gray-700'
                                                    } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${useSoros ? 'left-6' : 'left-1'
                                                    }`}></div>
                                            </div>
                                        </div>

                                        {/* Expandable Configuration Area */}
                                        <div className={`transition-all duration-500 ease-in-out ${useSoros ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>

                                            {/* Level Slider */}
                                            <div className="pt-2 pb-4">
                                                <div className="flex justify-between text-[10px] text-purple-400/80 font-mono mb-2 uppercase font-bold">
                                                    <span>Conservador (1)</span>
                                                    <span>Agresivo (5)</span>
                                                </div>
                                                <div className="relative h-2 bg-gray-800 rounded-full cursor-pointer group">
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                                                        style={{ width: `${(sorosLevels / 5) * 100}%` }}
                                                    ></div>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="5"
                                                        step="1"
                                                        disabled={isRunning}
                                                        value={sorosLevels}
                                                        onChange={(e) => setSorosLevels(parseInt(e.target.value))}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-purple-500 transition-all duration-300 pointer-events-none group-hover:scale-125"
                                                        style={{ left: `calc(${(sorosLevels / 5) * 100}% - 8px)` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Visual Cycle Feedback */}
                                            <div className="bg-black/40 rounded-lg p-3 border border-purple-500/10 flex items-center justify-between text-[11px] font-mono">
                                                <div className="text-center">
                                                    <span className="block text-gray-500 text-[9px] uppercase mb-1">Base</span>
                                                    <span className="text-white font-bold">${stake}</span>
                                                </div>
                                                <div className="w-full mx-2 relative h-px bg-gray-800">
                                                    <div className="absolute inset-0 bg-purple-500/50 animate-pulse"></div>
                                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-500/20 px-2 rounded-full text-[9px] text-purple-400 font-bold whitespace-nowrap border border-purple-500/30">
                                                        {sorosLevels} {sorosLevels === 1 ? 'Nivel' : 'Niveles'}
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <span className="block text-gray-500 text-[9px] uppercase mb-1">Meta</span>
                                                    <span className="text-purple-400 font-bold drop-shadow-lg">
                                                        Max Power
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-gray-500 mt-3 text-center leading-relaxed">
                                                Reinicia a la base después de <strong className="text-purple-400">{sorosLevels}</strong> victorias consecutivas.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cooldown Configuration Section */}
                                <div className="bg-cyan-500/5 rounded-xl p-4 border border-cyan-500/20">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Snowflake size={16} className="text-cyan-400" />
                                        <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider font-mono">
                                            Bóveda Inteligente
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Profit Target */}
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-mono mb-1 block uppercase">
                                                🏦 Meta Lucro ($)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.50"
                                                min="1"
                                                value={profitTarget}
                                                onChange={(e) => setProfitTarget(e.target.value)}
                                                disabled={isRunning}
                                                className="w-full bg-[#05050F] border border-cyan-500/20 rounded-lg py-2 px-3 text-cyan-300 font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Max Losses */}
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-mono mb-1 block uppercase">
                                                🛡️ Máx Pérdidas
                                            </label>
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                max="5"
                                                value={maxLosses}
                                                onChange={(e) => setMaxLosses(e.target.value)}
                                                disabled={isRunning}
                                                className="w-full bg-[#05050F] border border-cyan-500/20 rounded-lg py-2 px-3 text-cyan-300 font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    <p className="text-[9px] text-cyan-400/60 mt-3 font-mono leading-relaxed">
                                        Al alcanzar la meta o pérdidas consecutivas, la Bóveda se activa por 60-90s para proteger tu capital.
                                    </p>
                                </div>

                                <div className="mt-auto pt-6 border-t border-gray-800/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400 font-medium font-mono">Estrategia</span>
                                        <button className="text-[10px] font-bold text-[#00E5FF] bg-[#00E5FF]/10 px-3 py-1.5 rounded-lg border border-[#00E5FF]/20 hover:bg-[#00E5FF]/20 transition-colors font-mono tracking-wide">
                                            SHADOW + INERTIA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* RIGHT COLUMN: Data & Logs - SECOND ON MOBILE */}
                    <div className="lg:col-span-8 flex flex-col gap-4 lg:gap-6 order-2">

                        {/* STRATEGY GRID */}
                        <StrategyGrid
                            strategies={strategies}
                            isRunning={isRunning}
                            onToggleStrategy={handleStrategyToggle}
                        />

                        {/* Bottom Row: Live Activity - MOBILE OPTIMIZED */}
                        <div className="bg-[#0B0E14]/80 backdrop-blur-xl rounded-xl lg:rounded-2xl p-4 lg:p-6 flex flex-col h-[280px] lg:h-[400px] shadow-2xl border border-white/5">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 lg:mb-6">
                                <div className="flex items-center gap-2">
                                    <Terminal size={16} className="text-[#00E5FF]" />
                                    <h3 className="text-white font-bold text-xs lg:text-sm tracking-wide font-mono">REGISTRO</h3>
                                </div>
                                <div className="flex gap-8 text-[10px] font-bold text-gray-400 tracking-wider bg-[#0B0E14] px-4 py-1.5 rounded-lg border border-white/5 font-mono">
                                    <span className="hidden sm:block w-20 text-gray-500">HORA</span>
                                    <span className="w-full text-left text-gray-300">PROCESO</span>
                                    <span className="w-20 text-right text-gray-500">RESULTADO</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 custom-scrollbar flex flex-col" ref={logsContainerRef}>
                                {logs.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 animate-pulse">
                                            <Terminal size={32} className="text-blue-400" />
                                        </div>
                                        <p className="text-sm font-medium tracking-wide font-mono">Esperando inicio...</p>
                                    </div>
                                )}
                                {logs.map((log, index) => {
                                    return (
                                        <div key={`${log.id}-${index}`} className={`animate-enter-log group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 hover:scale-[1.01] ${log.type === 'success' ? 'bg-[#00E5FF]/5 border-[#00E5FF]/20 shadow-[0_0_10px_rgba(0,229,255,0.05)]' :
                                            log.type === 'error' ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_10px_rgba(255,61,0,0.05)]' :
                                                log.type === 'gold' ? 'bg-amber-500/5 border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.05)]' :
                                                    'bg-[#0B0E14]/50 border-gray-800 hover:bg-[#0B0E14]'
                                            }`}>
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`p-2 rounded-lg shrink-0 ${log.type === 'success' ? 'bg-[#00E5FF]/10 text-[#00E5FF]' :
                                                    log.type === 'error' ? 'bg-red-500/10 text-red-500' :
                                                        log.type === 'gold' ? 'bg-amber-500/10 text-amber-400' :
                                                            'bg-blue-500/10 text-blue-400'
                                                    }`}>
                                                    {log.type === 'success' ? <ArrowUpRight size={18} strokeWidth={3} /> :
                                                        log.type === 'error' ? <ArrowDownRight size={18} strokeWidth={3} /> :
                                                            log.type === 'gold' ? <Sparkles size={18} /> :
                                                                <Code size={18} />}
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 flex-1">
                                                    <span className="text-[10px] font-mono text-gray-400 w-20 shrink-0 opacity-70">{log.time}</span>
                                                    <div className="flex-1">
                                                        <h4 className={`text-xs font-bold tracking-wide font-mono ${log.type === 'success' ? 'text-white' : log.type === 'error' ? 'text-white' : log.type === 'gold' ? 'text-amber-200' : 'text-gray-300'}`}>{log.message}</h4>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right w-24 shrink-0">
                                                <span className={`font-mono font-black text-sm ${log.type === 'success' ? 'text-[#00E5FF]' : log.type === 'error' ? 'text-[#FF3D00]' : log.type === 'gold' ? 'text-amber-400' : 'text-gray-500'}`}>
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
