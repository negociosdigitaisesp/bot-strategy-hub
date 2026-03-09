import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Mail, AlertTriangle } from 'lucide-react';

interface IQOptionConnectionFormProps {
    onConnect: (email: string, pass: string) => Promise<{ success?: boolean; error?: string }>;
    loading: boolean;
    hasCredentials: boolean;
    savedEmail?: string;
}

export function IQOptionConnectionForm({ onConnect, loading, hasCredentials, savedEmail }: IQOptionConnectionFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;
        
        await onConnect(email.trim(), password.trim());
        setPassword(''); // Limpa a senha após enviar por segurança
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Aviso sobre 2FA */}
            <div className="bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="text-[#FFB800] shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="text-[13px] font-bold text-[#FFB800] mb-1">¡Atención Importante! Autenticación en 2 Pasos</h4>
                    <p className="text-xs text-[#FFB800]/80 leading-relaxed">
                        Si tu cuenta de IQ Option tiene activada la <strong>Autenticación de 2 Factores (2FA / SMS)</strong>, 
                        el motor HFT no podrá conectarse. Por favor, <strong>desactívala temporalmente</strong> en la configuración de seguridad de tu broker antes de conectar.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                        Correo Electrónico (E-mail)
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Mail size={16} />
                        </div>
                        <input
                            type="email"
                            required
                            placeholder="tucorreo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                        Contraseña
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <KeyRound size={16} />
                        </div>
                        <input
                            type="password"
                            required
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || (!email.trim() && !password.trim())}
                className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Conectando...
                    </span>
                ) : hasCredentials && savedEmail && (!email || (email === savedEmail)) ? (
                    'Actualizar Contraseña y Conectar'
                ) : (
                    'Conectar con IQ Option'
                )}
            </button>
            
            {hasCredentials && savedEmail && (
                <div className="text-center mt-3">
                    <p className="text-[11px] text-emerald-400/80 font-mono">
                        Última cuenta configurada: {savedEmail}
                    </p>
                </div>
            )}
        </form>
    );
}
