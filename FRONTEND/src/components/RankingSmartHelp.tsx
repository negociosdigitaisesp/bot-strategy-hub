import React from 'react';
import { HelpCircle, Play, ExternalLink, AlertTriangle, TrendingUp, Settings, StopCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Link } from 'react-router-dom';

interface RankingSmartHelpProps {
    variant?: 'token' | 'ranking';
}

export const RankingSmartHelp: React.FC<RankingSmartHelpProps> = ({ variant = 'ranking' }) => {
    if (variant === 'ranking') {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="ml-2 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-[#00F5D4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00F5D4]/50 p-0.5 hover:bg-[#00F5D4]/10"
                        title="Ayuda rápida"
                    >
                        <HelpCircle size={18} className="sm:inline hidden" />
                        <HelpCircle size={16} className="sm:hidden" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 border-cyan-500/30 bg-[#0c0e12]/90 backdrop-blur-xl shadow-[0_0_30px_rgba(0,245,212,0.15)] rounded-xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 to-transparent">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                            <span className="text-[#00F5D4]">📊</span> Estrategia: Ranking de Asertividad
                        </h3>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                        <div className="space-y-3 text-xs text-slate-300">
                            {/* Step 1 */}
                            <div className="flex gap-3 items-start">
                                <div className="shrink-0 w-5 h-5 rounded-full bg-slate-800/80 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">1</div>
                                <p className="leading-5">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="font-bold text-white">🕒 Filtros:</span>
                                    </span> Usa <span className="font-semibold text-[#00F5D4]">'Ahora y 1 Hora'</span> para ver qué funciona <span className="font-bold text-emerald-400">AHORA</span>, no ayer.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-3 items-start">
                                <div className="shrink-0 w-5 h-5 rounded-full bg-slate-800/80 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">2</div>
                                <p className="leading-5">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="font-bold text-white">✅ Selección:</span>
                                    </span> Busca bots con Win Rate <span className="font-semibold text-emerald-400">&gt; 85%</span> y <span className="font-semibold text-blue-400">alto volumen</span>.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-3 items-start">
                                <div className="shrink-0 w-5 h-5 rounded-full bg-slate-800/80 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">3</div>
                                <p className="leading-5">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="font-bold text-white">⚙️ Gestión:</span>
                                    </span> Inicia con <span className="font-semibold text-[#00F5D4]">Stake bajo</span> para probar el mercado.
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="flex gap-3 items-start">
                                <div className="shrink-0 w-5 h-5 rounded-full bg-slate-800/80 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">4</div>
                                <p className="leading-5">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="font-bold text-white">🛑 Disciplina:</span>
                                    </span> ¿Meta cumplida? <span className="font-semibold text-amber-400">Detén el bot</span>. Asegura la ganancia.
                                </p>
                            </div>
                        </div>

                        {/* Pro Tip */}
                        <div className="flex gap-3 items-start bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/20 -mx-1 mt-4">
                            <div className="shrink-0 mt-0.5">
                                <TrendingUp size={14} className="text-blue-400" />
                            </div>
                            <div className="text-blue-200/90 leading-relaxed text-[11px]">
                                <span className="font-bold text-blue-300 uppercase text-[10px] tracking-wider block mb-1">💡 PRO TIP</span>
                                Los datos cambian <span className="font-bold text-white">rápido</span>. Actualiza el ranking antes de operar.
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/5 bg-white/5">
                        <Link to="/tutorial" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#00F5D4]/10 hover:bg-[#00F5D4]/20 text-[#00F5D4] text-xs font-bold transition-all border border-[#00F5D4]/20 hover:border-[#00F5D4]/40 group">
                            <Play size={12} fill="currentColor" className="opacity-80 group-hover:scale-110 transition-transform" />
                            Ver Video Tutorial (Aula 2)
                        </Link>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    return null;
};
