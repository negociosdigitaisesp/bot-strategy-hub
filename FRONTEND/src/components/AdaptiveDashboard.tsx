import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Zap, TrendingUp, ShieldAlert, BarChart3 } from 'lucide-react';

interface AssetState {
    name: string;
    atr: number;
    persistence: number;
    momentum: number;
    regime: string;
}

interface AdaptiveState {
    timestamp: number;
    status: string;
    assets: Record<string, AssetState>;
}

const AdaptiveDashboard: React.FC = () => {
    const [state, setState] = useState<AdaptiveState | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Cache busting
                const res = await fetch('/adaptive_state.json?t=' + Date.now());
                if (res.ok) {
                    const data = await res.json();
                    setState(data);
                    setLastUpdate(new Date());
                }
            } catch (error) {
                console.error("Erro ao buscar estado do motor:", error);
            }
        };

        const interval = setInterval(fetchData, 1000);
        fetchData(); // Initial load

        return () => clearInterval(interval);
    }, []);

    if (!state) return (
        <div className="flex items-center justify-center p-8">
            <div className="text-xl text-cyan-500 animate-pulse">Conectando ao Motor Adaptativo v2.0...</div>
        </div>
    );

    const assets = Object.values(state.assets);

    return (
        <div className="p-6 bg-slate-950 min-h-screen text-slate-100">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
                        Bug Deriv 2.0 <span className="text-sm font-light text-slate-400">| Motor Adaptativo</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Status: <span className="text-green-400 font-mono">{state.status}</span> • 
                        Last Update: {lastUpdate.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <div className="text-xs text-slate-500">WORKFLOW ATIVO</div>
                        <div className="font-bold text-cyan-400">Volatility Barrier</div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map(asset => (
                    <AssetCard key={asset.name} data={asset} />
                ))}
            </div>
            
            {/* Global Stats or Graph Area could go here */}
             <div className="mt-8 p-4 border border-slate-800 rounded-lg bg-slate-900/50">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <Activity size={18} />
                    <h3 className="uppercase tracking-wider text-xs font-bold">Lógica de Decisão (Live)</h3>
                </div>
                <div className="text-sm text-slate-300 font-mono">
                    System Check: Persistência Global Média = {
                        (assets.reduce((acc, curr) => acc + curr.persistence, 0) / assets.length).toFixed(3)
                    }
                    <br/>
                    Threshold Mínimo para Operar: 0.100
                </div>
            </div>
        </div>
    );
};

const AssetCard: React.FC<{ data: AssetState }> = ({ data }) => {
    // Visual Helpers
    const isHighVol = data.persistence > 0.1;
    const persistencePct = Math.min(Math.max((data.persistence + 0.2) / 1.2 * 100, 0), 100); // Normalize visual
    
    return (
        <div className={`
            relative p-5 rounded-xl border transition-all duration-300
            ${isHighVol 
                ? 'bg-slate-900/80 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                : 'bg-slate-900/40 border-slate-800 grayscale opacity-80'}
        `}>
            {isHighVol && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/50 px-2 py-1 rounded-full animate-pulse border border-cyan-500/30">
                    <Zap size={10} fill="currentColor" /> ACTIVE EDGE
                </div>
            )}

            <div className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter text-white">{data.name}</h2>
                    <div className="text-xs text-slate-500 font-mono mt-1">ATR: {data.atr.toFixed(3)}</div>
                </div>
                <div className="text-right">
                     <div className="text-[10px] uppercase text-slate-500 mb-1">Persistence Score</div>
                     <div className={`text-xl font-bold font-mono ${isHighVol ? 'text-green-400' : 'text-slate-600'}`}>
                        {data.persistence.toFixed(3)}
                     </div>
                </div>
            </div>

            {/* Visualizer Bar */}
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
                <div 
                    className={`h-full transition-all duration-1000 ease-out ${isHighVol ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-600'}`}
                    style={{ width: `${persistencePct}%` }}
                />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono text-slate-400 border-t border-slate-800 pt-4">
               <div>
                   <span className="block text-[10px] text-slate-600 uppercase">Regime</span>
                   {data.regime}
               </div>
               <div className="text-right">
                   <span className="block text-[10px] text-slate-600 uppercase">Momentum</span>
                   {data.momentum.toFixed(2)}
               </div>
            </div>
        </div>
    );
};

export default AdaptiveDashboard;
