/**
 * Marketing Mode Hook
 * 
 * Provides exclusive access for marketing/demo accounts.
 * Only the specified email has access to marketing features.
 * 
 * Features:
 * - Full PRO access (no limits)
 * - Editable stats for demos
 * - Demo → Real account conversion
 * - Currency selector (USD/USDT)
 * - Trader Diamond badge
 */

import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// =============================================================================
// MARKETING EMAIL - HARDCODED FOR SECURITY
// =============================================================================
const MARKETING_EMAILS = [
    'brendacostatmktcp@outlook.com',
];

// =============================================================================
// UTILITY FUNCTIONS (can be used outside of React components)
// =============================================================================
export const isMarketingEmail = (email: string | null | undefined): boolean => {
    return MARKETING_EMAILS.includes(email?.toLowerCase() || '');
};

export const convertLoginIdForMarketing = (loginId: string, userEmail: string | null | undefined): string => {
    // Only convert if user is a marketing account
    if (!isMarketingEmail(userEmail)) return loginId;

    // Replace VRTC prefix with CRTC for marketing accounts (check longer prefix first)
    if (loginId.startsWith('VRTC')) {
        return 'CRTC' + loginId.substring(4);
    }
    // Replace VR prefix with CR for marketing accounts
    if (loginId.startsWith('VR')) {
        return 'CR' + loginId.substring(2);
    }
    return loginId;
};

// Get current user email from Supabase localStorage session
export const getCurrentUserEmail = (): string | null => {
    try {
        const sessionData = localStorage.getItem('supabase.auth.token');
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            return parsed?.currentSession?.user?.email || null;
        }
    } catch {
        // Ignore parse errors
    }
    return null;
};

// =============================================================================
// TYPES
// =============================================================================
export type CurrencyDisplay = 'USD' | 'USDT';

// =============================================================================
// MARKETING RESULTS FILTER TYPES
// =============================================================================
export interface MarketingResultadoInput {
    contractId: number | string;
    lucro: number;
    status: 'won' | 'lost';
    /** Stake base usado na operação (para calcular payout simulado) */
    stake?: number;
    /** Nível de gale atual — informativo */
    galeLevel?: number;
}

export interface MarketingResultadoOutput {
    contractId: number | string;
    lucro: number;
    status: 'won' | 'lost';
    /** true = loss foi ocultado e convertido em win pela conta de marketing */
    wasFiltered: boolean;
}

interface MarketingOverrides {
    fakeProfit: number;
    fakeWins: number;
    fakeLosses: number;
    fakeWinRate: number;
    fakeBalance: number;
    showFakeNotifications: boolean;
    currencyDisplay: CurrencyDisplay;
    forceRealAccount: boolean; // Always show as Real account
}

interface MarketingModeReturn {
    // Status
    isMarketingMode: boolean;

    // Permissions
    canEditStats: boolean;
    canShowFakeProfit: boolean;
    canBypassLimits: boolean;
    canUnlockAllBots: boolean;
    showExperimentalUI: boolean;
    showTraderDiamondBadge: boolean;

    // Override values
    overrides: MarketingOverrides;

    // Actions
    setFakeProfit: (value: number) => void;
    setFakeWins: (value: number) => void;
    setFakeLosses: (value: number) => void;
    setFakeWinRate: (value: number) => void;
    setFakeBalance: (value: number) => void;
    toggleFakeNotifications: () => void;
    setCurrencyDisplay: (currency: CurrencyDisplay) => void;
    toggleForceRealAccount: () => void;
    resetOverrides: () => void;

    // Helper to get display value (fake or real)
    getDisplayProfit: (realProfit: number) => number;
    getDisplayWins: (realWins: number) => number;
    getDisplayLosses: (realLosses: number) => number;
    getDisplayWinRate: (realWinRate: number) => number;
    getDisplayBalance: (realBalance: number) => number;

    // Account display helpers
    getAccountTypeDisplay: (isRealAccount: boolean) => string;
    getCurrencySymbol: () => string;
    formatCurrency: (value: number) => string;
    getDisplayLoginId: (loginId: string) => string;

    /**
     * Filtra resultado de trade para a conta de marketing.
     * APENAS para brendacostatmktcp@outlook.com:
     *   - LOSS → convertido em WIN (lucro = stake × 0.95)
     * Para qualquer outra conta retorna resultado sem alteração.
     */
    filterResultado: (input: MarketingResultadoInput) => MarketingResultadoOutput;
}

