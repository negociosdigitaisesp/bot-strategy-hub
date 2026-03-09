/**
 * iqSupabase.js
 * Camada de acesso ao Supabase para o módulo IQ Bot (Copy Trading Pro).
 * Usa o banco CENTRAL (xwclmxjeombwabfdvyij) conforme regra de isolamento.
 *
 * Tabelas utilizadas:
 *   - iq_bots           (configuração do bot do usuário)
 *   - iq_trade_logs     (histórico de trades)
 */

import { supabase } from './supabaseClient';

/* ─── Constantes ─── */
const BOTS_TABLE = 'iq_bots';
const LOGS_TABLE = 'iq_trade_logs';

/* ═══════════════════════════════════════════════════════
   getIQBot — busca o bot do usuário
   ═══════════════════════════════════════════════════════ */
export async function getIQBot(userId) {
    if (!userId) return null;

    const { data, error } = await supabase
        .from(BOTS_TABLE)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('[iqSupabase] getIQBot error:', error.message);
        return null;
    }
    return data;
}

/* ═══════════════════════════════════════════════════════
   saveIQCredentials — cria ou atualiza credenciais
   ═══════════════════════════════════════════════════════ */
export async function saveIQCredentials(userId, { email, password, stake, trader_id }) {
    if (!userId) return { ok: false, error: 'userId obrigatório' };

    const payload = {
        user_id: userId,
        iq_email: email,
        iq_password: password,
        stake: parseFloat(stake) || 1,
        trader_id: trader_id || null,
        updated_at: new Date().toISOString(),
    };

    /* Upsert — cria se não existe, atualiza se já existe */
    const { data, error } = await supabase
        .from(BOTS_TABLE)
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

    if (error) {
        console.error('[iqSupabase] saveIQCredentials error:', error.message);
        return { ok: false, error: error.message };
    }
    return { ok: true, bot: data };
}

/* ═══════════════════════════════════════════════════════
   toggleIQBot — ativa/desativa o bot
   ═══════════════════════════════════════════════════════ */
export async function toggleIQBot(botId, isActive) {
    if (!botId) return { ok: false, error: 'botId obrigatório' };

    const { error } = await supabase
        .from(BOTS_TABLE)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', botId);

    if (error) {
        console.error('[iqSupabase] toggleIQBot error:', error.message);
        return { ok: false, error: error.message };
    }
    return { ok: true };
}

/* ═══════════════════════════════════════════════════════
   toggleIQMode — muda modo demo/real
   ═══════════════════════════════════════════════════════ */
export async function toggleIQMode(botId, mode) {
    if (!botId) return { ok: false, error: 'botId obrigatório' };

    const { error } = await supabase
        .from(BOTS_TABLE)
        .update({ mode, updated_at: new Date().toISOString() })
        .eq('id', botId);

    if (error) {
        console.error('[iqSupabase] toggleIQMode error:', error.message);
        return { ok: false, error: error.message };
    }
    return { ok: true };
}

/* ═══════════════════════════════════════════════════════
   getIQTradeLogs — últimos N trades do bot
   ═══════════════════════════════════════════════════════ */
export async function getIQTradeLogs(botId, limit = 6) {
    if (!botId) return [];

    const { data, error } = await supabase
        .from(LOGS_TABLE)
        .select('*')
        .eq('bot_id', botId)
        .order('executed_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[iqSupabase] getIQTradeLogs error:', error.message);
        return [];
    }
    return data || [];
}

/* ═══════════════════════════════════════════════════════
   getTodayStats — estatísticas do dia atual
   ═══════════════════════════════════════════════════════ */
export async function getTodayStats(botId) {
    if (!botId) return { wins: 0, losses: 0, profit: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from(LOGS_TABLE)
        .select('result, profit')
        .eq('bot_id', botId)
        .gte('executed_at', today.toISOString());

    if (error) {
        console.error('[iqSupabase] getTodayStats error:', error.message);
        return { wins: 0, losses: 0, profit: 0 };
    }

    const trades = data || [];
    const wins = trades.filter(t => t.result === 'WIN').length;
    const losses = trades.filter(t => t.result === 'LOSS').length;
    const profit = trades.reduce((acc, t) => acc + parseFloat(t.profit || 0), 0);

    return {
        wins,
        losses,
        profit: parseFloat(profit.toFixed(2)),
    };
}

/* ═══════════════════════════════════════════════════════
   subscribeToTrades — Realtime para novos trades
   ═══════════════════════════════════════════════════════ */
export function subscribeToTrades(botId, callback) {
    if (!botId || typeof callback !== 'function') return null;

    const channel = supabase
        .channel(`iq_trades_${botId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: LOGS_TABLE,
                filter: `bot_id=eq.${botId}`,
            },
            (payload) => callback(payload.new)
        )
        .subscribe();

    return channel;
}

/* ═══════════════════════════════════════════════════════
   subscribeToBotStatus — Realtime para mudanças do bot
   ═══════════════════════════════════════════════════════ */
export function subscribeToBotStatus(botId, callback) {
    if (!botId || typeof callback !== 'function') return null;

    const channel = supabase
        .channel(`iq_bot_status_${botId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: BOTS_TABLE,
                filter: `id=eq.${botId}`,
            },
            (payload) => callback(payload.new)
        )
        .subscribe();

    return channel;
}
