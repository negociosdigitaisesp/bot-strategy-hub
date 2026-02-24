import React, { useState } from 'react';
import { toast } from 'sonner';

/**
 * IQBotCredentials — Formulario de configuración de la cuenta IQ Option.
 */
export default function IQBotCredentials({ config, onSave, onCancel }) {
    const [email, setEmail] = useState(config?.iq_email ?? '');
    const [password, setPassword] = useState(config?.iq_password ?? '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave({ iq_email: email, iq_password: password, stake_amount: Number(config?.stake_amount || 10) });
            toast.success('Credenciales de IQ Option guardadas correctamente');
            onCancel();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar credenciales');
        } finally {
            setIsLoading(false);
        }
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
                    <h3 className="font-bold text-white text-sm tracking-wide">Configuración de la Cuenta IQ Option</h3>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Tus credenciales se almacenan de forma segura en Supabase.
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
                        Correo Electrónico
                    </label>
                    <input
                        type="email"
                        style={inputStyle}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="tu-correo@ejemplo.com"
                        required
                    />
                </div>

                {/* Password */}
                <div>
                    <label
                        className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                        Contraseña
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
                        disabled={isLoading}
                        className="px-5 py-2 text-sm font-black rounded-lg transition-all duration-200"
                        style={{
                            background: 'linear-gradient(135deg,#00FF88,#00C866)',
                            color: '#000',
                            boxShadow: '0 0 20px rgba(0,255,136,0.3)',
                            letterSpacing: '0.04em',
                            opacity: isLoading ? 0.7 : 1,
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,136,0.5)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,136,0.3)'; }}
                    >
                        {isLoading ? 'Guardando...' : '✓ Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}
