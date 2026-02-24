import React from 'react';

/**
 * IQBotFeed — Tabela de histórico de operações em tempo real.
 */
export default function IQBotFeed({ logs, newTradeId }) {
    return (
        <div
            className="rounded-xl overflow-hidden flex flex-col"
            style={{
                background: 'rgba(15,23,42,0.70)',
                border: '1px solid rgba(255,255,255,0.05)',
                minHeight: '280px',
            }}
        >
            {/* Header */}
            <div
                className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
                <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-black"
                    style={{ background: 'linear-gradient(135deg,#00B4FF,#0066FF)' }}
                >
                    ⬡
                </div>
                <span
                    className="text-xs text-white font-bold tracking-wider uppercase"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                    Histórico de Operações
                </span>
                {logs?.length > 0 && (
                    <span
                        className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{
                            background: 'rgba(0,180,255,0.12)',
                            border: '1px solid rgba(0,180,255,0.25)',
                            color: '#00B4FF',
                            fontFamily: "'JetBrains Mono', monospace",
                        }}
                    >
                        {logs.length}
                    </span>
                )}
            </div>

            {/* Content */}
            {!logs || logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                    <div className="text-4xl opacity-20">📭</div>
                    <div
                        className="text-[11px] text-center px-6"
                        style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        Nenhuma operação registrada ainda.
                        <br />
                        Ligue o bot para começar.
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead
                            className="sticky top-0 z-10"
                            style={{
                                background: 'rgba(5,10,20,0.95)',
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            <tr>
                                {['Data/Hora', 'Ativo', 'Ação', 'Valor', 'Resultado'].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                                        style={{
                                            color: 'rgba(255,255,255,0.3)',
                                            fontFamily: "'JetBrains Mono', monospace",
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, i) => (
                                <TradeRow key={log.id ?? i} log={log} isNew={log.id === newTradeId} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function TradeRow({ log, isNew }) {
    const isWin = log.result === 'win';
    const isLoss = log.result === 'loss';

    return (
        <tr
            className={`transition-colors duration-150 ${isNew ? 'iq-slide-down' : ''}`}
            style={{
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                background: isNew ? 'rgba(0,180,255,0.1)' : 'transparent'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isNew ? 'rgba(0,180,255,0.1)' : 'transparent'; }}
        >
            {/* Date */}
            <td
                className="px-4 py-3 text-[11px]"
                style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}
            >
                {new Date(log.executed_at).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                })}
            </td>

            {/* Asset */}
            <td
                className="px-4 py-3 text-[12px] font-bold text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
                {log.pair || log.asset}
            </td>

            {/* Direction */}
            <td className="px-4 py-3">
                <span
                    className="px-2 py-1 rounded text-[10px] font-black uppercase"
                    style={{
                        background: log.direction === 'CALL'
                            ? 'rgba(0,255,136,0.12)'
                            : 'rgba(255,59,92,0.12)',
                        color: log.direction === 'CALL' ? '#00FF88' : '#FF3B5C',
                        border: `1px solid ${log.direction === 'CALL' ? 'rgba(0,255,136,0.25)' : 'rgba(255,59,92,0.25)'}`,
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {log.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
                </span>
            </td>

            {/* Amount */}
            <td
                className="px-4 py-3 text-[12px] font-bold text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
                R$ {log.amount?.toFixed(2) ?? '—'}
            </td>

            {/* Result */}
            <td className="px-4 py-3">
                {isWin ? (
                    <span
                        className="text-[11px] font-black"
                        style={{ color: '#00FF88', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        ✅ WIN
                    </span>
                ) : isLoss ? (
                    <span
                        className="text-[11px] font-black"
                        style={{ color: '#FF3B5C', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        ❌ LOSS
                    </span>
                ) : (
                    <span
                        className="text-[11px] font-bold iq-countdown-alert"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        ⏳ PENDING
                    </span>
                )}
            </td>
        </tr>
    );
}
