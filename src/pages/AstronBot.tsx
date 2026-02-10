import React from 'react';
import { AlertTriangle, Hammer, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AstronBot = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0B0F17] relative overflow-hidden">
            {/* Background elements for premium look */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            </div>

            <div className="relative z-10 max-w-2xl w-full">
                <div className="bg-[#131926]/80 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center group">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/20 mb-8 relative">
                        <Hammer className="text-red-500 w-12 h-12 relative z-10 animate-bounce" />
                        <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full scale-75 group-hover:scale-110 transition-transform duration-500"></div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter uppercase italic">
                        <span className="text-red-500">ESTRATÉGIA</span> EM MANUTENÇÃO
                    </h1>

                    <div className="space-y-4 mb-10">
                        <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed">
                            Estamos atualizando os algoritmos do <span className="text-white font-bold">Astron Bot</span> para garantir a máxima precisão e segurança no seu operacional.
                        </p>

                        <div className="flex items-center justify-center gap-2 text-amber-500 bg-amber-500/10 px-4 py-2 rounded-full w-fit mx-auto border border-amber-500/20">
                            <ShieldAlert size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Acesso Temporariamente Restrito</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                            variant="outline"
                            onClick={() => window.history.back()}
                            className="bg-transparent border-white/10 hover:bg-white/5 text-white h-12 px-8 rounded-xl flex items-center gap-2 group/btn"
                        >
                            <ArrowLeft size={18} className="group-hover/btn:-translate-x-1 transition-transform" />
                            Voltar
                        </Button>
                        <div className="flex items-center gap-2 text-red-500/60 font-mono text-xs font-bold italic animate-pulse">
                            <AlertTriangle size={14} />
                            <span>SISTEMA OFFLINE PARA UPGRADE</span>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-slate-500 text-[10px] text-center uppercase tracking-[0.2em] font-bold">
                    © 2026 Million Bots Intelligence • Quantum Engine v4.0.2
                </p>
            </div>
        </div>
    );
};

export default AstronBot;

