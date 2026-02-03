
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { ShieldAlert, Smartphone, Lock, CheckCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export const MandatoryWACapture = () => {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+51'); // Default Peru/Latam
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);

    // Countries common in Latam
    const countries = [
        { code: '+52', flag: '🇲🇽', name: 'México' },
        { code: '+57', flag: '🇨🇴', name: 'Colombia' },
        { code: '+54', flag: '🇦🇷', name: 'Argentina' },
        { code: '+51', flag: '🇵🇪', name: 'Perú' },
        { code: '+56', flag: '🇨🇱', name: 'Chile' },
        { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
        { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
        { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
        { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
        { code: '+504', flag: '🇭🇳', name: 'Honduras' },
        { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
        { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
        { code: '+507', flag: '🇵🇦', name: 'Panamá' },
        { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
        { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
        { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
        { code: '+1', flag: '🇺🇸', name: 'USA' },
        { code: '+34', flag: '🇪🇸', name: 'España' },
    ];

    useEffect(() => {
        const checkUserStatus = async () => {
            if (!user) return;

            try {
                // Fetch profile to check plan and whatsapp
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('plan_type, whatsapp_number')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error checando estado de usuario:', error);
                    return;
                }

                // LOGIC: Free User AND No WhatsApp => SHOW LOCK
                const isFree = !profile.plan_type || profile.plan_type === 'free';
                const hasNoPhone = !profile.whatsapp_number || profile.whatsapp_number.trim() === '';

                // Only target FREE users who haven't given their number
                if (isFree && hasNoPhone) {
                    setIsVisible(true);
                }
            } catch (err) {
                console.error('Error en captura obligatoria:', err);
            } finally {
                setLoadingConfig(false);
            }
        };

        checkUserStatus();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!phoneNumber || phoneNumber.length < 8) {
            toast.error('Por favor ingresa un número válido');
            return;
        }

        setIsSubmitting(true);
        const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`; // Clean number

        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Fake network feel

            const { error } = await supabase
                .from('profiles')
                .update({
                    whatsapp_number: fullNumber,
                    wa_status: 'pending_welcome'
                })
                .eq('id', user?.id);

            if (error) throw error;

            setIsSuccess(true);
            setTimeout(() => {
                setIsVisible(false); // Unlock screen
                toast.success("¡Protocolo validado! Acceso concedido.");
            }, 2000);

        } catch (error) {
            console.error('Error saving whatsapp:', error);
            toast.error('Error de conexión. Intenta nuevamente.');
            setIsSubmitting(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with heavy blur for Hard Lock feel */}
            <div className="absolute inset-0 bg-[#05050F]/90 backdrop-blur-xl transition-all duration-500"></div>

            {/* Modal Container */}
            <div className={`relative w-full max-w-md bg-[#0B0E14] border border-[#FFD700]/30 rounded-2xl shadow-[0_0_50px_rgba(255,215,0,0.15)] overflow-hidden transition-all duration-500 ${isSuccess ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>

                {/* Cyber-Gold Header Bar */}
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#FFD700] to-transparent"></div>

                <div className="p-8 flex flex-col items-center text-center relative z-10">

                    {/* Icon Halo */}
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 bg-[#FFD700]/20 blur-[30px] rounded-full"></div>
                        <div className="relative w-20 h-20 bg-[#0B0E14] border border-[#FFD700]/40 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                            <ShieldAlert size={40} className="text-[#FFD700] animate-pulse" />
                        </div>
                        {/* Lock Badge */}
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#0B0E14] border border-[#FFD700]/40 rounded-full flex items-center justify-center">
                            <Lock size={14} className="text-white" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-white mb-2 tracking-wide uppercase">
                        Validación Requerida
                    </h2>

                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        Para liberar el acceso al nuevo motor <strong className="text-[#FFD700]">Bug Deriv Scanner</strong> y garantizar la seguridad de tu cuenta, es necesario vincular tu WhatsApp de soporte.
                    </p>

                    {/* Benefit Box */}
                    <div className="w-full bg-[#FFD700]/5 border border-[#FFD700]/10 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <CheckCircle className="text-[#FFD700] shrink-0 mt-0.5" size={16} />
                        <div className="text-left">
                            <p className="text-[#FFD700] text-xs font-bold uppercase tracking-wider mb-0.5">Ventaja Exclusiva</p>
                            <p className="text-gray-400 text-xs">Recibirás alertas de seguridad y el cupón de lanzamiento directamente en tu móvil.</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        <div className="space-y-1 text-left">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider ml-1">Número de WhatsApp</label>
                            <div className="flex gap-2">
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="bg-[#050510] text-white border border-white/10 rounded-xl px-3 py-3 text-sm focus:border-[#FFD700] focus:outline-none focus:ring-1 focus:ring-[#FFD700]/50 transition-all appearance-none cursor-pointer hover:bg-white/5"
                                    style={{ maxWidth: '80px' }}
                                >
                                    {countries.map(country => (
                                        <option key={country.code} value={country.code}>
                                            {country.flag} {country.code}
                                        </option>
                                    ))}
                                </select>
                                <div className="relative flex-1">
                                    <input
                                        type="tel"
                                        placeholder="000 000 0000"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full bg-[#050510] text-white border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm font-mono focus:border-[#FFD700] focus:outline-none focus:ring-1 focus:ring-[#FFD700]/50 transition-all"
                                    />
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all duration-300 ${isSubmitting ? 'opacity-80 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                    <span>SINCRONIZANDO...</span>
                                </>
                            ) : (
                                <>
                                    <span>VALIDAR Y ACTIVAR</span>
                                    <ChevronRight size={18} className="text-black/70" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-4 flex items-center gap-2 justify-center opacity-40">
                        <Lock size={10} className="text-white" />
                        <span className="text-[10px] text-white tracking-widest uppercase">Encriptación de extremo a extremo</span>
                    </div>
                </div>
            </div>

            {/* Success Animation Overlay */}
            {isSuccess && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-in fade-in duration-300">
                    <div className="relative">
                        <div className="w-24 h-24 bg-[#FFD700]/20 rounded-full animate-ping absolute inset-0"></div>
                        <div className="w-24 h-24 bg-[#0B0E14] border-2 border-[#FFD700] rounded-full flex items-center justify-center relative shadow-[0_0_30px_rgba(255,215,0,0.5)]">
                            <CheckCircle size={48} className="text-[#FFD700]" />
                        </div>
                    </div>
                    <h3 className="text-[#FFD700] font-black text-xl mt-6 tracking-widest uppercase animate-pulse">
                        SCANNER DESBLOQUEADO
                    </h3>
                    <p className="text-white/60 text-sm mt-2 font-mono">Redirigiendo al sistema...</p>
                </div>
            )}
        </div>
    );
};
