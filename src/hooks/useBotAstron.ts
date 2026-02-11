import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';
import {
    useMultiAssetScanner,
    SCANNER_SYMBOLS,
    type ScannerSymbol,
    type AssetState,
    type ScannerStats,
    type LogEntry,
    type AssetScore
} from './useMultiAssetScanner';

// ============================================
// BUG DERIV - Multi-Asset Opportunity Scanner
// Wrapper around useMultiAssetScanner for UI compatibility
// ============================================

// Re-export types for UI compatibility
export type { LogEntry, ScannerSymbol, AssetState, AssetScore };

export interface BotConfig {
    stake: number;
    stopLoss: number;
    takeProfit: number;
    symbol?: string; // Legacy - now uses multi-asset
    useMartingale?: boolean;
    maxMartingaleLevel?: number;
    martingaleFactor?: number; // Configurable Martingale multiplier
    autoSwitchEnabled?: boolean; // Smart Asset Selection
    minScore?: number; // Minimum score threshold for trading
    useSoros?: boolean; // Turbo-Scalp Mode
    maxSorosLevels?: number; // Configurable Soros Levels
    // Cooldown Config
    profitTarget?: number;
    maxConsecutiveLosses?: number;
    // Anomaly Detection v3.0
    anomalyOnlyMode?: boolean; // Only trade when anomaly is confirmed
}

export interface BotStats {
    wins: number;
    losses: number;
    totalProfit: number;
    currentStake: number;
    consecutiveLosses?: number;
    cycleProfit?: number;
    cycleCount?: number;
}

export interface TickData {
    id: string;
    price: string;
    lastDigit: number;
    signal: string;
    change: string;
    isUp: boolean;
    symbol?: ScannerSymbol;
}

// Symbol display names
const SYMBOL_NAMES: Record<ScannerSymbol, string> = {
    'R_10': 'V10',
    'R_25': 'V25',
    'R_50': 'V50',
    'R_75': 'V75',
    'R_100': 'V100',
};

export const useBotAstron = () => {
    const { socket, isConnected } = useDeriv();

    // Use the multi-asset scanner
    const scanner = useMultiAssetScanner();

    // Local state for UI components that expect recentTicks
    const [recentTicks, setRecentTicks] = useState<TickData[]>([]);
    const lastPricesRef = useRef<Record<ScannerSymbol, number>>({
        R_10: 0,
        R_25: 0,
        R_50: 0,
        R_75: 0,
        R_100: 0,
    });

    // Convert scanner stats to legacy BotStats format
    const stats: BotStats = {
        wins: scanner.stats.wins,
        losses: scanner.stats.losses,
        totalProfit: scanner.stats.totalProfit,
        currentStake: scanner.stats.currentStake,
        consecutiveLosses: scanner.stats.consecutiveLosses,
        cycleProfit: scanner.stats.cycleProfit,
        cycleCount: scanner.stats.cycleCount,
    };

    // Ref for assetStates to avoid re-binding the listener on every update
    const assetStatesRef = useRef(scanner.assetStates);

    // Sync Ref with state
    useEffect(() => {
        assetStatesRef.current = scanner.assetStates;
    }, [scanner.assetStates]);

    // Handle tick updates from all assets to populate recentTicks for UI
    useEffect(() => {
        if (!socket || socket.readyState !== WebSocket.OPEN || !scanner.isRunning) return;

        const handleTick = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);

                if (data.msg_type === 'tick' && data.tick) {
                    const tickSymbol = data.tick.symbol as ScannerSymbol;
                    if (!SCANNER_SYMBOLS.includes(tickSymbol)) return;

                    const price = parseFloat(data.tick.quote);
                    const quote = price.toFixed(2);
                    const currentDigit = parseInt(quote.charAt(quote.length - 1));

                    // Calculate change
                    const lastPrice = lastPricesRef.current[tickSymbol];
                    const changeVal = lastPrice !== 0 ? price - lastPrice : 0;
                    const isUp = changeVal >= 0;
                    const changeStr = (isUp ? '+' : '') + changeVal.toFixed(2);

                    lastPricesRef.current[tickSymbol] = price;

                    // Get asset state for signal from REF (not state dependency)
                    const assetState = assetStatesRef.current[tickSymbol];
                    const signalStr = assetState ?
                        `${assetState.status.toUpperCase()} Z:${assetState.zScore.toFixed(1)}` :
                        '---';

                    const newTick: TickData = {
                        id: data.tick.id || Math.random().toString(),
                        price: quote,
                        lastDigit: currentDigit,
                        signal: signalStr,
                        change: changeStr,
                        isUp,
                        symbol: tickSymbol,
                    };

                    setRecentTicks(prev => [newTick, ...prev].slice(0, 20));
                }
            } catch (error) {
                console.error("Error parsing socket message in useBotAstron:", error);
            }
        };

        socket.addEventListener('message', handleTick);
        return () => socket.removeEventListener('message', handleTick);
    }, [socket, scanner.isRunning]); // Dependency list reduced - listener stays bound!

    // Start bot wrapper
    const startBot = useCallback((config: BotConfig) => {
        // Reset recent ticks
        setRecentTicks([]);
        lastPricesRef.current = {
            R_10: 0,
            R_25: 0,
            R_50: 0,
            R_75: 0,
            R_100: 0,
        };

        return scanner.startScanner({
            stake: config.stake,
            stopLoss: config.stopLoss,
            takeProfit: config.takeProfit,
            useMartingale: config.useMartingale,
            maxMartingaleLevel: config.maxMartingaleLevel,
            martingaleFactor: config.martingaleFactor,
            autoSwitch: config.autoSwitchEnabled,
            minScore: config.minScore,
            useSoros: config.useSoros,
            profitTarget: config.profitTarget,
            maxConsecutiveLosses: config.maxConsecutiveLosses,
            anomalyOnlyMode: config.anomalyOnlyMode
        });
    }, [scanner]);

    // Stop bot wrapper
    const stopBot = useCallback(() => {
        scanner.stopScanner();
    }, [scanner]);

    return {
        // Core state
        isRunning: scanner.isRunning,
        stats,
        logs: scanner.logs,
        recentTicks,

        // Multi-asset specific
        assetStates: scanner.assetStates,
        activeAsset: scanner.activeAsset,
        leaderAsset: scanner.leaderAsset,
        opportunityMessage: scanner.opportunityMessage,
        isWarmingUp: scanner.isWarmingUp,
        warmUpProgress: scanner.warmUpProgress,

        // Cooldown States
        isCoolingDown: scanner.isCoolingDown,
        cooldownTime: scanner.cooldownTime,
        cooldownReason: scanner.cooldownReason,

        // Anomaly Detection States v3.0
        isAnomalyDetected: scanner.isAnomalyDetected,
        currentAutocorr: scanner.currentAutocorr,
        ANOMALY_CONFIG: scanner.ANOMALY_CONFIG,

        // Actions
        startBot,
        stopBot,
        addLog: scanner.addLog,

        // Constants
        SCANNER_SYMBOLS,
        SYMBOL_NAMES,
    };
};
