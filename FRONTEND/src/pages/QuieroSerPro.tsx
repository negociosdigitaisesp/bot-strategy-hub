import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Gem, Flame, Shield, ArrowRight } from 'lucide-react';

interface PricingCardProps {
    title: string;
    price: string;
    period: string;
    subtitle: string;
    description: string;
    features?: string[];
    buttonText: string;
    checkoutUrl: string;
    isHero?: boolean;
    isDiamond?: boolean;
    badge?: string;
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
    isHero = false,
    isDiamond = false,
    badge,
    delay = 0,
}) => {
    const handleCheckout = () => {
        window.open(checkoutUrl, '_blank');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -8, scale: isHero ? 1.02 : 1, transition: { duration: 0.3 } }}
            className={`relative flex flex-col rounded-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 ${isHero
                ? 'bg-gradient-to-b from-[#0F171A] to-[#0a1214] border-2 border-cyan-500 shadow-2xl shadow-cyan-500/30 scale-105 z-10'
                : isDiamond
                    ? 'bg-[#0F171A] border border-amber-500/40 hover:border-amber-500/70 hover:shadow-xl hover:shadow-amber-500/20'
                    : 'bg-[#0F171A] border border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-slate-800/50'
                }`}
        >
            {/* Badge */}
            {badge && (
                <div className="absolute -top-px left-0 right-0 flex justify-center z-20">
                    <div className="bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-b-lg flex items-center gap-1.5 shadow-lg shadow-cyan-500/30">
                        <Flame size={12} className="animate-pulse" />
                        <span>{badge}</span>
                    </div>
                </div>
            )}

            {/* Diamond Icon */}
            {isDiamond && (
                <div className="absolute top-3 right-3 z-20">
                    <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-full p-1.5">
                        <Gem size={14} className="text-amber-400" />
                    </div>
                </div>
            )}

            {/* Card Content */}
            <div className={`flex-1 flex flex-col p-8 ${badge ? 'pt-12' : ''}`}>
                {/* Title */}
                <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-lg font-bold uppercase tracking-wider ${isHero ? 'text-cyan-400' : isDiamond ? 'text-amber-400' : 'text-white'
                        }`}>
                        {title}
                    </h3>
                    {isDiamond && <Gem size={18} className="text-amber-400" />}
                </div>

                {/* Subtitle */}
                <p className="text-sm text-slate-500 mb-6">{subtitle}</p>

                {/* Price */}
                <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-mono font-bold tracking-tighter ${isHero ? 'text-cyan-400' : isDiamond ? 'text-amber-400' : 'text-white'
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
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${isHero ? 'bg-cyan-500/20 text-cyan-400' : isDiamond ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
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
                    className={`w-full py-4 px-6 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group ${isHero
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black hover:shadow-lg hover:shadow-cyan-500/40'
                        : isDiamond
                            ? 'border-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20'
                            : 'border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400'
                        }`}
                >
                    {isHero && <Zap size={16} />}
                    {isDiamond && <Gem size={16} />}
                    <span>{buttonText}</span>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all duration-300" />
                </motion.button>
            </div>

            {/* Decorative Elements */}
            {isHero && (
                <>
                    <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                </>
            )}
            {isDiamond && (
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            )}
        </motion.div>
    );
};

const QuieroSerPro: React.FC = () => {
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
            isHero: false,
            isDiamond: false,
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
            isHero: true,
            isDiamond: false,
            badge: '🔥 OFERTA SECRETA (AHORRA 85%)',
        },
        {
            title: 'DIAMANTE',
            price: '$67',
            period: '/único',
            subtitle: 'Edición Founder - Acceso Total',
            description: 'Pago único. Acceso vitalicio sin renovaciones futuras.',
            features: [
                'Desbloqueo Inmediato de Bots',
                'Sin Límites de Ganancia ($5)',
                'IP Dedicada (Anti-Bloqueo)',
                'Acceso a Efecto Midas & Bug Deriv',
                'Sin Pagos Recurrentes',
                'Badge de Founder',
                'Comunidad VIP Exclusiva',
                'Soporte VIP Prioritario',
            ],
            buttonText: 'SER DIAMANTE 💎',
            checkoutUrl: 'https://pay.hotmart.com/Q103866199O?off=5v9syrd5',
            isHero: false,
            isDiamond: true,
        },
    ];

    return (
        <section className="relative min-h-screen py-20 px-4 md:px-8 overflow-hidden bg-[#020617]">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/3 via-emerald-500/3 to-amber-500/3 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-12"
                >
                    {/* Urgency Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-full px-4 py-2 mb-6"
                    >
                        <Flame size={16} className="text-orange-400 animate-pulse" />
                        <span className="text-sm font-bold text-orange-300 uppercase tracking-wider">
                            ⚡ Oferta Limitada - Solo para Suscriptores
                        </span>
                    </motion.div>

                    {/* Main Headline */}
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
                        Desbloquea el{' '}
                        <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                            Poder Total
                        </span>
                        <br />
                        de Million Bots
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-8 leading-relaxed">
                        Accede a estrategias probadas que generan resultados consistentes.{' '}
                        <span className="text-emerald-400 font-semibold">Sin límites. Sin restricciones.</span>
                    </p>

                    {/* Social Proof Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="flex flex-wrap items-center justify-center gap-8 mb-12"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-slate-400 text-sm">
                                <span className="text-emerald-400 font-bold text-lg">1,247+</span> usuarios activos
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                            <span className="text-slate-400 text-sm">
                                <span className="text-cyan-400 font-bold text-lg">$2.4M+</span> generados
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            <span className="text-slate-400 text-sm">
                                <span className="text-amber-400 font-bold text-lg">94%</span> tasa de éxito
                            </span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Pricing Header */}
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
                            Planes Diseñados Para Tu Éxito
                        </span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Elige tu{' '}
                        <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                            Acceso Premium
                        </span>
                    </h2>

                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Todos los planes incluyen acceso completo a bots de alta asertividad y soporte dedicado.
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

                {/* Comparison Table */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="mt-20"
                >
                    <div className="text-center mb-10">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            Comparación{' '}
                            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                                Detallada
                            </span>
                        </h3>
                        <p className="text-slate-400">
                            Todos los planes incluyen acceso completo, elige según tu compromiso
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[600px] bg-[#0F171A] border border-slate-800 rounded-2xl overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-4 gap-4 p-6 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-slate-700">
                                <div className="text-slate-400 font-semibold text-sm">Característica</div>
                                <div className="text-center">
                                    <div className="text-white font-bold text-sm">MENSUAL</div>
                                    <div className="text-cyan-400 text-xs mt-1">$17/mes</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-cyan-400 font-bold text-sm flex items-center justify-center gap-1">
                                        PRO ANUAL
                                        <Flame size={12} className="text-orange-400" />
                                    </div>
                                    <div className="text-emerald-400 text-xs mt-1">$30/año</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-amber-400 font-bold text-sm flex items-center justify-center gap-1">
                                        DIAMANTE
                                        <Gem size={12} />
                                    </div>
                                    <div className="text-amber-400 text-xs mt-1">$67 único</div>
                                </div>
                            </div>

                            {/* Table Rows */}
                            {[
                                { feature: 'Acceso a Todos los Bots', mensual: true, anual: true, diamante: true },
                                { feature: 'Sin Límites de Ganancia', mensual: true, anual: true, diamante: true },
                                { feature: 'Bug Deriv & Efecto Midas', mensual: true, anual: true, diamante: true },
                                { feature: 'Soporte WhatsApp', mensual: true, anual: true, diamante: true },
                                { feature: 'IP Dedicada (Anti-Bloqueo)', mensual: false, anual: true, diamante: true },
                                { feature: 'Comunidad VIP', mensual: false, anual: true, diamante: true },
                                { feature: 'Soporte Prioritario 24/7', mensual: false, anual: true, diamante: true },
                                { feature: 'Bots Premium Secretos', mensual: false, anual: true, diamante: true },
                                { feature: 'Badge de Founder', mensual: false, anual: false, diamante: true },
                                { feature: 'Sin Pagos Recurrentes', mensual: false, anual: false, diamante: true },
                                { feature: 'Acceso Vitalicio', mensual: false, anual: false, diamante: true },
                            ].map((row, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.05, duration: 0.3 }}
                                    className={`grid grid-cols-4 gap-4 p-4 border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors ${index % 2 === 0 ? 'bg-slate-900/10' : ''
                                        }`}
                                >
                                    <div className="text-slate-300 text-sm">{row.feature}</div>
                                    <div className="flex justify-center">
                                        {row.mensual ? (
                                            <Check size={18} className="text-emerald-400" />
                                        ) : (
                                            <span className="text-slate-600 text-xs">—</span>
                                        )}
                                    </div>
                                    <div className="flex justify-center">
                                        {row.anual ? (
                                            <Check size={18} className="text-cyan-400" />
                                        ) : (
                                            <span className="text-slate-600 text-xs">—</span>
                                        )}
                                    </div>
                                    <div className="flex justify-center">
                                        {row.diamante ? (
                                            <Check size={18} className="text-amber-400" />
                                        ) : (
                                            <span className="text-slate-600 text-xs">—</span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>

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

                {/* FAQ Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="mt-24 mb-20"
                >
                    <div className="text-center mb-12">
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Preguntas{' '}
                            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                                Frecuentes
                            </span>
                        </h3>
                        <p className="text-slate-400 text-lg">
                            Resolvemos tus dudas antes de que comiences
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        {[
                            {
                                q: '¿Cuánto tiempo tarda en activarse mi acceso?',
                                a: 'Tu acceso se activa de forma INMEDIATA después del pago. Recibirás un email con tus credenciales en menos de 2 minutos.',
                            },
                            {
                                q: '¿Necesito experiencia previa en trading?',
                                a: 'No. Nuestros bots están diseñados para ser 100% automáticos. Solo necesitas conectar tu cuenta Deriv y activar el bot que prefieras.',
                            },
                            {
                                q: '¿Cuál es la diferencia entre los planes?',
                                a: 'Todos los planes incluyen acceso completo a los bots. La diferencia está en la duración: Mensual (30 días), Anual (12 meses con 85% descuento), y Diamante (acceso vitalicio sin renovaciones).',
                            },
                            {
                                q: '¿Hay límites de ganancia?',
                                a: 'NO. Los planes Premium eliminan completamente el límite de $5 del plan gratuito. Puedes operar sin restricciones.',
                            },
                            {
                                q: '¿Qué pasa si no me funciona?',
                                a: 'Tienes 7 días de garantía. Si no estás satisfecho, te devolvemos el 100% de tu dinero sin preguntas.',
                            },
                            {
                                q: '¿Puedo cambiar de plan después?',
                                a: 'Sí. Puedes actualizar tu plan en cualquier momento desde tu panel de control.',
                            },
                        ].map((faq, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.4 }}
                                className="bg-[#0F171A] border border-slate-800 rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300"
                            >
                                <h4 className="text-white font-semibold mb-3 flex items-start gap-3">
                                    <span className="text-cyan-400 flex-shrink-0">Q:</span>
                                    <span>{faq.q}</span>
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed pl-8">
                                    {faq.a}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Final CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="relative mt-24 rounded-3xl overflow-hidden"
                >
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-emerald-500/10 to-amber-500/10 backdrop-blur-xl" />
                    <div className="absolute inset-0 bg-[#0F171A]/80" />

                    {/* Animated border */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 opacity-30 animate-pulse"
                        style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '2px' }} />

                    <div className="relative z-10 p-12 text-center">
                        <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-full px-4 py-2 mb-6"
                        >
                            <Flame size={16} className="text-red-400" />
                            <span className="text-sm font-bold text-red-300 uppercase tracking-wider">
                                ⏰ Esta oferta expira pronto
                            </span>
                        </motion.div>

                        <h3 className="text-4xl md:text-5xl font-black text-white mb-4">
                            ¿Listo para{' '}
                            <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                Multiplicar tus Resultados
                            </span>
                            ?
                        </h3>

                        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                            Únete a miles de traders que ya están generando resultados consistentes con Million Bots.
                        </p>

                        <motion.button
                            onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
                            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(6, 182, 212, 0.4)' }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 text-black font-bold text-lg px-12 py-5 rounded-xl uppercase tracking-wider transition-all duration-300 inline-flex items-center gap-3 shadow-2xl shadow-cyan-500/30"
                        >
                            <Zap size={24} />
                            <span>Ver Planes Ahora</span>
                            <ArrowRight size={24} />
                        </motion.button>

                        <p className="text-slate-500 text-sm mt-6">
                            💳 Pago seguro • ⚡ Acceso inmediato • 🛡️ Garantía de 7 días
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default QuieroSerPro;
