import React, { useState } from 'react';

/**
 * IQBotCredentials — Formulário de configuração da conta IQ Option.
 */
export default function IQBotCredentials({ config, onSave, onCancel }) {
    const [email, setEmail] = useState(config?.iq_email ?? '');
    const [password, setPassword] = useState(config?.iq_password ?? '');
    const [stakeAmount, setStakeAmount] = useState(config?.stake_amount ?? 10.00);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ iq_email: email, iq_password: password, stake_amount: parseFloat(stakeAmount) || 10 });
        onCancel();
    };

    const inputStyle = {
        width: '100%',
        background: 'rgba(5,10,20,0.7)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '10px 14px',
        color: '#e2e8f0',
        fontFamily: "'Inter', sans-serif",
        fontSize: '13px',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    };

    const handleFocus = (e) => {
        e.target.style.borderColor = 'rgba(0,255,136,0.5)';
        e.target.style.boxShadow = '0 0 0 3px rgba(0,255,136,0.08)';
    };
    const handleBlur = (e) => {
        e.target.style.borderColor = 'rgba(255,255,255,0.08)';
        e.target.style.boxShadow = 'none';
    };

    return (
        <div
            className="rounded-xl p-5 iq-slide-down"
            style={{
                background: 'rgba(15,23,42,0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-black"
                    style={{ background: 'linear-gradient(135deg,#00FF88,#00B4FF)' }}
                >
                    🔑
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm tracking-wide">Configurações da Conta IQ Option</h3>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Suas credenciais são armazenadas de forma segura no Supabase.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                    <label
                        className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                        Email IQ Option
                    </label>
                    <input
                        type="email"
                        style={inputStyle}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="seuemail@exemplo.com"
                        required
                    />
                </div>

                {/* Password */}
                <div>
                    <label
                        className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                        Senha IQ Option
                    </label>
                    <input
                        type="password"
                        style={inputStyle}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="••••••••"
                        required
                    />
                </div>

                {/* Stake Amount */}
                <div>
                    <label
                        className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                        Valor de Entrada (Stake)
                    </label>
                    <div className="relative">
                        <span
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}
                        >
                            R$
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            min="1"
                            style={{ ...inputStyle, paddingLeft: '36px' }}
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            required
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                        style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)',
                            background: 'transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-5 py-2 text-sm font-black rounded-lg transition-all duration-200"
                        style={{
                            background: 'linear-gradient(135deg,#00FF88,#00C866)',
                            color: '#000',
                            boxShadow: '0 0 20px rgba(0,255,136,0.3)',
                            letterSpacing: '0.04em',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,136,0.5)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,136,0.3)'; }}
                    >
                        ✓ Salvar
                    </button>
                </div>
            </form>
        </div>
    );
}
