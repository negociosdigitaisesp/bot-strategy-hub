import { useState, useEffect } from 'react';

/**
 * useIQCountdown — Contagem regressiva reutilizável.
 * @param {number} initialSeconds - Segundos iniciais
 * @param {boolean} autoStart - Iniciar automaticamente
 */
export function useIQCountdown(initialSeconds = 0, autoStart = false) {
    const [remaining, setRemaining] = useState(initialSeconds);
    const [running, setRunning] = useState(autoStart);

    useEffect(() => {
        if (!running || remaining <= 0) return;

        const interval = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [running, remaining]);

    const start = (seconds) => {
        if (seconds !== undefined) setRemaining(seconds);
        setRunning(true);
    };

    const stop = () => setRunning(false);

    const restart = (seconds) => {
        setRemaining(seconds ?? initialSeconds);
        setRunning(true);
    };

    const formatted = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

    return { remaining, formatted, running, start, stop, restart };
}
