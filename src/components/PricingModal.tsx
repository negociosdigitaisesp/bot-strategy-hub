import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Crown, Flame, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { usePricingModal } from '../contexts/PricingModalContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface PricingCardProps {
    title: string;
    price: string;
    period: string;
    subtitle: string;
    description: string;
    features?: string[];
    buttonText: string;
    checkoutUrl: string;
    isPopular?: boolean;
    isLifetime?: boolean;
    delay?: number;
    affiliateId?: string | null;
}

const PricingCard: React.FC<PricingCardProps> = ({
    title,
    price,
    period,
    subtitle,
    description,
    features = [],
    buttonText,
    checkoutUrl,
    isPopular = false,
    isLifetime = false,
    delay = 0,
    affiliateId,
}) => {
    const handleCheckout = () => {
        // Build URL with affiliate tracking if available
        let url = checkoutUrl;
        if (affiliateId) {
            // Hotmart uses 'sck' (source key) for affiliate tracking
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}sck=${affiliateId}`;
            console.log('[Checkout] Affiliate tracking added:', affiliateId);
        }
        window.open(url, '_blank');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: isPopular ? 1.02 : 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, delay, ease: 'easeOut' }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative flex flex-col rounded-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 ${isPopular
                ? 'bg-gradient-to-b from-[#0F171A] to-[#0a1214] border-2 border-cyan-500 shadow-2xl shadow-cyan-500/30 z-10'
                : isLifetime
                    ? 'bg-[#0F171A] border border-amber-500/40 hover:border-amber-500/70 hover:shadow-xl hover:shadow-amber-500/15'
                    : 'bg-[#0F171A] border border-slate-700 hover:border-slate-600 hover:shadow-xl hover:shadow-slate-800/50'
                }`}
        >
            {/* Popular Badge */}
            {isPopular && (
                <div className="absolute -top-px left-0 right-0 flex justify-center z-20">
                    <div className="bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-b-lg flex items-center gap-1.5 shadow-lg shadow-cyan-500/30">
                        <Flame size={12} className="animate-pulse" />
                        <span>🔥 AHORRA 75%</span>
                    </div>
                </div>
            )}

            {/* Lifetime Crown */}
            {isLifetime && (
                <div className="absolute top-3 right-3 z-20">
                    <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-full p-1.5">
                        <Crown size={14} className="text-amber-400" />
                    </div>
                </div>
            )}

            {/* Card Content */}
            <div className={`flex-1 flex flex-col p-5 ${isPopular ? 'pt-10' : ''}`}>
                {/* Title */}
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${isPopular ? 'text-cyan-400' : isLifetime ? 'text-amber-400' : 'text-white'
                    }`}>
                    {title}
                </h3>

                {/* Subtitle */}
                <p className="text-xs text-slate-500 mb-4">{subtitle}</p>

                {/* Price */}
                <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-mono font-bold tracking-tighter ${isPopular ? 'text-cyan-400' : isLifetime ? 'text-amber-400' : 'text-white'
                            }`}>
                            {price}
                        </span>
                        <span className="text-slate-500 text-xs font-medium">{period}</span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                    {description}
                </p>

                {/* Features */}
                {features.length > 0 && (
                    <ul className="space-y-2 mb-5 flex-1">
                        {features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-xs text-slate-300">
                                <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${isPopular ? 'bg-cyan-500/20 text-cyan-400' : isLifetime ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                                    }`}>
                                    <Check size={10} strokeWidth={3} />
                                </div>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* CTA Button */}
                <motion.button
                    onClick={handleCheckout}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group ${isPopular
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black hover:shadow-lg hover:shadow-cyan-500/40'
                        : isLifetime
                            ? 'border-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20'
                            : 'border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400'
                        }`}
                >
                    {isPopular && <Zap size={14} />}
                    {isLifetime && <Sparkles size={14} />}
                    <span>{buttonText}</span>
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all duration-300" />
                </motion.button>
            </div>

            {/* Decorative Elements */}
            {isPopular && (
                <>
                    <div className="absolute top-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                </>
            )}
        </motion.div>
    );
};

