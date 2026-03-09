/**
 * StreakDetector - Detección de secuencias consecutivas de even/odd
 * 
 * Detecta cuando hay 3+ dígitos consecutivos del mismo tipo (par o impar).
 * Proporciona flag cuando se alcanza exactamente el 3er consecutivo (trigger).
 */

export interface StreakStatus {
    currentStreak: number;
    streakType: 'EVEN' | 'ODD' | null;
    hasMinimumStreak: boolean; // >= 3 consecutivos
    isThirdConsecutive: boolean; // Exactamente el 3er consecutivo (trigger)
    lastDigit: number | null;
    history: Array<{ digit: number; type: 'EVEN' | 'ODD' }>;
}

export class StreakDetector {
    private readonly MIN_STREAK = 3;
    private readonly HISTORY_SIZE = 20;

    private currentStreak: number = 0;
    private streakType: 'EVEN' | 'ODD' | null = null;
    private lastDigit: number | null = null;
    private history: Array<{ digit: number; type: 'EVEN' | 'ODD' }> = [];

    constructor() {
        this.reset();
    }

    /**
     * Resetear detector
     */
    reset(): void {
        this.currentStreak = 0;
        this.streakType = null;
        this.lastDigit = null;
        this.history = [];
    }

    /**
     * Procesar un nuevo dígito y actualizar streak
     */
    processDigit(digit: number): StreakStatus {
        const currentType: 'EVEN' | 'ODD' = digit % 2 === 0 ? 'EVEN' : 'ODD';
        this.lastDigit = digit;

        // Agregar a historial
        this.history.push({ digit, type: currentType });
        if (this.history.length > this.HISTORY_SIZE) {
            this.history.shift();
        }

        let isThirdConsecutive = false;

        // Verificar si continúa el streak o se reinicia
        if (this.streakType === currentType) {
            this.currentStreak++;
            // Marcar si es exactamente el 3er consecutivo
            if (this.currentStreak === this.MIN_STREAK) {
                isThirdConsecutive = true;
            }
        } else {
            // Nuevo streak
            this.streakType = currentType;
            this.currentStreak = 1;
        }

        return this.getStatus(isThirdConsecutive);
    }

    /**
     * Obtener estado actual del streak
     */
    getStatus(isThirdConsecutive: boolean = false): StreakStatus {
        return {
            currentStreak: this.currentStreak,
            streakType: this.streakType,
            hasMinimumStreak: this.currentStreak >= this.MIN_STREAK,
            isThirdConsecutive,
            lastDigit: this.lastDigit,
            history: [...this.history]
        };
    }

    /**
     * Obtener estado actual sin procesar nuevo dígito
     */
    getCurrentStatus(): StreakStatus {
        return this.getStatus(false);
    }

    /**
     * Verificar si el streak actual es del lado "fuerte" dado un tipo
     * El lado fuerte es el que tiene el streak activo
     */
    isStrongSide(type: 'EVEN' | 'ODD'): boolean {
        return this.streakType === type && this.hasMinimumStreak();
    }

    /**
     * Obtener el lado "débil" (opuesto al streak actual)
     * Para estrategia de regresión a la media
     */
    getWeakSide(): 'EVEN' | 'ODD' | null {
        if (!this.hasMinimumStreak() || !this.streakType) {
            return null;
        }
        return this.streakType === 'EVEN' ? 'ODD' : 'EVEN';
    }

    /**
     * Verificar si hay streak mínimo
     */
    hasMinimumStreak(): boolean {
        return this.currentStreak >= this.MIN_STREAK;
    }

    /**
     * Obtener el streak actual como número
     */
    getStreakCount(): number {
        return this.currentStreak;
    }

    /**
     * Obtener tipo del streak actual
     */
    getStreakType(): 'EVEN' | 'ODD' | null {
        return this.streakType;
    }

    /**
     * Obtener historial de los últimos N dígitos
     */
    getHistory(limit?: number): Array<{ digit: number; type: 'EVEN' | 'ODD' }> {
        if (limit) {
            return this.history.slice(-limit);
        }
        return [...this.history];
    }

    /**
     * Analizar historial para encontrar el streak más largo
     */
    getLongestStreakInHistory(): { count: number; type: 'EVEN' | 'ODD' | null } {
        if (this.history.length === 0) {
            return { count: 0, type: null };
        }

        let maxStreak = 1;
        let maxType: 'EVEN' | 'ODD' = this.history[0].type;
        let currentCount = 1;
        let currentType = this.history[0].type;

        for (let i = 1; i < this.history.length; i++) {
            if (this.history[i].type === currentType) {
                currentCount++;
                if (currentCount > maxStreak) {
                    maxStreak = currentCount;
                    maxType = currentType;
                }
            } else {
                currentType = this.history[i].type;
                currentCount = 1;
            }
        }

        return { count: maxStreak, type: maxType };
    }
}
