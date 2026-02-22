/**
 * IQBotConfirmModal.jsx
 * Modal de confirmação antes de ativar modo REAL.
 * Exibe aviso com stake destacado e dois botões.
 * Props: visivel, stake, nomeTrader, onConfirmar, onCancelar
 */

import React from 'react';
import '../../styles/iq-bot-animations.css';

export default function IQBotConfirmModal({ visivel, stake = 10, nomeTrader = 'CIPHER', onConfirmar, onCancelar }) {
    if (!visivel) return null;

    return (
        /* Overlay com blur */
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9990,
                background: 'rgba(0,0,0,0.70)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px',
            }}
            onClick={onCancelar}
        >
            {/* Card do modal */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--iq-bg-elevated)',
                    border: '1px solid rgba(255,59,92,0.25)',
                    borderRadius: 'var(--iq-radius)',
                    padding: '32px 24px',
                    maxWidth: 380,
                    width: '100%',
                    animation: 'iqModalIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    textAlign: 'center',
                }}
            >
                {/* Ícone de aviso */}
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>

                {/* Título */}
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#E8EDF5', margin: '0 0 12px', letterSpacing: '-0.3px' }}>
                    Ativar Dinheiro Real?
                </h2>

                {/* Texto */}
                <p style={{ fontSize: 14, color: '#4A6080', margin: '0 0 20px', lineHeight: 1.6 }}>
                    As operações serão executadas automaticamente na sua conta{' '}
                    <strong style={{ color: '#E8EDF5' }}>IQ Option real</strong> com o trader{' '}
                    <strong style={{ color: '#00B4FF' }}>{nomeTrader}</strong>.
                </p>

                {/* Stake destacado */}
                <div
                    style={{
                        background: 'rgba(255,59,92,0.10)',
                        border: '1.5px solid rgba(255,59,92,0.30)',
                        borderRadius: 10,
                        padding: '12px 16px',
                        marginBottom: 24,
                    }}
                >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4A6080', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                        Stake por operação
                    </span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#FF3B5C' }}>
                        R$ {stake.toFixed(2)}
                    </span>
                </div>

                {/* Botões */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                        onClick={onConfirmar}
                        style={{
                            width: '100%', padding: '13px',
                            borderRadius: 10, border: 'none',
                            background: '#FF3B5C', color: '#fff',
                            fontSize: 14, fontWeight: 800, letterSpacing: '0.04em',
                            cursor: 'pointer', transition: 'opacity 150ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >
                        Confirmar Modo Real
                    </button>

                    <button
                        onClick={onCancelar}
                        style={{
                            width: '100%', padding: '13px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'transparent',
                            color: '#4A6080', fontSize: 14, fontWeight: 700,
                            cursor: 'pointer', transition: 'border 150ms, color 150ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#E8EDF5'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#4A6080'; }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
