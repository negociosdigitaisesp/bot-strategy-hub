import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Flame, Sparkles, Shield, ArrowRight, Diamond, Star } from 'lucide-react';

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
}) => {
    const handleCheckout = () => {
        window.open(checkoutUrl, '_blank');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay, ease: 'easeOut' }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            className={`relative flex flex-col rounded-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 ${isPopular
                ? 'bg-gradient-to-b from-[#1a0a2e] via-[#12071f] to-[#0a0514] border-2 border-violet-500 shadow-2xl shadow-violet-500/30 scale-105 z-10'
                : isLifetime
                    ? 'bg-gradient-to-br from-[#1a0a2e] via-[#0f0520] to-[#0a0312] border-2 border-fuchsia-500/50 hover:border-fuchsia-400 hover:shadow-2xl hover:shadow-fuchsia-500/20'
                    : 'bg-gradient-to-b from-[#0f0a1a] to-[#080510] border border-violet-900/50 hover:border-violet-700/70 hover:shadow-xl hover:shadow-violet-900/30'
                }`}
        >
            {/* Popular Badge - Violet Theme */}
            {isPopular && (
                <div className="absolute -top-px left-0 right-0 flex justify-center z-20">
                    <div className="bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-500 text-white font-bold text-xs uppercase tracking-widest px-6 py-2 rounded-b-xl flex items-center gap-2 shadow-lg shadow-violet-500/40">
                        <Flame size={14} className="animate-pulse" />
                        <span>🔥 OFERTA SECRETA (AHORRA 85%)</span>
                    </div>
                </div>
            )}

            {/* Lifetime Diamond Crown */}
            {isLifetime && (
                <div className="absolute top-4 right-4 z-20">
                    <motion.div
                        animate={{
                            boxShadow: ['0 0 20px rgba(217,70,239,0.3)', '0 0 40px rgba(217,70,239,0.6)', '0 0 20px rgba(217,70,239,0.3)']
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-gradient-to-br from-fuchsia-500/30 to-violet-600/20 border border-fuchsia-400/50 rounded-full p-2.5"
                    >
                        <Diamond size={20} className="text-fuchsia-300" />
                    </motion.div>
                </div>
            )}

            {/* Shimmer Effect for Lifetime */}
            {isLifetime && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-fuchsia-400/10 to-transparent skew-x-12"
                    />
                </div>
            )}

            {/* Card Content */}
            <div className={`flex-1 flex flex-col p-8 ${isPopular ? 'pt-14' : ''}`}>
                {/* Title */}
                <h3 className={`text-lg font-bold uppercase tracking-wider mb-2 ${isPopular ? 'text-violet-300' : isLifetime ? 'text-fuchsia-300' : 'text-violet-200'
                    }`}>
                    {isLifetime && <span className="mr-2">💎</span>}
                    {title}
                </h3>

                {/* Subtitle */}
                <p className={`text-sm mb-6 ${isLifetime ? 'text-fuchsia-400/70' : 'text-violet-400/60'}`}>{subtitle}</p>

                {/* Price */}
                <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-mono font-bold tracking-tighter ${isPopular
                            ? 'bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent'
                            : isLifetime
                                ? 'bg-gradient-to-r from-fuchsia-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent'
                                : 'text-violet-200'
                            }`}>
                            {price}
                        </span>
                        <span className="text-violet-500/70 text-sm font-medium">{period}</span>
                    </div>
                </div>

                {/* Description */}
                <p className={`text-sm leading-relaxed mb-6 ${isLifetime ? 'text-violet-300/70' : 'text-violet-400/60'}`}>
                    {description}
                </p>

                {/* Features */}
                {features.length > 0 && (
                    <ul className="space-y-3 mb-8 flex-1">
                        {features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3 text-sm text-violet-200/80">
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${isPopular
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : isLifetime
                                        ? 'bg-fuchsia-500/20 text-fuchsia-300'
                                        : 'bg-violet-500/15 text-violet-400'
                                    }`}>
                                    <Check size={12} strokeWidth={3} />
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
                    className={`w-full py-4 px-6 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group ${isPopular
                        ? 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 text-white hover:shadow-lg hover:shadow-violet-500/40 hover:from-violet-500 hover:via-fuchsia-400 hover:to-violet-500'
                        : isLifetime
                            ? 'bg-gradient-to-r from-fuchsia-600/80 via-violet-500/80 to-fuchsia-600/80 text-white border border-fuchsia-400/30 hover:border-fuchsia-300/50 hover:shadow-lg hover:shadow-fuchsia-500/30 hover:from-fuchsia-500/90 hover:via-violet-400/90 hover:to-fuchsia-500/90'
                            : 'border-2 border-violet-600/50 text-violet-300 hover:bg-violet-600/10 hover:border-violet-500 hover:text-violet-200'
                        }`}
                >
                    {isPopular && <Zap size={16} />}
                    {isLifetime && <Diamond size={16} className="text-fuchsia-200" />}
                    <span>{buttonText}</span>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all duration-300" />
                </motion.button>
            </div>

            {/* Decorative Elements */}
            {isPopular && (
                <>
                    <div className="absolute top-0 left-0 w-32 h-32 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-fuchsia-500/15 rounded-full blur-2xl pointer-events-none" />
                </>
            )}
            {isLifetime && (
                <>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                    {/* Sparkle particles */}
                    <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute top-1/4 left-1/4 w-1 h-1 bg-fuchsia-300 rounded-full"
                    />
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                        className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-violet-300 rounded-full"
                    />
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
                        className="absolute bottom-1/3 left-1/2 w-1 h-1 bg-fuchsia-200 rounded-full"
                    />
                </>
            )}
        </motion.div>
    );
};

