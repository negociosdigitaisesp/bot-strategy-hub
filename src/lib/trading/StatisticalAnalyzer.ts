/**
 * StatisticalAnalyzer - Análisis estadístico Chi-Cuadrado para dígitos
 * 
 * Implementa:
 * - Buffer circular de 200 ticks
 * - Cálculo de frecuencia de dígitos (0-9)
 * - Test Chi-Cuadrado para detectar desviaciones significativas
 * - Detección de dígitos sub-representados para estrategia de regresión a la media
 */

export interface DigitFrequency {
    digit: number;
    count: number;
    percentage: number;
    deviation: number; // Desviación del 10% esperado
    zScore: number;    // Z-Score para esta frecuencia
}

export interface StatisticalResult {
    frequencies: DigitFrequency[];
    chiSquared: number;
    pValue: number;
    standardDeviation: number;
    evenPercentage: number;
    oddPercentage: number;
    hasSignificantDeviation: boolean;
    signalType: 'EVEN' | 'ODD' | 'DIGIT' | null;
    signalDigit: number | null;
    confidence: number;
    tickCount: number;
}

export class StatisticalAnalyzer {
    private readonly BUFFER_SIZE = 200;
    private readonly EXPECTED_PERCENTAGE = 10; // 10% por dígito en distribución uniforme
    private readonly SIGMA_THRESHOLD = 1.5; // 1.5 sigma para señal de entrada (más frecuente)

    private tickBuffer: number[] = [];
    private digitCounts: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    constructor() {
        this.reset();
    }

    /**
     * Resetear todos los contadores y buffers
     */
    reset(): void {
        this.tickBuffer = [];
        this.digitCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    /**
     * Procesar un nuevo tick y actualizar estadísticas
     */
    processTick(price: number): StatisticalResult {
        // Extraer último dígito del precio
        const priceStr = price.toFixed(2);
        const lastDigit = parseInt(priceStr.charAt(priceStr.length - 1));

        // Si el buffer está lleno, remover el más antiguo
        if (this.tickBuffer.length >= this.BUFFER_SIZE) {
            const removedDigit = this.tickBuffer.shift()!;
            this.digitCounts[removedDigit]--;
        }

        // Agregar nuevo dígito
        this.tickBuffer.push(lastDigit);
        this.digitCounts[lastDigit]++;

        return this.analyze();
    }

    /**
     * Analizar la distribución actual
     */
    analyze(): StatisticalResult {
        const totalTicks = this.tickBuffer.length;

        if (totalTicks < 20) {
            return this.getEmptyResult(totalTicks);
        }

        // Calcular frecuencias y desviaciones
        const frequencies: DigitFrequency[] = this.digitCounts.map((count, digit) => {
            const percentage = (count / totalTicks) * 100;
            const expectedCount = totalTicks * 0.1;
            const deviation = percentage - this.EXPECTED_PERCENTAGE;

            // Z-Score: (observado - esperado) / sqrt(esperado)
            const zScore = expectedCount > 0
                ? (count - expectedCount) / Math.sqrt(expectedCount)
                : 0;

            return {
                digit,
                count,
                percentage,
                deviation,
                zScore
            };
        });

        // Calcular Chi-Cuadrado
        const chiSquared = this.calculateChiSquared(frequencies, totalTicks);

        // P-Value aproximado para chi-cuadrado con 9 grados de libertad
        const pValue = this.chiSquaredPValue(chiSquared, 9);

        // Desviación estándar de las frecuencias
        const standardDeviation = this.calculateStdDev(frequencies);

        // Even/Odd percentages
        const evenCount = [0, 2, 4, 6, 8].reduce((sum, d) => sum + this.digitCounts[d], 0);
        const oddCount = [1, 3, 5, 7, 9].reduce((sum, d) => sum + this.digitCounts[d], 0);
        const evenPercentage = totalTicks > 0 ? (evenCount / totalTicks) * 100 : 50;
        const oddPercentage = totalTicks > 0 ? (oddCount / totalTicks) * 100 : 50;

        // Detectar señal
        const signal = this.detectSignal(frequencies, evenPercentage, oddPercentage);

        return {
            frequencies,
            chiSquared,
            pValue,
            standardDeviation,
            evenPercentage,
            oddPercentage,
            hasSignificantDeviation: signal.hasSignal,
            signalType: signal.type,
            signalDigit: signal.digit,
            confidence: signal.confidence,
            tickCount: totalTicks
        };
    }

    /**
     * Calcular estadístico Chi-Cuadrado
     */
    private calculateChiSquared(frequencies: DigitFrequency[], totalTicks: number): number {
        const expectedCount = totalTicks * 0.1;

        if (expectedCount === 0) return 0;

        return frequencies.reduce((sum, f) => {
            const diff = f.count - expectedCount;
            return sum + (diff * diff) / expectedCount;
        }, 0);
    }

    /**
     * P-Value aproximado usando aproximación de Wilson-Hilferty
     */
    private chiSquaredPValue(chiSquared: number, df: number): number {
        if (chiSquared <= 0) return 1;

        // Aproximación usando distribución normal
        const z = Math.pow((chiSquared / df), 1 / 3) - (1 - 2 / (9 * df));
        const normalizedZ = z / Math.sqrt(2 / (9 * df));

        // CDF de normal estándar aproximada
        const pValue = 1 - this.normalCDF(normalizedZ);
        return Math.max(0, Math.min(1, pValue));
    }

    /**
     * CDF de distribución normal estándar (aproximación)
     */
    private normalCDF(z: number): number {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;

        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2);

        const t = 1.0 / (1.0 + p * z);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

        return 0.5 * (1.0 + sign * y);
    }

