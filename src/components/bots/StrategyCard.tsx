import React from 'react';
import { Play, Square, Activity, BarChart3 } from 'lucide-react';
import { StrategyPerformance } from '../../hooks/useBotAstron';

interface StrategyCardProps {
    strategy: StrategyPerformance;
    rank: number;
    isRunning: boolean;
    onToggle: (id: number) => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, rank, isRunning, onToggle }) => {
    const { id, name, wins, losses, winRate, syncScore, status, active } = strategy;

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'OPTIMO': return { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
            case 'FUERTE': return { text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' };
            case 'ESTABLE': return { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
            default: return { text: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20' };
        }
    };

    const statusStyle = getStatusColor(status);

    // Conic gradient angle for score circle
    const scoreAngle = (syncScore / 100) * 360;
    const scoreColor = syncScore >= 90 ? '#34d399' : syncScore >= 75 ? '#22d3ee' : syncScore >= 60 ? '#facc15' : '#f97316';

    return (
        <div
            className={`
                astron-card relative rounded-2xl transition-all duration-300 will-change-transform
                ${active
                    ? 'bg-[#0a0f1a] border border-cyan-500/40 shadow-[0_0_24px_rgba(0,229,255,0.1)]'
                    : 'bg-[#0d1117] border border-white/[0.06] hover:border-white/[0.12]'
                }
            `}
            style={{ transform: 'translateZ(0)' }}
        >
            {/* Content */}
            <div className="p-5 sm:p-6 flex flex-col gap-5">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        {/* Rank + Live badge */}
                        <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-[10px] font-semibold font-mono text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-md">
                                #{rank}
                            </span>
                            {active && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 astron-dot-pulse" />
                                    EN VIVO
                                </span>
                            )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight truncate">
                            {name}
                        </h3>
                    </div>

                    {/* Score Ring via conic-gradient */}
                    <div
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0"
                        style={{
                            background: `conic-gradient(${scoreColor} ${scoreAngle}deg, rgba(255,255,255,0.06) ${scoreAngle}deg)`,
                            padding: '3px',
                        }}
                    >
                        <div className="w-full h-full rounded-full bg-[#0d1117] flex flex-col items-center justify-center">
                            <span className="text-base sm:text-lg font-black leading-none text-white">{syncScore}</span>
                            <span className="text-[7px] font-bold uppercase text-gray-500 tracking-wider mt-0.5">Score</span>
                        </div>
                    </div>
                </div>

                {/* ── Win Rate Hero ── */}
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
                    <div className="flex items-end justify-between mb-3">
                        <div>
                            <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider flex items-center gap-1 mb-1">
                                <Activity size={10} className="opacity-60" /> Tasa de Acierto
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                {winRate}<span className="text-sm text-gray-500 ml-0.5">%</span>
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <div className="text-center px-2.5 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/10">
                                <span className="text-[10px] text-emerald-400 font-mono font-bold block">{wins}</span>
                                <span className="text-[8px] text-gray-500 uppercase">Win</span>
                            </div>
                            <div className="text-center px-2.5 py-1.5 rounded-lg bg-red-500/8 border border-red-500/10">
                                <span className="text-[10px] text-red-400 font-mono font-bold block">{losses}</span>
                                <span className="text-[8px] text-gray-500 uppercase">Loss</span>
                            </div>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                                width: `${winRate}%`,
                                background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)`,
                            }}
                        />
                    </div>
                </div>

                {/* ── Status Badge ── */}
                <div className="flex items-center justify-between">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono ${statusStyle.text} ${statusStyle.bg} border ${statusStyle.border}`}>
                        <BarChart3 size={12} />
                        {status}
                    </div>
                </div>

                {/* ── Action Button ── */}
                <button
                    onClick={() => onToggle(id)}
                    disabled={isRunning && !active}
                    className={`
                        w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest
                        transition-all duration-300 flex items-center justify-center gap-2
                        will-change-transform
                        ${active
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/15'
                            : 'bg-cyan-500 text-gray-950 hover:bg-cyan-400 shadow-[0_4px_20px_rgba(0,229,255,0.2)]'
                        }
                        ${isRunning && !active ? 'opacity-20 cursor-not-allowed grayscale' : ''}
                    `}
                >
                    {active ? (
                        <><Square size={13} fill="currentColor" /> Detener Bot</>
                    ) : (
                        <><Play size={13} fill="currentColor" /> Ejecutar Estrategia</>
                    )}
                </button>
            </div>
        </div>
    );
};
