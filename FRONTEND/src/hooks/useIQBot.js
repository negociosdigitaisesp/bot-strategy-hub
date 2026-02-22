import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * useIQBot — Hook principal do módulo IQ Option.
 * - Lê/cria a linha do usuário em `iq_bots`
 * - Subscreve realtime para mudanças
 * - Lê e subscreve inserções em `iq_trade_logs`
 * - Expõe helpers para update e toggle
 */
export function useIQBot(userId) {
    const [botConfig, setBotConfig] = useState(null);
    const [tradeLogs, setTradeLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        // ── Busca ou cria configuraçao do bot ─────────────────────────────────
        const fetchConfig = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('iq_bots')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (data) {
                setBotConfig(data);
            } else if (!error || error.code === 'PGRST116') {
                // Não encontrado → cria registro inicial
                const { data: newConfig } = await supabase
                    .from('iq_bots')
                    .insert([{ user_id: userId, iq_email: '', iq_password: '', mode: 'demo', is_active: false }])
                    .select()
                    .single();
                setBotConfig(newConfig || null);
            } else {
                console.error('[useIQBot] fetchConfig error:', error);
            }
            setLoading(false);
        };

        fetchConfig();

        // ── Realtime: mudanças no iq_bots ────────────────────────────────────
        const botSubscription = supabase
            .channel(`iq_bots_changes_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'iq_bots',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => setBotConfig(payload.new)
            )
            .subscribe();

        // ── Busca logs iniciais ──────────────────────────────────────────────
        const fetchLogs = async () => {
            const { data } = await supabase
                .from('iq_trade_logs')
                .select('*')
                .eq('user_id', userId)
                .order('executed_at', { ascending: false })
                .limit(50);
            setTradeLogs(data || []);
        };

        fetchLogs();

        // ── Realtime: novas operações ────────────────────────────────────────
        const logsSubscription = supabase
            .channel(`iq_logs_changes_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'iq_trade_logs',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => setTradeLogs((prev) => [payload.new, ...prev].slice(0, 50))
            )
            .subscribe();

        return () => {
            supabase.removeChannel(botSubscription);
            supabase.removeChannel(logsSubscription);
        };
    }, [userId]);

    // ── Atualiza campos do botConfig no Supabase ────────────────────────────
    const updateBotConfig = async (updates) => {
        if (!botConfig) return;
        const { data, error } = await supabase
            .from('iq_bots')
            .update(updates)
            .eq('id', botConfig.id)
            .select()
            .single();

        if (error) {
            console.error('[useIQBot] updateBotConfig error:', error);
            return;
        }
        if (data) setBotConfig(data);
    };

    // ── Liga / Desliga o bot ─────────────────────────────────────────────────
    const toggleBot = async () => {
        if (!botConfig) return;
        const newActiveState = !botConfig.is_active;
        await updateBotConfig({
            is_active: newActiveState,
            session_status: newActiveState ? 'connecting' : 'disconnected',
        });
    };

    return { botConfig, tradeLogs, loading, updateBotConfig, toggleBot };
}
