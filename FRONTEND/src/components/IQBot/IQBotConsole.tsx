import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ConsoleLog {
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warn';
}

interface IQBotConsoleProps {
    logs: ConsoleLog[];
}

const TYPE_COLORS: Record<ConsoleLog['type'], string> = {
    info: '#94a3b8',
    success: '#00FF88',
    error: '#FF3B5C',
    warn: '#FFB800',
};

const TYPE_PREFIXES: Record<ConsoleLog['type'], string> = {
    info: '●',
    success: '✓',
    error: '✗',
    warn: '⚠',
};

export default function IQBotConsole({ logs = [] }: IQBotConsoleProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new log
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
                background: '#000000',
                border: '1px solid rgba(255,255,255,0.08)',
                minHeight: '320px',
                maxHeight: '480px',
            }}
        >
            {/* ── Terminal Header ── */}
            <div
                className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                {/* macOS-style dots */}
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                    <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                    <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                </div>

                <div className="flex items-center gap-2 ml-2">
                    <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse shadow-[0_0_6px_#00FF88]" />
                    <span
                        className="text-[11px] font-bold uppercase tracking-widest"
                        style={{
                            color: 'rgba(255,255,255,0.5)',
                            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                        }}
                    >
                        Terminal de Logs
                    </span>
                </div>

                <span
                    className="ml-auto text-[10px] font-bold"
                    style={{
                        color: 'rgba(255,255,255,0.2)',
                        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    }}
                >
                    {logs.length} linhas
                </span>
            </div>

            {/* ── Log Lines ── */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-1"
                style={{
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    fontSize: '11px',
                    lineHeight: '1.7',
                }}
            >
                {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full opacity-30">
                        <span style={{ color: '#94a3b8' }}>
                            Aguardando eventos...
                        </span>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {logs.map((log, i) => (
                            <motion.div
                                key={`${i}-${log.time}-${log.message}`}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-start gap-2"
                            >
                                {/* Timestamp */}
                                <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                                    [{log.time}]
                                </span>

                                {/* Type Indicator */}
                                <span style={{ color: TYPE_COLORS[log.type], flexShrink: 0 }}>
                                    {TYPE_PREFIXES[log.type]}
                                </span>

                                {/* Message */}
                                <span
                                    style={{ color: TYPE_COLORS[log.type], wordBreak: 'break-word' }}
                                >
                                    {log.message}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* ── Bottom Bar ── */}
            <div
                className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
                style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                }}
            >
                <span
                    className="text-[10px]"
                    style={{
                        color: 'rgba(255,255,255,0.15)',
                        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    }}
                >
                    {'>'} million-bots@iq-engine ~
                </span>
                <div
                    className="w-2 h-4 animate-pulse"
                    style={{ background: 'rgba(0,255,136,0.6)' }}
                />
            </div>
        </motion.div>
    );
}
