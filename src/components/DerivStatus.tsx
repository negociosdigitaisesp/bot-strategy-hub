import React from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useMarketingMode } from '../hooks/useMarketingMode';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
import { Wifi, WifiOff, Loader2, User, DollarSign, Gem } from 'lucide-react';
import { cn } from '../lib/utils';

import { Link } from 'react-router-dom';
import { AccountNumberDisplay } from './AccountNumberDisplay';

export const DerivStatus = () => {
    const { isConnected, isConnecting, account } = useDeriv();
    const {
        isMarketingMode,
        getAccountTypeDisplay,
        getCurrencySymbol,
        getDisplayBalance,
        getDisplayLoginId,
        overrides,
        showTraderDiamondBadge
    } = useMarketingMode();

    // Get plan type to determine if user is Diamante/Vitalicio
    const { planType } = useFreemiumLimiter();
    const isDiamante = showTraderDiamondBadge || ['whale', 'vitalicio', 'elite'].includes((planType || '').toLowerCase());

    // Disconnected state
    if (!isConnected && !isConnecting) {
        return (
            <Link
                to="/conectar-deriv"
                className={cn(
                    "w-full p-4 rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border hover:border-red-500/30 transition-all duration-200 group",
                    isDiamante ? "border-purple-500/20 shadow-none hover:bg-purple-500/5" : "border-red-500/20"
                )}
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20">
                        <WifiOff size={20} className="text-red-400" />
                    </div>
                    <div className="flex-1">
                        <span className="block text-sm font-bold text-red-400 group-hover:text-red-300">Deriv Desconectado</span>
                        <span className="block text-[10px] text-red-400/50 uppercase tracking-wider">Sin conexión</span>
                    </div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10 text-center">
                    <span className="text-xs text-red-400/70">Clic para conectar tu cuenta</span>
                </div>
            </Link>
        );
    }

    // Connecting state
    if (isConnecting) {
        return (
            <div className={cn(
                "w-full p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border",
                isDiamante ? "border-purple-500/20 shadow-none" : "border-yellow-500/20"
            )}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <Loader2 size={20} className="text-yellow-500 animate-spin" />
                    </div>
                    <div className="flex-1">
                        <span className="block text-sm font-bold text-yellow-500">Conectando...</span>
                        <span className="block text-[10px] text-yellow-500/50 uppercase tracking-wider">Aguarde</span>
                    </div>
                </div>
            </div>
        );
    }

    // Connected state
    const loginId = account?.loginid || '';
    const isRealAccount = loginId.startsWith('CR');

    // Marketing mode: convert CR to VR for display
    const displayLoginId = getDisplayLoginId(loginId);

    // Marketing mode: force display as Real account if enabled
    const accountTypeDisplay = getAccountTypeDisplay(isRealAccount);
    const forceRealColors = isMarketingMode && overrides.forceRealAccount;

    // Get display balance (fake or real)
    const realBalance = account ? parseFloat(account.balance) : 0;
    const displayBalance = getDisplayBalance(realBalance);

    // Currency symbol based on marketing settings
    const currencySymbol = getCurrencySymbol();

    return (
        <div className={cn(
            "w-full p-4 rounded-2xl bg-gradient-to-br transition-all duration-300",
            isDiamante
                ? "from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20"
                : "from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20"
        )}>
            {/* Header with connection status */}
            <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-xl border",
                    isDiamante
                        ? "bg-purple-500/10 border-purple-500/20"
                        : "bg-emerald-500/20 border-emerald-500/30"
                )}>
                    <Wifi size={20} className={isDiamante ? "text-purple-400" : "text-emerald-400"} />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-50",
                            isDiamante ? "bg-purple-400" : "bg-emerald-400"
                        )}></span>
                        <span className={cn(
                            "relative inline-flex rounded-full h-2.5 w-2.5 border-2 border-background",
                            isDiamante ? "bg-purple-500" : "bg-emerald-500"
                        )}></span>
                    </span>
                </div>
                <div className="flex-1">
                    <span className={cn(
                        "block text-sm font-bold",
                        isDiamante ? "text-purple-400" : "text-emerald-400"
                    )}>Deriv Conectado</span>
                    <span className={cn(
                        "block text-[10px] uppercase tracking-wider",
                        isDiamante ? "text-purple-400/50" : "text-emerald-400/50"
                    )}>En línea</span>
                </div>
            </div>

            {/* Account info */}
            <div className="flex flex-col gap-1 mb-3 px-3 py-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                    {/* Use Gem icon for Diamante users, User icon for others */}
                    {isDiamante ? (
                        <Gem size={12} className="text-purple-400" />
                    ) : (
                        <User size={12} className="text-white/40" />
                    )}
                    <span
                        className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            // Purple for Diamante, emerald for real, cyan for demo
                            isDiamante ? "text-purple-400" :
                                forceRealColors || isRealAccount ? "text-emerald-400" : "text-cyan-400"
                        )}
                    >
                        {accountTypeDisplay}
                    </span>
                </div>
                <div className="ml-5">
                    <AccountNumberDisplay
                        accountNumber={displayLoginId}
                        className="text-[10px] text-white/50 font-mono tracking-wider"
                        iconSize={12}
                    />
                </div>
            </div>

            {/* Balance display */}
            <div className={cn(
                "px-3 py-3 rounded-xl bg-gradient-to-r border",
                isDiamante
                    ? "from-purple-500/5 to-transparent border-purple-500/10"
                    : "from-emerald-500/5 to-transparent border-emerald-500/10"
            )}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isDiamante ? "bg-purple-500/10" : "bg-emerald-500/10"
                        )}>
                            <DollarSign size={16} className={isDiamante ? "text-purple-400" : "text-emerald-400"} />
                        </div>
                        <div>
                            <span className="block text-[10px] text-white/40 font-medium uppercase tracking-wider leading-none mb-1">
                                Saldo Disponible
                            </span>
                            <span className="block text-xl font-black font-mono text-white leading-none">
                                {account ? (
                                    <>
                                        <span className={isDiamante ? "text-purple-400" : "text-emerald-400"}>{currencySymbol}</span>
                                        <span>{displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </>
                                ) : (
                                    <span className="text-white/30">---</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
