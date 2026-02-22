import { useState, useEffect } from 'react';
import { useIQBot } from '../hooks/useIQBot';
import { useIQTrades } from '../hooks/useIQTrades';
import { supabase } from '../lib/supabaseClient';
import {
    IQBotHeader,
    IQBotPnL,
    IQBotStatus,
    IQBotFeed,
    IQBotCredentials,
    IQBotConfirmModal,
} from '../components/IQBot';

/**
 * IQBotPage — Página principal do módulo IQ Option Copy Trading.
 * Inserida na rota /iq-option dentro do layout padrão do Million Bots.
 */
export default function IQBotPage() {
    const [userId, setUserId] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ open: false, action: 'on' });
    const [winFlash, setWinFlash] = useState(null); // 'win' | 'loss' | null

    // ── Auth: pega o user_id do Supabase Auth ────────────────────────────────
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUserId(data.session?.user?.id ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // ── Hooks IQ ─────────────────────────────────────────────────────────────
    const { botConfig, loading, updateBotConfig, toggleBot } = useIQBot(userId);
    const { trades, wins, losses, totalPnL, winRate } = useIQTrades(userId, 50);

    // ── Flash visual ao receber resultado ────────────────────────────────────
    useEffect(() => {
        if (!trades.length) return;
        const latest = trades[0];
        if (latest?.result === 'win') {
            setWinFlash('win');
            setTimeout(() => setWinFlash(null), 1000);
        } else if (latest?.result === 'loss') {
            setWinFlash('loss');
            setTimeout(() => setWinFlash(null), 1000);
        }
    }, [trades]);

    // ── Abre modal de confirmação antes de toggle ────────────────────────────
    const handleToggleRequest = () => {
        const action = botConfig?.is_active ? 'off' : 'on';
        setConfirmModal({ open: true, action });
    };

    const handleConfirmToggle = async () => {
        setConfirmModal({ open: false, action: 'on' });
        await toggleBot();
    };

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'rgba(2,6,23,1)' }}
            >
                <div className="text-center space-y-4">
                    <div
                        className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black text-black iq-breathe"
                        style={{ background: 'linear-gradient(135deg,#00FF88,#00B4FF)' }}
                    >
                        IQ
                    </div>
                    <div
                        className="text-sm"
                        style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        Carregando IQ Option Bot...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative min-h-screen overflow-hidden"
            style={{
                background: 'hsl(var(--background))',
                fontFamily: "'Inter', sans-serif",
            }}
        >
            {/* Google Fonts */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
      `}</style>

            {/* Win/Loss flash border */}
            {winFlash && (
                <div
                    className="iq-win-flash fixed inset-0 pointer-events-none z-50"
                    style={{
                        boxShadow: winFlash === 'win'
                            ? 'inset 0 0 80px 20px rgba(0,255,136,0.4)'
                            : 'inset 0 0 80px 20px rgba(255,59,92,0.4)',
                        border: winFlash === 'win'
                            ? '2px solid rgba(0,255,136,0.6)'
                            : '2px solid rgba(255,59,92,0.6)',
                    }}
                />
            )}

            {/* Confirm Modal */}
            <IQBotConfirmModal
                isOpen={confirmModal.open}
                action={confirmModal.action}
                onConfirm={handleConfirmToggle}
                onCancel={() => setConfirmModal({ open: false, action: 'on' })}
            />

            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <IQBotHeader botConfig={botConfig} />

            {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
            <div className="max-w-screen-xl mx-auto px-6 py-6 grid grid-cols-12 gap-4">

                {/* LEFT COLUMN — Controls + PnL */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">

                    {/* Status / Master Switch */}
                    <IQBotStatus
                        botConfig={botConfig}
                        updateBotConfig={updateBotConfig}
                        toggleBot={handleToggleRequest}
                        onConfigureClick={() => setShowConfig((v) => !v)}
                    />

                    {/* P&L Stats */}
                    <IQBotPnL
                        wins={wins}
                        losses={losses}
                        totalPnL={totalPnL}
                        winRate={winRate}
                    />
                </div>

                {/* RIGHT COLUMN — Credentials form or Trade Feed */}
                <div className="col-span-12 lg:col-span-8">
                    {showConfig ? (
                        <IQBotCredentials
                            config={botConfig}
                            onSave={(updates) => {
                                updateBotConfig(updates);
                            }}
                            onCancel={() => setShowConfig(false)}
                        />
                    ) : (
                        <IQBotFeed logs={trades} />
                    )}
                </div>
            </div>
        </div>
    );
}
