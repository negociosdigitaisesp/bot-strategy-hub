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
    Bug
} from 'lucide-react';
import { toast } from 'sonner';
import { useBotAstron, LogEntry } from '../../hooks/useBotAstron';
import { useDeriv } from '../../contexts/DerivContext';

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
    const { isRunning, stats, logs, recentTicks, startBot, stopBot } = useBotAstron();
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // Config States
    const [stake, setStake] = useState<string>('0.35');
    const [stopLoss, setStopLoss] = useState<string>('50.00');
    const [takeProfit, setTakeProfit] = useState<string>('50.00');
    const [useMartingale, setUseMartingale] = useState<boolean>(true);
    const [maxGale, setMaxGale] = useState<string>('3'); // Default Max Gale 3

    // Auto-scroll logs
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.info('Astron Bot detenido');
        } else {
            if (!isConnected) {
                toast.error('Primero debe conectar su cuenta Deriv');
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
            if (isNaN(maxGaleVal) || maxGaleVal < 0) {
                toast.error('Nivel de Martingala inválido');
                return;
            }

            const success = startBot({
                stake: stakeVal,
                stopLoss: stopLossVal,
                takeProfit: takeProfitVal,
                symbol: 'R_10',
                useMartingale: useMartingale,
                maxMartingaleLevel: maxGaleVal,
            });

            if (success) {
                toast.success('Astron Bot iniciado');
            }
        }
    };

    const winRate = (stats.wins + stats.losses) > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : '0.0';

    const totalOps = stats.wins + stats.losses;

    return (
        <div className="min-h-screen bg-transparent text-white p-3 sm:p-6 font-sans">
            <div className="max-w-[1600px] mx-auto px-2 sm:px-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 bg-[#0B0E14]/50 p-3 sm:p-4 rounded-2xl border border-white/5 backdrop-blur-md gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#00E5FF]/20 via-[#00E5FF]/10 to-transparent rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative p-2 sm:p-3 bg-[#00E5FF]/10 rounded-xl border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                                <Bug className="text-[#00E5FF]" size={24} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                                BUG DERIV
                            </h1>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] font-mono font-bold">
                                Sistema de Control v3.0
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="text-left sm:text-right flex-1 sm:flex-none">
                            <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider block font-bold font-mono">Cuenta Deriv</span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Wifi size={12} className={isConnected ? "text-green-500" : "text-red-500"} />
                                <span className="text-xs font-bold text-white">{account?.loginid || 'Desconectado'}</span>
                            </div>
                        </div>
                        <div className={`px-4 py-2 rounded-lg border ${isRunning ? 'bg-[#00E5FF]/10 border-[#00E5FF] text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.3)]' : 'bg-gray-800 border-gray-700 text-gray-400'} flex items-center gap-2 text-xs font-bold font-mono transition-all duration-300`}>
                            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#00E5FF] animate-ping' : 'bg-gray-500'}`}></div>
                            {isRunning ? 'SISTEMA ACTIVO' : 'SISTEMA EN REPOSO'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN: Controls & Key Stats */}
                    <div className="lg:col-span-4 flex flex-col gap-6">

                        {/* Market Result (Overview) */}
                        <div className="bg-[#0B0E14]/80 backdrop-blur-xl rounded-2xl p-6 relative flex flex-col justify-between group overflow-hidden transition-all duration-500 border border-white/5 hover:border-[#00E5FF]/30">
                            {/* Ambient Background Glow */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00E5FF]/10 blur-[80px] rounded-full pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-2">
                                    <Terminal size={18} className="text-[#00E5FF]" />
                                    <h3 className="text-white font-bold text-sm tracking-wide font-mono">RESULTADO</h3>
                                </div>
                                <ShieldAlert size={14} className="text-gray-500 cursor-pointer hover:text-white transition-colors" />
                            </div>

                            <div className="text-center mb-6 relative z-10">
                                <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-1">Beneficio Total</p>
                                <div className={`text-4xl font-black flex items-center justify-center gap-2 ${stats.totalProfit >= 0 ? 'text-[#00E5FF] drop-shadow-[0_0_15px_rgba(0,229,255,0.6)]' : 'text-[#FF3D00] drop-shadow-[0_0_15px_rgba(255,61,0,0.6)]'} transition-all duration-300 scale-100`}>
                                    {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)} <span className="text-lg opacity-50">$</span>
                                </div>
                                <div className="flex justify-center mt-2">
                                    <span className="text-[10px] bg-white/5 px-3 py-0.5 rounded-full text-gray-400 font-mono border border-white/5">
                                        RENDIMIENTO: {totalOps > 0 ? ((stats.totalProfit / (totalOps * parseFloat(stake || '1'))) * 100).toFixed(2) : '0.00'}%
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-2 relative z-10">
                                {/* Wins Block */}
                                <div className="flex flex-col items-center group/item">
                                    <div className="bg-[#111625]/80 backdrop-blur-sm rounded-xl p-3 w-full border border-gray-800 relative overflow-hidden group-hover/item:border-[#00E5FF]/30 transition-all duration-300 shadow-lg">
                                        <div className="text-center mb-1">
                                            <span className="text-xl font-bold text-[#00E5FF]">{stats.wins}</span>
                                        </div>
                                        <ProgressBar
                                            value={totalOps > 0 ? (stats.wins / totalOps) * 100 : 0}
                                            color="#00E5FF"
                                            glowColor="rgba(0, 229, 255, 0.5)"
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

                        {/* Strategy Configuration */}
                        <div className="bg-[#0B0E14]/80 backdrop-blur-xl rounded-2xl p-6 flex flex-col shadow-2xl transition-transform hover:scale-[1.005] duration-300 border-t border-t-[#00E5FF]/10 border border-white/5">
                            <div className="flex items-center gap-2 mb-6">
                                <Code size={18} className="text-[#00E5FF]" />
                                <h3 className="text-white font-bold text-sm tracking-wide font-mono">CONFIGURACIÓN</h3>
                            </div>

                            <div className="flex-1 space-y-6">
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
                                            className="w-full bg-[#05050F] border border-gray-800 rounded-xl py-4 pl-8 pr-4 text-white font-mono text-lg font-bold focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/50 focus:outline-none transition-all disabled:opacity-50 shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                                        <div className="mt-3 pt-3 border-t border-gray-800">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 block font-mono">Max Gale (Niveles)</label>
                                            <input
                                                type="number"
                                                value={maxGale}
                                                onChange={(e) => setMaxGale(e.target.value)}
                                                disabled={isRunning}
                                                className="w-full bg-[#05050F] border border-gray-800 rounded-lg py-2 px-3 text-white font-mono text-sm focus:border-[#00E5FF] focus:outline-none transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    )}
                                    <p className="text-[11px] text-gray-500 leading-relaxed opacity-80 font-mono mt-3">
                                        Auto-recuperación: Doblar apuesta tras pérdida para forzar recuperación.
                                    </p>
                                </div>

                                <div className="mt-auto pt-6 border-t border-gray-800/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400 font-medium font-mono">Estrategia</span>
                                        <button className="text-[10px] font-bold text-[#00E5FF] bg-[#00E5FF]/10 px-3 py-1.5 rounded-lg border border-[#00E5FF]/20 hover:bg-[#00E5FF]/20 transition-colors font-mono tracking-wide">
                                            MEAN REVERSION
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Data & Logs */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* Top Row: Tick & Bots */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tick Analysis Card */}
                            <div className="bg-[#0B0E14]/80 backdrop-blur-xl rounded-2xl p-0 overflow-hidden flex flex-col relative group border border-white/5 shadow-2xl h-[380px]">
                                <div className="p-5 pb-3 flex justify-between items-center bg-[#111625] border-b border-white/5 z-20 relative">
                                    <div className="flex items-center gap-2">
                                        <List size={16} className="text-[#00E5FF]" />
                                        <h3 className="text-white font-bold text-sm tracking-wide font-mono">FLUJO DE DATOS</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1.5 bg-[#00E5FF]/10 px-2 py-1 rounded-md border border-[#00E5FF]/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
                                            <span className="text-[10px] text-[#00E5FF] font-bold tracking-wider font-mono">EN VIVO</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table Header */}
                                <div className="grid grid-cols-3 px-6 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#0B0E14] z-10 font-mono">
                                    <div>Precio / Dígito</div>
                                    <div className="text-center">Señal</div>
                                    <div className="text-right">Cambio</div>
                                </div>

                                {/* Table Body - Tick List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#05050F]">
                                    {recentTicks.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs opacity-50 font-mono">
                                            <Activity className="mb-2 animate-bounce" size={20} />
                                            Esperando datos...
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        {recentTicks.map((tick, index) => (
                                            <div key={tick.id} className={`
                                            grid grid-cols-3 px-6 py-2.5 border-b border-white/[0.03] items-center 
                                            transition-all duration-500 font-mono
                                            ${index === 0 ? 'bg-[#00E5FF]/5 animate-enter-row border-l-2 border-l-[#00E5FF]' : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'}
                                        `}>
                                                <div className={`text-sm font-medium ${tick.isUp ? 'text-[#2F80ED]' : 'text-red-500'} flex items-baseline gap-1`}>
                                                    <span className="opacity-60 text-xs tracking-tighter">{tick.price.slice(0, -1)}</span>
                                                    <span className={`text-base font-bold ${tick.isUp ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-red-400'}`}>{tick.price.slice(-1)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${index === 0 ? 'bg-white/10 text-white' : 'text-gray-500 opacity-60'}`}>
                                                        {tick.signal}
                                                    </span>
                                                </div>
                                                <div className={`text-right text-xs font-bold ${tick.change.startsWith('+') ? 'text-[#00E5FF]' : 'text-[#FF3D00]'}`}>
                                                    {tick.change}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Gradient Overlay at bottom for fade effect */}
                                    <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#05050F] to-transparent pointer-events-none z-10"></div>
                                </div>
                            </div>

                            {/* Active Bots Card */}
                            <div className="bg-[#0B0E14]/80 backdrop-blur-xl rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-2xl h-[380px] border border-white/5">
                                {/* Background Effect - Moving Gradient */}
                                <div className="absolute top-0 right-0 w-48 h-48 bg-[#00E5FF]/10 rounded-full blur-[60px] -mr-10 -mt-10 animate-pulse-glow"></div>

                                <div className="flex justify-between items-center mb-6 relative z-10">
                                    <h3 className="text-gray-400 font-bold text-sm tracking-wide font-mono">BOT ACTIVO</h3>
                                    <span className="flex h-3 w-3 relative">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isRunning ? 'bg-green-400 opacity-75' : 'bg-gray-500 opacity-20'}`}></span>
                                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                    </span>
                                </div>

                                <div className="flex-1 space-y-4 relative z-10">
                                    <div className="bg-[#0B0E14] rounded-xl p-4 border border-[#00E5FF]/30 relative overflow-hidden group hover:border-[#00E5FF]/60 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.3)]">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isRunning ? 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]' : 'bg-gray-600'} transition-all duration-300`}></div>
                                        <div className="flex justify-between items-start mb-2 pl-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-[#00E5FF]/10 rounded-xl border border-[#00E5FF]/20">
                                                    <Bug className="text-[#00E5FF]" size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-white text-base tracking-tight font-mono">ASTRON BOT v3</h4>
                                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5 font-mono">ESTRATEGIA: MEAN REVERSION</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-5 pl-2">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 font-mono">Ganancia Sesión</span>
                                                <span className={`text-base font-black ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} font-mono`}>
                                                    {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleToggleBot}
                                                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex-shrink-0 ${isRunning
                                                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50'
                                                        : 'bg-gradient-to-r from-[#00E5FF] to-[#00D1FF] hover:from-[#00D1FF] hover:to-[#00E5FF] text-black shadow-lg shadow-[#00E5FF]/30 hover:shadow-[#00E5FF]/50'
                                                    }`}
                                            >
                                                {isRunning ? (
                                                    <span className="flex items-center gap-1.5 sm:gap-2">
                                                        <Square size={14} className="sm:w-4 sm:h-4" fill="currentColor" />
                                                        <span className="hidden sm:inline">DETENER</span>
                                                        <span className="sm:hidden">STOP</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 sm:gap-2">
                                                        <Play size={14} className="sm:w-4 sm:h-4" fill="currentColor" />
                                                        <span className="hidden sm:inline">INICIAR</span>
                                                        <span className="sm:hidden">START</span>
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-[#0B0E14]/30 rounded-xl p-3 border border-gray-800/50 flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity cursor-not-allowed grayscale">
                                        <div className="flex items-center gap-3">
                                            <Layers className="text-gray-400" size={18} />
                                            <span className="text-sm text-gray-400 font-medium font-mono">Protección de Balance</span>
                                        </div>
                                        <span className="text-[9px] border border-gray-700 rounded px-1.5 py-0.5 text-gray-500 font-bold uppercase font-mono">Activado</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row: Live Activity */}
                        <div className="bg-[#0B0E14]/80 backdrop-blur-xl rounded-2xl p-6 flex flex-col h-[400px] shadow-2xl border border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <Terminal size={18} className="text-[#00E5FF]" />
                                    <h3 className="text-white font-bold text-sm tracking-wide font-mono">REGISTRO DEL SISTEMA</h3>
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
                                {logs.map((log) => {
                                    return (
                                        <div key={log.id} className={`animate-enter-log group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 hover:scale-[1.01] ${log.type === 'success' ? 'bg-[#00E5FF]/5 border-[#00E5FF]/20 shadow-[0_0_10px_rgba(0,229,255,0.05)]' :
                                            log.type === 'error' ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_10px_rgba(255,61,0,0.05)]' :
                                                'bg-[#0B0E14]/50 border-gray-800 hover:bg-[#0B0E14]'
                                            }`}>
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`p-2 rounded-lg shrink-0 ${log.type === 'success' ? 'bg-[#00E5FF]/10 text-[#00E5FF]' :
                                                    log.type === 'error' ? 'bg-red-500/10 text-red-500' :
                                                        'bg-blue-500/10 text-blue-400'
                                                    }`}>
                                                    {log.type === 'success' ? <ArrowUpRight size={18} strokeWidth={3} /> :
                                                        log.type === 'error' ? <ArrowDownRight size={18} strokeWidth={3} /> :
                                                            <Code size={18} />}
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 flex-1">
                                                    <span className="text-[10px] font-mono text-gray-400 w-20 shrink-0 opacity-70">{log.time}</span>
                                                    <div className="flex-1">
                                                        <h4 className={`text-xs font-bold tracking-wide font-mono ${log.type === 'success' ? 'text-white' : log.type === 'error' ? 'text-white' : 'text-gray-300'}`}>{log.message}</h4>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right w-24 shrink-0">
                                                {/* Check if message contains profit info to display here, or leave as status */}
                                                <span className={`font-mono font-black text-sm ${log.type === 'success' ? 'text-[#00E5FF]' : log.type === 'error' ? 'text-[#FF3D00]' : 'text-gray-500'}`}>
                                                    {log.type === 'success' ? 'WIN' : log.type === 'error' ? 'LOSS' : 'INFO'}
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
        </div>
    );
};

export default AstronPanel;
