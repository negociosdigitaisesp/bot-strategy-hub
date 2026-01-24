/**
 * PatternHeatmap - Análisis de patrones de pares de dígitos consecutivos
 * 
 * Para cada par de dígitos consecutivos (ej: "38"), registra si el siguiente
 * dígito fue par o impar, calculando confidence para predicciones.
 * 
 * Solo usa patterns con sample size mínimo de 10 ocurrencias.
 */

export interface PatternData {
    nextEven: number;
    nextOdd: number;
    total: number;
    confidence: number; // (vencedoras / total) * 100
    direction: 'EVEN' | 'ODD' | null;
}

export interface PatternPrediction {
    pattern: string;
    direction: 'EVEN' | 'ODD';
    confidence: number;
    sampleSize: number;
}

export class PatternHeatmap {
    private readonly MIN_SAMPLE_SIZE = 10;
    private patternMap: Map<string, PatternData> = new Map();
    private lastTwoDigits: number[] = [];

    constructor() {
        this.reset();
    }

    /**
     * Resetear todos los patterns
     */
    reset(): void {
        this.patternMap = new Map();
        this.lastTwoDigits = [];
    }

    /**
     * Procesar un nuevo dígito y actualizar patterns
     */
    processDigit(digit: number): void {
        const isEven = digit % 2 === 0;

        // Si tenemos al menos 2 dígitos previos, podemos registrar un pattern
        if (this.lastTwoDigits.length === 2) {
            const pattern = this.getPatternKey(this.lastTwoDigits[0], this.lastTwoDigits[1]);
            this.updatePattern(pattern, isEven);
        }

        // Actualizar últimos 2 dígitos
        this.lastTwoDigits.push(digit);
        if (this.lastTwoDigits.length > 2) {
            this.lastTwoDigits.shift();
        }
    }

    /**
     * Obtener clave del pattern
     */
    private getPatternKey(digit1: number, digit2: number): string {
        return `${digit1}${digit2}`;
    }

    /**
     * Actualizar datos del pattern
     */
    private updatePattern(pattern: string, nextIsEven: boolean): void {
        let data = this.patternMap.get(pattern);

        if (!data) {
            data = {
                nextEven: 0,
                nextOdd: 0,
                total: 0,
                confidence: 0,
                direction: null
            };
        }

        if (nextIsEven) {
            data.nextEven++;
        } else {
            data.nextOdd++;
        }
        data.total++;

        // Calcular confidence y dirección
        const evenPct = (data.nextEven / data.total) * 100;
        const oddPct = (data.nextOdd / data.total) * 100;

        if (evenPct > oddPct) {
            data.direction = 'EVEN';
            data.confidence = evenPct;
        } else if (oddPct > evenPct) {
            data.direction = 'ODD';
            data.confidence = oddPct;
        } else {
            data.direction = null;
            data.confidence = 50;
        }

        this.patternMap.set(pattern, data);
    }

    /**
     * Verificar si pattern tiene sample size mínimo
     */
    hasMinimumSampleSize(digit1: number, digit2: number): boolean {
        const pattern = this.getPatternKey(digit1, digit2);
        const data = this.patternMap.get(pattern);
        return data ? data.total >= this.MIN_SAMPLE_SIZE : false;
    }

    /**
     * Obtener predicción del pattern actual
     * Retorna null si no hay suficiente data o confidence < umbral
     */
    getPatternPrediction(digit1: number, digit2: number, minConfidence: number = 70): PatternPrediction | null {
        const pattern = this.getPatternKey(digit1, digit2);
        const data = this.patternMap.get(pattern);

        if (!data || data.total < this.MIN_SAMPLE_SIZE || !data.direction) {
            return null;
        }

        if (data.confidence < minConfidence) {
            return null;
        }

        return {
            pattern,
            direction: data.direction,
            confidence: data.confidence,
            sampleSize: data.total
        };
    }

    /**
     * Obtener predicción basada en los últimos 2 dígitos
     */
    getCurrentPrediction(minConfidence: number = 70): PatternPrediction | null {
        if (this.lastTwoDigits.length < 2) {
            return null;
        }
        return this.getPatternPrediction(
            this.lastTwoDigits[0],
            this.lastTwoDigits[1],
            minConfidence
        );
    }

    /**
     * Obtener datos de un pattern específico
     */
    getPatternData(digit1: number, digit2: number): PatternData | null {
        const pattern = this.getPatternKey(digit1, digit2);
        return this.patternMap.get(pattern) || null;
    }

    /**
     * Obtener todos los patterns como objeto para UI
     */
    getAllPatterns(): Record<string, PatternData> {
        const result: Record<string, PatternData> = {};
        this.patternMap.forEach((data, key) => {
            result[key] = { ...data };
        });
        return result;
    }

    /**
     * Obtener patterns ordenados por confidence (top patterns)
     */
    getTopPatterns(limit: number = 10): Array<{ pattern: string; data: PatternData }> {
        const patterns = Array.from(this.patternMap.entries())
            .filter(([_, data]) => data.total >= this.MIN_SAMPLE_SIZE)
            .map(([pattern, data]) => ({ pattern, data }))
            .sort((a, b) => b.data.confidence - a.data.confidence)
            .slice(0, limit);

        return patterns;
    }

    /**
     * Obtener últimos 2 dígitos
     */
    getLastTwoDigits(): number[] {
        return [...this.lastTwoDigits];
    }

    /**
     * Obtener estadísticas generales del heatmap
     */
    getStats(): { totalPatterns: number; validPatterns: number; avgConfidence: number } {
        let validPatterns = 0;
        let totalConfidence = 0;

        this.patternMap.forEach((data) => {
            if (data.total >= this.MIN_SAMPLE_SIZE) {
                validPatterns++;
                totalConfidence += data.confidence;
            }
        });

        return {
            totalPatterns: this.patternMap.size,
            validPatterns,
            avgConfidence: validPatterns > 0 ? totalConfidence / validPatterns : 0
        };
    }
}
