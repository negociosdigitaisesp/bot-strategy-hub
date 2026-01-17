import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// --- TIPOS ---
type RiskMode = 'fixed' | 'soros';

interface RiskSettings {
    global_stop_loss: number;
    global_take_profit: number;
    risk_mode: RiskMode;
    soros_levels: number;
    base_stake: number;
    risk_enabled: boolean;
}

interface SafetyCheck {
    allowed: boolean;
    reason?: string;
}

interface RiskSystemReturn {
    // Estado
    isLoading: boolean;
    isEnabled: boolean;
    settings: RiskSettings | null;
    currentStake: number;
    consecutiveWins: number;
    sorosLevel: number;

    // Funciones
    toggleRiskSystem: () => Promise<void>;
    getNextStake: (lastWin: boolean) => number;
    checkSafetyLock: (currentSessionProfit: number) => SafetyCheck;
    resetSorosChain: () => void;
    refetchSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: RiskSettings = {
    global_stop_loss: 50,
    global_take_profit: 100,
    risk_mode: 'fixed',
    soros_levels: 3,
    base_stake: 1,
    risk_enabled: false,
};

/**
 * Hook de Sistema de Gestión de Riesgo Inteligente
 * 
 * Este hook centraliza toda la lógica de gestión de riesgo para todos los bots.
 * Lee las configuraciones del usuario desde Supabase y aplica las reglas de:
 * - Stop Loss Global
 * - Take Profit Global  
 * - Gestión de Banca (Fija o Soros)
 */
export const useRiskSystem = (): RiskSystemReturn => {
    const { user } = useAuth();

    // Estado
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<RiskSettings | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);

    // Soros Chain Tracking
    const [consecutiveWins, setConsecutiveWins] = useState(0);
    const [sorosLevel, setSorosLevel] = useState(0);
    const [currentStake, setCurrentStake] = useState(1);
    const sorosProfitAccumulator = useRef(0);