    /**
     * Calcular desviación estándar de las frecuencias
     */
    private calculateStdDev(frequencies: DigitFrequency[]): number {
        const mean = frequencies.reduce((sum, f) => sum + f.percentage, 0) / 10;
        const variance = frequencies.reduce((sum, f) => {
            const diff = f.percentage - mean;
            return sum + (diff * diff);
        }, 0) / 10;

        return Math.sqrt(variance);
    }

    /**
     * Detectar señal de trading basada en desviación estadística
     */
    private detectSignal(
        frequencies: DigitFrequency[],
        evenPct: number,
        oddPct: number
    ): { hasSignal: boolean; type: 'EVEN' | 'ODD' | 'DIGIT' | null; digit: number | null; confidence: number } {

        // 1. Verificar Even/Odd - apostar al sub-representado
        const evenOddDeviation = Math.abs(evenPct - 50);
        const evenOddZScore = Math.abs((evenPct - 50) / 5); // ~5% desv estándar esperada

        if (evenOddZScore > this.SIGMA_THRESHOLD) {
            // Si pares están sub-representados, apostar a pares (regresión a la media)
            if (evenPct < 50) {
                return {
                    hasSignal: true,
                    type: 'EVEN',
                    digit: null,
                    confidence: Math.min(99, 50 + evenOddZScore * 10)
                };
            } else {
                return {
                    hasSignal: true,
                    type: 'ODD',
                    digit: null,
                    confidence: Math.min(99, 50 + evenOddZScore * 10)
                };
            }
        }

        // 2. Verificar DIGITDIFF - encontrar dígito más sub-representado
        const sortedByDeviation = [...frequencies].sort((a, b) => a.deviation - b.deviation);
        const mostUnderRepresented = sortedByDeviation[0];

        if (Math.abs(mostUnderRepresented.zScore) > this.SIGMA_THRESHOLD && mostUnderRepresented.deviation < 0) {
            return {
                hasSignal: true,
                type: 'DIGIT',
                digit: mostUnderRepresented.digit,
                confidence: Math.min(99, 50 + Math.abs(mostUnderRepresented.zScore) * 10)
            };
        }

        return {
            hasSignal: false,
            type: null,
            digit: null,
            confidence: 0
        };
    }

    /**
     * Resultado vacío para cuando no hay suficientes datos
     */
    private getEmptyResult(tickCount: number): StatisticalResult {
        return {
            frequencies: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => ({
                digit,
                count: this.digitCounts[digit],
                percentage: 0,
                deviation: 0,
                zScore: 0
            })),
            chiSquared: 0,
            pValue: 1,
            standardDeviation: 0,
            evenPercentage: 50,
            oddPercentage: 50,
            hasSignificantDeviation: false,
            signalType: null,
            signalDigit: null,
            confidence: 0,
            tickCount
        };
    }

    /**
     * Obtener último dígito del buffer
     */
    getLastDigit(): number | null {
        return this.tickBuffer.length > 0
            ? this.tickBuffer[this.tickBuffer.length - 1]
            : null;
    }

    /**
     * Obtener los últimos N dígitos
     */
    getLastDigits(n: number = 20): number[] {
        return this.tickBuffer.slice(-n);
    }

    /**
     * Obtener cantidad de ticks en buffer
     */
    getTickCount(): number {
        return this.tickBuffer.length;
    }
}
