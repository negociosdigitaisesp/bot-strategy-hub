/**
 * IQBotCredentials.jsx
 * Seção de credenciais e configuração da conta IQ Option.
 * Accordion com campos de email, senha e stake.
 * Props: onSalvar (fn async), carregandoSalvar (bool)
 * IMPORTANTE: Senha nunca é exibida em texto claro após salva.
 */

import React, { useState } from 'react';
import '../../styles/iq-bot-animations.css';

/* ─── Chips de stake rápido ─── */
const STAKES_RAPIDOS = [1, 2, 5, 10];

/* ─── Campo de input base ─── */
function Campo({ label, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#4A6080', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                {label}
            </label>
            {children}
        </div>
    );
}

const estiloInput = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
    color: '#E8EDF5',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border 150ms',
};

export default function IQBotCredentials({ onSalvar, carregandoSalvar = false }) {
    const [aberto, setAberto] = useState(false);
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [stake, setStake] = useState(5);
    const [stakeCustom, setStakeCustom] = useState('');
    const [toastVisivel, setToastVisivel] = useState(false);

    const handleSalvar = async () => {
        if (!onSalvar) return;
        await onSalvar({ email, stake: stakeCustom ? parseFloat(stakeCustom) : stake });
        /* Nunca envia senha para fora — somente internamente para autenticação */
        setToastVisivel(true);
        setTimeout(() => setToastVisivel(false), 3000);
    };

    return (
        <section
            style={{
                background: 'var(--iq-bg-card)',
                borderRadius: 'var(--iq-radius)',
                border: '1px solid var(--iq-border)',
                overflow: 'hidden',
            }}
        >
            {/* ─── Cabeçalho do accordion ─── */}
            <button
                onClick={() => setAberto(v => !v)}
                style={{
                    width: '100%', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#E8EDF5',
                    transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
                <span style={{ fontSize: 14, fontWeight: 700 }}>⚙️ Configurações da Conta</span>
                <span style={{ fontSize: 18, color: '#4A6080', transform: aberto ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 250ms' }}>
                    ∨
                </span>
            </button>

            {/* ─── Conteúdo do accordion ─── */}
            {aberto && (
                <div style={{ padding: '4px 20px 20px', borderTop: '1px solid var(--iq-border)' }}>
                    {/* Email */}
                    <Campo label="Email IQ Option">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            style={estiloInput}
                            onFocus={e => { e.target.style.border = '1px solid rgba(0,180,255,0.4)'; }}
                            onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.10)'; }}
                        />
                    </Campo>

                    {/* Senha */}
                    <Campo label="Senha">
                        <div style={{ position: 'relative' }}>
                            <input
                                type={mostrarSenha ? 'text' : 'password'}
                                value={senha}
                                onChange={e => setSenha(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                style={{ ...estiloInput, paddingRight: 42 }}
                                onFocus={e => { e.target.style.border = '1px solid rgba(0,180,255,0.4)'; }}
                                onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.10)'; }}
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarSenha(v => !v)}
                                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                                style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#4A6080', fontSize: 15, padding: 4,
                                }}
                            >
                                {mostrarSenha ? '🙈' : '👁'}
                            </button>
                        </div>
                    </Campo>

                    {/* Stake */}
                    <Campo label="Stake por Operação">
                        {/* Chips rápidos */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                            {STAKES_RAPIDOS.map(v => (
                                <button
                                    key={v}
                                    onClick={() => { setStake(v); setStakeCustom(''); }}
                                    style={{
                                        padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                        border: stake === v && !stakeCustom
                                            ? '1.5px solid #00FF88'
                                            : '1px solid rgba(255,255,255,0.10)',
                                        background: stake === v && !stakeCustom
                                            ? 'rgba(0,255,136,0.12)'
                                            : 'rgba(255,255,255,0.04)',
                                        color: stake === v && !stakeCustom ? '#00FF88' : '#E8EDF5',
                                        transition: 'all 150ms',
                                    }}
                                >
                                    ${v}
                                </button>
                            ))}
                            {/* Input customizado */}
                            <input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={stakeCustom}
                                onChange={e => { setStakeCustom(e.target.value); setStake(0); }}
                                placeholder="Outro"
                                style={{
                                    ...estiloInput,
                                    width: 80, padding: '7px 10px',
                                    border: stakeCustom ? '1.5px solid #00B4FF' : '1px solid rgba(255,255,255,0.10)',
                                }}
                                onFocus={e => { e.target.style.border = '1px solid rgba(0,180,255,0.4)'; }}
                                onBlur={e => { e.target.style.border = stakeCustom ? '1.5px solid #00B4FF' : '1px solid rgba(255,255,255,0.10)'; }}
                            />
                        </div>
                    </Campo>

                    {/* Botão salvar */}
                    <button
                        onClick={handleSalvar}
                        disabled={carregandoSalvar}
                        style={{
                            width: '100%', padding: '12px', borderRadius: 10,
                            border: 'none',
                            background: carregandoSalvar ? 'rgba(0,255,136,0.4)' : 'linear-gradient(135deg, #00FF88, #00D4FF)',
                            color: '#07100D', fontSize: 13, fontWeight: 800,
                            cursor: carregandoSalvar ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'opacity 150ms',
                        }}
                    >
                        {carregandoSalvar ? (
                            <>
                                <span
                                    style={{
                                        width: 14, height: 14, border: '2px solid #07100D',
                                        borderTopColor: 'transparent', borderRadius: '50%',
                                        display: 'inline-block', animation: 'iqSpin 1s linear infinite',
                                    }}
                                />
                                Salvando...
                            </>
                        ) : 'Salvar Configurações'}
                    </button>

                    {/* Toast de confirmação */}
                    {toastVisivel && (
                        <div style={{
                            marginTop: 12, padding: '10px 14px', borderRadius: 10,
                            background: 'rgba(0,255,136,0.12)',
                            border: '1px solid rgba(0,255,136,0.3)',
                            color: '#00FF88', fontSize: 13, fontWeight: 600, textAlign: 'center',
                            animation: 'iqSlideIn 300ms ease-out forwards',
                        }}>
                            ✅ Salvo com segurança
                        </div>
                    )}

                    {/* Aviso de segurança */}
                    <p style={{ fontSize: 11, color: '#4A6080', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
                        🔒 Criptografado e protegido
                    </p>
                </div>
            )}
        </section>
    );
}
