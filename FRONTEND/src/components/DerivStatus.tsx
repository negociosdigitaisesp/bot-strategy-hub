import React from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useMarketingMode } from '../hooks/useMarketingMode';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
import { Wifi, WifiOff, Loader2, User, DollarSign, Gem, Bug } from 'lucide-react';
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
            "w-full p-4 rounded-2xl bg-[#0B0E14]/80 backdrop-blur-xl border border-[#00E5FF]/20 transition-all duration-300 relative group overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.4)]",
        )}>
            {/* Background Glow Effect */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00E5FF]/5 rounded-full blur-2xl group-hover:bg-[#00E5FF]/10 transition-all duration-500"></div>

            {/* Header with connection status */}
            <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-xl border bg-[#00E5FF]/10 border-[#00E5FF]/20 shadow-[0_0_10px_rgba(0,229,255,0.1)]",
                )}>
                    <Wifi size={20} className="text-[#00E5FF]" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 bg-[#00E5FF]",
                        )}></span>
                        <span className={cn(
                            "relative inline-flex rounded-full h-2.5 w-2.5 border-2 border-[#0B0E14] bg-[#00E5FF]",
                        )}></span>
                    </span>
                </div>
                <div className="flex-1">
                    <span className="block text-sm font-bold text-white tracking-tight">Deriv Conectado</span>
                    <span className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#00E5FF]/70">EN LÍNEA</span>
                </div>
            </div>

            {/* Account info */}
            <div className="flex flex-col gap-1 mb-3 px-3 py-2.5 rounded-xl bg-[#05050F] border border-white/5 relative z-10">
                <div className="flex items-center gap-2">
                    {/* Use Gem icon for special users, Bug/User icon for others to match Cyber theme */}
                    <Bug size={12} className="text-[#00E5FF]/60" />
                    <span
                        className={cn(
                            "text-[10px] font-black uppercase tracking-[0.1em] font-mono text-[#00E5FF]",
                        )}
                    >
                        {accountTypeDisplay}
                    </span>
                </div>
                <div className="ml-5">
                    <AccountNumberDisplay
                        accountNumber={displayLoginId}
                        className="text-[11px] text-white/50 font-mono tracking-wider font-medium"
                        iconSize={12}
                    />
                </div>
            </div>

            {/* Balance display */}
            <div className={cn(
                "px-3 py-3 rounded-xl bg-gradient-to-r from-[#00E5FF]/5 to-transparent border border-[#00E5FF]/10 relative z-10 hover:border-[#00E5FF]/30 transition-colors duration-300",
            )}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center bg-[#00E5FF]/10 border border-[#00E5FF]/20",
                        )}>
                            <DollarSign size={16} className="text-[#00E5FF]" />
                        </div>
                        <div>
                            <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-[0.15em] leading-none mb-1.5 font-mono">
                                SALDO DISPONIBLE
                            </span>
                            <span className="block text-xl font-black font-mono text-white leading-none tracking-tight">
                                {account ? (
                                    <>
                                        <span className="text-[#00E5FF] mr-1">$</span>
                                        <span>{displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </>
                                ) : (
                                    <span className="text-white/20">---</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
