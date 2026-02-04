import { useState, useEffect, useCallback } from 'react';

const COOLDOWN_KEY_PREFIX = 'bot_cooldown_';

interface UseCooldownReturn {
    isCooldown: boolean;
    remainingSeconds: number;
    startCooldown: (durationSeconds: number) => void;
    clearCooldown: () => void;
}

/**
 * Hook para gerenciar cooldown de bots após Stop Loss
 * Persiste o estado no localStorage para sobreviver a refreshes
 */
export const useCooldown = (key: string = 'global'): UseCooldownReturn => {
    const storageKey = `${COOLDOWN_KEY_PREFIX}${key}`;

    const [isCooldown, setIsCooldown] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // Verificar cooldown existente no mount
    useEffect(() => {
        const checkCooldown = () => {
            const endTimeStr = localStorage.getItem(storageKey);
            if (!endTimeStr) {
                setIsCooldown(false);
                setRemainingSeconds(0);
                return;
            }

            const endTime = parseInt(endTimeStr, 10);
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

            if (remaining > 0) {
                setIsCooldown(true);
                setRemainingSeconds(remaining);
            } else {
                // Cooldown expirado
                localStorage.removeItem(storageKey);
                setIsCooldown(false);
                setRemainingSeconds(0);
            }
        };

        checkCooldown();
    }, [storageKey]);

    // Atualizar contador a cada segundo
    useEffect(() => {
        if (!isCooldown || remainingSeconds <= 0) return;

        const interval = setInterval(() => {
            const endTimeStr = localStorage.getItem(storageKey);
            if (!endTimeStr) {
                setIsCooldown(false);
                setRemainingSeconds(0);
                return;
            }

            const endTime = parseInt(endTimeStr, 10);
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

            if (remaining > 0) {
                setRemainingSeconds(remaining);
            } else {
                // Cooldown completado
                localStorage.removeItem(storageKey);
                setIsCooldown(false);
                setRemainingSeconds(0);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isCooldown, remainingSeconds, storageKey]);

    const startCooldown = useCallback((durationSeconds: number) => {
        const endTime = Date.now() + (durationSeconds * 1000);
        localStorage.setItem(storageKey, endTime.toString());
        setIsCooldown(true);
        setRemainingSeconds(durationSeconds);
        console.log(`[Bóveda Inteligente] ❄️ Activada: ${durationSeconds}s`);
    }, [storageKey]);

    const clearCooldown = useCallback(() => {
        localStorage.removeItem(storageKey);
        setIsCooldown(false);
        setRemainingSeconds(0);
        console.log('[Bóveda Inteligente] ✅ Desactivada');
    }, [storageKey]);

    return {
        isCooldown,
        remainingSeconds,
        startCooldown,
        clearCooldown,
    };
};
