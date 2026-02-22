import React from 'react';

/**
 * IQBotConfirmModal — Modal de confirmação antes de ligar/desligar o bot.
 * Renderizado com overlay ao centro da tela (position: fixed).
 *
 * @param {boolean}  isOpen    - Controla visibilidade
 * @param {'on'|'off'} action  - Ação a confirmar
 * @param {function} onConfirm - Callback ao confirmar
 * @param {function} onCancel  - Callback ao cancelar
 */
export default function IQBotConfirmModal({ isOpen, action, onConfirm, onCancel }) {
    if (!isOpen) return null;

    const isTurnOn = action === 'on';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(10px)' }}
            onClick={onCancel}
        >
            <div
                className="iq-slide-down rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
                style={{
                    background: 'rgba(15,23,42,0.96)',
                    border: `1px solid ${isTurnOn ? 'rgba(0,255,136,0.25)' : 'rgba(255,59,92,0.25)'}`,
                    boxShadow: isTurnOn
                        ? '0 0 60px rgba(0,255,136,0.15)'
                        : '0 0 60px rgba(255,59,92,0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon */}
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-5"
                    style={{
                        background: isTurnOn ? 'rgba(0,255,136,0.12)' : 'rgba(255,59,92,0.12)',
                        border: `2px solid ${isTurnOn ? 'rgba(0,255,136,0.3)' : 'rgba(255,59,92,0.3)'}`,
                    }}
                >
                    {isTurnOn ? '▶' : '⏹'}
                </div>

                {/* Title */}
                <h2
                    className="text-xl font-black mb-2 tracking-wide"
                    style={{
                        color: isTurnOn ? '#00FF88' : '#FF3B5C',
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {isTurnOn ? 'LIGAR BOT?' : 'DESLIGAR BOT?'}
                </h2>

                {/* Message */}
                <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {isTurnOn
                        ? 'O robô IQ Option começará a copiar trades automaticamente na sua conta.'
                        : 'O robô será desligado e todas as operações em andamento serão encerradas.'}
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
                        style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)',
                            background: 'transparent',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 text-sm font-black rounded-xl transition-all duration-300"
                        style={{
                            background: isTurnOn
                                ? 'linear-gradient(135deg,#00FF88,#00C866)'
                                : 'linear-gradient(135deg,#FF3B5C,#CC0033)',
                            color: isTurnOn ? '#000' : '#fff',
                            boxShadow: isTurnOn
                                ? '0 0 20px rgba(0,255,136,0.35)'
                                : '0 0 20px rgba(255,59,92,0.35)',
                        }}
                    >
                        {isTurnOn ? '✓ Confirmar' : '⏹ Desligar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