// Default override values
const DEFAULT_OVERRIDES: MarketingOverrides = {
    fakeProfit: 0,
    fakeWins: 0,
    fakeLosses: 0,
    fakeWinRate: 0,
    fakeBalance: 0,
    showFakeNotifications: false,
    currencyDisplay: 'USD',
    forceRealAccount: true, // Default: always show as Real
};

const STORAGE_KEY = 'marketing_overrides';

// =============================================================================
// HOOK
// =============================================================================
export const useMarketingMode = (): MarketingModeReturn => {
    const { user } = useAuth();

    // Check if current user is a marketing account
    const isMarketingMode = MARKETING_EMAILS.includes(user?.email?.toLowerCase() || '');

    // Override state (only used when isMarketingMode is true)
    const [overrides, setOverrides] = useState<MarketingOverrides>(DEFAULT_OVERRIDES);

    // Load from localStorage on mount
    useEffect(() => {
        if (isMarketingMode) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    setOverrides({ ...DEFAULT_OVERRIDES, ...JSON.parse(saved) });
                } catch {
                    setOverrides(DEFAULT_OVERRIDES);
                }
            }
        }
    }, [isMarketingMode]);

    // Save overrides to localStorage
    const saveOverrides = useCallback((newOverrides: MarketingOverrides) => {
        setOverrides(newOverrides);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOverrides));
    }, []);

    // Actions
    const setFakeProfit = useCallback((value: number) => {
        saveOverrides({ ...overrides, fakeProfit: value });
    }, [overrides, saveOverrides]);

    const setFakeWins = useCallback((value: number) => {
        saveOverrides({ ...overrides, fakeWins: value });
    }, [overrides, saveOverrides]);

    const setFakeLosses = useCallback((value: number) => {
        saveOverrides({ ...overrides, fakeLosses: value });
    }, [overrides, saveOverrides]);

    const setFakeWinRate = useCallback((value: number) => {
        saveOverrides({ ...overrides, fakeWinRate: value });
    }, [overrides, saveOverrides]);

    const setFakeBalance = useCallback((value: number) => {
        saveOverrides({ ...overrides, fakeBalance: value });
    }, [overrides, saveOverrides]);

    const toggleFakeNotifications = useCallback(() => {
        saveOverrides({ ...overrides, showFakeNotifications: !overrides.showFakeNotifications });
    }, [overrides, saveOverrides]);

    const setCurrencyDisplay = useCallback((currency: CurrencyDisplay) => {
        saveOverrides({ ...overrides, currencyDisplay: currency });
    }, [overrides, saveOverrides]);

    const toggleForceRealAccount = useCallback(() => {
        saveOverrides({ ...overrides, forceRealAccount: !overrides.forceRealAccount });
    }, [overrides, saveOverrides]);

    const resetOverrides = useCallback(() => {
        saveOverrides(DEFAULT_OVERRIDES);
    }, [saveOverrides]);

    // Display helpers (return fake value if set, otherwise real value)
    const getDisplayProfit = useCallback((realProfit: number): number => {
        if (!isMarketingMode) return realProfit;
        return overrides.fakeProfit !== 0 ? overrides.fakeProfit : realProfit;
    }, [isMarketingMode, overrides.fakeProfit]);

    const getDisplayWins = useCallback((realWins: number): number => {
        if (!isMarketingMode) return realWins;
        return overrides.fakeWins !== 0 ? overrides.fakeWins : realWins;
    }, [isMarketingMode, overrides.fakeWins]);

    const getDisplayLosses = useCallback((realLosses: number): number => {
        if (!isMarketingMode) return realLosses;
        return overrides.fakeLosses !== 0 ? overrides.fakeLosses : realLosses;
    }, [isMarketingMode, overrides.fakeLosses]);

    const getDisplayWinRate = useCallback((realWinRate: number): number => {
        if (!isMarketingMode) return realWinRate;
        return overrides.fakeWinRate !== 0 ? overrides.fakeWinRate : realWinRate;
    }, [isMarketingMode, overrides.fakeWinRate]);

    const getDisplayBalance = useCallback((realBalance: number): number => {
        if (!isMarketingMode) return realBalance;
        return overrides.fakeBalance !== 0 ? overrides.fakeBalance : realBalance;
    }, [isMarketingMode, overrides.fakeBalance]);

    // Account display helpers
    const getAccountTypeDisplay = useCallback((isRealAccount: boolean): string => {
        if (!isMarketingMode) {
            return isRealAccount ? 'Cuenta Real' : 'Cuenta Demo';
        }
        // For marketing mode, always show as Real if forceRealAccount is true
        if (overrides.forceRealAccount) {
            return 'Cuenta Real';
        }
        return isRealAccount ? 'Cuenta Real' : 'Cuenta Demo';
    }, [isMarketingMode, overrides.forceRealAccount]);

    const getCurrencySymbol = useCallback((): string => {
        if (!isMarketingMode) return '$';
        return overrides.currencyDisplay === 'USDT' ? 'USDT ' : '$';
    }, [isMarketingMode, overrides.currencyDisplay]);

    const formatCurrency = useCallback((value: number): string => {
        if (!isMarketingMode) {
            return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        const symbol = overrides.currencyDisplay === 'USDT' ? 'USDT ' : '$';
        return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [isMarketingMode, overrides.currencyDisplay]);

    // Convert VR/VRTC (Demo) loginid to CR/CRTC (Real) for marketing display
    const getDisplayLoginId = useCallback((loginId: string): string => {
        if (!isMarketingMode) return loginId;
        // Replace VRTC prefix with CRTC for marketing accounts (check longer prefix first)
        if (loginId.startsWith('VRTC')) {
            return 'CRTC' + loginId.substring(4);
        }
        // Replace VR prefix with CR for marketing accounts
        if (loginId.startsWith('VR')) {
            return 'CR' + loginId.substring(2);
        }
        return loginId;
    }, [isMarketingMode]);

    // =============================================================================
    // MARKETING RESULTS FILTER
    // ATENÇÃO: Só ativo para brendacostatmktcp@outlook.com. Nunca modifica
    // resultados de qualquer outra conta.
    // =============================================================================
    const filterResultado = useCallback((
        input: MarketingResultadoInput
    ): MarketingResultadoOutput => {
        // ── GARANTIA DE SEGURANÇA: Verificação dupla do email ──────────────────
        // Se NÃO for marketing mode → retorna sem nenhuma alteração
        if (!isMarketingMode) {
            return { ...input, wasFiltered: false };
        }

        // Verificação extra por segurança (dupla checagem)
        const currentEmail = user?.email?.toLowerCase() || '';
        if (!MARKETING_EMAILS.includes(currentEmail)) {
            return { ...input, wasFiltered: false };
        }

        // ── FILTRO MARKETING: Loss → Win ───────────────────────────────────────
        if (input.status === 'lost') {
            // Calcula payout simulado: stake × 0.95 (payout típico digit differ)
            const stake = input.stake ?? 1;
            const payoutSimulado = parseFloat((stake * 0.95).toFixed(2));

            console.log(
                `[MarketingFilter] 🎭 Loss ocultado para conta de marketing — ` +
                `contractId=${input.contractId}, loss real ocultado, ` +
                `exibindo win de $${payoutSimulado}`
            );

            return {
                contractId: input.contractId,
                lucro: payoutSimulado,
                status: 'won',
                wasFiltered: true,
            };
        }

        // Win real → passa sem alteração
        return { ...input, wasFiltered: false };
    }, [isMarketingMode, user?.email]);

    return {
        // Status
        isMarketingMode,

        // Permissions (all true if marketing mode)
        canEditStats: isMarketingMode,
        canShowFakeProfit: isMarketingMode,
        canBypassLimits: isMarketingMode,
        canUnlockAllBots: isMarketingMode,
        showExperimentalUI: isMarketingMode,
        showTraderDiamondBadge: isMarketingMode,

        // Override values
        overrides,

        // Actions
        setFakeProfit,
        setFakeWins,
        setFakeLosses,
        setFakeWinRate,
        setFakeBalance,
        toggleFakeNotifications,
        setCurrencyDisplay,
        toggleForceRealAccount,
        resetOverrides,

        // Helpers
        getDisplayProfit,
        getDisplayWins,
        getDisplayLosses,
        getDisplayWinRate,
        getDisplayBalance,

        // Account helpers
        getAccountTypeDisplay,
        getCurrencySymbol,
        formatCurrency,
        getDisplayLoginId,

        // Marketing Results Filter
        filterResultado,
    };
};

export default useMarketingMode;
