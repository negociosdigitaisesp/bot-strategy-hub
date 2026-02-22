/**
 * useIQBot.js
 * Hook principal do Copy Trading Pro.
 * Alimenta IQBotPanel, IQBotMarketplace e IQBotExtension com dados reais.
 *
 * Fluxo:
 *   1. Busca bot do usuário no Supabase (getIQBot)
 *   2. Carrega logs e stats do dia
 *   3. Subscreve Realtime para novos trades e mudanças de status
 *   4. Expõe funções de controle: toggleBot, saveCredentials, changeMode...
 *   5. Cleanup completo no unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    getIQBot,
    saveIQCredentials,
    toggleIQBot,
    toggleIQMode,
    getIQTradeLogs,
    getTodayStats,
    subscribeToTrades,
    subscribeToBotStatus,
} from '../lib/iqSupabase';

const IS_DEV = import.meta.env.DEV;

/* ─── Máximo de trades recentes exibidos ─── */
const MAX_RECENTES = 6;

/* ─── Calcula streak a partir de lista de trades ─── */
function calcularStreak(trades) {
    if (!trades || trades.length === 0) return 0;
    const primeiroResultado = trades[0].resultado || trades[0].result;
    let contagem = 0;
    for (const t of trades) {
        const r = t.resultado || t.result;
        if (r === primeiroResultado) contagem++;
        else break;
    }
    /* Positivo = streak de WIN, negativo = streak de LOSS */
    return primeiroResultado === 'WIN' ? contagem : -contagem;
}

/**
 * Hook principal do IQ Bot.
 * @returns {object} Estado completo + funções de controle
 */
