import React, { useState } from 'react';
import { Plug, Shield, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import BrokerCard from '../components/BrokerCard';
import { DerivConnectionForm } from '../components/DerivConnectionForm';
import IQBotCredentials from '../components/IQBot/IQBotCredentials';
import { useBrokerHub } from '../hooks/useBrokerHub';
import { useAuth } from '../contexts/AuthContext';
import { useDeriv } from '../contexts/DerivContext';
import { useIQBot } from '../hooks/useIQBot';
import RecentGainsTicker from '../components/RecentGainsTicker';
import { SpecialOfferModal } from '../components/SpecialOfferModal';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';

const BrokerHubPage: React.FC = () => {
    const { derivBroker, iqBroker, totalBalance, connectedCount, totalBrokers, refreshIQ } = useBrokerHub();
    const { isConnected: derivConnected, account: derivAccount } = useDeriv();
    const { bot: iqBot, saveCredentials } = useIQBot();
    const { user } = useAuth();
    const { daysLeft } = useFreemiumLimiter();

    const [showDerivForm, setShowDerivForm] = useState(false);
    const [showIQForm, setShowIQForm] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);

    const derivBalance = derivConnected && derivAccount ? parseFloat(derivAccount.balance) : null;
    const isExpired = daysLeft !== null && daysLeft <= 0;

    return (
        <div className="container max-w-5xl mx-auto pt-20 pb-8 md:py-8 px-4 animate-in fade-in duration-500">
            {/* Ticker */}
            <RecentGainsTicker className="mb-6 -mx-4" />

            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                        <div className="absolute -inset-2 bg-gradient-to-r from-[#00E5FF]/20 to-emerald-500/20 rounded-xl blur-lg opacity-50" />
                        <div className="relative w-12 h-12 rounded-xl bg-[#0B0E14] border border-[#00E5FF]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                            <Plug size={24} className="text-[#00E5FF]" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                            Mis Brokers
                            <Sparkles size={20} className="text-[#00E5FF]/60" />
                        </h1>
                        <p className="text-sm text-white/40 mt-0.5">
                            Administra todas tus cuentas de trading en un solo lugar
                        </p>
                    </div>
                </div>

                {/* Global stats bar */}
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B0E14]/80 border border-white/5">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">Cartera Total</span>
                        <span className="text-sm font-black font-mono text-white">
                            <span className="text-[#00E5FF]">$</span>
                            {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B0E14]/80 border border-white/5">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">Brokers Activos</span>
                        <span className="text-sm font-black font-mono text-emerald-400">
                            {connectedCount}/{totalBrokers}
                        </span>
                    </div>
                </div>
            </div>

            {/* Broker Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Deriv Card */}
                <BrokerCard
                    name="Deriv"
                    logoFallback="📊"
                    isConnected={derivBroker.isConnected}
                    balance={derivBalance}
                    currency={derivAccount?.currency || 'USD'}
                    ctaLabel="Administrar Conexión"
                    ctaDisconnectedLabel="Configurar API Token"
                    onCtaClick={() => setShowDerivForm(!showDerivForm)}
                    description="Trading de opciones binarias y CFDs"
                    affiliateUrl="https://deriv.com/?t=TRCjAn8FEcUivlVU8hndU2Nd7ZgqdRLk&utm_source=affiliate_223442&utm_medium=affiliate&utm_campaign=MyAffiliates"
                    affiliateLabel="¿No tienes cuenta Deriv? Crea una"
                />

                {/* IQ Option Card */}
                <BrokerCard
                    name="IQ Option"
                    logoFallback="📈"
                    isConnected={iqBroker.isConnected || !!iqBot?.iq_email}
                    balance={null}
                    ctaLabel="Administrar Conexión"
                    ctaDisconnectedLabel="Iniciar Sesión"
                    onCtaClick={() => setShowIQForm(!showIQForm)}
                    description="Copy Trading & opciones binarias"
                />

                {/* Coming Soon Card */}
                <BrokerCard
                    name="Próximamente"
                    logoFallback="🔮"
                    isConnected={false}
                    ctaLabel=""
                    onCtaClick={() => { }}
                    comingSoon={true}
                    description="Quotex, Binance y más..."
                />
            </div>

            {/* Expandable Forms */}
            <div className="space-y-6">
                {/* Deriv Connection Form */}
                <div className={cn(
                    "transition-all duration-500 ease-out overflow-hidden",
                    showDerivForm ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                )}>
                    <div className="rounded-2xl border border-[#00E5FF]/10 bg-[#0B0E14]/60 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="text-[#00E5FF]" size={20} />
                            <h3 className="text-lg font-bold text-white">Conexión Deriv — API Token</h3>
                        </div>
                        <DerivConnectionForm />
                    </div>
                </div>

                {/* IQ Option Login Form */}
                <div className={cn(
                    "transition-all duration-500 ease-out overflow-hidden",
                    showIQForm ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                )}>
                    <div className="rounded-2xl border border-cyan-500/10 bg-[#0B0E14]/60 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="text-cyan-400" size={20} />
                            <h3 className="text-lg font-bold text-white">Conexión IQ Option — Credenciales</h3>
                        </div>
                        <IQBotCredentials
                            config={iqBot ? { iq_email: iqBot.iq_email, iq_password: '', stake_amount: iqBot.stake_amount || 10 } : undefined}
                            onSave={async (data: any) => {
                                const result = await saveCredentials(data.iq_email, data.iq_password, data.stake_amount);
                                if (result?.error) throw new Error(result.error);
                                refreshIQ();
                            }}
                            onCancel={() => setShowIQForm(false)}
                        />
                    </div>
                </div>
            </div>

            {/* Security note */}
            <div className="mt-10 text-center">
                <p className="text-[10px] text-white/20 max-w-md mx-auto leading-relaxed">
                    🔒 Tus credenciales se almacenan de forma segura y encriptada. Nunca compartimos tus datos con terceros.
                    Million Bots actúa como intermediario inteligente entre tú y los brokers.
                </p>
            </div>

            {/* Special Offer Modal */}
            <SpecialOfferModal
                isOpen={showOfferModal}
                onClose={() => setShowOfferModal(false)}
                onContinueFree={() => setShowOfferModal(false)}
                isExpired={isExpired}
            />
        </div>
    );
};

export default BrokerHubPage;
