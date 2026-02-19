import React from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Activity, BarChart3, AlertTriangle, Trophy, Zap, TrendingUp } from 'lucide-react';
import { StrategyPerformance } from '../../hooks/useBotAstron';

interface StrategyCardProps {
    strategy: StrategyPerformance;
    rank: number;
    index: number;
    isRunning: boolean;
    onToggle: (id: number) => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, rank, index, isRunning, onToggle }) => {
    const { id, name, wins, losses, winRate, syncScore, status, active } = strategy;
    const isTopRank = rank === 1;
    const isUnderObservation = winRate < 55 && (wins + losses) > 0;

    // Status Styling
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'OPTIMO': return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/20' };
            case 'FUERTE': return { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/20' };
            case 'ESTABLE': return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', glow: 'shadow-blue-500/20' };
            default: return { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', glow: 'shadow-none' };
        }
    };
    const statusStyle = getStatusColor(status);

    // Score Colors
    const scoreColor = syncScore >= 90 ? '#34d399' : syncScore >= 75 ? '#22d3ee' : syncScore >= 60 ? '#facc15' : '#f97316';
    const scoreAngle = (syncScore / 100) * 360;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`
                relative rounded-3xl overflow-hidden
                border backdrop-blur-xl transition-all duration-300
                ${active
                    ? 'bg-gradient-to-b from-[#0a0f1a]/95 to-black/95 border-cyan-500/30'
                    : 'bg-gradient-to-b from-[#111620]/90 to-black/80 border-white/[0.08] hover:border-white/[0.15]'
                }
                ${isTopRank ? 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.15)]' : ''}
                ${isUnderObservation ? 'opacity-70 grayscale-[0.3]' : ''}
            `}
        >
            {/* Active Glow Background */}
            {active && (
                <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none animate-pulse-slow" />
            )}

            <div className="p-6 relative z-10 flex flex-col gap-5">

                {/* Header: Rank & Score */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                        {/* Badges */}
                        <div className="flex items-center gap-2">
                            {isTopRank ? (
                                <motion.div
                                    initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                                    className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold font-mono flex items-center gap-1"
                                >
                                    <Trophy size={10} /> LÍDER #1
                                </motion.div>
                            ) : (
                                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-gray-400 text-[10px] font-mono font-semibold">
                                    #{rank}
                                </span>
                            )}

                            {active && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    ONLINE
                                </span>
                            )}
                        </div>

                        {/* Strategy Name */}
                        <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-cyan-50 transition-colors">
                            {name}
                        </h3>
                    </div>

                    {/* Score Ring */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        {/* Conic Gradient Ring */}
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: `conic-gradient(${scoreColor} ${scoreAngle}deg, rgba(255,255,255,0.05) ${scoreAngle}deg)`,
                                maskImage: 'radial-gradient(transparent 55%, black 56%)',
                                WebkitMaskImage: 'radial-gradient(transparent 55%, black 56%)'
                            }}
                        />
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-white leading-none">{syncScore}</span>
                        </div>
                    </div>
                </div>

                {/* Metrics Hero */}
                <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.04]">
                    <div className="flex items-end justify-between mb-3">
                        <div>
                            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-0.5 block">Win Rate</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                                    {winRate.toFixed(1)}
                                </span>
                                <span className="text-sm font-bold text-gray-500">%</span>
                            </div>
                        </div>

                        {/* Wins/Losses Pills */}
                        <div className="flex gap-2">
                            <div className="flex flex-col items-center bg-emerald-500/10 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 min-w-[50px]">
                                <span className="text-xs font-bold text-emerald-400">{wins}</span>
                                <span className="text-[7px] uppercase font-bold text-emerald-500/60">Win</span>
                            </div>
                            <div className="flex flex-col items-center bg-red-500/10 border border-red-500/10 rounded-lg px-2.5 py-1.5 min-w-[50px]">
                                <span className="text-xs font-bold text-red-400">{losses}</span>
                                <span className="text-[7px] uppercase font-bold text-red-500/60">Loss</span>
                            </div>
                        </div>
                    </div>

                    {/* Pro Bar */}
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden relative">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(winRate, 2)}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            className="absolute h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}80)` }}
                        />
                    </div>
                </div>

                {/* Footer: Status & Action */}
                <div className="flex gap-3">
                    <div className={`
                        flex-shrink-0 flex items-center justify-center w-12 rounded-xl border
                        ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}
                    `}>
                        <Activity size={18} />
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onToggle(id)}
                        disabled={isRunning && !active}
                        className={`
                            flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2
                            transition-all duration-300
                            ${active
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                : 'bg-cyan-500 text-gray-950 font-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]'
                            }
                            ${isRunning && !active ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                        `}
                    >
                        {active ? (
                            <><Square size={14} fill="currentColor" /> PAUSAR</>
                        ) : (
                            <><Play size={14} fill="currentColor" /> ACTIVAR</>
                        )}
                    </motion.button>
                </div>

            </div>
        </motion.div>
    );
};

