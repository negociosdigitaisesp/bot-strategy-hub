import React from 'react';
import { Play, Square, Activity, Trophy, Zap, BarChart3 } from 'lucide-react';
import { StrategyPerformance } from '../../hooks/useBotAstron';

interface StrategyCardProps {
    strategy: StrategyPerformance;
    rank: number;
    isRunning: boolean;
    onToggle: (id: number) => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, rank, isRunning, onToggle }) => {
    const { id, name, wins, losses, winRate, syncScore, status, active } = strategy;

    // Derived colors/styles based on status/score
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'OPTIMO': return 'text-[#00FF88]';
            case 'FUERTE': return 'text-[#00E5FF]';
            case 'ESTABLE': return 'text-[#2F80ED]';
            default: return 'text-gray-400';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-[#00FF88] border-[#00FF88]';
        if (score >= 75) return 'text-[#00E5FF] border-[#00E5FF]';
        if (score >= 60) return 'text-yellow-400 border-yellow-400';
        return 'text-amber-500 border-amber-500';
    };

    return (
        <div className={`
            relative overflow-hidden rounded-2xl border transition-all duration-300 group
            ${active
                ? 'bg-[#0B0E14] border-[#00E5FF] shadow-[0_0_30px_rgba(0,229,255,0.15)]'
                : 'bg-[#111625]/80 border-white/5 hover:border-white/10 hover:bg-[#151a2d]'
            }
        `}>
            {/* Active Glow Background */}
            {active && (
                <div className="absolute inset-0 bg-[#00E5FF]/5 pointer-events-none" />
            )}

            <div className="p-5 relative z-10 flex flex-col h-full justify-between gap-4">

                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                RANK #{rank}
                            </span>
                            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border bg-opacity-10 ${active ? 'bg-[#00FF88] text-[#00FF88] border-[#00FF88]/20' : 'bg-gray-500 text-gray-400 border-gray-500/20'
                                }`}>
                                {active ? '● EN VIVO' : 'DISPONIBLE'}
                            </span>
                        </div>
                        <h3 className="text-lg font-black text-white tracking-wide">{name}</h3>
                        <div className="flex gap-1 mt-1">
                            {[1, 2, 3].map(i => (
                                <Zap key={i} size={12} className="text-yellow-500 fill-yellow-500" />
                            ))}
                        </div>
                    </div>

                    {/* Score Circle */}
                    <div className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center ${getScoreColor(syncScore)}`}>
                        <span className="text-lg font-black leading-none">{syncScore}</span>
                        <span className="text-[8px] font-bold uppercase">Score</span>
                    </div>
                </div>

                {/* Performance Stats */}
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className="text-[10px] uppercase text-gray-500 font-bold block mb-1 flex items-center gap-1">
                                <Activity size={10} /> Tasa de Acierto
                            </span>
                            <span className="text-3xl font-black text-white">{winRate}<span className="text-sm text-gray-500">%</span></span>
                        </div>
                        <div className="text-right space-y-1">
                            <div className="text-[10px] font-mono text-[#00FF88] bg-[#00FF88]/10 px-2 py-0.5 rounded flex items-center gap-1 justify-end">
                                GANADAS <span className="font-bold">{wins}</span>
                            </div>
                            <div className="text-[10px] font-mono text-[#FF3D00] bg-[#FF3D00]/10 px-2 py-0.5 rounded flex items-center gap-1 justify-end">
                                PERDIDAS <span className="font-bold">{losses}</span>
                            </div>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-[#00FF88]"
                            style={{ width: `${winRate}%` }}
                        />
                    </div>
                </div>

                {/* Sincronia / Status */}
                <div className="flex items-center justify-between px-2">
                    {/* Visual Triangle (Mock) */}
                    <div className="relative w-8 h-8 flex items-center justify-center">
                        <div className={`absolute inset-0 border-t-transparent border-l-[16px] border-r-[16px] border-b-[28px] border-b-[rgba(0,229,255,0.1)] border-l-transparent border-r-transparent transform scale-75 opacity-50`}></div>
                        <div className={`absolute inset-0 border-t-transparent border-l-[12px] border-r-[12px] border-b-[20px] ${active ? 'border-b-[#00E5FF]' : 'border-b-gray-600'} border-l-transparent border-r-transparent top-1 left-1`}></div>
                    </div>

                    <div className="text-right">
                        <div className="text-[10px] text-gray-500 font-mono mb-0.5">SINCRONÍA / ESTADO</div>
                        <div className={`text-sm font-bold font-mono flex items-center justify-end gap-1.5 ${getStatusColor(status)}`}>
                            <BarChart3 size={14} />
                            {status}
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => onToggle(id)}
                    disabled={isRunning && !active}
                    className={`
                        w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2
                        ${active
                            ? 'bg-[#FF3D00]/10 text-[#FF3D00] border border-[#FF3D00]/50 hover:bg-[#FF3D00]/20'
                            : 'bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90 shadow-[0_0_20px_rgba(0,229,255,0.3)]'
                        }
                        ${isRunning && !active ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                    `}
                >
                    {active ? (
                        <>
                            <Square size={14} fill="currentColor" /> DETENER BOT
                        </>
                    ) : (
                        <>
                            <Play size={14} fill="currentColor" /> EJECUTAR ESTRATEGIA
                        </>
                    )}
                </button>

            </div>
        </div>
    );
};
