import React from 'react';
import { HelpCircle, Play, ExternalLink, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Link } from 'react-router-dom';

export const SmartHelpTrigger = () => {
    const AFFILIATE_LINK = "https://deriv.com/?t=TRCjAn8FEcUivlVU8hndU2Nd7ZgqdRLk&utm_source=affiliate_223442&utm_medium=affiliate&utm_campaign=MyAffiliates&utm_content=&referrer=";
    const NORMAL_TOKEN_LINK = "https://app.deriv.com/account/api-token";

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="ml-2 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-[#00F5D4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00F5D4]/50 p-0.5 hover:bg-[#00F5D4]/10"
                    title="Ayuda rápida"
                >
                    <HelpCircle size={16} />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 border-cyan-500/30 bg-[#0c0e12]/90 backdrop-blur-xl shadow-[0_0_30px_rgba(0,245,212,0.15)] rounded-xl overflow-hidden z-50">
                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 to-transparent">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                        <span className="text-[#00F5D4]">⚡</span> Guía Rápida: Conexión API
                    </h3>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    <div className="space-y-3 text-xs text-slate-300">
                        {/* Step 1 */}
                        <div className="flex gap-3 items-start">
                            <div className="shrink-0 w-5 h-5 rounded-full bg-slate-800/80 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">1</div>
                            <p className="leading-5">
                                Crea tu cuenta usando <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="text-[#00F5D4] hover:underline underline-offset-2 decoration-[#00F5D4]/30 font-medium whitespace-nowrap">nuestro enlace</a> (Sincronización HFT).
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-3 items-start">
                            <div className="shrink-0 w-5 h-5 rounded-full bg-slate-800/80 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">2</div>
                            <p className="leading-5">
                                En Deriv, ve a: <a href={NORMAL_TOKEN_LINK} target="_blank" rel="noopener noreferrer" className="text-[#00F5D4] hover:underline underline-offset-2 decoration-[#00F5D4]/30 font-medium inline-flex items-center gap-0.5 whitespace-nowrap">Seguridad &gt; API Token <ExternalLink size={10} /></a>
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-3 items-start bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 -mx-1">
                            <div className="shrink-0 mt-0.5">
                                <AlertTriangle size={14} className="text-amber-500" />
                            </div>
                            <div className="text-amber-200/90 leading-relaxed text-[11px]">
                                <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider block mb-1">⚠️ IMPORTANTE</span>
                                Marca las casillas <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded text-[10px] border border-white/10">Leer</span> y <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded text-[10px] border border-white/10">Operar</span> (Trade).
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="flex gap-3 items-start">
                            <div className="shrink-0 w-5 h-5 rounded-full bg-slate-800/80 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">4</div>
                            <p className="leading-5">
                                Copia el token y pégalo aquí.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/5 bg-white/5">
                    <Link to="/tutorial" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#00F5D4]/10 hover:bg-[#00F5D4]/20 text-[#00F5D4] text-xs font-bold transition-all border border-[#00F5D4]/20 hover:border-[#00F5D4]/40 group">
                        <Play size={12} fill="currentColor" className="opacity-80 group-hover:scale-110 transition-transform" />
                        Ver Video Tutorial Completo
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
};
