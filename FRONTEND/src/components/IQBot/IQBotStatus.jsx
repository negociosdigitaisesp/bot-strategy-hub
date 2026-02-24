import React from 'react';
import { useIQCountdown } from '../../hooks/useIQCountdown';

/**
 * IQBotStatus — Master switch e seletor de modo (Demo / Real).
 */
export default function IQBotStatus({ botConfig, updateBotConfig, toggleBot, onConfigureClick }) {
    const isActive = botConfig?.is_active ?? false;
    const hasCredentials = !!(botConfig?.email && botConfig?.password);
    const { countdown, isUrgent } = useIQCountdown();

    return (
        <div
            className="rounded-xl p-4 space-y-4"
            style={{
                background: 'rgba(15,23,42,0.70)',
                border: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <div className="flex items-center gap-2">
                    <div
                        className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-black"
                        style={{ background: 'linear-gradient(135deg,#00FF88,#00B4FF)' }}
                    >
                        ⚡
                    </div>
                    <span
                        className="text-xs text-white font-bold tracking-wider uppercase"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        Controle
                    </span>
                </div>
                <button
                    onClick={onConfigureClick}
                    className="text-[10px] font-medium px-2 py-1 rounded-lg transition-all duration-200"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.6)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                    ⚙ Configurar
                </button>
            </div>

            {/* Master Switch Button */}
            <div className="flex flex-col items-center text-center space-y-3">
                <button
                    onClick={toggleBot}
                    disabled={!hasCredentials}
                    className={`w-full py-4 text-base font-black rounded-xl transition-all duration-300 ${isActive ? 'iq-breathe' : ''}`}
                    style={{
                        background: isActive
                            ? 'linear-gradient(135deg, #FF3B5C, #CC0033)'
                            : hasCredentials
                                ? 'linear-gradient(135deg, #00FF88, #00C866)'
                                : 'rgba(255,255,255,0.08)',
                        color: hasCredentials ? '#000' : 'rgba(255,255,255,0.3)',
                        boxShadow: isActive
                            ? '0 0 30px rgba(255,59,92,0.4)'
                            : hasCredentials ? '0 0 30px rgba(0,255,136,0.3)' : 'none',
                        cursor: hasCredentials ? 'pointer' : 'not-allowed',
                        letterSpacing: '0.12em',
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {isActive ? '⏹ DESLIGAR BOT' : '▶ LIGAR BOT'}
                </button>

                {!hasCredentials && (
                    <p
                        className="text-[11px] px-2"
                        style={{ color: '#FFB800', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        ⚠ Configure suas credenciais antes de ligar.
                    </p>
                )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }} />

            {/* Countdown Display */}
            <div className="space-y-2 flex justify-between items-center">
                <div
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}
                >
                    Próxima Operação
                </div>
                <div
                    className={`text-lg font-bold tracking-widest ${isUrgent ? 'iq-breathe' : ''}`}
                    style={{ color: isUrgent ? '#FF3B5C' : '#00B4FF', fontFamily: "'JetBrains Mono', monospace" }}
                >
                    {countdown}
                </div>
            </div>

            {/* Demo / Real Mode Toggle */}
            <div className="space-y-2">
                <div
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}
                >
                    Modo Operacional
                </div>
                <div
                    className="flex rounded-lg p-1 gap-1"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                    <button
                        onClick={() => !isActive && updateBotConfig({ mode: 'demo' })}
                        disabled={isActive}
                        className="flex-1 py-2 text-[11px] font-black rounded-md transition-all duration-200 uppercase tracking-wider"
                        style={{
                            background: botConfig?.mode === 'demo' ? 'rgba(0,180,255,0.25)' : 'transparent',
                            color: botConfig?.mode === 'demo' ? '#00B4FF' : 'rgba(255,255,255,0.3)',
                            border: botConfig?.mode === 'demo' ? '1px solid rgba(0,180,255,0.4)' : '1px solid transparent',
                            cursor: isActive ? 'not-allowed' : 'pointer',
                            fontFamily: "'JetBrains Mono', monospace",
                        }}
                    >
                        🔵 Demo
                    </button>
                    <button
                        onClick={() => !isActive && updateBotConfig({ mode: 'real' })}
                        disabled={isActive}
                        className="flex-1 py-2 text-[11px] font-black rounded-md transition-all duration-200 uppercase tracking-wider"
                        style={{
                            background: botConfig?.mode === 'real' ? 'rgba(255,184,0,0.2)' : 'transparent',
                            color: botConfig?.mode === 'real' ? '#FFB800' : 'rgba(255,255,255,0.3)',
                            border: botConfig?.mode === 'real' ? '1px solid rgba(255,184,0,0.4)' : '1px solid transparent',
                            cursor: isActive ? 'not-allowed' : 'pointer',
                            fontFamily: "'JetBrains Mono', monospace",
                        }}
                    >
                        🔴 Real
                    </button>
                </div>
                {isActive && (
                    <p
                        className="text-[10px]"
                        style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        Desligue o bot para trocar o modo.
                    </p>
                )}
            </div>
        </div>
    );
}