const PricingSection: React.FC = () => {
    const plans = [
        {
            title: 'MENSUAL',
            price: '$17',
            period: '/mes',
            subtitle: 'Sin compromiso',
            description: 'Acceso completo por 30 días. Ideal para probar la estrategia.',
            features: [
                'Desbloqueo Inmediato de Bots',
                'Sin Límites de Ganancia ($5)',
                'Acceso a Bug Deriv',
                'Acceso a Efecto Midas',
                'Soporte por WhatsApp',
            ],
            buttonText: 'Comenzar Mensual',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=c1pgsg6o',
            isPopular: false,
            isLifetime: false,
        },
        {
            title: 'PRO ANUAL',
            price: '$30',
            period: '/año',
            subtitle: 'Pagas menos de $3 al mes',
            description: 'Un solo Win paga tu año. Acceso ilimitado por 12 meses.',
            features: [
                'Desbloqueo Inmediato de Bots',
                'Sin Límites de Ganancia ($5)',
                'IP Dedicada (Anti-Bloqueo)',
                'Acceso a Efecto Midas & Bug Deriv',
                'Comunidad VIP',
                'Soporte Prioritario 24/7',
                'Actualizaciones Gratis',
                'Bots Premium Secretos',
            ],
            buttonText: 'OBTENER OFERTA ANUAL',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=zouponhf',
            isPopular: true,
            isLifetime: false,
        },
        {
            title: 'DIAMANTE VITALICIO',
            price: '$67',
            period: '/único',
            subtitle: '✨ Edición Founder - Acceso Eterno',
            description: 'Pago único. Sin renovaciones. Acceso de por vida a todas las funciones premium.',
            features: [
                'Acceso VITALICIO Garantizado',
                'Desbloqueo Total de Bots',
                'Sin Límites de Ganancia',
                'IP Dedicada (Anti-Bloqueo)',
                'Efecto Midas & Bug Deriv',
                'Badge Diamante Vitalicio 💎',
                'Comunidad VIP Exclusiva',
                'Soporte VIP de por vida',
            ],
            buttonText: 'DESBLOQUEAR NIVEL DIAMANTE 💎',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=5v9syrd5',
            isPopular: false,
            isLifetime: true,
        },
    ];

    return (
        <section className="relative py-20 px-4 md:px-8 overflow-hidden bg-gradient-to-b from-[#0a0514] via-[#0f0820] to-[#0a0514]">
            {/* Background Effects - Diamond Theme */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-violet-600/10 via-fuchsia-500/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-fuchsia-600/8 rounded-full blur-[100px]" />
                {/* Floating diamond particles */}
                <motion.div
                    animate={{ y: [0, -20, 0], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute top-1/3 left-1/5 w-2 h-2 bg-violet-400/30 rotate-45"
                />
                <motion.div
                    animate={{ y: [0, -15, 0], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                    className="absolute top-1/2 right-1/5 w-3 h-3 bg-fuchsia-400/30 rotate-45"
                />
                <motion.div
                    animate={{ y: [0, -25, 0], opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 6, repeat: Infinity, delay: 2 }}
                    className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-violet-300/30 rotate-45"
                />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <motion.div
                        animate={{
                            boxShadow: ['0 0 20px rgba(139,92,246,0.2)', '0 0 40px rgba(139,92,246,0.4)', '0 0 20px rgba(139,92,246,0.2)']
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600/20 via-fuchsia-500/20 to-violet-600/20 border border-violet-500/30 rounded-full px-5 py-2 mb-6"
                    >
                        <Diamond size={14} className="text-fuchsia-400" />
                        <span className="text-xs font-medium text-violet-300 uppercase tracking-wider">
                            Desbloquea el Nivel Diamante
                        </span>
                        <Diamond size={14} className="text-fuchsia-400" />
                    </motion.div>

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Elige tu{' '}
                        <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                            Acceso Premium
                        </span>
                    </h2>

                    <p className="text-violet-300/60 text-lg max-w-2xl mx-auto">
                        Desbloquea el poder de la automatización. Accede al nivel <span className="text-fuchsia-400 font-semibold">Diamante Vitalicio</span> y opera sin límites para siempre.
                    </p>
                </motion.div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 lg:gap-8 items-stretch">
                    {plans.map((plan, index) => (
                        <PricingCard
                            key={plan.title}
                            {...plan}
                            delay={index * 0.1}
                        />
                    ))}
                </div>

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="mt-16 flex flex-wrap items-center justify-center gap-8 text-violet-400/60 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <Shield size={16} className="text-violet-400" />
                        <span>Pago 100% Seguro</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-fuchsia-400" />
                        <span>Activación Inmediata</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check size={16} className="text-violet-400" />
                        <span>Garantía de 7 Días</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Diamond size={16} className="text-fuchsia-400" />
                        <span>Acceso Vitalicio Disponible</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default PricingSection;
