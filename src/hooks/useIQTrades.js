/**
 * useIQTrades.js
 * Hook para gerenciar o feed de operações ao vivo do IQ Bot.
 * Integra com Supabase Realtime para receber novos trades em tempo real.
 *
 * Recebe: botId (string) — ID do registro em iq_bots
 * Retorna: { trades, allTrades, newTradeId, loadMore, hasMore, carregando }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getIQTradeLogs, subscribeToTrades } from '../lib/iqSupabase';

const IS_DEV = import.meta.env.DEV;

/* Quantidade máxima de trades visíveis no feed */
const MAX_FEED = 6;
/* Quantidade por página no "Ver todos" */
const POR_PAGINA = 20;

/**
 * Normaliza um registro de iq_trade_logs para o formato dos componentes.
 * Garante campos compatíveis com IQBotFeed.jsx.
 */
function normalizarTrade(raw) {
    return {
        id: raw.id || `trade_${Date.now()}_${Math.random()}`,
        par: raw.asset || raw.par || 'EURUSD-OTC',
        direcao: raw.direction || raw.direcao || 'CALL',
        resultado: raw.result || raw.resultado || 'WIN',
        valor: parseFloat(raw.profit || raw.valor || 0),
        horario: raw.executed_at
            ? new Date(raw.executed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : raw.horario || '--:--',
    };
}

/**
 * Hook para o feed de operações.
 * @param {string | null} botId
 */
export function useIQTrades(botId) {
    /* Últimos MAX_FEED trades (exibição no painel) */
    const [trades, setTrades] = useState([]);
    /* Todos os trades carregados (modal histórico) */
    const [allTrades, setAllTrades] = useState([]);
    /* ID do último trade novo — aciona animação de entrada */
    const [newTradeId, setNewTradeId] = useState(null);
    /* Controles de paginação */
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    /* Estado de loading */
    const [carregando, setCarregando] = useState(false);

    /* Ref para cancelar subscription no cleanup */
    const canalRef = useRef(null);

    /* ─── Carregamento inicial ─── */
    useEffect(() => {
        if (!botId) return;

        const carregar = async () => {
            setCarregando(true);
            try {
                const logs = await getIQTradeLogs(botId, MAX_FEED);
                const normalizados = logs.map(normalizarTrade);
                setTrades(normalizados);
                setAllTrades(normalizados);
            } catch (err) {
                console.error('[useIQTrades] Erro ao carregar logs:', err);
            } finally {
                setCarregando(false);
            }
        };

        carregar();
    }, [botId]);

    /* ─── Subscription Realtime ─── */
    useEffect(() => {
        if (!botId) return;

        /* Subscreve a novos trades em tempo real */
        canalRef.current = subscribeToTrades(botId, (novoTradeRaw) => {
            const trade = normalizarTrade(novoTradeRaw);

            if (IS_DEV) console.log('[useIQTrades] Novo trade recebido:', trade.resultado);

            /* Acionar animação de entrada */
            setNewTradeId(trade.id);

            /* Adicionar no topo do feed (máx MAX_FEED itens) */
            setTrades(prev => [trade, ...prev].slice(0, MAX_FEED));

            /* Adicionar no histórico completo sem limite */
            setAllTrades(prev => [trade, ...prev]);
        });

        /* Cleanup: cancelar subscription no unmount */
        return () => {
            if (canalRef.current) {
                canalRef.current.unsubscribe?.();
                canalRef.current = null;
            }
        };
    }, [botId]);

    /* ─── Carregar mais (paginação do histórico) ─── */
    const loadMore = useCallback(async () => {
        if (!botId || !hasMore || carregando) return;

        setCarregando(true);
        try {
            const proximaPagina = page + 1;
            const offset = page * POR_PAGINA;
            const logs = await getIQTradeLogs(botId, POR_PAGINA + offset);
            const normalizados = logs.slice(offset).map(normalizarTrade);

            if (normalizados.length === 0) {
                setHasMore(false);
            } else {
                setAllTrades(prev => [...prev, ...normalizados]);
                setPage(proximaPagina);
            }
        } catch (err) {
            console.error('[useIQTrades] Erro ao carregar mais:', err);
        } finally {
            setCarregando(false);
        }
    }, [botId, page, hasMore, carregando]);

    return {
        trades,
        allTrades,
        newTradeId,
        loadMore,
        hasMore,
        carregando,
    };
}

export default useIQTrades;
