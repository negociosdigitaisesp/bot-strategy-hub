/**
 * IQBotPanel.jsx
 * Painel completo do trader selecionado para copy trading.
 * Orquestra todos os subcomponentes e conecta os hooks da Parte 3.
 *
 * Props:
 *   trader   → objeto do trader selecionado (fallback para selectedTrader do hook)
 *   onVoltar → callback para retornar ao marketplace
 */

import React from 'react';
import IQBotHeader from './IQBotHeader';
import IQBotPnL from './IQBotPnL';
import IQBotStatus from './IQBotStatus';
import IQBotFeed from './IQBotFeed';
import IQBotCredentials from './IQBotCredentials';
import IQBotConfirmModal from './IQBotConfirmModal';
import IQBotExtension from './IQBotExtension';
import { useIQBot } from '../../hooks/useIQBot';
import { useIQTrades } from '../../hooks/useIQTrades';
import '../../styles/iq-bot-animations.css';

export default function IQBotPanel({ trader: traderProp, onVoltar }) {
    /* ─── Hook principal — estado real do bot ─── */
    const {
        bot,
        isActive,
        mode,
        pnlToday,
        winRate,
        totalOps,
        wins,
        losses,
        streak,
        loading,
        showConfirmModal,
        selectedTrader,
        toggleBot,
        confirmActivateReal,
        saveCredentials,
        changeMode,
        setShowConfirmModal,
    } = useIQBot();

    /* Trader pode vir de prop (navegação direta) ou do hook (seleção via marketplace) */
    const trader = traderProp || selectedTrader;

    /* ─── Hook de trades específicos do bot ─── */
    const { trades, newTradeId, loadMore, hasMore, carregando: carregandoTrades } = useIQTrades(bot?.id);

    /* Para o modal de confirmação — stake vem de stake_amount (nome real da coluna) */
    const stakeAtual = parseFloat(bot?.stake_amount) || 10;

    /* ─── Guarda de segurança: sem trader → não renderiza ─── */
    if (!trader) return null;

    return (
        <>
            {/* ─── Modal de confirmação REAL ─── */}
            <IQBotConfirmModal
                visivel={showConfirmModal}
                stake={stakeAtual}
                nomeTrader={trader.nome}
                onConfirmar={confirmActivateReal}
                onCancelar={() => setShowConfirmModal(false)}
            />

            {/* ─── Widget flutuante ─── */}
            <IQBotExtension
                trader={trader}
                ativo={isActive}
                lucroHoje={pnlToday}
                ultimoSinal={trades[0] || null}
                onToggleBot={toggleBot}
            />

            {/* ─── Painel principal ─── */}
            <div
                style={{
                    minHeight: '100vh',
                    background: 'var(--iq-bg-deep)',
                    color: 'var(--iq-text-primary)',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    paddingBottom: 100,
                }}
            >
                {/* Header com toggle DEMO/REAL */}
                <IQBotHeader
                    trader={trader}
                    modoReal={mode === 'real'}
                    onToggleModo={() => changeMode(mode === 'real' ? 'demo' : 'real')}
                    onVoltar={onVoltar}
                />

                {/* Conteúdo com scroll */}
                <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* P&L — elemento dominante */}
                    <IQBotPnL
                        lucroHoje={pnlToday}
                        winRate={winRate}
                        totalOps={totalOps}
                        vitorias={wins}
                        derrotas={losses}
                        streak={streak}
                    />

                    {/* Status / Countdown via useIQCountdown interno */}
                    <IQBotStatus
                        ativo={isActive}
                        parAtual={trades[0] ? { ativo: trades[0].par, direcao: trades[0].direcao } : null}
                        nomeTrader={trader.nome}
                        onAtivar={toggleBot}
                        onParar={toggleBot}
                    />

                    {/* Feed de operações com animação newTradeId */}
                    <IQBotFeed
                        operacoes={trades}
                        carregando={carregandoTrades || loading}
                        newTradeId={newTradeId}
                        onVerTodos={loadMore}
                    />

                    {/* Credenciais e configurações */}
                    <IQBotCredentials
                        onSalvar={saveCredentials}
                        carregandoSalvar={loading}
                    />
                </div>
            </div>
        </>
    );
}
