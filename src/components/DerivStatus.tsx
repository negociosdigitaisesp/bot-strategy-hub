import React from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useMarketingMode } from '../hooks/useMarketingMode';
import { Wifi, WifiOff, Loader2, User, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export const DerivStatus = () => {
    const { isConnected, isConnecting, account } = useDeriv();
    const {
        isMarketingMode,
        getAccountTypeDisplay,
        getCurrencySymbol,
        getDisplayBalance,
        getDisplayLoginId,
        overrides
    } = useMarketingMode();

    // Disconnected state
    if (!isConnected && !isConnecting) {
        return (
            <Link
                to="/conectar-deriv"
                className="w-full p-4 rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 hover:border-red-500/30 transition-all duration-200 group"
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
            <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20">
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
        <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
            {/* Header with connection status */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                    <Wifi size={20} className="text-emerald-400" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background"></span>
                    </span>
                </div>
                <div className="flex-1">
                    <span className="block text-sm font-bold text-emerald-400">Deriv Conectado</span>
                    <span className="block text-[10px] text-emerald-400/50 uppercase tracking-wider">En línea</span>
                </div>
            </div>

            {/* Account info */}
            <div className="flex flex-col gap-1 mb-3 px-3 py-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                    <User size={12} className="text-white/40" />
                    <span
                        className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            // Always show emerald for marketing mode with forceRealAccount
                            forceRealColors || isRealAccount ? "text-emerald-400" : "text-cyan-400"
                        )}
                    >
                        {accountTypeDisplay}
                    </span>
                </div>
                <span className="text-[10px] text-white/50 font-mono tracking-wider ml-5">{displayLoginId}</span>
            </div>

            {/* Balance display */}
            <div className="px-3 py-3 rounded-xl bg-gradient-to-r from-emerald-500/5 to-transparent border border-emerald-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <DollarSign size={16} className="text-emerald-400" />
                        </div>
                        <div>
                            <span className="block text-[10px] text-white/40 font-medium uppercase tracking-wider leading-none mb-1">
                                Saldo Disponible
                            </span>
                            <span className="block text-xl font-black font-mono text-white leading-none">
                                {account ? (
                                    <>
                                        <span className="text-emerald-400">{currencySymbol}</span>
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
