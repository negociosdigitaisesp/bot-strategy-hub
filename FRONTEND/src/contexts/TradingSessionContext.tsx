import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TradingSessionStats {
    sessionProfit: number;
    totalTrades: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    maxDrawdown: number;
    activeBot: string | null;
    sessionStartTime: Date | null;
}

interface TradingSessionContextType extends TradingSessionStats {
    updateStats: (profit: number, isWin: boolean) => void;
    setActiveBot: (botName: string | null) => void;
    resetSession: () => void;
}

const TradingSessionContext = createContext<TradingSessionContextType | undefined>(undefined);

export const TradingSessionProvider = ({ children }: { children: ReactNode }) => {
    const [stats, setStats] = useState<TradingSessionStats>({
        sessionProfit: 0,
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        maxDrawdown: 0,
        activeBot: null,
        sessionStartTime: null,
    });

    const updateStats = useCallback((profit: number, isWin: boolean) => {
        setStats(prev => {
            const newTotalTrades = prev.totalTrades + 1;
            const newWins = isWin ? prev.totalWins + 1 : prev.totalWins;
            const newLosses = isWin ? prev.totalLosses : prev.totalLosses + 1;
            const newProfit = prev.sessionProfit + profit;
            const newDrawdown = Math.min(prev.maxDrawdown, newProfit);

            return {
                ...prev,
                sessionProfit: newProfit,
                totalTrades: newTotalTrades,
                totalWins: newWins,
                totalLosses: newLosses,
                winRate: newTotalTrades > 0 ? (newWins / newTotalTrades) * 100 : 0,
                maxDrawdown: newDrawdown,
                sessionStartTime: prev.sessionStartTime || new Date(),
            };
        });
    }, []);

    const setActiveBot = useCallback((botName: string | null) => {
        setStats(prev => ({ ...prev, activeBot: botName }));
    }, []);

    const resetSession = useCallback(() => {
        setStats({
            sessionProfit: 0,
            totalTrades: 0,
            totalWins: 0,
            totalLosses: 0,
            winRate: 0,
            maxDrawdown: 0,
            activeBot: null,
            sessionStartTime: null,
        });
    }, []);

    return (
        <TradingSessionContext.Provider
            value={{
                ...stats,
                updateStats,
                setActiveBot,
                resetSession,
            }}
        >
            {children}
        </TradingSessionContext.Provider>
    );
};

export const useTradingSession = () => {
    const context = useContext(TradingSessionContext);
    if (context === undefined) {
        throw new Error('useTradingSession must be used within a TradingSessionProvider');
    }
    return context;
};
