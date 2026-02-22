import React from 'react';

/**
 * IQBotPnL — Painel de resulta dos e estatísticas de P&L.
 * Exibe vitórias, derrotas, taxa de acerto e lucro acumulado.
 */
export default function IQBotPnL({ wins, losses, totalPnL, winRate }) {
    const total = wins + losses;
    const profitable = totalPnL >= 0;

    return (
        <div
            className="rounded-xl p-4 space-y-4"
            style={{
                background: 'rgba(15,23,42,0.70)',
                border: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-black"
                    style={{ background: 'linear-gradient(135deg,#FFB800,#FF8800)' }}
                >
                    📊
                </div>
                <span
                    className="text-xs text-white font-bold tracking-wider uppercase"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                    Resultados em Vivo
                </span>
            </div>

            {/* Win rate circle */}
            <div className="flex items-center gap-3">
                <WinRateGauge value={winRate} color={winRate >= 50 ? '#00FF88' : '#FF3B5C'} />
                <div>
                    <div
                        className="text-[10px] uppercase tracking-wider mb-0.5"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)' }}
                    >
                        Taxa de Acerto
                    </div>
                    <div
                        className="text-2xl font-black"
                        style={{ color: winRate >= 50 ? '#00FF88' : '#FF3B5C', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        {total > 0 ? winRate.toFixed(1) : '0.0'}%
                    </div>
                </div>
            </div>

            {/* Win / Loss grid */}
            <div className="grid grid-cols-2 gap-2">
                <div
                    className="rounded-lg p-3"
                    style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.12)' }}
                >
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        Vitórias
                    </div>
                    <div className="text-xl font-black" style={{ color: '#00FF88', fontFamily: "'JetBrains Mono', monospace" }}>
                        {wins}
                    </div>
                </div>
                <div
                    className="rounded-lg p-3"
                    style={{ background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.12)' }}
                >
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        Derrotas
                    </div>
                    <div className="text-xl font-black" style={{ color: '#FF3B5C', fontFamily: "'JetBrains Mono', monospace" }}>
                        {losses}
                    </div>
                </div>
            </div>

            {/* P&L */}
            <div
                className="rounded-lg p-3 flex items-center justify-between"
                style={{
                    background: profitable ? 'rgba(0,255,136,0.05)' : 'rgba(255,59,92,0.05)',
                    border: `1px solid ${profitable ? 'rgba(0,255,136,0.15)' : 'rgba(255,59,92,0.15)'}`,
                }}
            >
                <div>
                    <div className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        Lucro / Prejuízo
                    </div>
                    <div
                        className="text-xl font-black mt-0.5"
                        style={{ color: profitable ? '#00FF88' : '#FF3B5C', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        {profitable ? '+' : ''}{totalPnL.toFixed(2)} USD
                    </div>
                </div>
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
                    style={{
                        border: `2px solid ${profitable ? 'rgba(0,255,136,0.3)' : 'rgba(255,59,92,0.3)'}`,
                        color: profitable ? '#00FF88' : '#FF3B5C',
                    }}
                >
                    {profitable ? '▲' : '▼'}
                </div>
            </div>

            {/* Total */}
            <div
                className="flex items-center justify-between pt-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
                <span
                    className="text-[9px] uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)' }}
                >
                    Total de Operações
                </span>
                <span
                    className="text-xs font-bold text-white"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                    {total}
                </span>
            </div>
        </div>
    );
}

// Gauge circular SVG inline
function WinRateGauge({ value, color }) {
    const r = 26, cx = 32, cy = 32;
    const circ = 2 * Math.PI * r;
    const dash = Math.min(value / 100, 1) * circ;
    return (
        <svg width="64" height="64" style={{ flexShrink: 0 }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
            <circle
                cx={cx} cy={cy} r={r} fill="none"
                stroke={color} strokeWidth="5"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
            <text
                x={cx} y={cy + 4}
                textAnchor="middle"
                fill={color}
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
            >
                {value.toFixed(0)}%
            </text>
        </svg>
    );
}
