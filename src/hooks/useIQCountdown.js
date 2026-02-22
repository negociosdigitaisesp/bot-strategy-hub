/**
 * useIQCountdown.js
 * Hook simples que calcula a contagem regressiva até o próximo
 * minuto completo — usado em IQBotStatus para exibir "PRÓXIMA ENTRADA EM MM:SS".
 *
 * Lógica: 60 - segundos_atuais = segundos restantes no minuto.
 * isUrgent = true quando seconds <= 10 (aciona animação iqCountdown).
 *
 * Cleanup: limpa o interval no unmount para evitar memory leaks.
 */

import { useState, useEffect } from 'react';

/**
 * Formata número de segundos como "MM:SS" com zero à esquerda.
 * @param {number} totalSegundos
 * @returns {string} Ex: "00:23"
 */
function formatarContagem(totalSegundos) {
    const m = Math.floor(totalSegundos / 60);
    const s = totalSegundos % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Hook para contagem regressiva até o próximo minuto completo.
 * @returns {{ countdown: string, isUrgent: boolean, segundos: number }}
 */
export function useIQCountdown() {
    const calcularSegundos = () => 60 - new Date().getSeconds();

    const [segundos, setSegundos] = useState(calcularSegundos);

    useEffect(() => {
        /* Atualiza a cada segundo */
        const intervalId = setInterval(() => {
            setSegundos(calcularSegundos());
        }, 1000);

        /* Cleanup obrigatório — evita memory leak */
        return () => clearInterval(intervalId);
    }, []);

    return {
        countdown: formatarContagem(segundos),
        isUrgent: segundos <= 10,
        segundos,
    };
}

export default useIQCountdown;
