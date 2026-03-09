import { supabase } from './supabaseClient'

// IQ Bot Data Operations

export const getIQBot = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('iq_bots')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching IQ Bot:', error)
            return { data: null, error }
        }

        return { data, error: null }
    } catch (error) {
        console.error('Exception in getIQBot:', error)
        return { data: null, error }
    }
}

export const saveIQCredentials = async (userId, credentials) => {
    try {
        const base64Password = btoa(credentials.password)

        const payload = {
            user_id: userId,
            iq_email: credentials.email,
            iq_password: base64Password,
            stake_amount: credentials.stake,
            is_active: false,
            session_status: 'disconnected',
            updated_at: new Date().toISOString()
        }

        // Checking if bot exists to update or insert
        const { data: existingBot } = await supabase
            .from('iq_bots')
            .select('id')
            .eq('user_id', userId)
            .single()

        let result
        if (existingBot) {
            result = await supabase
                .from('iq_bots')
                .update(payload)
                .eq('id', existingBot.id)
                .select()
                .single()
        } else {
            payload.mode = 'demo'
            result = await supabase
                .from('iq_bots')
                .insert(payload)
                .select()
                .single()
        }

        return { data: result.data, error: result.error }
    } catch (error) {
        console.error('Error saving IQ Credentials:', error)
        return { data: null, error }
    }
}

export const toggleIQBot = async (botId, isActive) => {
    try {
        const { data, error } = await supabase
            .from('iq_bots')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', botId)
            .select()
            .single()

        if (error) console.error('Error toggling IQ Bot:', error)
        return { data, error }
    } catch (error) {
        return { data: null, error }
    }
}

export const toggleIQMode = async (botId, mode) => {
    try {
        const { data, error } = await supabase
            .from('iq_bots')
            .update({ mode: mode, updated_at: new Date().toISOString() })
            .eq('id', botId)
            .select()
            .single()

        if (error) console.error('Error toggling IQ Bot mode:', error)
        return { data, error }
    } catch (error) {
        return { data: null, error }
    }
}

export const getIQTradeLogs = async (botId, limit = 6) => {
    try {
        const { data, error } = await supabase
            .from('iq_trade_logs')
            .select('*')
            .eq('bot_id', botId)
            .order('executed_at', { ascending: false })
            .limit(limit)

        if (error) console.error('Error fetching IQ trade logs:', error)
        return { data, error }
    } catch (error) {
        return { data: null, error }
    }
}

export const getTodayStats = async (botId) => {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data, error } = await supabase
            .from('iq_trade_logs')
            .select('result, profit')
            .eq('bot_id', botId)
            .gte('executed_at', today.toISOString())

        if (error) {
            console.error('Error fetching today stats:', error)
            return { wins: 0, losses: 0, profit: 0, total: 0 }
        }

        let wins = 0
        let losses = 0
        let profit = 0

        data?.forEach(trade => {
            if (trade.result === 'win') {
                wins++
            } else if (trade.result === 'loss') {
                losses++
            }
            profit += Number(trade.profit)
        })

        return { wins, losses, profit, total: data?.length || 0 }
    } catch (error) {
        console.error('Exception in getTodayStats:', error)
        return { wins: 0, losses: 0, profit: 0, total: 0 }
    }
}

export const subscribeToTrades = (botId, callback) => {
    return supabase
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
                callback(payload.new)
            }
        )
        .subscribe()
}

export const subscribeToBotStatus = (botId, callback) => {
    return supabase
        .channel(`iq-bot-status-${botId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'iq_bots',
                filter: `id=eq.${botId}`
            },
            (payload) => {
                callback(payload.new)
            }
        )
        .subscribe()
}