    // --- CARGAR CONFIGURACIONES ---
    const fetchSettings = useCallback(async () => {
        if (!user) {
            setSettings(DEFAULT_SETTINGS);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('global_stop_loss, global_take_profit, risk_mode, soros_levels, base_stake, risk_enabled')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('[RiskSystem] Error cargando configuración:', error);
                setSettings(DEFAULT_SETTINGS);
            } else if (data) {
                const loadedSettings: RiskSettings = {
                    global_stop_loss: data.global_stop_loss || DEFAULT_SETTINGS.global_stop_loss,
                    global_take_profit: data.global_take_profit || DEFAULT_SETTINGS.global_take_profit,
                    risk_mode: data.risk_mode === 'soros' ? 'soros' : 'fixed',
                    soros_levels: data.soros_levels || DEFAULT_SETTINGS.soros_levels,
                    base_stake: data.base_stake || DEFAULT_SETTINGS.base_stake,
                    risk_enabled: data.risk_enabled ?? false,
                };
                setSettings(loadedSettings);
                setIsEnabled(loadedSettings.risk_enabled);
                setCurrentStake(loadedSettings.base_stake);
                console.log('[RiskSystem] ✅ Configuración cargada:', loadedSettings);
            }
        } catch (err) {
            console.error('[RiskSystem] Error inesperado:', err);
            setSettings(DEFAULT_SETTINGS);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Cargar al montar
    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // --- TOGGLE RISK SYSTEM ---
    const toggleRiskSystem = useCallback(async () => {
        if (!user || !settings) return;

        const newEnabled = !isEnabled;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ risk_enabled: newEnabled })
                .eq('id', user.id);

            if (error) throw error;

            setIsEnabled(newEnabled);
            console.log(`[RiskSystem] ${newEnabled ? '🛡️ GUARDIÁN ACTIVADO' : '⚠️ GUARDIÁN DESACTIVADO'}`);
        } catch (err) {
            console.error('[RiskSystem] Error al cambiar estado:', err);
        }
    }, [user, settings, isEnabled]);

    // --- VERIFICACIÓN DE SEGURIDAD ---
    const checkSafetyLock = useCallback((currentSessionProfit: number): SafetyCheck => {
        // Si el sistema está desactivado, siempre permite
        if (!isEnabled || !settings) {
            return { allowed: true };
        }

        // STOP LOSS: Pérdida máxima alcanzada
        if (currentSessionProfit <= -settings.global_stop_loss) {
            console.log(`[RiskSystem] 🛑 STOP LOSS ACTIVADO | Pérdida: $${Math.abs(currentSessionProfit).toFixed(2)}`);
            return {
                allowed: false,
                reason: `🛑 STOP LOSS ALCANZADO (-$${settings.global_stop_loss.toFixed(2)})`
            };
        }

        // TAKE PROFIT: Meta alcanzada
        if (currentSessionProfit >= settings.global_take_profit) {
            console.log(`[RiskSystem] 🎯 META ALCANZADA | Ganancia: $${currentSessionProfit.toFixed(2)}`);
            return {
                allowed: false,
                reason: `🎯 META DIARIA ALCANZADA (+$${settings.global_take_profit.toFixed(2)})`
            };
        }

        return { allowed: true };
    }, [isEnabled, settings]);

    // --- RESET CADENA SOROS ---
    const resetSorosChain = useCallback(() => {
        setConsecutiveWins(0);
        setSorosLevel(0);
        sorosProfitAccumulator.current = 0;
        if (settings) {
            setCurrentStake(settings.base_stake);
        }
        console.log('[RiskSystem] 🔄 Cadena Soros reiniciada');
    }, [settings]);

    // --- CALCULAR PRÓXIMO STAKE ---
    const getNextStake = useCallback((lastWin: boolean): number => {
        if (!settings) return 1;

        // Sistema desactivado = stake base fijo
        if (!isEnabled) {
            return Math.round(settings.base_stake * 100) / 100;
        }

        // MODO FIJO: Siempre el mismo stake
        if (settings.risk_mode === 'fixed') {
            const stake = Math.round(settings.base_stake * 100) / 100;
            setCurrentStake(stake);
            return stake;
        }

        // MODO SOROS: Interés compuesto
        if (settings.risk_mode === 'soros') {
            if (lastWin) {
                const newWins = consecutiveWins + 1;
                setConsecutiveWins(newWins);

                // ¿Alcanzamos el máximo de niveles?
                if (newWins >= settings.soros_levels) {
                    console.log(`[RiskSystem] 🚀 SOROS COMPLETO (${settings.soros_levels} niveles) - Reiniciando`);
                    resetSorosChain();
                    return Math.round(settings.base_stake * 100) / 100;
                }

                // Calcular próximo nivel
                const profitFromLastTrade = currentStake * 0.9; // ~90% payout
                sorosProfitAccumulator.current += profitFromLastTrade;
                const nextStake = settings.base_stake + sorosProfitAccumulator.current;
                const roundedStake = Math.round(nextStake * 100) / 100;

                setSorosLevel(newWins);
                setCurrentStake(roundedStake);

                console.log(`[RiskSystem] 📈 SOROS Nivel ${newWins}/${settings.soros_levels} | Stake: $${roundedStake}`);
                return roundedStake;
            } else {
                // LOSS: Reiniciar cadena
                console.log('[RiskSystem] ❌ LOSS - Reiniciando cadena Soros');
                resetSorosChain();
                return Math.round(settings.base_stake * 100) / 100;
            }
        }

        return Math.round(settings.base_stake * 100) / 100;
    }, [settings, isEnabled, consecutiveWins, currentStake, resetSorosChain]);

    return {
        isLoading,
        isEnabled,
        settings,
        currentStake,
        consecutiveWins,
        sorosLevel,
        toggleRiskSystem,
        getNextStake,
        checkSafetyLock,
        resetSorosChain,
        refetchSettings: fetchSettings,
    };
};
