/**
 * DiffersStrategy - Estrategia secundaria DIFFERS/OVER-UNDER
 * 
 * Implementa 3 variantes específicas basadas en barras verdes/rojas del heatmap:
 * 
 * Variant A: Green bar en 0 (≥12%), Red bar en 7 (≤7.7%), Pointer = 9 → Trade OVER 8
 * Variant B: Green bar en 4, Red bar en 8, Pointer = 8 → Trade OVER 8
 * Variant C: Green bar en 0, Red bar en 3, Pointer = 3 → Trade OVER 8
 */

export interface DigitPercentage {
    digit: number;
    percentage: number;
}

export interface DiffersSignal {
    variant: 'A' | 'B' | 'C';
    trade: 'DIGITOVER';
    barrier: number; // 8 para OVER 8
    conditions: {
        greenBar: { digit: number; percentage: number; threshold: number };
        redBar: { digit: number; percentage: number; threshold: number };
        pointer: { digit: number; current: number };
    };
    confidence: number;
}

export interface DiffersConditions {
    variantA: boolean;
    variantB: boolean;
    variantC: boolean;
    activeVariant: 'A' | 'B' | 'C' | null;
    signal: DiffersSignal | null;
}

export class DiffersStrategy {
    // Thresholds para detección de barras
    private readonly GREEN_THRESHOLD = 12; // ≥12% es "green bar"
    private readonly RED_THRESHOLD = 7.7;   // ≤7.7% es "red bar"

    constructor() { }

    /**
     * Analizar condiciones de las 3 variantes
     */
    analyze(frequencies: DigitPercentage[], currentPointer: number): DiffersConditions {
        // Crear mapa de dígito -> porcentaje
        const pctMap: Record<number, number> = {};
        frequencies.forEach(f => {
            pctMap[f.digit] = f.percentage;
        });

        // Verificar Variant A
        const variantA = this.checkVariantA(pctMap, currentPointer);

        // Verificar Variant B
        const variantB = this.checkVariantB(pctMap, currentPointer);

        // Verificar Variant C
        const variantC = this.checkVariantC(pctMap, currentPointer);

        // Determinar variante activa (prioridad: A > B > C)
        let activeVariant: 'A' | 'B' | 'C' | null = null;
        let signal: DiffersSignal | null = null;

        if (variantA.isValid) {
            activeVariant = 'A';
            signal = variantA.signal;
        } else if (variantB.isValid) {
            activeVariant = 'B';
            signal = variantB.signal;
        } else if (variantC.isValid) {
            activeVariant = 'C';
            signal = variantC.signal;
        }

        return {
            variantA: variantA.isValid,
            variantB: variantB.isValid,
            variantC: variantC.isValid,
            activeVariant,
            signal
        };
    }

    /**
     * Variant A: Green 0 (≥12%), Red 7 (≤7.7%), Pointer = 9 → OVER 8
     */
    private checkVariantA(pctMap: Record<number, number>, pointer: number): { isValid: boolean; signal: DiffersSignal | null } {
        const digit0Pct = pctMap[0] || 0;
        const digit7Pct = pctMap[7] || 0;

        const greenOk = digit0Pct >= this.GREEN_THRESHOLD;
        const redOk = digit7Pct <= this.RED_THRESHOLD;
        const pointerOk = pointer === 9;

        const isValid = greenOk && redOk && pointerOk;

        if (!isValid) {
            return { isValid: false, signal: null };
        }

        return {
            isValid: true,
            signal: {
                variant: 'A',
                trade: 'DIGITOVER',
                barrier: 8,
                conditions: {
                    greenBar: { digit: 0, percentage: digit0Pct, threshold: this.GREEN_THRESHOLD },
                    redBar: { digit: 7, percentage: digit7Pct, threshold: this.RED_THRESHOLD },
                    pointer: { digit: 9, current: pointer }
                },
                confidence: this.calculateConfidence(digit0Pct, digit7Pct)
            }
        };
    }

    /**
     * Variant B: Green 4, Red 8, Pointer = 8 → OVER 8
     */
    private checkVariantB(pctMap: Record<number, number>, pointer: number): { isValid: boolean; signal: DiffersSignal | null } {
        const digit4Pct = pctMap[4] || 0;
        const digit8Pct = pctMap[8] || 0;

        const greenOk = digit4Pct >= this.GREEN_THRESHOLD;
        const redOk = digit8Pct <= this.RED_THRESHOLD;
        const pointerOk = pointer === 8;

        const isValid = greenOk && redOk && pointerOk;

        if (!isValid) {
            return { isValid: false, signal: null };
        }

        return {
            isValid: true,
            signal: {
                variant: 'B',
                trade: 'DIGITOVER',
                barrier: 8,
                conditions: {
                    greenBar: { digit: 4, percentage: digit4Pct, threshold: this.GREEN_THRESHOLD },
                    redBar: { digit: 8, percentage: digit8Pct, threshold: this.RED_THRESHOLD },
                    pointer: { digit: 8, current: pointer }
                },
                confidence: this.calculateConfidence(digit4Pct, digit8Pct)
            }
        };
    }

    /**
     * Variant C: Green 0, Red 3, Pointer = 3 → OVER 8
     */
    private checkVariantC(pctMap: Record<number, number>, pointer: number): { isValid: boolean; signal: DiffersSignal | null } {
        const digit0Pct = pctMap[0] || 0;
        const digit3Pct = pctMap[3] || 0;

        const greenOk = digit0Pct >= this.GREEN_THRESHOLD;
        const redOk = digit3Pct <= this.RED_THRESHOLD;
        const pointerOk = pointer === 3;

        const isValid = greenOk && redOk && pointerOk;

        if (!isValid) {
            return { isValid: false, signal: null };
        }

        return {
            isValid: true,
            signal: {
                variant: 'C',
                trade: 'DIGITOVER',
                barrier: 8,
                conditions: {
                    greenBar: { digit: 0, percentage: digit0Pct, threshold: this.GREEN_THRESHOLD },
                    redBar: { digit: 3, percentage: digit3Pct, threshold: this.RED_THRESHOLD },
                    pointer: { digit: 3, current: pointer }
                },
                confidence: this.calculateConfidence(digit0Pct, digit3Pct)
            }
        };
    }

    /**
     * Calcular confidence basado en qué tan fuertes son las barras
     */
    private calculateConfidence(greenPct: number, redPct: number): number {
        // Mayor diferencia = mayor confidence
        const greenStrength = (greenPct - this.GREEN_THRESHOLD) / this.GREEN_THRESHOLD;
        const redStrength = (this.RED_THRESHOLD - redPct) / this.RED_THRESHOLD;

        // Confidence base 60% + hasta 30% por fuerza de barras
        const baseConfidence = 60;
        const bonusConfidence = Math.min(30, (greenStrength + redStrength) * 15);

        return Math.min(95, baseConfidence + bonusConfidence);
    }

    /**
     * Obtener descripción de la señal para logs
     */
    getSignalDescription(signal: DiffersSignal): string {
        const { variant, conditions } = signal;
        return `DIFFERS-${variant}: Green[${conditions.greenBar.digit}]=${conditions.greenBar.percentage.toFixed(1)}% ` +
            `Red[${conditions.redBar.digit}]=${conditions.redBar.percentage.toFixed(1)}% ` +
            `Pointer=${conditions.pointer.current} → OVER 8`;
    }
}
