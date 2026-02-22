import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * useIQTrades — Busca e subscreve ao histórico de operações IQ Option.
 * Separado do useIQBot para poder ser usado isoladamente em subcomponentes.
 *
 * @param {string|null} userId
 * @param {number} limit - Número máximo de registros (padrão: 50)
 */
export function useIQTrades(userId, limit = 50) {
    const [trades, setTrades] = useState([]);
    const [loadingTrades, setLoadingTrades] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoadingTrades(false);
            return;
        }

        // Busca inicial
        const fetchTrades = async () => {
            setLoadingTrades(true);
            const { data, error } = await supabase
                .from('iq_trade_logs')
                .select('*')
                .eq('user_id', userId)
                .order('executed_at', { ascending: false })
                .limit(limit);

            if (!error) setTrades(data || []);
            else console.error('[useIQTrades] fetchTrades error:', error);

            setLoadingTrades(false);
        };

        fetchTrades();

        // Realtime: novas inserções
        const subscription = supabase
            .channel(`iq_trades_sub_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'iq_trade_logs',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    setTrades((prev) => [payload.new, ...prev].slice(0, limit));
                }
            )
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, [userId, limit]);

    // Estatísticas derivadas
    const wins = trades.filter((t) => t.result === 'win').length;
    const losses = trades.filter((t) => t.result === 'loss').length;
    const pending = trades.filter((t) => t.result !== 'win' && t.result !== 'loss').length;
    const totalPnL = trades.reduce((sum, t) => {
        if (t.result === 'win') return sum + (t.amount || 0);
        if (t.result === 'loss') return sum - (t.amount || 0);
        return sum;
    }, 0);
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

    return { trades, loadingTrades, wins, losses, pending, totalPnL, winRate };
}
