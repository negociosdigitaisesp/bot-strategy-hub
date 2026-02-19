import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { SignalState } from '../hooks/useSpikeSensor';
import { ArrowUp, ArrowDown, Crosshair, Radio, Activity } from 'lucide-react';

interface SpikeGaugeProps {
    signalState: SignalState;
    signalText: string;
    squeezeLevel: number;
    currentPrice: number;
    bollingerBands: { upper: number; middle: number; lower: number; width: number } | null;
    isInSqueeze: boolean;
    onExecuteTrade: (type: 'CALL' | 'PUT', stake: number) => void;
    className?: string;
}

const SpikeGauge: React.FC<SpikeGaugeProps> = ({
    signalState,
    signalText,
    squeezeLevel,
    currentPrice,
    bollingerBands,
    isInSqueeze,
    onExecuteTrade,
    className,
}) => {
    const [stake, setStake] = useState<number>(1);

    const stateColors = {
        neutral: { primary: '#6b7280', glow: 'rgba(107,114,128,0.3)', text: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/50' },
        squeeze: { primary: '#eab308', glow: 'rgba(234,179,8,0.5)', text: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
        call: { primary: '#22c55e', glow: 'rgba(34,197,94,0.6)', text: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/50' },
        put: { primary: '#ef4444', glow: 'rgba(239,68,68,0.6)', text: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50' },
    };

    const colors = stateColors[signalState];
    const isSignalActive = signalState === 'call' || signalState === 'put';

    const formatPrice = (price: number) => price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });

    return (
        <div
            className={cn(
                'relative flex flex-col items-center p-6 rounded-2xl',
                'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
                'backdrop-blur-xl border-2',
                isSignalActive ? 'border-opacity-100' : 'border-white/10',
                isSignalActive && signalState === 'call' && 'border-green-500 animate-pulse',
                isSignalActive && signalState === 'put' && 'border-red-500 animate-pulse',
                !isSignalActive && 'border-slate-700',
                className
            )}
            style={{ boxShadow: isSignalActive ? `0 0 60px ${colors.glow}` : `0 25px 50px -12px rgba(0,0,0,0.5)` }}
        >
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', colors.bg, 'border', colors.border)}>
                        <Crosshair className={cn('w-5 h-5', colors.text)} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white font-mono tracking-wide">SYSTEM_OVERRIDE</h2>
                        <span className="text-xs text-slate-500 font-mono">{'>'} VOLATILITY_100_1S</span>
                    </div>
                </div>
                <div className={cn('px-3 py-1 rounded font-mono text-xs font-bold', isInSqueeze ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' : 'bg-slate-700 text-slate-400')}>
                    {isInSqueeze ? '⚡ SQUEEZE' : '◉ NORMAL'}
                </div>
            </div>

            {/* Pressure Bar */}
            <div className="w-full mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Monitor de Presión</span>
                    <span className={cn('text-sm font-bold font-mono', colors.text)}>{squeezeLevel.toFixed(0)}%</span>
                </div>
                <div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div
                        className={cn('h-full rounded-full transition-all duration-500',
                            squeezeLevel < 30 && 'bg-gradient-to-r from-gray-600 to-gray-500',
                            squeezeLevel >= 30 && squeezeLevel < 60 && 'bg-gradient-to-r from-yellow-600 to-yellow-400',
                            squeezeLevel >= 60 && 'bg-gradient-to-r from-orange-600 via-red-500 to-red-400'
                        )}
                        style={{ width: `${squeezeLevel}%`, boxShadow: squeezeLevel >= 60 ? '0 0 20px rgba(239,68,68,0.5)' : 'none' }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-600 font-mono">BAJA</span>
                    <span className="text-[10px] text-slate-600 font-mono">CRÍTICA</span>
                </div>
            </div>

            {/* Signal Display */}
            <div className="relative w-full h-32 mb-6 flex items-center justify-center">
                {signalState === 'neutral' && (
                    <div className="flex flex-col items-center">
                        <Radio className="w-12 h-12 text-slate-600 animate-pulse" />
                        <span className="text-slate-500 font-mono text-sm mt-2">ESCANEANDO...</span>
                    </div>
                )}
                {signalState === 'squeeze' && (
                    <div className="flex flex-col items-center">
                        <Activity className="w-16 h-16 text-yellow-500 animate-pulse" />
                        <span className="text-yellow-400 font-mono text-sm mt-2 animate-pulse">⚡ PREPARAR EMBOSCADA ⚡</span>
                    </div>
                )}
                {signalState === 'call' && (
                    <div className="flex flex-col items-center animate-bounce">
                        <ArrowUp className="w-24 h-24 text-green-500" style={{ filter: 'drop-shadow(0 0 20px rgba(34,197,94,0.8))' }} />
                        <span className="text-green-400 font-mono text-lg font-bold mt-2">↑ ROMPIMIENTO ALCISTA ↑</span>
                    </div>
                )}
                {signalState === 'put' && (
                    <div className="flex flex-col items-center animate-bounce">
                        <ArrowDown className="w-24 h-24 text-red-500" style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.8))' }} />
                        <span className="text-red-400 font-mono text-lg font-bold mt-2">↓ ROMPIMIENTO BAJISTA ↓</span>
                    </div>
                )}
            </div>

            {/* Signal Text */}
            <div className={cn('w-full px-4 py-3 rounded-xl mb-6 text-center', colors.bg, 'border', colors.border, isSignalActive && 'animate-pulse')}>
                <span className={cn('font-mono font-semibold', colors.text)}>{signalText}</span>
            </div>

            {/* Bollinger Info */}
            {bollingerBands && (
                <div className="w-full grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
                        <span className="text-[10px] text-slate-500 font-mono block">BANDA SUP</span>
                        <span className="text-sm text-green-400 font-mono font-bold">{formatPrice(bollingerBands.upper)}</span>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
                        <span className="text-[10px] text-slate-500 font-mono block">PRECIO</span>
                        <span className={cn('text-sm font-mono font-bold', currentPrice > bollingerBands.upper ? 'text-green-400' : currentPrice < bollingerBands.lower ? 'text-red-400' : 'text-white')}>
                            {formatPrice(currentPrice)}
                        </span>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
                        <span className="text-[10px] text-slate-500 font-mono block">BANDA INF</span>
                        <span className="text-sm text-red-400 font-mono font-bold">{formatPrice(bollingerBands.lower)}</span>
                    </div>
                </div>
            )}

            {/* Stake Input */}
            <div className="w-full mb-4">
                <label className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-2 block">Stake (USD)</label>
                <div className="flex items-center gap-2">
                    <button onClick={() => setStake(prev => Math.max(0.35, prev - 1))} className="px-3 py-2 bg-slate-800 rounded-lg text-white font-bold hover:bg-slate-700">-</button>
                    <input
                        type="number"
                        value={stake}
                        onChange={(e) => setStake(Math.max(0.35, parseFloat(e.target.value) || 0.35))}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-center text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                        min="0.35"
                        step="0.5"
                    />
                    <button onClick={() => setStake(prev => prev + 1)} className="px-3 py-2 bg-slate-800 rounded-lg text-white font-bold hover:bg-slate-700">+</button>
                </div>
            </div>

            {/* Execute Buttons */}
            <div className="w-full grid grid-cols-2 gap-4">
                <button
                    onClick={() => onExecuteTrade('CALL', stake)}
                    disabled={signalState !== 'call'}
                    className={cn('py-4 rounded-xl font-bold font-mono text-lg flex items-center justify-center gap-2',
                        signalState === 'call' ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg shadow-green-500/30 hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                    )}
                >
                    <ArrowUp className="w-6 h-6" />EJECUTAR CALL
                </button>
                <button
                    onClick={() => onExecuteTrade('PUT', stake)}
                    disabled={signalState !== 'put'}
                    className={cn('py-4 rounded-xl font-bold font-mono text-lg flex items-center justify-center gap-2',
                        signalState === 'put' ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                    )}
                >
                    <ArrowDown className="w-6 h-6" />EJECUTAR PUT
                </button>
            </div>
        </div>
    );
};

export default SpikeGauge;
