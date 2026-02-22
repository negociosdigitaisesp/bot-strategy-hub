/**
 * IQBotPnL.jsx
 * Seção de P&L (Profit & Loss) — elemento dominante do painel.
 * Mostra lucro do dia, barra de win rate, e mini cards de estatísticas.
 * Props: lucroHoje, winRate, totalOps, vitorias, derrotas, streak
 */

import React, { useEffect, useRef, useState } from 'react';
import '../../styles/iq-bot-animations.css';

export default function IQBotPnL({ lucroHoje = 0, winRate = 0, totalOps = 0, vitorias = 0, derrotas = 0, streak = 0 }) {
    const positivo = lucroHoje >= 0;
    const prevLucro = useRef(lucroHoje);
    const [animKey, setAnimKey] = useState(0);

    /* Dispara animação de rolagem quando o valor muda */
    useEffect(() => {
        if (lucroHoje !== prevLucro.current) {
            prevLucro.current = lucroHoje;
            setAnimKey(k => k + 1);
        }
    }, [lucroHoje]);

    const lucroStr = positivo
        ? `+$${Math.abs(lucroHoje).toFixed(2)}`
        : `-$${Math.abs(lucroHoje).toFixed(2)}`;

    return (
        <section
            style={{
                background: 'var(--iq-bg-card)',
                borderRadius: 'var(--iq-radius)',
                border: '1px solid var(--iq-border)',
                padding: '28px 20px 20px',
                textAlign: 'center',
            }}
        >
            {/* ─── Número principal do P&L ─── */}
            <div
                key={animKey}
                style={{
                    fontSize: 'clamp(40px, 8vw, 72px)',
                    fontWeight: 800,
                    letterSpacing: '-2px',
                    lineHeight: 1,
                    color: positivo ? 'var(--iq-green)' : 'var(--iq-red)',
                    animation: 'iqDigitRoll 200ms ease-out forwards',
                    marginBottom: 6,
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: "'Inter', monospace",
                }}
            >
                {lucroStr}
            </div>

            {/* Label */}
            <p style={{ fontSize: 10, fontWeight: 700, color: '#4A6080', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px' }}>
                Lucro Hoje
            </p>

            {/* ─── Barra de win rate ─── */}
            <div style={{ marginBottom: 10 }}>
                <div
                    style={{
                        height: 6,
                        borderRadius: 3,
                        background: 'var(--iq-border)',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: `${Math.min(winRate, 100)}%`,
                            background: 'linear-gradient(90deg, #00FF88, #00B4FF)',
                            borderRadius: 3,
                            transition: 'width 800ms ease',
                        }}
                    />
                </div>

                {/* Stats em linha */}
                <p style={{ fontSize: 12, fontWeight: 600, color: '#4A6080', margin: '8px 0 0', letterSpacing: '0.02em' }}>
                    <span style={{ color: '#E8EDF5' }}>{winRate.toFixed(1)}%</span>
                    {' • '}
                    {totalOps} ops
                    {' • '}
                    <span style={{ color: '#00FF88' }}>{vitorias}W ↑</span>
                    {' • '}
                    <span style={{ color: '#FF3B5C' }}>{derrotas}L ↓</span>
                </p>
            </div>

            {/* ─── Mini cards de estatísticas ─── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginTop: 16,
                }}
            >
                <MiniStat label="Ganadas" value={vitorias} color="#00FF88" />
                <MiniStat label="Perdidas" value={derrotas} color="#FF3B5C" />
                <MiniStat
                    label="Streak"
                    value={
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                            {streak}
                            <span style={{ fontSize: 14 }}>🔥</span>
                        </span>
                    }
                    color="#FFB800"
                />
            </div>
        </section>
    );
}

/* ─── Card de estatística individual ─── */
function MiniStat({ label, value, color }) {
    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.025)',
                borderRadius: 10,
                padding: '10px 8px',
                border: '1px solid var(--iq-border)',
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 800, color, marginBottom: 2, fontVariantNumeric: 'tabular-nums' }}>
                {value}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#4A6080', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {label}
            </div>
        </div>
    );
}
