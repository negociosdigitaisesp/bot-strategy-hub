import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface BotRiskConfig {
    ssid: string;
    stake: number;
    take_profit: number;
    stop_loss: number;
    martingale_steps: number;
}

interface IQBotCredentialsProps {
    onSave: (config: BotRiskConfig) => Promise<{ success?: boolean; error?: string }>;
    initialConfig?: Partial<BotRiskConfig>;
    hasSSID: boolean;
    loading: boolean;
}

export default function IQBotCredentials({ onSave, initialConfig, hasSSID, loading }: IQBotCredentialsProps) {
    const [ssid, setSsid] = useState(initialConfig?.ssid || '');
    const [stake, setStake] = useState(initialConfig?.stake?.toString() || '10.00');
    const [takeProfit, setTakeProfit] = useState(initialConfig?.take_profit?.toString() || '50.00');
    const [stopLoss, setStopLoss] = useState(initialConfig?.stop_loss?.toString() || '20.00');
    const [martingaleSteps, setMartingaleSteps] = useState(initialConfig?.martingale_steps?.toString() || '2');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ssid.trim()) return;
        setSaving(true);
        await onSave({
            ssid: ssid.trim(),
            stake: parseFloat(stake) || 10,
            take_profit: parseFloat(takeProfit) || 50,
            stop_loss: parseFloat(stopLoss) || 20,
            martingale_steps: parseInt(martingaleSteps) || 2
        });
        setSsid(''); // Nunca reter o SSID no state após salvar por segurança
        setSaving(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl overflow-hidden"
            style={{
                background: '#0B1221',
                border: '1px solid rgba(255,255,255,0.04)',
            }}
        >
            {/* Header */}
            <div
                className="px-5 py-4 flex items-center gap-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                    style={{ background: 'linear-gradient(135deg, #00FF88, #00B4FF)', color: '#000' }}
                >
                    🛡️
                </div>
                <div>
                    <div className="text-sm font-bold text-white">Configuração & Gestão de Risco</div>
                    <div className="text-[10px] text-slate-500">SSID, Stake, TP / SL e Martingale</div>
                </div>
                {hasSSID && (
                    <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                        style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)', color: '#00FF88' }}
                    >
                        ✓ Configurado
                    </span>
                )}
            </div>

            <div className="p-5 space-y-5">
                {/* ── Instruction Panel ── */}
                <div
                    className="rounded-xl p-4 space-y-3"
                    style={{
                        background: 'rgba(0,180,255,0.05)',
                        border: '1px solid rgba(0,180,255,0.12)',
                    }}
                >
                    <div className="text-[11px] font-bold text-[#00B4FF] uppercase tracking-wider mb-2">
                        📋 Como pegar seu SSID
                    </div>
                    <div className="space-y-2">
                        {[
                            { step: '1', text: 'Faça login na IQ Option pelo navegador' },
                            { step: '2', text: 'Aperte F12 → Application → Cookies → iqoption.com' },
                            { step: '3', text: 'Copie o valor do cookie "ssid"' },
                        ].map(({ step, text }) => (
                            <div key={step} className="flex items-start gap-3">
                                <div
                                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                                    style={{ background: 'rgba(0,180,255,0.15)', color: '#00B4FF' }}
                                >
                                    {step}
                                </div>
                                <span className="text-[12px] text-slate-300 leading-relaxed">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Form ── */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Linha 1: SSID */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                            Token SSID
                        </label>
                        <input
                            type="text"
                            value={ssid}
                            onChange={e => setSsid(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600"
                            style={{
                                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => { e.target.style.borderColor = 'rgba(0,255,136,0.4)'; }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                            placeholder={hasSSID ? "SSID Oculto (Cole um novo para substituir)" : "Cole seu SSID aqui..."}
                            required={!hasSSID}
                        />
                    </div>

                    {/* Linha 2: Stake & Martingale */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                                Aposta Inicial ($)
                            </label>
                            <input
                                type="number" step="0.5" min="1"
                                value={stake}
                                onChange={e => setStake(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 font-mono focus:border-[#00FF88] border border-white/10 bg-black/30 outline-none transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                                Níveis de Martingale
                            </label>
                            <input
                                type="number" step="1" min="0" max="5"
                                value={martingaleSteps}
                                onChange={e => setMartingaleSteps(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 font-mono focus:border-[#00FF88] border border-white/10 bg-black/30 outline-none transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Linha 3: Take Profit & Stop Loss */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-[#00FF88] mb-2 uppercase tracking-wider">
                                Take Profit ($)
                            </label>
                            <input
                                type="number" step="1" min="1"
                                value={takeProfit}
                                onChange={e => setTakeProfit(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 font-mono focus:border-[#00FF88] border border-[#00FF88]/20 bg-black/30 outline-none transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-[#FF3B5C] mb-2 uppercase tracking-wider">
                                Stop Loss ($)
                            </label>
                            <input
                                type="number" step="1" min="1"
                                value={stopLoss}
                                onChange={e => setStopLoss(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 font-mono focus:border-[#FF3B5C] border border-[#FF3B5C]/20 bg-black/30 outline-none transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving || loading || (!hasSSID && !ssid.trim())}
                        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 uppercase tracking-wider mt-2"
                        style={{
                            background: saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #00FF88, #00C866)',
                            color: saving ? '#64748b' : '#000',
                            boxShadow: saving ? 'none' : '0 0 20px rgba(0,255,136,0.25)',
                            cursor: saving || (!hasSSID && !ssid.trim()) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {saving ? '⏳ Salvando Configurações...' : '🚀 Salvar Gestão de Risco'}
                    </button>
                </form>
            </div>
        </motion.div>
    );
}
