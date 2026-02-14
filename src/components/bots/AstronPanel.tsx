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
        <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center p-6 text-center">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-1000">
                <div className="relative inline-block">
                    <div className="absolute -inset-6 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="relative bg-[#0B0E14] p-8 rounded-3xl border border-amber-500/20 shadow-2xl">
                        <div className="bg-amber-500/10 p-6 rounded-2xl border border-amber-500/30">
                            <Settings size={48} className="text-amber-500 animate-spin-slow" />
                        </div>
                    </div>
                    {/* Floating elements */}
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center animate-bounce duration-[3000ms]">
                        <Search size={20} className="text-gray-500" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase group">
                        MÓDULO EN <span className="text-amber-500">MANTENIMIENTO</span>
                    </h1>
                    <div className="h-1.5 w-32 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>
                    <p className="text-gray-400 font-medium leading-relaxed mt-6">
                        Nuestros sistemas de auditoría están realizando una optimización programada. Esta funcionalidad estará disponible próximamente tras la actualización del protocolo de seguridad.
                    </p>

                    <div className="pt-8 flex flex-col items-center gap-6">
                        <div className="flex items-center gap-3 px-6 py-2.5 bg-black/40 border border-white/5 rounded-2xl text-[10px] font-mono text-gray-400 border-t-white/10 shadow-xl">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40 animate-pulse delay-100"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/20 animate-pulse delay-200"></div>
                            </div>
                            <span className="uppercase tracking-[0.2em] font-bold">Estado: Auditoría Interna #402</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full pt-4">
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left">
                                <span className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Próxima ventana</span>
                                <span className="text-xs text-gray-300 font-mono">T+48:00:00</span>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left">
                                <span className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Carga Actual</span>
                                <span className="text-xs text-gray-300 font-mono">OPTIMIZANDO</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8">
                    <button
                        onClick={() => window.history.back()}
                        className="group relative w-full px-8 py-4 bg-[#0B0E14] hover:bg-white/5 border border-white/10 rounded-2xl transition-all duration-300 overflow-hidden shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <span className="relative z-10 text-xs font-black text-gray-400 group-hover:text-white transition-colors tracking-[0.2em]">
                            VOLVER AL PANEL DE CONTROL
                        </span>
                    </button>
                    <p className="text-[9px] text-gray-600 mt-6 font-mono tracking-widest uppercase">
                        Admin Protocol V5.2.0 • Security Cluster A-12
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AstronPanel;