export function useIQBot() {
    const { user } = useAuth();
    const navigate = useNavigate();

    /* ─── Estado do bot ─── */
    const [bot, setBot] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('demo');
    const [sessionStatus, setSessionStatus] = useState('disconnected');

    /* ─── Estatísticas do dia ─── */
    const [pnlToday, setPnlToday] = useState(0);
    const [winRate, setWinRate] = useState(0);
    const [totalOps, setTotalOps] = useState(0);
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [streak, setStreak] = useState(0);

    /* ─── Feed de trades ─── */
    const [recentTrades, setRecentTrades] = useState([]);

    /* ─── Trader selecionado para copy ─── */
    const [selectedTrader, setSelectedTrader] = useState(null);

    /* ─── Estados de UI ─── */
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    /* ─── Refs para subscriptions (cleanup no unmount) ─── */
    const canalTradesRef = useRef(null);
    const canalStatusRef = useRef(null);

    /* ═══════════════════════════════════════════════════════
       RECALCULAR STATS QUANDO LISTA DE TRADES MUDA
       ═══════════════════════════════════════════════════════ */
    const recalcularStats = useCallback((trades) => {
        if (!trades || trades.length === 0) {
            setPnlToday(0); setWinRate(0); setTotalOps(0);
            setWins(0); setLosses(0); setStreak(0);
            return;
        }
        const w = trades.filter(t => (t.resultado || t.result) === 'WIN').length;
        const l = trades.filter(t => (t.resultado || t.result) === 'LOSS').length;
        const tot = trades.length;
        const pnl = trades.reduce((acc, t) => acc + parseFloat(t.valor ?? t.profit ?? 0), 0);
        const wr = tot > 0 ? (w / tot) * 100 : 0;

        setPnlToday(parseFloat(pnl.toFixed(2)));
        setWinRate(parseFloat(wr.toFixed(1)));
        setTotalOps(tot);
        setWins(w);
        setLosses(l);
        setStreak(calcularStreak(trades));
    }, []);

    /* ═══════════════════════════════════════════════════════
       HANDLER REALTIME: NOVO TRADE
       ═══════════════════════════════════════════════════════ */
    const handleNovoTrade = useCallback((novoTradeRaw) => {
        if (IS_DEV) console.log('[useIQBot] Novo trade via Realtime:', novoTradeRaw?.result);

        const trade = {
            id: novoTradeRaw.id,
            par: novoTradeRaw.asset || novoTradeRaw.par || 'EURUSD-OTC',
            direcao: novoTradeRaw.direction || novoTradeRaw.direcao || 'CALL',
            resultado: novoTradeRaw.result || novoTradeRaw.resultado || 'WIN',
            valor: parseFloat(novoTradeRaw.profit || novoTradeRaw.valor || 0),
            horario: novoTradeRaw.executed_at
                ? new Date(novoTradeRaw.executed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '--:--',
        };

        setRecentTrades(prev => {
            const atualizado = [trade, ...prev].slice(0, MAX_RECENTES);
            recalcularStats(atualizado);
            return atualizado;
        });
    }, [recalcularStats]);

    /* ═══════════════════════════════════════════════════════
       HANDLER REALTIME: STATUS DO BOT MUDOU
       ═══════════════════════════════════════════════════════ */
    const handleStatusBotAtualizado = useCallback((novoStatus) => {
        if (IS_DEV) console.log('[useIQBot] Status atualizado via Realtime:', novoStatus?.is_active);
        if (novoStatus.is_active !== undefined) setIsActive(novoStatus.is_active);
        if (novoStatus.mode) setMode(novoStatus.mode);
        setBot(prev => ({ ...prev, ...novoStatus }));
    }, []);

    /* ═══════════════════════════════════════════════════════
       EFEITO PRINCIPAL: CARREGAR BOT + SUBSCRIÇÕES
       ═══════════════════════════════════════════════════════ */
    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        let cancelado = false; /* Previne atualização de estado após unmount */

        const inicializar = async () => {
            setLoading(true);
            setError(null);

            try {
                /* 1. Buscar bot do usuário */
                const botData = await getIQBot(user.id);

                if (cancelado) return;

                if (!botData) {
                    /* Usuário ainda não configurou → estado limpo */
                    setBot(null);
                    setLoading(false);
                    return;
                }

                setBot(botData);
                setIsActive(botData.is_active || false);
                setMode(botData.mode || 'demo');

                /* 2. Carregar trades recentes */
                const logs = await getIQTradeLogs(botData.id, MAX_RECENTES);
                if (cancelado) return;

                const tradesNormalizados = logs.map(raw => ({
                    id: raw.id,
                    par: raw.asset || 'EURUSD-OTC',
                    direcao: raw.direction || 'CALL',
                    resultado: raw.result || 'WIN',
                    valor: parseFloat(raw.profit || 0),
                    horario: raw.executed_at
                        ? new Date(raw.executed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '--:--',
                }));
                setRecentTrades(tradesNormalizados);

                /* 3. Stats do dia */
                const stats = await getTodayStats(botData.id);
                if (cancelado) return;

                setPnlToday(stats.profit);
                setWins(stats.wins);
                setLosses(stats.losses);
                setTotalOps(stats.wins + stats.losses);
                setWinRate(
                    stats.wins + stats.losses > 0
                        ? parseFloat(((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1))
                        : 0
                );
                setStreak(calcularStreak(tradesNormalizados));

                /* 4. Subscrever Realtime — trades */
                canalTradesRef.current = subscribeToTrades(botData.id, handleNovoTrade);

                /* 5. Subscrever Realtime — status do bot */
                canalStatusRef.current = subscribeToBotStatus(botData.id, handleStatusBotAtualizado);

                setSessionStatus('connected');
            } catch (err) {
                if (!cancelado) {
                    console.error('[useIQBot] Erro na inicialização:', err);
                    setError(err.message || 'Erro ao carregar bot');
                }
            } finally {
                if (!cancelado) setLoading(false);
            }
        };

        inicializar();

        /* Cleanup obrigatório */
        return () => {
            cancelado = true;

            /* Cancelar subscriptions Realtime */
            if (canalTradesRef.current) {
                canalTradesRef.current.unsubscribe?.();
                canalTradesRef.current = null;
            }
            if (canalStatusRef.current) {
                canalStatusRef.current.unsubscribe?.();
                canalStatusRef.current = null;
            }

            setSessionStatus('disconnected');
        };
    }, [user?.id, handleNovoTrade, handleStatusBotAtualizado]);

    /* ═══════════════════════════════════════════════════════
       FUNÇÕES EXPOSTAS
       ═══════════════════════════════════════════════════════ */

    /**
     * Alterna ativo/inativo.
     * Se modo REAL e tentando ATIVAR → abre modal de confirmação.
     */
    const toggleBot = useCallback(async () => {
        if (!bot?.id) return;

        if (!isActive) {
            /* Tentando ativar */
            if (mode === 'real') {
                /* Exige confirmação para REAL */
                setShowConfirmModal(true);
            } else {
                /* DEMO — ativa diretamente */
                const { ok, error: err } = await toggleIQBot(bot.id, true);
                if (ok) setIsActive(true);
                else setError(err);
            }
        } else {
            /* Desativando */
            const { ok, error: err } = await toggleIQBot(bot.id, false);
            if (ok) setIsActive(false);
            else setError(err);
        }
    }, [bot, isActive, mode]);

    /**
     * Confirma ativação em modo REAL (após modal).
     */
    const confirmActivateReal = useCallback(async () => {
        if (!bot?.id) return;
        setShowConfirmModal(false);
        const { ok, error: err } = await toggleIQBot(bot.id, true);
        if (ok) setIsActive(true);
        else setError(err);
    }, [bot]);

    /**
     * Salva credenciais da IQ Option e stake.
     * Senha nunca é retornada ou exibida após salvar.
     *
     * @param {{ email: string, password: string, stake: number }} dados
     * @returns {{ ok: boolean, error?: string }}
     */
    const saveCredentials = useCallback(async (dados) => {
        if (!user?.id) return { ok: false, error: 'Usuário não autenticado' };

        setLoading(true);
        const { ok, bot: botAtualizado, error: err } = await saveIQCredentials(user.id, {
            ...dados,
            trader_id: selectedTrader?.id || null,
        });
        setLoading(false);

        if (ok && botAtualizado) {
            setBot(botAtualizado);
        } else {
            setError(err);
        }

        return { ok, error: err };
    }, [user, selectedTrader]);

    /**
     * Muda o modo de operação.
     * Se tentando ir para REAL → abre modal de confirmação.
     * @param {'demo' | 'real'} novoModo
     */
    const changeMode = useCallback(async (novoModo) => {
        if (!bot?.id) return;

        if (novoModo === 'real') {
            /* Confirmação via modal — o componente deverá chamar confirmActivateReal */
            setShowConfirmModal(true);
        } else {
            const { ok, error: err } = await toggleIQMode(bot.id, 'demo');
            if (ok) setMode('demo');
            else setError(err);
        }
    }, [bot]);

    /**
     * Seleciona trader para copy e navega ao painel.
     * @param {object} trader
     */
    const selectTrader = useCallback((trader) => {
        setSelectedTrader(trader);
        navigate('/iq-bot/panel');
    }, [navigate]);

    /* ─── Retornar tudo ─── */
    return {
        /* Estado */
        bot,
        isActive,
        mode,
        sessionStatus,
        pnlToday,
        winRate,
        totalOps,
        wins,
        losses,
        streak,
        recentTrades,
        selectedTrader,
        loading,
        error,
        showConfirmModal,

        /* Funções */
        toggleBot,
        confirmActivateReal,
        saveCredentials,
        changeMode,
        selectTrader,
        setShowConfirmModal,
        setSelectedTrader,
    };
}

export default useIQBot;
