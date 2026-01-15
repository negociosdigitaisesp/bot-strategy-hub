import React, { useState, useEffect } from 'react';
import { Activity, Zap, TrendingUp, Radio, Bot, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { bots as mockBots } from '../lib/mockData';

interface BotLogEntry {
    id: string;
    name: string;
    accuracy: number;
    status: 'operational' | 'standby' | 'analyzing';
    lastSignal: string;
}

/**
 * LiveBotFeed - Gamified activity log showing top performing bots
 * Replaces the old BotFinderRadar with a server-log aesthetic
 */
const LiveBotFeed: React.FC = () => {
    const [entries, setEntries] = useState<BotLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Initialize and simulate live updates
    useEffect(() => {
        const loadInitialData = () => {
            // Get top 5 bots sorted by accuracy
            const topBots = [...mockBots]
                .sort((a, b) => b.accuracy - a.accuracy)
                .slice(0, 5)
                .map((bot, index) => ({
                    id: `bot-${index}`,
                    name: bot.name,
                    accuracy: bot.accuracy,
                    status: index === 0 ? 'operational' as const :
                        Math.random() > 0.3 ? 'operational' as const : 'standby' as const,
                    lastSignal: getRandomTimeAgo()
                }));

            setEntries(topBots);
            setIsLoading(false);
        };

        loadInitialData();

        // Simulate live updates every 12 seconds
        const interval = setInterval(() => {
            setLastUpdate(new Date());
            setEntries(prev => prev.map(entry => ({
                ...entry,
                lastSignal: getRandomTimeAgo(),
                status: Math.random() > 0.2 ? 'operational' : 'standby'
            })));
        }, 12000);

        return () => clearInterval(interval);
    }, []);

    const getRandomTimeAgo = () => {
        const seconds = Math.floor(Math.random() * 120) + 5;
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'operational': return 'bg-emerald-500';
            case 'standby': return 'bg-amber-500';
            case 'analyzing': return 'bg-blue-500';
            default: return 'bg-slate-500';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'operational': return 'Operando';
            case 'standby': return 'Standby';
            case 'analyzing': return 'Analizando';
            default: return 'Offline';
        }
    };

    if (isLoading) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-slate-700/50 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-slate-800/50 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl border border-slate-700/30 rounded-xl overflow-hidden shadow-2xl shadow-black/20">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-700/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
                        <Radio size={18} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            Top Bots en Vivo
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                LIVE
                            </span>
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono">
                            Última actualización: {lastUpdate.toLocaleTimeString()}
                        </p>
                    </div>
                </div>
                <Sparkles size={16} className="text-amber-400/60" />
            </div>

            {/* Bot entries */}
            <div className="divide-y divide-slate-800/50">
                {entries.map((entry, index) => (
                    <div
                        key={entry.id}
                        className={cn(
                            "px-5 py-3 flex items-center gap-4 transition-all duration-300",
                            "hover:bg-slate-800/30 group"
                        )}
                    >
                        {/* Rank */}
                        <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold",
                            index === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                index === 1 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                                    index === 2 ? "bg-orange-600/20 text-orange-400 border border-orange-600/30" :
                                        "bg-slate-700/30 text-slate-500 border border-slate-600/20"
                        )}>
                            {index + 1}
                        </div>

                        {/* Bot Icon */}
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Bot size={16} className="text-primary/70" />
                        </div>

                        {/* Bot Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-primary transition-colors">
                                {entry.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                                Hace {entry.lastSignal}
                            </p>
                        </div>

                        {/* Accuracy */}
                        <div className="text-right">
                            <p className={cn(
                                "text-sm font-bold font-mono",
                                entry.accuracy >= 80 ? "text-emerald-400" :
                                    entry.accuracy >= 70 ? "text-blue-400" :
                                        "text-amber-400"
                            )}>
                                {entry.accuracy}%
                            </p>
                            <p className="text-[9px] text-slate-600 uppercase tracking-wider">
                                Asertividad
                            </p>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-800/50 border border-slate-700/30">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                getStatusColor(entry.status),
                                entry.status === 'operational' && "animate-pulse"
                            )}></div>
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">
                                {getStatusText(entry.status)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-900/50 border-t border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <Activity size={12} />
                    <span>Actualización automática cada 12s</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-500/60">
                    <Zap size={10} />
                    <span>{entries.filter(e => e.status === 'operational').length}/{entries.length} activos</span>
                </div>
            </div>
        </div>
    );
};

export default LiveBotFeed;
