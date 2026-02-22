import React from 'react';

// Status color helper
function getStatusColor(status) {
    if (status === 'connected') return '#00FF88';
    if (status === 'connecting') return '#FFB800';
    return '#FF3B5C';
}

/**
 * IQBotHeader — Barra superior do painel IQ Option.
 * Exibe logo, status da sessão e badge visual.
 */
export default function IQBotHeader({ botConfig }) {
    const status = botConfig?.session_status ?? 'disconnected';
    const statusColor = getStatusColor(status);
    const isActive = botConfig?.is_active ?? false;

    return (
        <div
            style={{
                background: 'rgba(15,23,42,0.85)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-3">
                {/* Logo + Title */}
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-black shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #00FF88, #00B4FF)' }}
                    >
                        IQ
                    </div>
                    <div>
                        <div className="font-black text-white text-sm tracking-wider">IQ OPTION BOT</div>
                        <div
                            className="text-[11px] font-medium"
                            style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)' }}
                        >
                            COPY TRADING PRO · EXECUÇÃO 100% NA NUVEM
                        </div>
                    </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center gap-5 flex-wrap">
                    {/* Mode badge */}
                    <div className="flex items-center gap-1.5">
                        <span
                            className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)' }}
                        >
                            Modo:
                        </span>
                        <span
                            className="px-2 py-0.5 rounded text-[10px] font-black uppercase"
                            style={{
                                background: botConfig?.mode === 'real'
                                    ? 'rgba(255,184,0,0.15)'
                                    : 'rgba(0,180,255,0.15)',
                                border: `1px solid ${botConfig?.mode === 'real' ? 'rgba(255,184,0,0.4)' : 'rgba(0,180,255,0.4)'}`,
                                color: botConfig?.mode === 'real' ? '#FFB800' : '#00B4FF',
                            }}
                        >
                            {botConfig?.mode === 'real' ? '🔴 REAL' : '🔵 DEMO'}
                        </span>
                    </div>

                    {/* Session status */}
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{
                                background: statusColor,
                                boxShadow: `0 0 6px ${statusColor}`,
                                animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
                            }}
                        />
                        <span
                            className="text-[11px] font-bold uppercase tracking-wider"
                            style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                color: statusColor,
                            }}
                        >
                            {status.toUpperCase()}
                        </span>
                    </div>

                    {/* Active pill */}
                    <div
                        className="px-3 py-1 rounded-full text-[10px] font-bold"
                        style={{
                            background: isActive ? 'rgba(0,255,136,0.12)' : 'rgba(100,116,139,0.15)',
                            border: `1px solid ${isActive ? 'rgba(0,255,136,0.4)' : '#475569'}`,
                            color: isActive ? '#00FF88' : '#94a3b8',
                            fontFamily: "'JetBrains Mono', monospace",
                        }}
                    >
                        {isActive ? '● OPERANDO' : '○ EM ESPERA'}
                    </div>
                </div>
            </div>
        </div>
    );
}
