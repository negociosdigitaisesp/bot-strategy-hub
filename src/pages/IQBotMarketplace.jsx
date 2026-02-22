/**
 * IQBotMarketplace.jsx
 * Tela principal do Copy Trading Pro — lista de traders.
 * Conectado ao useIQBot para selectTrader e estado do bot ativo.
 */

import React from 'react';
import IQTraderCard from '../components/iq-bot/IQTraderCard';
import { useIQBot } from '../hooks/useIQBot';
import '../styles/iq-bot-animations.css';

/* ─── Dados do marketplace (substituir por API/JSON na Parte 4) ─── */
const TRADERS = [
    {
        id: 'cipher',
        nome: 'CIPHER',
        nivel: 'ELITE',
        status: 'OPERANDO',
        gradiente: 'linear-gradient(135deg, #00FF88, #00B4FF)',
        winRate: 74,
        operacoes: 1248,
        lucroMes: 3420,
        maxDD: 8.2,
        historico: [45, 60, 42, 78, 55, 90, 74],
    },
    {
        id: 'phantom',
        nome: 'PHANTOM',
        nivel: 'PRO',
        status: 'OPERANDO',
        gradiente: 'linear-gradient(135deg, #B06EFF, #FF3B5C)',
        winRate: 68,
        operacoes: 876,
        lucroMes: 2180,
        maxDD: 12.5,
        historico: [50, 40, 65, 48, 72, 60, 68],
    },
    {
        id: 'nexus',
        nome: 'NEXUS',
        nivel: 'MASTER',
        status: 'EM ESPERA',
        gradiente: 'linear-gradient(135deg, #FFD700, #FF8C00)',
        winRate: 81,
        operacoes: 2340,
        lucroMes: 5670,
        maxDD: 6.1,
        historico: [70, 82, 75, 88, 79, 85, 81],
    },
    {
        id: 'vector',
        nome: 'VECTOR',
        nivel: 'PRO',
        status: 'OPERANDO',
        gradiente: 'linear-gradient(135deg, #00D4FF, #0070FF)',
        winRate: 65,
        operacoes: 543,
        lucroMes: 1340,
        maxDD: 15.3,
        historico: [55, 62, 48, 70, 58, 65, 65],
    },
    {
        id: 'aurora',
        nome: 'AURORA',
        nivel: 'ELITE',
        status: 'OPERANDO',
        gradiente: 'linear-gradient(135deg, #FF6B6B, #FFE66D)',
        winRate: 77,
        operacoes: 1870,
        lucroMes: 4230,
        maxDD: 9.8,
        historico: [68, 72, 80, 74, 78, 76, 77],
    },
    {
        id: 'titan',
        nome: 'TITAN',
        nivel: 'MASTER',
        status: 'EM ESPERA',
        gradiente: 'linear-gradient(135deg, #43E97B, #38F9D7)',
        winRate: 83,
        operacoes: 3120,
        lucroMes: 7890,
        maxDD: 5.4,
        historico: [75, 80, 85, 78, 88, 82, 83],
    },
];

export default function IQBotMarketplace() {
    /* ─── Hook principal — obtém selectTrader e selectedTrader ─── */
    const { selectTrader, selectedTrader, bot, isActive } = useIQBot();

    const quantidadeOperando = TRADERS.filter(t => t.status === 'OPERANDO').length;
    const traderAtivoCopiadoId = bot?.trader_id || null;

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--iq-bg-deep)',
                color: 'var(--iq-text-primary)',
                fontFamily: "'Inter', -apple-system, sans-serif",
                paddingBottom: 80,
            }}
        >
            {/* ─── Header ─── */}
            <div
                style={{
                    padding: '28px 20px 0',
                    maxWidth: 1200,
                    margin: '0 auto',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1
                            style={{
                                fontSize: 24, fontWeight: 900, color: '#E8EDF5',
                                margin: '0 0 4px', letterSpacing: '-0.5px',
                            }}
                        >
                            Copy Trading Pro
                        </h1>
                        <p style={{ fontSize: 14, color: '#4A6080', margin: 0 }}>
                            Copie sinais de traders verificados em tempo real
                        </p>
                    </div>

                    {/* Badge operando */}
                    <div
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'rgba(0,255,136,0.08)',
                            border: '1px solid rgba(0,255,136,0.25)',
                            borderRadius: 20,
                            padding: '6px 14px',
                        }}
                    >
                        <span
                            style={{
                                width: 6, height: 6, borderRadius: '50%', background: '#00FF88',
                                display: 'inline-block', animation: 'iqLiveDot 1.4s ease-in-out infinite',
                            }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#00FF88' }}>
                            {quantidadeOperando} traders operando
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── Grid de traders ─── */}
            <div
                style={{
                    maxWidth: 1200,
                    margin: '28px auto 0',
                    padding: '0 20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                }}
            >
                {TRADERS.map((trader) => (
                    <IQTraderCard
                        key={trader.id}
                        trader={trader}
                        estaCopiando={traderAtivoCopiadoId === trader.id && isActive}
                        onCopiar={() => selectTrader(trader)}
                        onParar={() => selectTrader(trader)}
                    />
                ))}
            </div>
        </div>
    );
}
