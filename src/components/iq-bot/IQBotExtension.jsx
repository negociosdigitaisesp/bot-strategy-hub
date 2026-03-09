/**
 * IQBotExtension.jsx
 * Widget flutuante colapsável — canto inferior direito.
 * Collapsed: círculo 56px com avatar do trader + dot pulsante + badge P&L.
 * Expanded: card 280px com status, último sinal, P&L e botão de toggle.
 * Props: trader, ativo, lucroHoje, ultimoSinal, onToggleBot
 */

import React, { useState } from 'react';
import '../../styles/iq-bot-animations.css';

export default function IQBotExtension({ trader = null, ativo = false, lucroHoje = 0, ultimoSinal = null, onToggleBot }) {
    const [expandido, setExpandido] = useState(false);

    /* Sem trader ativo — não renderiza nada */
    if (!trader) return null;

    const positivo = lucroHoje >= 0;
    const lucroStr = `${positivo ? '+' : ''}$${Math.abs(lucroHoje).toFixed(2)}`;

    /* ─── Versão colapsada ─── */
    if (!expandido) {
        return (
            <button
                onClick={() => setExpandido(true)}
                aria-label="Expandir painel do bot"
                style={{
                    position: 'fixed', bottom: 24, right: 24,
                    zIndex: 9999,
                    width: 56, height: 56,
                    borderRadius: '50%',
                    background: trader.gradiente,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    transition: 'transform 150ms, box-shadow 150ms',
                    padding: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)'; }}
            >
                {/* Letra do trader */}
                <span style={{ fontSize: 20, fontWeight: 900, color: '#0D1420' }}>
                    {trader.nome.charAt(0)}
                </span>

                {/* Dot de status vivo */}
                {ativo && (
                    <span
                        style={{
                            position: 'absolute', top: 2, right: 2,
                            width: 12, height: 12, borderRadius: '50%',
                            background: '#00FF88',
                            border: '2px solid #070B12',
                            animation: 'iqLiveDot 1.4s ease-in-out infinite',
                        }}
                    />
                )}

                {/* Badge de P&L */}
                <span
                    style={{
                        position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                        background: positivo ? '#00FF88' : '#FF3B5C',
                        color: '#070B12',
                        fontSize: 9, fontWeight: 800,
                        padding: '1px 6px', borderRadius: 8,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                >
                    {lucroStr}
                </span>
            </button>
        );
    }

    /* ─── Versão expandida ─── */
    return (
        <div
            style={{
                position: 'fixed', bottom: 24, right: 24,
                zIndex: 9999,
                width: 280,
                background: 'var(--iq-bg-elevated)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 'var(--iq-radius)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                overflow: 'hidden',
                animation: 'iqExpandWidget 250ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.15)',
                }}
            >
                {/* Avatar */}
                <div
                    style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: trader.gradiente,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900, color: '#0D1420', flexShrink: 0,
                    }}
                >
                    {trader.nome.charAt(0)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#E8EDF5', display: 'block' }}>
                        {trader.nome}
                    </span>
                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                            style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: ativo ? '#00FF88' : '#4A6080',
                                display: 'inline-block',
                                animation: ativo ? 'iqLiveDot 1.4s ease-in-out infinite' : 'none',
                            }}
                        />
                        <span style={{ fontSize: 10, fontWeight: 600, color: ativo ? '#00FF88' : '#4A6080' }}>
                            {ativo ? 'Operando' : 'Parado'}
                        </span>
                    </div>
                </div>

                {/* Fechar */}
                <button
                    onClick={() => setExpandido(false)}
                    aria-label="Minimizar widget"
                    style={{ background: 'none', border: 'none', color: '#4A6080', fontSize: 16, cursor: 'pointer', padding: 4, lineHeight: 1 }}
                >
                    ×
                </button>
            </div>

            {/* Corpo */}
            <div style={{ padding: '14px' }}>
                {/* Último sinal */}
                {ultimoSinal && (
                    <div
                        style={{
                            background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                            padding: '8px 12px', marginBottom: 10,
                            fontSize: 12, fontWeight: 600, color: '#E8EDF5',
                        }}
                    >
                        <span style={{ color: '#4A6080', fontSize: 10, display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Último sinal
                        </span>
                        {ultimoSinal.par} · {ultimoSinal.direcao} ·{' '}
                        <span style={{ color: ultimoSinal.resultado === 'WIN' ? '#00FF88' : '#FF3B5C' }}>
                            {ultimoSinal.resultado === 'WIN' ? '+' : '-'}${Math.abs(ultimoSinal.valor).toFixed(2)}
                        </span>
                    </div>
                )}

                {/* P&L do dia */}
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: positivo ? '#00FF88' : '#FF3B5C', letterSpacing: '-0.5px' }}>
                        {lucroStr}
                    </span>
                    <span style={{ fontSize: 10, color: '#4A6080', display: 'block', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Hoje
                    </span>
                </div>

                {/* Botão toggle */}
                <button
                    onClick={onToggleBot}
                    style={{
                        width: '100%', padding: '10px',
                        borderRadius: 8,
                        border: ativo ? '1px solid rgba(255,59,92,0.35)' : 'none',
                        background: ativo
                            ? 'rgba(255,59,92,0.15)'
                            : 'linear-gradient(135deg, #00FF88, #00D4FF)',
                        color: ativo ? '#FF3B5C' : '#07100D',
                        fontSize: 12, fontWeight: 800, cursor: 'pointer',
                        transition: 'opacity 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                    {ativo ? '⏸ PAUSAR' : '▶ RETOMAR'}
                </button>
            </div>
        </div>
    );
}
