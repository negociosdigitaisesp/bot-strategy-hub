import React, { useState, useEffect, useRef } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
import { useMarketingMode } from '../hooks/useMarketingMode';
import { usePricingModal } from '../contexts/PricingModalContext';
import { RealAccountLockModal } from './RealAccountLockModal';
import {
    DollarSign,
    Gamepad2,
    ChevronDown,
    Plus,
    Trash2,
    Wallet,
    Check,
    Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface SavedAccount {
    token: string;
    loginid: string;
    balance?: string;
    currency?: string;
}

interface AccountSwitcherProps {
    onAddAccount: () => void;
    className?: string;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ onAddAccount, className }) => {
    const { account, token, connect, disconnect, isConnecting } = useDeriv();
    const { isFree, isPro } = useFreemiumLimiter();
    const { isMarketingMode, getAccountTypeDisplay, getCurrencySymbol, getDisplayBalance, getDisplayLoginId, overrides } = useMarketingMode();
    const { openPricingModal } = usePricingModal();
    const [isOpen, setIsOpen] = useState(false);
    const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
    const [showRealLockModal, setShowRealLockModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Carregar contas do localStorage
    useEffect(() => {
        const loadAccounts = () => {
            try {
                const stored = localStorage.getItem('deriv_saved_accounts');
                if (stored) {
                    setSavedAccounts(JSON.parse(stored));
                }
            } catch (error) {
                console.error('Erro ao carregar contas:', error);
            }
        };

        loadAccounts();
        // Escutar evento de storage para atualizar entre abas ou ações
        window.addEventListener('storage', loadAccounts);
        return () => window.removeEventListener('storage', loadAccounts);
    }, []);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Determinar se é conta Real ou Demo
    const isRealAccount = (loginid?: string) => loginid?.startsWith('CR');
    const isDemoAccount = (loginid?: string) => loginid?.startsWith('VR');

    // Configuração visual baseada no tipo de conta ativa
    const activeIsReal = account ? isRealAccount(account.loginid) : false;

    // Marketing mode: force display as Real if enabled
    const forceRealColors = isMarketingMode && overrides.forceRealAccount;
    const displayAsReal = forceRealColors || activeIsReal;

    const triggerStyles = displayAsReal
        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
        : "border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]";

    const iconStyles = displayAsReal
        ? "bg-emerald-500/20 text-emerald-400"
        : "bg-cyan-500/20 text-cyan-400";

    // Formatar saldo
    const formatBalance = (val: string | number) => {
        return Number(val).toLocaleString('es-LA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Get currency symbol for marketing mode
    const currencySymbol = getCurrencySymbol();

    const handleSwitchAccount = async (acc: SavedAccount) => {
        // Check if trying to switch to Real account while on Free plan
        const targetIsReal = isRealAccount(acc.loginid);

        // Marketing mode bypasses all restrictions
        if (!isMarketingMode && targetIsReal && isFree) {
            // Block the switch and show modal
            setIsOpen(false);
            setShowRealLockModal(true);
            return;
        }

        if (acc.token === token) {
            setIsOpen(false);
            return;
        }

        setIsOpen(false);
        toast.promise(connect(acc.token), {
            loading: 'Conectando carteira...',
            success: `Conectado: ${acc.loginid}`,
            error: 'Erro ao conectar conta'
        });
    };

    const handleDeleteAccount = (e: React.MouseEvent, accToDelete: SavedAccount) => {
        e.stopPropagation();
        const newAccounts = savedAccounts.filter(acc => acc.loginid !== accToDelete.loginid);
        setSavedAccounts(newAccounts);
        localStorage.setItem('deriv_saved_accounts', JSON.stringify(newAccounts));
        toast.success('Conta removida da carteira');

        // Se deletou a conta ativa, desconectar
        if (account?.loginid === accToDelete.loginid) {
            disconnect();
        }
    };

    // Get display balance for marketing mode
    const getBalanceDisplay = (balance: string | number) => {
        const realBalance = Number(balance);
        const displayBal = getDisplayBalance(realBalance);
        return formatBalance(displayBal);
    };

    return (
        <>
            <div className={cn("relative w-full max-w-sm", className)} ref={dropdownRef}>
                {/* TRIGGER BUTTON (CÁPSULA) */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "relative w-full flex items-center justify-between p-1 pl-2 pr-4 rounded-full border transition-all duration-300 group",
                        account ? triggerStyles : "border-white/10 bg-slate-900 text-slate-400 hover:border-white/20"
                    )}
                >
                    <div className="flex items-center gap-3">
                        {/* Ícone Redondo */}
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border border-white/5 transition-colors",
                            account ? iconStyles : "bg-white/5 text-slate-500"
                        )}>
                            {account ? (
                                displayAsReal ? <DollarSign size={20} className="drop-shadow-glow" /> : <Gamepad2 size={20} />
                            ) : (
                                <Wallet size={20} />
                            )}
                        </div>

                        {/* Info Texto */}
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] uppercase tracking-widest opacity-70 font-bold">
                                {account ? getAccountTypeDisplay(activeIsReal) : 'Sin Conexión'}
                            </span>
                            <span className={cn(
                                "text-lg font-mono font-bold leading-none tracking-tight",
                                account ? "" : "text-slate-500"
                            )}>
                                {account ? (
                                    <>
                                        <span className="opacity-60 text-sm mr-1">{currencySymbol}</span>
                                        {getBalanceDisplay(account.balance)}
                                    </>
                                ) : (
                                    '---'
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Seta e ID */}
                    <div className="flex items-center gap-2">
                        {account && (
                            <span className="hidden sm:inline-block text-[10px] font-mono bg-black/20 px-2 py-0.5 rounded text-white/40 border border-white/5">
                                {getDisplayLoginId(account.loginid)}
                            </span>
                        )}
                        <ChevronDown
                            size={18}
                            className={cn("transition-transform duration-300", isOpen && "rotate-180")}
                        />
                    </div>

                    {/* Glow Effect no fundo quando ativo (opcional, para reforçar cyberpunk) */}
                    {account && (
                        <div className={cn(
                            "absolute inset-0 rounded-full blur-xl opacity-20 -z-10 transition-opacity",
                            displayAsReal ? "bg-emerald-500" : "bg-cyan-500",
                            isOpen ? "opacity-40" : "opacity-0 group-hover:opacity-30"
                        )}></div>
                    )}
                </button>

                {/* DROPDOWN MENU */}
                <div className={cn(
                    "absolute top-full left-0 right-0 mt-3 p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl transition-all duration-300 z-50 origin-top",
                    isOpen
                        ? "opacity-100 translate-y-0 visible"
                        : "opacity-0 -translate-y-2 invisible",
                    // Fundo vidro escuro
                    "bg-[#0B0F17]/95"
                )}>
                    {/* Título da Lista */}
                    <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                        <span>Mis Cuentas</span>
                        <span className="bg-white/5 px-1.5 rounded text-[9px]">{savedAccounts.length}</span>
                    </div>

                    {/* Lista de Contas */}
                    <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar mb-2">
                        {savedAccounts.length === 0 && (
                            <div className="text-center py-6 text-slate-600 text-sm">
                                No hay cuentas guardadas
                            </div>
                        )}

                        {savedAccounts.map((acc, index) => {
                            const isReal = isRealAccount(acc.loginid);
                            const isActive = account?.loginid === acc.loginid;
                            // Marketing mode bypasses lock
                            const isLocked = !isMarketingMode && isReal && isFree;

                            // For marketing mode, always show as Real if forceRealAccount is true
                            const showAsReal = (isMarketingMode && overrides.forceRealAccount) || isReal;

                            return (
                                <div
                                    key={`${acc.loginid}-${index}`}
                                    onClick={() => handleSwitchAccount(acc)}
                                    className={cn(
                                        "relative group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                                        isActive
                                            ? "bg-white/5 border-white/10 shadow-inner"
                                            : "hover:bg-white/5 hover:border-white/5",
                                        isLocked && !isActive && "opacity-60"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                                            showAsReal
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-500",
                                            isActive && (showAsReal ? "bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]")
                                        )}>
                                            {showAsReal ? <DollarSign size={14} /> : <Gamepad2 size={14} />}
                                            {/* Lock indicator for Real accounts on Free plan */}
                                            {isLocked && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border border-slate-900">
                                                    <Lock size={8} className="text-slate-900" />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "font-bold text-sm",
                                                    showAsReal ? "text-emerald-100" : "text-cyan-100"
                                                )}>
                                                    {getAccountTypeDisplay(isReal)}
                                                </span>
                                                {isActive && <Check size={12} className="text-white/50" />}
                                                {isLocked && (
                                                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                                                        PRO
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                                                <span className="opacity-70">{getDisplayLoginId(acc.loginid)}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                <span>{acc.balance ? `${currencySymbol}${formatBalance(acc.balance)}` : '---'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => handleDeleteAccount(e, acc)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Eliminar cuenta"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    {/* Status Indicator Bar */}
                                    {isActive && (
                                        <div className={cn(
                                            "absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
                                            showAsReal ? "bg-emerald-500 box-shadow-glow-emerald" : "bg-cyan-500 box-shadow-glow-cyan"
                                        )}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Botão Nova Conta */}
                    <button
                        onClick={() => {
                            // Marketing mode bypasses restrictions
                            if (!isMarketingMode && isFree) {
                                openPricingModal();
                            } else {
                                setIsOpen(false);
                                onAddAccount();
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all group"
                    >
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors">
                            <Plus size={14} />
                        </div>
                        <span className="text-sm font-medium">Conectar Nueva Cuenta</span>
                    </button>
                </div>
            </div>

            {/* Real Account Lock Modal */}
            <RealAccountLockModal
                isOpen={showRealLockModal}
                onClose={() => setShowRealLockModal(false)}
            />
        </>
    );
};