const PricingModal: React.FC = () => {
    const { isOpen, closePricingModal } = usePricingModal();
    const { user } = useAuth();
    const [affiliateId, setAffiliateId] = useState<string | null>(null);

    // Fetch affiliate ID from user's referred_by
    useEffect(() => {
        const fetchAffiliateId = async () => {
            if (!user?.id) return;

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('referred_by')
                    .eq('id', user.id)
                    .single();

                if (!error && data?.referred_by) {
                    setAffiliateId(data.referred_by);
                    console.log('[PricingModal] Affiliate ID loaded:', data.referred_by);
                }
            } catch (err) {
                console.error('[PricingModal] Error fetching affiliate:', err);
            }
        };

        if (isOpen) {
            fetchAffiliateId();
        }
    }, [user?.id, isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closePricingModal();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, closePricingModal]);

    const plans = [
        {
            title: 'Mensual',
            price: '$17',
            period: '/mes',
            subtitle: 'Prueba y Valida',
            description: 'Acceso completo por 30 días. Ideal para probar la estrategia.',
            features: [
                'Acesso a todos los bots',
                'Acceso ao Ranking de Assertividade',
                'Bug Reset Ilimitado',
                'Efecto Midas Ilimitado',
                'Acceso a Comunidad Trader Millonario',
                'Suporte Via Premium Whatsapp',
            ],
            buttonText: 'Comenzar',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=c1pgsg6o',
            isPopular: false,
            isLifetime: false,
        },
        {
            title: 'Pro Anual',
            price: '$24',
            period: '/año',
            subtitle: 'Equivale a $2.00/mes',
            description: '12 meses de operaciones ilimitadas. Maximiza tu retorno (OFERTA RELÁMPAGO).',
            features: [
                'Acesso a todos los bots',
                'Acceso ao Ranking de Assertividade',
                'Bug Reset Ilimitado',
                'Efecto Midas Ilimitado',
                'Acceso a Comunidad Trader Millonario',
                'Suporte Via Premium Whatsapp',
                'Acesso a todas as atualizaçoes',
                'Acesso a Robôs (Bugs) Premium - Secreto',
                'Ahorro del 80%',
                'Comunidad VIP',
                'Soporte prioritario',
            ],
            buttonText: 'Obtener Pro Limitado',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=itafpp2z',
            isPopular: true,
            isLifetime: false,
        },
        {
            title: 'Vitalicio',
            price: '$67',
            period: '/único',
            subtitle: 'Edición Founder',
            description: 'Pago único. Acceso vitalicio sin renovaciones.',
            features: [
                'Acesso a todos los bots',
                'Acceso ao Ranking de Assertividade',
                'Bug Reset Ilimitado',
                'Efecto Midas Ilimitado',
                'Acceso a Comunidad Trader Millonario',
                'Suporte Via Premium Whatsapp',
                'Acesso a todas as atualizaçoes',
                'Acesso a Robôs (Bugs) Premium - Secreto',
                'Sin pagos recurrentes',
                'Comunidad VIP',
                'Soporte prioritario',
            ],
            buttonText: 'Ser Founder',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=5v9syrd5',
            isPopular: false,
            isLifetime: true,
        },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={closePricingModal}
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-800 shadow-2xl"
                    >
                        {/* Close Button */}
                        <button
                            onClick={closePricingModal}
                            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                        >
                            <X size={20} />
                        </button>

                        {/* Background Effects */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                            <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
                            <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px]" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 p-6 md:p-8">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-4">
                                    <Shield size={14} className="text-cyan-400" />
                                    <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                                        Desbloquea Todo
                                    </span>
                                </div>

                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                    Elige tu{' '}
                                    <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                                        Acceso Premium
                                    </span>
                                </h2>

                                <p className="text-slate-400 text-sm max-w-lg mx-auto">
                                    Desbloquea bots de alta asertividad y maximiza tus resultados.
                                </p>
                            </div>

                            {/* Pricing Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-3 lg:gap-4">
                                {plans.map((plan, index) => (
                                    <PricingCard
                                        key={plan.title}
                                        {...plan}
                                        delay={index * 0.08}
                                        affiliateId={affiliateId}
                                    />
                                ))}
                            </div>

                            {/* Trust Badges */}
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-slate-500 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <Shield size={14} className="text-emerald-500" />
                                    <span>Pago Seguro</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Zap size={14} className="text-cyan-500" />
                                    <span>Activación Inmediata</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Check size={14} className="text-emerald-500" />
                                    <span>Garantía 7 Días</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PricingModal;
