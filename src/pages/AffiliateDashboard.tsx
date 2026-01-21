import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Copy, Check, DollarSign, Users, TrendingUp, Wallet, Handshake, ExternalLink, Sparkles, Gift, ArrowRight, Shield, Zap } from 'lucide-react';
import { useAffiliate } from '../hooks/useAffiliate';
import { WithdrawalModal } from '../components/WithdrawalModal';
import { toast } from 'sonner';

const AffiliateDashboard = () => {
    const { affiliateCode, affiliateBalance, totalEarnings, referredCount, isLoading, refreshData } = useAffiliate();
    const [copied, setCopied] = useState(false);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    const affiliateLink = affiliateCode
        ? `${window.location.origin}/ref/${affiliateCode}`
        : 'Generando...';

    const MIN_WITHDRAWAL = 20;
    const canWithdraw = affiliateBalance >= MIN_WITHDRAWAL;
    const remainingToWithdraw = Math.max(0, MIN_WITHDRAWAL - affiliateBalance);
    const progressPercent = Math.min(100, (affiliateBalance / MIN_WITHDRAWAL) * 100);

    const handleCopy = () => {
        if (!affiliateCode) return;
        navigator.clipboard.writeText(affiliateLink);
        setCopied(true);
        toast.success('¡Enlace copiado!');
        setTimeout(() => setCopied(false), 2500);
    };

    // Animation variants - optimized for mobile
    const fadeIn = {
        hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: prefersReducedMotion ? 0 : 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
        }
    };

    const stagger = {
        visible: {
            transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 }
        }
    };

    const scaleIn = {
        hidden: { opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeOut' }
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#06070A] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Cargando...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#06070A] text-white overflow-x-hidden">
            {/* Subtle Background - CSS only, no blur on mobile */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-emerald-950/20 via-transparent to-transparent" />
                <div className="hidden md:block absolute top-20 right-[15%] w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-3xl" />
                <div className="hidden md:block absolute bottom-20 left-[10%] w-[300px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-2xl" />
            </div>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="relative z-10 max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-5 md:space-y-8"
            >
                {/* Header - Compact & Premium */}
                <motion.header variants={fadeIn} className="text-center space-y-3 md:space-y-4">
                    <motion.div
                        variants={scaleIn}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                    >
                        <Handshake size={14} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                            Programa de Socios
                        </span>
                    </motion.div>

                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                        Gana{' '}
                        <span className="relative inline-block">
                            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                                60%
                            </span>
                            <motion.span
                                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
                            />
                        </span>
                        {' '}de Comisión
                    </h1>

                    <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                        Invita traders a Million Bots y recibe comisiones por cada venta.
                    </p>
                </motion.header>

                {/* Referral Link Card - Hero */}
                <motion.div variants={fadeIn} className="group">
                    <div className="relative p-5 md:p-6 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800/80 overflow-hidden">
                        {/* Subtle shimmer effect - desktop only */}
                        <div className="hidden md:block absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-semibold text-white">Tu Enlace Exclusivo</h3>
                                    <p className="text-xs text-slate-500">Comparte en redes, grupos o comunidades</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="flex-1 px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl font-mono text-xs md:text-sm text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none">
                                    {affiliateLink}
                                </div>
                                <motion.button
                                    onClick={handleCopy}
                                    disabled={!affiliateCode}
                                    whileTap={{ scale: 0.97 }}
                                    className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                    <span className="hidden sm:inline">{copied ? '¡Copiado!' : 'Copiar'}</span>
                                </motion.button>
                            </div>

                            <div className="flex items-center gap-2 mt-4 text-xs text-emerald-400/80">
                                <Gift size={14} />
                                <span>Ganas <strong className="text-emerald-300">60%</strong> de cada venta realizada con este enlace</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid - Clean & Minimal */}
                <motion.div variants={fadeIn} className="grid grid-cols-3 gap-2 md:gap-4">
                    {[
                        {
                            label: 'Comisiones',
                            value: `$${totalEarnings.toFixed(2)}`,
                            sublabel: 'Total ganado',
                            icon: TrendingUp,
                            color: 'amber'
                        },
                        {
                            label: 'Referidos',
                            value: referredCount,
                            sublabel: 'Socios activos',
                            icon: Users,
                            color: 'blue'
                        },
                        {
                            label: 'Disponible',
                            value: `$${affiliateBalance.toFixed(2)}`,
                            sublabel: 'Para retirar',
                            icon: DollarSign,
                            color: 'emerald'
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            variants={scaleIn}
                            className="relative p-3 md:p-5 rounded-xl md:rounded-2xl bg-slate-900/60 border border-slate-800/60 overflow-hidden group"
                        >
                            {/* Icon background - subtle */}
                            <stat.icon
                                size={60}
                                className={`absolute -right-2 -bottom-2 opacity-[0.03] text-${stat.color}-500`}
                            />

                            <div className="relative z-10">
                                <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                                <p className={`text-lg md:text-2xl font-bold font-mono text-${stat.color === 'amber' ? 'amber-400' : stat.color === 'blue' ? 'cyan-400' : 'emerald-400'}`}>
                                    {stat.value}
                                </p>
                                <p className="text-[9px] md:text-[10px] text-slate-600 mt-0.5">{stat.sublabel}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Withdrawal Section - Premium */}
                <motion.div variants={fadeIn}>
                    <div className="relative p-5 md:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/60 overflow-hidden">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-white">Retirar Comisiones</h3>
                                <p className="text-xs text-slate-500">USDT • Red TRC20</p>
                            </div>
                        </div>

                        {canWithdraw ? (
                            <motion.button
                                onClick={() => setShowWithdrawalModal(true)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="w-full py-3.5 md:py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <Wallet size={18} />
                                SOLICITAR RETIRO
                                <ArrowRight size={16} className="ml-1" />
                            </motion.button>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Mínimo: $20.00 USDT</span>
                                    <span className="text-emerald-400 font-medium">
                                        Faltan ${remainingToWithdraw.toFixed(2)}
                                    </span>
                                </div>

                                {/* Premium progress bar */}
                                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />
                                </div>

                                <button
                                    disabled
                                    className="w-full py-3.5 bg-slate-800/50 text-slate-600 text-sm font-medium rounded-xl cursor-not-allowed"
                                >
                                    Disponible a partir de $20
                                </button>
                            </div>
                        )}

                        <p className="text-[10px] text-slate-600 mt-4 text-center flex items-center justify-center gap-1">
                            <Shield size={10} />
                            Pagos procesados manualmente en 24h
                        </p>
                    </div>
                </motion.div>

                {/* Info Section - Compact */}
                <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="p-4 md:p-5 rounded-xl bg-slate-900/40 border border-slate-800/50">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap size={16} className="text-emerald-400" />
                            <h4 className="text-sm font-semibold text-white">Cómo Funciona</h4>
                        </div>
                        <ol className="space-y-2 text-xs text-slate-400">
                            <li className="flex gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] flex items-center justify-center flex-shrink-0">1</span>
                                Comparte tu enlace único
                            </li>
                            <li className="flex gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] flex items-center justify-center flex-shrink-0">2</span>
                                Tu referido compra un plan
                            </li>
                            <li className="flex gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] flex items-center justify-center flex-shrink-0">3</span>
                                Recibes 60% de comisión
                            </li>
                            <li className="flex gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] flex items-center justify-center flex-shrink-0">4</span>
                                Retira a partir de $20
                            </li>
                        </ol>
                    </div>

                    <div className="p-4 md:p-5 rounded-xl bg-slate-900/40 border border-slate-800/50">
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign size={16} className="text-cyan-400" />
                            <h4 className="text-sm font-semibold text-white">Tu Ganancia</h4>
                        </div>
                        <div className="space-y-2">
                            {[
                                { plan: 'Mensual', price: 10, commission: 6 },
                                { plan: 'Anual', price: 30, commission: 18 },
                                { plan: 'Vitalicio', price: 67, commission: 40.20 },
                            ].map(item => (
                                <div key={item.plan} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">{item.plan} (${item.price})</span>
                                    <span className="text-emerald-400 font-semibold font-mono">+${item.commission.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-amber-500/70 mt-3 pt-2 border-t border-slate-800/50">
                            ¡Comisiones por renovaciones incluidas!
                        </p>
                    </div>
                </motion.div>
            </motion.div>

            {/* Withdrawal Modal */}
            <WithdrawalModal
                isOpen={showWithdrawalModal}
                onClose={() => setShowWithdrawalModal(false)}
                availableBalance={affiliateBalance}
                onSuccess={refreshData}
            />
        </div>
    );
};

export default AffiliateDashboard;
