import React, { useEffect, useState } from 'react';
import { DerivConnectionForm } from '../components/DerivConnectionForm';
import { AccountSwitcher } from '../components/AccountSwitcher';
import { Shield, PlusCircle } from 'lucide-react';
import { useDeriv } from '../contexts/DerivContext';
import { cn } from '../lib/utils';
import RecentGainsTicker from '../components/RecentGainsTicker';
import { SpecialOfferModal } from '../components/SpecialOfferModal';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';

const DerivConnectionPage = () => {
    const { isConnected, account, token } = useDeriv();
    const [showConnectionForm, setShowConnectionForm] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const { isFree, isPro, daysLeft } = useFreemiumLimiter();

    // Check if trial expired
    const isExpired = daysLeft !== null && daysLeft <= 0;

    // Show offer modal for free users when they access the page (only once per session)
    useEffect(() => {
        const hasSeenOffer = sessionStorage.getItem('deriv_page_offer_shown');
        if (isFree && !isPro && !hasSeenOffer && !isConnected) {
            // Small delay for better UX
            const timer = setTimeout(() => {
                setShowOfferModal(true);
                sessionStorage.setItem('deriv_page_offer_shown', 'true');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isFree, isPro, isConnected]);

    // Efeito para salvar conta automaticamente ao conectar com sucesso
    useEffect(() => {
        if (isConnected && account && token) {
            try {
                const savedAccountsStr = localStorage.getItem('deriv_saved_accounts');
                const savedAccounts = savedAccountsStr ? JSON.parse(savedAccountsStr) : [];

                // Verificar se já existe
                const existingIndex = savedAccounts.findIndex((a: any) => a.loginid === account.loginid);

                const newAccountData = {
                    token,
                    loginid: account.loginid,
                    balance: account.balance,
                    currency: account.currency
                };

                let updatedAccounts;
                if (existingIndex >= 0) {
                    // Atualizar existente
                    updatedAccounts = [...savedAccounts];
                    updatedAccounts[existingIndex] = newAccountData;
                } else {
                    // Adicionar nova
                    updatedAccounts = [...savedAccounts, newAccountData];
                }

                localStorage.setItem('deriv_saved_accounts', JSON.stringify(updatedAccounts));

                // Disparar evento para atualizar AccountSwitcher
                window.dispatchEvent(new Event('storage'));

                // Se conectou com sucesso, podemos esconder o form se ele estiver em modo "nova conta"
                // Mas talvez o usuário queira ver o feedback de sucesso do form.
                // Vamos manter o form visível se foi uma ação explícita.
            } catch (err) {
                console.error("Erro ao salvar conta Deriv:", err);
            }
        }
    }, [isConnected, account, token]);

    // Handler para "Nova Conta" vindo do Switcher
    const handleAddAccount = () => {
        setShowConnectionForm(true);
        // Scroll para o formulário
        setTimeout(() => {
            document.getElementById('connection-form-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className="container max-w-4xl mx-auto pt-20 pb-8 md:py-8 px-4 animate-in fade-in duration-500">
            {/* Recent Gains Ticker */}
            <RecentGainsTicker className="mb-6 -mx-4" />
            {/* Header com Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
                        <Shield className="text-emerald-500" size={28} />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                            Billetera Deriv
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-sm max-w-md">
                        Administre sus cuentas de trading. Conecte múltiples cuentas y alterne entre ellas instantáneamente.
                    </p>

                    <div className="mt-4">
                        <a
                            href="https://deriv.com/?t=TRCjAn8FEcUivlVU8hndU2Nd7ZgqdRLk&utm_source=affiliate_223442&utm_medium=affiliate&utm_campaign=MyAffiliates&utm_content=&referrer="
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-xs group"
                        >
                            <span className="text-gray-400">¿No tienes cuenta Deriv?</span>
                            <span className="text-white font-medium group-hover:text-emerald-400 transition-colors">Crea una ahora</span>
                            <Shield size={12} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                        </a>
                    </div>
                </div>

                {/* O AccountSwitcher é o protagonista aqui - estilo Cyberpunk Fintech */}
                <div className="w-full md:w-auto z-50">
                    <AccountSwitcher onAddAccount={handleAddAccount} />
                </div>
            </div>

            {/* Área Principal */}
            <div className="space-y-8">

                {/* Se não estiver conectado e não houver contas salvas, mostrar form direto. 
                    Se estiver conectado, mostrar detalhes da conexão atual OU form de nova conexão se solicitado. */}

                <div id="connection-form-section" className={cn(
                    "transition-all duration-500 ease-in-out",
                    (showConnectionForm || !isConnected) ? "opacity-100 translate-y-0" : "opacity-100"
                )}>
                    {/* Se o usuário pediu para adicionar conta (showConnectionForm) E JÁ ESTÁ CONECTADO, 
                        o DerivConnectionForm padrão vai mostrar "Conectado". 
                        Isso é um problema se queremos conectar OUTRA. 
                        Vamos assumir que o usuário deve desconectar no form atual ou usar o token input se o form permitir. 
                        
                        Como não posso editar o DerivConnectionForm agora para forçar modo input, 
                        vou adicionar um aviso explicativo se estiver tentando adicionar nova conta enquanto conectado.
                    */}

                    {showConnectionForm && isConnected && (
                        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                            <PlusCircle className="text-blue-400 mt-1 shrink-0" size={20} />
                            <div className="text-sm text-blue-200">
                                <p className="font-bold mb-1">Para conectar una NUEVA cuenta:</p>
                                <p>Simplemente ingrese el Token de la cuenta que desea agregar (sea Real o Demo) en el formulario abajo. El sistema detectará automáticamente el tipo de cuenta.</p>
                            </div>
                        </div>
                    )}

                    <DerivConnectionForm />
                </div>
            </div>

            {/* Dicas / Footer (opcional) */}
            {!isConnected && !showConnectionForm && (
                <div className="mt-12 text-center">
                    <p className="text-muted-foreground mb-4">¿Desea conectar una nueva cuenta?</p>
                    <button
                        onClick={() => setShowConnectionForm(true)}
                        className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                        Conectar Nueva Cuenta
                    </button>
                </div>
            )}

            {/* Special Offer Modal for Free Users */}
            <SpecialOfferModal
                isOpen={showOfferModal}
                onClose={() => setShowOfferModal(false)}
                onContinueFree={() => setShowOfferModal(false)}
                isExpired={isExpired}
            />
        </div>
    );
};

export default DerivConnectionPage;
