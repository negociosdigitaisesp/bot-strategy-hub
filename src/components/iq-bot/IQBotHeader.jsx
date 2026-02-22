/**
 * IQBotHeader.jsx
 * Header do painel do trader selecionado.
 * Botão voltar, avatar, nome, badge nível, status e toggle DEMO/REAL.
 * Props: trader, modoReal, onToggleModo, onVoltar
 */

import React from 'react';
import '../../styles/iq-bot-animations.css';

/* ─── Badge de nível (reaproveitada, independente) ─── */
function LevelBadge({ level }) {
    const map = {
        ELITE: { bg: 'rgba(255,184,0,0.15)', color: '#FFB800', border: 'rgba(255,184,0,0.4)' },
        PRO: { bg: 'rgba(0,180,255,0.15)', color: '#00B4FF', border: 'rgba(0,180,255,0.35)' },
        MASTER: { bg: 'rgba(123,97,255,0.15)', color: '#7B61FF', border: 'rgba(123,97,255,0.35)' },
    };
    const s = map[level] || map.PRO;
    return (
        <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
            padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase',
            background: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
        }}>
            {level}
        </span>
    );
}

export default function IQBotHeader({ trader, modoReal, onToggleModo, onVoltar }) {
    const { nome, level, status, gradiente } = trader;
    const operando = status === 'OPERANDO';

    return (
        <header
            style={{
                background: 'var(--iq-bg-card)',
                borderBottom: '1px solid var(--iq-border)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* ← Voltar */}
            <button
                onClick={onVoltar}
                aria-label="Voltar para lista de traders"
                style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: '1px solid var(--iq-border)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#4A6080', cursor: 'pointer',
                    fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'color 150ms, background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#E8EDF5'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#4A6080'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
                ←
            </button>

            {/* Avatar */}
            <div
                style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: gradiente, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 900, color: '#0D1420',
                }}
            >
                {nome.charAt(0)}
            </div>

            {/* Nome + badges */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#E8EDF5' }}>{nome}</span>
                    <LevelBadge level={level} />
                </div>
                {/* Status pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                    <span
                        style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: operando ? '#00FF88' : '#4A6080',
                            display: 'inline-block',
                            animation: operando ? 'iqLiveDot 1.4s ease-in-out infinite' : 'none',
                        }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 600, color: operando ? '#00FF88' : '#4A6080' }}>
                        {operando ? 'OPERANDO' : 'EM ESPERA'}
                    </span>
                </div>
            </div>

            {/* Toggle DEMO / REAL */}
            <button
                onClick={onToggleModo}
                aria-label="Alternar modo demo/real"
                style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: modoReal
                        ? '1.5px solid rgba(255,59,92,0.5)'
                        : '1.5px solid rgba(0,180,255,0.35)',
                    background: modoReal
                        ? 'rgba(255,59,92,0.12)'
                        : 'rgba(0,180,255,0.10)',
                    color: modoReal ? '#FF3B5C' : '#00B4FF',
                    fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                    cursor: 'pointer', flexShrink: 0,
                    animation: modoReal ? 'iqGlow 2s ease-in-out infinite' : 'none',
                    transition: 'background 150ms, border 150ms, color 150ms',
                }}
            >
                {modoReal ? '🔴 REAL' : '🔵 DEMO'}
            </button>
        </header>
    );
}
