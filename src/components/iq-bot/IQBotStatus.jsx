/**
 * IQBotStatus.jsx
 * Seção de status do bot — inativo ou ativo com countdown.
 * Props: ativo, parAtual, nomeTrader, onAtivar, onParar
 * parAtual exemplo: { ativo: 'EURUSD-OTC', direcao: 'CALL' }
 *
 * Usa useIQCountdown para calcular o countdown até o próximo minuto.
 * isUrgent = true quando <= 10s → aplica animação iqCountdown e cor dourada.
 */

import React from 'react';
import '../../styles/iq-bot-animations.css';
import { useIQCountdown } from '../../hooks/useIQCountdown';

export default function IQBotStatus({ ativo = false, parAtual = null, nomeTrader = 'CIPHER', onAtivar, onParar }) {
    /* Countdown via hook — atualiza a cada segundo com cleanup automático */
    const { countdown, isUrgent } = useIQCountdown();
    const urgente = isUrgent && ativo;

    /* ─── Estado INATIVO ─── */
    if (!ativo) {
        return (
            <section
                style={{
                    background: 'var(--iq-bg-card)',
                    borderRadius: 'var(--iq-radius)',
                    border: '1px solid var(--iq-border)',
                    padding: '24px 20px',
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: 32, marginBottom: 10 }}>⏸</div>
                <p style={{ color: '#4A6080', fontSize: 14, fontWeight: 500, margin: '0 0 20px' }}>
                    Configure abaixo e ative o bot
                </p>
                <button
                    onClick={onAtivar}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #00FF88, #00D4FF)',
                        color: '#07100D',
                        fontSize: 14,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        cursor: 'pointer',
                        transition: 'opacity 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                    ▶ ATIVAR
                </button>
            </section>
        );
    }

    /* ─── Estado ATIVO ─── */
    return (
        <section
            style={{
                background: 'var(--iq-bg-card)',
                borderRadius: 'var(--iq-radius)',
                border: '1.5px solid rgba(0,180,255,0.3)',
                padding: '20px',
                animation: 'iqGlow 2s ease-in-out infinite',
                position: 'relative',
            }}
        >
            {/* Status ativo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                        style={{
                            width: 10, height: 10, borderRadius: '50%', background: '#00FF88',
                            display: 'inline-block', animation: 'iqLiveDot 1.4s ease-in-out infinite',
                        }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#00FF88' }}>
                        ◉ COPIANDO {nomeTrader}
                        {parAtual && ` — ${parAtual.ativo}`}
                    </span>
                </div>

                {/* Botão parar */}
                <button
                    onClick={onParar}
                    style={{
                        padding: '5px 12px', borderRadius: 7,
                        border: '1px solid rgba(255,59,92,0.35)',
                        background: 'rgba(255,59,92,0.08)',
                        color: '#FF3B5C', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,92,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,59,92,0.08)'; }}
                >
                    ■ PARAR
                </button>
            </div>

            {/* Próxima entrada — countdown via hook */}
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#4A6080', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                    Próxima Entrada Em
                </p>
                <div
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        letterSpacing: '2px',
                        color: urgente ? 'var(--iq-gold)' : 'var(--iq-text-primary)',
                        animation: urgente ? 'iqCountdown 1s ease-in-out infinite' : 'none',
                    }}
                >
                    {countdown}
                </div>
            </div>
        </section>
    );
}
