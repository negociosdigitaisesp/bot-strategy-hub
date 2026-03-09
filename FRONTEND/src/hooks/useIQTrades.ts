import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface IQTradeLog {
    id: string;
    bot_id: string;
    asset: string;
    action: string;
    amount: number;
    profit: number;
    result: 'win' | 'loss' | 'draw' | 'pending';
    executed_at: string;
    [key: string]: any;
}

export const useIQTrades = (botId: string | null) => {
    const [trades, setTrades] = useState<IQTradeLog[]>([]);
    const [allTrades, setAllTrades] = useState<IQTradeLog[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [newTradeId, setNewTradeId] = useState<string | null>(null);

    const tradesPerPage = 10;

    useEffect(() => {
        if (!botId) return;

        let tradeSubscription: any = null;

        const loadInitialTrades = async () => {
            try {
                const { data, error } = await supabase
                    .from('iq_trade_logs')
                    .select('*')
                    .eq('bot_id', botId)
                    .order('executed_at', { ascending: false })
                    .limit(tradesPerPage);

                if (error) {
                    console.error('Error fetching initial trades:', error);
                    return;
                }

                if (data) {
                    setTrades(data.slice(0, 6));
                    setAllTrades(data);
                    setHasMore(data.length === tradesPerPage);
                }

                // Subscribe to Realtime inserts
                tradeSubscription = supabase
                    .channel(`iq-trades-${botId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'iq_trade_logs',
                            filter: `bot_id=eq.${botId}`
                        },
                        (payload) => {
                            handleNewTrade(payload.new as IQTradeLog);
                        }
                    )
                    .subscribe();
            } catch (err) {
                console.error('Exception loading initial trades:', err);
            }
        };

        const handleNewTrade = (trade: IQTradeLog) => {
            setNewTradeId(trade.id);

            setTrades(prev => {
                const updated = [trade, ...prev];
                return updated.slice(0, 6);
            });

            setAllTrades(prev => [trade, ...prev]);

            // Reset newTradeId after animation time
            setTimeout(() => setNewTradeId(null), 1000);
        };

        loadInitialTrades();

        return () => {
            if (tradeSubscription) {
                tradeSubscription.unsubscribe();
            }
        };
    }, [botId]);

    const loadMore = async () => {
        if (!botId || !hasMore) return;

        const nextPage = page + 1;
        const offset = page * tradesPerPage;

        try {
            const { data, error } = await supabase
                .from('iq_trade_logs')
                .select('*')
                .eq('bot_id', botId)
                .order('executed_at', { ascending: false })
                .range(offset, offset + tradesPerPage - 1);

            if (error) {
                console.error('Error loading more trades:', error);
                return;
            }

            if (data && data.length > 0) {
                setAllTrades(prev => [...prev, ...data]);
                setPage(nextPage);
                setHasMore(data.length === tradesPerPage);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Exception loading more trades:', err);
        }
    };

    return { trades, allTrades, newTradeId, loadMore, hasMore };
};
