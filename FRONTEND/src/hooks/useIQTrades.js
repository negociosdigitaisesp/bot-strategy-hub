import { useState, useEffect, useCallback } from 'react'
import { getIQTradeLogs, subscribeToTrades } from '@/lib/supabaseIQ'

export const useIQTrades = (botId) => {
    const [trades, setTrades] = useState([])
    const [allTrades, setAllTrades] = useState([])
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [newTradeId, setNewTradeId] = useState(null)

    const tradesPerPage = 10

    useEffect(() => {
        if (!botId) return

        let tradeSubscription = null

        const loadInitialTrades = async () => {
            // Load initial batch for the feed (max 6 typically shown in top summary)
            // but allTrades stores more for history or loadMore
            const { data } = await getIQTradeLogs(botId, tradesPerPage)

            if (data) {
                setTrades(data.slice(0, 6))
                setAllTrades(data)
                setHasMore(data.length === tradesPerPage)
            }

            // Subscribe to Realtime inserts
            tradeSubscription = subscribeToTrades(botId, handleNewTrade)
        }

        const handleNewTrade = (trade) => {
            setNewTradeId(trade.id)

            setTrades(prev => {
                const updated = [trade, ...prev]
                return updated.slice(0, 6)
            })

            setAllTrades(prev => [trade, ...prev])

            // Reset newTradeId after animation time
            setTimeout(() => setNewTradeId(null), 1000)
        }

        loadInitialTrades()

        return () => {
            if (tradeSubscription) {
                tradeSubscription.unsubscribe()
            }
        }
    }, [botId])

    const loadMore = async () => {
        if (!botId || !hasMore) return

        const nextPage = page + 1
        const offset = page * tradesPerPage

        // Instead of relying on a real offset based fetch with Supabase here
        // we fetch again with higher limits or use offset in typical pagination:
        const { data: supabase } = await import('@/lib/supabaseClient')
        const { data } = await supabase.supabase
            .from('iq_trade_logs')
            .select('*')
            .eq('bot_id', botId)
            .order('executed_at', { ascending: false })
            .range(offset, offset + tradesPerPage - 1)

        if (data && data.length > 0) {
            setAllTrades(prev => [...prev, ...data])
            setPage(nextPage)
            setHasMore(data.length === tradesPerPage)
        } else {
            setHasMore(false)
        }
    }

    return { trades, allTrades, newTradeId, loadMore, hasMore }
}
