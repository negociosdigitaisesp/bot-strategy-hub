/**
 * IQBotFeed.jsx
 * Feed de operações ao vivo do trader.
 * Mostra até 6 operações recentes com animação de entrada.
 * Props: operacoes (array), onVerTodos (fn)
 *
 * Estrutura de cada operação:
 * { id, par, direcao, resultado, valor, horario }
 * direcao: 'CALL' | 'PUT'
 * resultado: 'WIN' | 'LOSS'
 * valor: número (positivo = WIN, negativo = LOSS)
 */

import React from 'react';
import '../../styles/iq-bot-animations.css';

/* ─── Card de operação individual ─── */
function OperacaoCard({ op, index }) {
    const isWin = op.resultado === 'WIN';

    return (
        <div
            key={op.id}
            style={{
                background: isWin ? 'var(--iq-green-dim)' : 'var(--iq-red-dim)',
                borderLeft: `3px solid ${isWin ? 'var(--iq-green)' : 'var(--iq-red)'}`,
                borderRadius: `0 var(--iq-radius-sm) var(--iq-radius-sm) 0`,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                animation: `iqSlideIn 300ms ease-out forwards${isWin ? ', iqWinBurst 400ms ease-out forwards' : ''}`,
                animationDelay: `${index * 40}ms`,
                opacity: 0,
                animationFillMode: 'forwards',
            }}
        >
            {/* Ícone + par + direção */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{isWin ? '✅' : '❌'}</span>
                <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#E8EDF5', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {op.par}
                    </span>
                    <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                        color: op.direcao === 'CALL' ? '#00FF88' : '#FF3B5C',
                    }}>
                        {op.direcao}
                    </span>
                </div>
            </div>

            {/* Valor + horário */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{
                    fontSize: 13, fontWeight: 800, display: 'block',
                    color: isWin ? 'var(--iq-green)' : 'var(--iq-red)',
                    fontVariantNumeric: 'tabular-nums',
                }}>
                    {isWin ? '+' : ''}{op.valor < 0 ? '' : ''}${Math.abs(op.valor).toFixed(2)}
                </span>
                <span style={{ fontSize: 10, color: '#4A6080' }}>{op.horario}</span>
            </div>
        </div>
    );
}

/* ─── Skeleton de loading ─── */
function FeedSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
                <div key={i} className="iq-skeleton" style={{ height: 55, borderRadius: 10 }} />
            ))}
        </div>
    );
}

export default function IQBotFeed({ operacoes = [], carregando = false, onVerTodos }) {
    const MAX_VISIVEIS = 6;
    const visiveis = operacoes.slice(0, MAX_VISIVEIS);

    return (
        <section
            style={{
                background: 'var(--iq-bg-card)',
                borderRadius: 'var(--iq-radius)',
                border: '1px solid var(--iq-border)',
                padding: '16px',
            }}
        >
            {/* ─── Header do feed ─── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#E8EDF5', letterSpacing: '0.02em' }}>
                        OPERAÇÕES AO VIVO
                    </span>
                    <span
                        style={{
                            width: 7, height: 7, borderRadius: '50%', background: '#00FF88',
                            display: 'inline-block', animation: 'iqLiveDot 1.4s ease-in-out infinite',
                        }}
                    />
                </div>

                {operacoes.length > MAX_VISIVEIS && (
                    <button
                        onClick={onVerTodos}
                        style={{
                            fontSize: 11, fontWeight: 600,
                            color: '#00B4FF', background: 'none', border: 'none', cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        Ver todos →
                    </button>
                )}
            </div>

            {/* ─── Lista de operações ─── */}
            {carregando ? (
                <FeedSkeleton />
            ) : visiveis.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#4A6080', fontSize: 13 }}>
                    Nenhuma operação registrada ainda.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                    {visiveis.map((op, i) => (
                        <OperacaoCard key={op.id} op={op} index={i} />
                    ))}
                </div>
            )}
        </section>
    );
}
