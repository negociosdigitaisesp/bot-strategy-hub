import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Flame, Sparkles, Shield, ArrowRight } from 'lucide-react';

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
                    ? 'bg-gradient-to-b from-[#0F171A] to-[#0a1214] border-2 border-cyan-500 shadow-2xl shadow-cyan-500/20 scale-105 z-10'
                    : isLifetime
                        ? 'bg-[#0F171A] border border-amber-500/30 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10'
                        : 'bg-[#0F171A] border border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-slate-800/50'
                }`}
        >
            {/* Popular Badge */}
            {isPopular && (
                <div className="absolute -top-px left-0 right-0 flex justify-center z-20">
                    <div className="bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 text-black font-bold text-xs uppercase tracking-widest px-6 py-2 rounded-b-xl flex items-center gap-2 shadow-lg shadow-cyan-500/30">
                        <Flame size={14} className="animate-pulse" />
                        <span>🔥 AHORRA 75% - MEJOR OPCIÓN</span>
                    </div>
                </div>
            )}

            {/* Lifetime Crown */}
            {isLifetime && (
                <div className="absolute top-4 right-4 z-20">
                    <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-full p-2">
                        <Crown size={18} className="text-amber-400" />
                    </div>
                </div>
            )}

            {/* Card Content */}
            <div className={`flex-1 flex flex-col p-8 ${isPopular ? 'pt-14' : ''}`}>
                {/* Title */}
                <h3 className={`text-lg font-bold uppercase tracking-wider mb-2 ${isPopular ? 'text-cyan-400' : isLifetime ? 'text-amber-400' : 'text-white'
                    }`}>
                    {title}
                </h3>

                {/* Subtitle */}
                <p className="text-sm text-slate-500 mb-6">{subtitle}</p>

                {/* Price */}
                <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-mono font-bold tracking-tighter ${isPopular ? 'text-cyan-400' : isLifetime ? 'text-amber-400' : 'text-white'
                            }`}>
                            {price}
                        </span>
                        <span className="text-slate-500 text-sm font-medium">{period}</span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {description}
                </p>

                {/* Features */}
                {features.length > 0 && (
                    <ul className="space-y-3 mb-8 flex-1">
                        {features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3 text-sm text-slate-300">
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${isPopular ? 'bg-cyan-500/20 text-cyan-400' : isLifetime ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
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
                            ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black hover:shadow-lg hover:shadow-cyan-500/40'
                            : isLifetime
                                ? 'border-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20'
                                : 'border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400'
                        }`}
                >
                    {isPopular && <Zap size={16} />}
                    {isLifetime && <Sparkles size={16} />}
                    <span>{buttonText}</span>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all duration-300" />
                </motion.button>
            </div>

            {/* Decorative Elements */}
            {isPopular && (
                <>
                    <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                </>
            )}
            {isLifetime && (
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            )}
        </motion.div>
    );
};

const PricingSection: React.FC = () => {
    const plans = [
        {
            title: 'Trader Mensual',
            price: '$10',
            period: '/mes',
            subtitle: 'Prueba y Valida',
            description: 'Acceso completo por 30 días. Ideal para probar la estrategia.',
            features: [
                'Acceso a todos los bots',
                'Análisis de mercado en vivo',
                'Soporte por WhatsApp',
                'Actualizaciones incluidas',
            ],
            buttonText: 'Comenzar Ahora',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=c1pgsg6o',
            isPopular: false,
            isLifetime: false,
        },
        {
            title: 'Pro Anual',
            price: '$30',
            period: '/año',
            subtitle: 'Equivale a $2.50/mes',
            description: '12 meses de operaciones ilimitadas. Maximiza tu retorno.',
            features: [
                'Todo del plan Mensual',
                'Ahorro del 75%',
                'Prioridad en nuevos bots',
                'Acceso a comunidad VIP',
                'Soporte prioritario 24/7',
            ],
            buttonText: 'Obtener Pro Anual',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=zouponhf',
            isPopular: true,
            isLifetime: false,
        },
        {
            title: 'Lifetime License',
            price: '$60',
            period: '/único',
            subtitle: 'Edición Founder',
            description: 'Pago único. Acceso vitalicio sin renovaciones futuras.',
            features: [
                'Todo del plan Pro',
                'Acceso de por vida',
                'Badge de Founder',
                'Nuevas funciones gratis',
                'Soporte VIP exclusivo',
                'Sin pagos recurrentes',
            ],
            buttonText: 'Ser Founder',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=5v9syrd5',
            isPopular: false,
            isLifetime: true,
        },
    ];

    return (
        <section className="relative py-20 px-4 md:px-8 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px]" />
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
                    <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-6">
                        <Shield size={14} className="text-cyan-400" />
                        <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                            Planes Flexibles
                        </span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Elige tu{' '}
                        <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                            Acceso Premium
                        </span>
                    </h2>

                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Desbloquea el poder de la automatización. Todos los planes incluyen acceso completo a nuestros bots de alta asertividad.
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
                    className="mt-16 flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <Shield size={16} className="text-emerald-500" />
                        <span>Pago 100% Seguro</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-cyan-500" />
                        <span>Activación Inmediata</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-500" />
                        <span>Garantía de 7 Días</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default PricingSection;
