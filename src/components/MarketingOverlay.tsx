/**
 * Marketing Overlay Component
 * 
 * Floating panel that only appears for marketing accounts.
 * Allows editing fake stats for demos and screenshots.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings2,
    X,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Percent,
    Wallet,
    Bell,
    RotateCcw,
    Eye,
    EyeOff,
    Sparkles,
    Crown,
    Infinity,
    CreditCard,
    ToggleLeft,
    ToggleRight,
    Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useMarketingMode, CurrencyDisplay } from '../hooks/useMarketingMode';

const MarketingOverlay: React.FC = () => {
    const {
        isMarketingMode,
        overrides,
        setFakeProfit,
        setFakeWins,
        setFakeLosses,
        setFakeWinRate,
        setFakeBalance,
        toggleFakeNotifications,
        setCurrencyDisplay,
        toggleForceRealAccount,
        resetOverrides,
    } = useMarketingMode();

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Don't render if not marketing mode
    if (!isMarketingMode) return null;

    return (
        <>
            {/* Trader Diamond Badge - Always visible */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed top-4 right-4 z-50"
            >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 backdrop-blur-xl shadow-lg shadow-amber-500/10">
                    <Crown size={18} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">Trader Diamond</span>
                    <Infinity size={16} className="text-amber-400" />
                </div>
            </motion.div>

            {/* Floating Badge - Opens panel */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                    "fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full",
                    "bg-gradient-to-r from-pink-500 to-purple-600",
                    "flex items-center justify-center shadow-lg shadow-purple-500/30",
                    "hover:shadow-purple-500/50 transition-shadow",
                    "border-2 border-white/20"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Sparkles size={20} className="text-white" />
            </motion.button>

            {/* Overlay Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className={cn(
                            "fixed right-4 z-50 w-80",
                            "bg-[#0c0e14]/95 backdrop-blur-xl border border-purple-500/30",
                            "rounded-2xl shadow-2xl shadow-purple-900/50",
                            isMinimized ? "bottom-40" : "bottom-40"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                                    <Settings2 size={16} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Marketing Mode</h3>
                                    <p className="text-[9px] text-purple-400 font-mono">DEMO CONTROL</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    {isMinimized ? <Eye size={14} className="text-white/60" /> : <EyeOff size={14} className="text-white/60" />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X size={14} className="text-white/60" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        {!isMinimized && (
                            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">

                                {/* Force Real Account Toggle */}
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={16} className="text-emerald-400" />
                                            <div>
                                                <span className="text-xs text-white font-medium block">Demo → Real</span>
                                                <span className="text-[9px] text-emerald-400/70">Siempre mostrar como Cuenta Real</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleForceRealAccount}
                                            className={cn(
                                                "relative w-10 h-5 rounded-full transition-colors",
                                                overrides.forceRealAccount ? "bg-emerald-500" : "bg-white/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                                                overrides.forceRealAccount ? "left-5" : "left-0.5"
                                            )} />
                                        </button>
                                    </div>
                                </div>

                                {/* Currency Selector */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] text-white/60 uppercase tracking-wider mb-2">
                                        <DollarSign size={12} />
                                        Moneda a Mostrar
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setCurrencyDisplay('USD')}
                                            className={cn(
                                                "p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all",
                                                overrides.currencyDisplay === 'USD'
                                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                            )}
                                        >
                                            {overrides.currencyDisplay === 'USD' && <Check size={14} />}
                                            $ USD
                                        </button>
                                        <button
                                            onClick={() => setCurrencyDisplay('USDT')}
                                            className={cn(
                                                "p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all",
                                                overrides.currencyDisplay === 'USDT'
                                                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                                                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                            )}
                                        >
                                            {overrides.currencyDisplay === 'USDT' && <Check size={14} />}
                                            USDT
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-white/10 pt-4">
                                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Valores Fake para Screenshots</p>
                                </div>

                                {/* Fake Profit */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] text-white/60 uppercase tracking-wider mb-2">
                                        <DollarSign size={12} />
                                        Lucro Fake
                                    </label>
                                    <input
                                        type="number"
                                        value={overrides.fakeProfit}
                                        onChange={(e) => setFakeProfit(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-emerald-400 font-mono text-sm focus:border-purple-500/50 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* Wins / Losses */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] text-white/60 uppercase tracking-wider mb-2">
                                            <TrendingUp size={12} />
                                            Wins
                                        </label>
                                        <input
                                            type="number"
                                            value={overrides.fakeWins}
                                            onChange={(e) => setFakeWins(parseInt(e.target.value) || 0)}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-emerald-400 font-mono text-sm focus:border-emerald-500/50 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] text-white/60 uppercase tracking-wider mb-2">
                                            <TrendingDown size={12} />
                                            Losses
                                        </label>
                                        <input
                                            type="number"
                                            value={overrides.fakeLosses}
                                            onChange={(e) => setFakeLosses(parseInt(e.target.value) || 0)}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-rose-400 font-mono text-sm focus:border-rose-500/50 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Win Rate */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] text-white/60 uppercase tracking-wider mb-2">
                                        <Percent size={12} />
                                        Win Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={overrides.fakeWinRate}
                                        onChange={(e) => setFakeWinRate(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-amber-400 font-mono text-sm focus:border-amber-500/50 focus:outline-none"
                                        placeholder="85.5"
                                    />
                                </div>

                                {/* Fake Balance */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] text-white/60 uppercase tracking-wider mb-2">
                                        <Wallet size={12} />
                                        Balance Fake
                                    </label>
                                    <input
                                        type="number"
                                        value={overrides.fakeBalance}
                                        onChange={(e) => setFakeBalance(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-cyan-400 font-mono text-sm focus:border-cyan-500/50 focus:outline-none"
                                        placeholder="1000.00"
                                    />
                                </div>

                                {/* Fake Notifications Toggle */}
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Bell size={14} className="text-white/60" />
                                        <span className="text-xs text-white/80">Notificações Fake</span>
                                    </div>
                                    <button
                                        onClick={toggleFakeNotifications}
                                        className={cn(
                                            "relative w-10 h-5 rounded-full transition-colors",
                                            overrides.showFakeNotifications ? "bg-purple-500" : "bg-white/20"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                                            overrides.showFakeNotifications ? "left-5" : "left-0.5"
                                        )} />
                                    </button>
                                </div>

                                {/* Reset Button */}
                                <button
                                    onClick={resetOverrides}
                                    className="w-full py-2.5 rounded-lg border border-white/10 text-white/60 text-xs font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                                >
                                    <RotateCcw size={14} />
                                    Reset Valores
                                </button>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-white/10 bg-purple-500/10">
                            <p className="text-[9px] text-purple-400 text-center font-mono">
                                ⚠️ Visible apenas para conta marketing
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default MarketingOverlay;
