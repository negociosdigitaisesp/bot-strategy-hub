/**
 * RiskManager - Gestión de riesgo avanzada para trading
 * 
 * Sistema actualizado con:
 * - Stake FIJO 3% del capital (SIN Martingale)
 * - Stop Loss: 2 pérdidas consecutivas O -8% capital
 * - Take Profit: 7 trades ganadores O +15% capital
 * - Max trades: 10 por sesión
 * - Cooldown: 5 ticks entre trades
 */

export interface TradeRecord {
    id: string;
    timestamp: Date;
    contractType: 'DIGITEVEN' | 'DIGITODD' | 'DIGITDIFF' | 'DIGITOVER' | 'DIGITUNDER';
    digit?: number;
    barrier?: number;
    stake: number;
    payout: number;
    profit: number;
    result: 'WIN' | 'LOSS';
    balance: number;
    conditionsMet: string[];
    signalType?: string;
}

export interface RiskConfig {
    initialCapital: number;
    stakePercentage: number;     // Porcentaje FIJO del capital (3%)
    stopLossPercentage: number;  // Stop loss como % del capital (-8%)
    takeProfitPercentage: number; // Take profit como % del capital (+15%)
    maxConsecutiveLosses: number; // Máximo pérdidas consecutivas (2)
    maxConsecutiveWins: number;   // Máximo wins para TP (7)
    maxTradesPerSession: number;  // Máximo trades por sesión (10)
    cooldownTicks: number;        // Ticks de cooldown entre trades (5)
}

export interface RiskStatus {
    currentCapital: number;
    initialCapital: number;
    totalProfit: number;
    profitPercentage: number;
    currentStake: number;
    consecutiveLosses: number;
    consecutiveWins: number;
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    winRateByType: Record<string, { wins: number; losses: number; rate: number }>;
    isStopLossTriggered: boolean;
    isTakeProfitTriggered: boolean;
    isMaxLossesTriggered: boolean;
    isMaxWinsTriggered: boolean;
    isMaxTradesTriggered: boolean;
    shouldStop: boolean;
    stopReason: string | null;
    ticksSinceLastTrade: number;
    isCooldownActive: boolean;
    bestPattern: string | null;
    sessionStats: SessionStats;
}

export interface SessionStats {
    startTime: Date;
    endTime?: Date;
    totalPnL: number;
    largestWin: number;
    largestLoss: number;
    avgWinSize: number;
    avgLossSize: number;
    winStreak: number;
    lossStreak: number;
    maxWinStreak: number;
    maxLossStreak: number;
}

// Default config para estrategia avançada
const DEFAULT_CONFIG: RiskConfig = {
    initialCapital: 100,
    stakePercentage: 3,           // 3% fixo
    stopLossPercentage: 8,        // -8% capital
    takeProfitPercentage: 15,     // +15% capital
    maxConsecutiveLosses: 2,      // 2 perdas consecutivas
    maxConsecutiveWins: 7,        // 7 wins para TP
    maxTradesPerSession: 10,      // 10 trades por sessão
    cooldownTicks: 5              // 5 ticks cooldown
};

export class RiskManager {
    private config: RiskConfig;
    private tradeHistory: TradeRecord[] = [];
    private currentCapital: number;
    private initialCapital: number;
    private consecutiveLosses: number = 0;
    private consecutiveWins: number = 0;
    private wins: number = 0;
    private losses: number = 0;
    private ticksSinceLastTrade: number = 0;
    private sessionStats: SessionStats;
    private winsByType: Map<string, { wins: number; losses: number }> = new Map();
    private patternWinRates: Map<string, { wins: number; total: number }> = new Map();

    constructor(config: Partial<RiskConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.initialCapital = this.config.initialCapital;
        this.currentCapital = this.config.initialCapital;
        this.sessionStats = this.createEmptySessionStats();
    }

    private createEmptySessionStats(): SessionStats {
        return {
            startTime: new Date(),
            totalPnL: 0,
            largestWin: 0,
            largestLoss: 0,
            avgWinSize: 0,
            avgLossSize: 0,
            winStreak: 0,
            lossStreak: 0,
            maxWinStreak: 0,
            maxLossStreak: 0
        };
    }

    /**
     * Configurar capital inicial
     */
    setInitialCapital(capital: number): void {
        this.initialCapital = capital;
        this.currentCapital = capital;
        this.config.initialCapital = capital;
    }

    /**
     * Actualizar configuración
     */
    updateConfig(config: Partial<RiskConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Calcular stake FIJO (3% do capital)
     * SIN Martingale
     */
    calculateStake(): number {
        const stake = (this.currentCapital * this.config.stakePercentage) / 100;
        return Math.max(0.35, Math.round(stake * 100) / 100); // Mínimo $0.35
    }

    /**
     * Registrar tick para cooldown
     */
    tick(): void {
        this.ticksSinceLastTrade++;
    }

    /**
     * Verificar se cooldown está ativo
     */
    isCooldownActive(): boolean {
        return this.ticksSinceLastTrade < this.config.cooldownTicks;
    }

    /**
     * Verificar si se puede abrir un trade
     */
    canTrade(): { allowed: boolean; reason?: string } {
        const status = this.getStatus();

        // Verificar cooldown
        if (this.isCooldownActive()) {
            return {
                allowed: false,
                reason: `Cooldown activo: ${this.config.cooldownTicks - this.ticksSinceLastTrade} ticks restantes`
            };
        }

        // Verificar max trades por sesión
        if (this.tradeHistory.length >= this.config.maxTradesPerSession) {
            return {
                allowed: false,
                reason: `Máximo de ${this.config.maxTradesPerSession} trades por sesión alcanzado`
            };
        }

        if (status.isStopLossTriggered) {
            return {
                allowed: false,
                reason: `Stop Loss alcanzado (-${this.config.stopLossPercentage}% del capital)`
            };
        }

        if (status.isTakeProfitTriggered) {
            return {
                allowed: false,
                reason: `Take Profit alcanzado (+${this.config.takeProfitPercentage}% del capital)`
            };
        }

        if (status.isMaxLossesTriggered) {
            return {
                allowed: false,
                reason: `Stop: ${this.config.maxConsecutiveLosses} pérdidas consecutivas`
            };
        }

        if (status.isMaxWinsTriggered) {
            return {
                allowed: false,
                reason: `Take Profit: ${this.config.maxConsecutiveWins} victorias alcanzadas`
            };
        }

        const stake = this.calculateStake();
        if (stake > this.currentCapital) {
            return {
                allowed: false,
                reason: 'Capital insuficiente para el stake mínimo'
            };
        }

        if (stake < 0.35) {
            return {
                allowed: false,
                reason: 'Stake mínimo requerido: $0.35'
            };
        }

        return { allowed: true };
    }

    /**
     * Registrar resultado de un trade
     */
    recordTrade(trade: Omit<TradeRecord, 'id' | 'timestamp' | 'balance'>): TradeRecord {
        const isWin = trade.result === 'WIN';

        // Actualizar capital
        this.currentCapital += trade.profit;

        // Actualizar contadores
        if (isWin) {
            this.wins++;
            this.consecutiveWins++;
            this.consecutiveLosses = 0;
            this.sessionStats.winStreak++;
            this.sessionStats.lossStreak = 0;
            if (this.sessionStats.winStreak > this.sessionStats.maxWinStreak) {
                this.sessionStats.maxWinStreak = this.sessionStats.winStreak;
            }
            if (trade.profit > this.sessionStats.largestWin) {
                this.sessionStats.largestWin = trade.profit;
            }
        } else {
            this.losses++;
            this.consecutiveLosses++;
            this.consecutiveWins = 0;
            this.sessionStats.lossStreak++;
            this.sessionStats.winStreak = 0;
            if (this.sessionStats.lossStreak > this.sessionStats.maxLossStreak) {
                this.sessionStats.maxLossStreak = this.sessionStats.lossStreak;
            }
            if (trade.profit < this.sessionStats.largestLoss) {
                this.sessionStats.largestLoss = trade.profit;
            }
        }

        // Actualizar stats por tipo
        const typeKey = trade.contractType;
        const typeStats = this.winsByType.get(typeKey) || { wins: 0, losses: 0 };
        if (isWin) {
            typeStats.wins++;
        } else {
            typeStats.losses++;
        }
        this.winsByType.set(typeKey, typeStats);

        // Atualizar stats de session
        this.sessionStats.totalPnL += trade.profit;

        // Reset cooldown
        this.ticksSinceLastTrade = 0;

        // Crear registro
        const record: TradeRecord = {
            ...trade,
            id: this.generateTradeId(),
            timestamp: new Date(),
            balance: this.currentCapital
        };

        this.tradeHistory.push(record);

        // Calcular médias
        this.updateAverages();

        return record;
    }

    /**
     * Atualizar médias de win/loss
     */
    private updateAverages(): void {
        const wins = this.tradeHistory.filter(t => t.result === 'WIN');
        const losses = this.tradeHistory.filter(t => t.result === 'LOSS');

        if (wins.length > 0) {
            this.sessionStats.avgWinSize = wins.reduce((sum, t) => sum + t.profit, 0) / wins.length;
        }
        if (losses.length > 0) {
            this.sessionStats.avgLossSize = losses.reduce((sum, t) => sum + t.profit, 0) / losses.length;
        }
    }

    /**
     * Registrar pattern para análise
     */
    recordPatternResult(pattern: string, isWin: boolean): void {
        const stats = this.patternWinRates.get(pattern) || { wins: 0, total: 0 };
        if (isWin) stats.wins++;
        stats.total++;
        this.patternWinRates.set(pattern, stats);
    }

    /**
     * Obtener mejor pattern do dia
     */
    getBestPattern(): string | null {
        let bestPattern: string | null = null;
        let bestRate = 0;

        this.patternWinRates.forEach((stats, pattern) => {
            if (stats.total >= 3) { // Mínimo 3 ocurrencias
                const rate = stats.wins / stats.total;
                if (rate > bestRate) {
                    bestRate = rate;
                    bestPattern = pattern;
                }
            }
        });

        return bestPattern;
    }

    /**
     * Obtener estado actual del riesgo
     */
    getStatus(): RiskStatus {
        const totalProfit = this.currentCapital - this.initialCapital;
        const profitPercentage = (totalProfit / this.initialCapital) * 100;

        const isStopLossTriggered = profitPercentage <= -this.config.stopLossPercentage;
        const isTakeProfitTriggered = profitPercentage >= this.config.takeProfitPercentage;
        const isMaxLossesTriggered = this.consecutiveLosses >= this.config.maxConsecutiveLosses;
        const isMaxWinsTriggered = this.consecutiveWins >= this.config.maxConsecutiveWins;
        const isMaxTradesTriggered = this.tradeHistory.length >= this.config.maxTradesPerSession;

        const shouldStop = isStopLossTriggered || isTakeProfitTriggered ||
            isMaxLossesTriggered || isMaxWinsTriggered || isMaxTradesTriggered;

        let stopReason: string | null = null;
        if (isStopLossTriggered) {
            stopReason = `🛑 Stop Loss: -${Math.abs(profitPercentage).toFixed(1)}%`;
        } else if (isTakeProfitTriggered) {
            stopReason = `🎯 Take Profit: +${profitPercentage.toFixed(1)}%`;
        } else if (isMaxLossesTriggered) {
            stopReason = `🛑 ${this.consecutiveLosses} pérdidas consecutivas`;
        } else if (isMaxWinsTriggered) {
            stopReason = `🎯 ${this.consecutiveWins} victorias consecutivas - Meta alcanzada`;
        } else if (isMaxTradesTriggered) {
            stopReason = `📊 Máximo ${this.config.maxTradesPerSession} trades de sesión alcanzado`;
        }

        // Win rate por tipo
        const winRateByType: Record<string, { wins: number; losses: number; rate: number }> = {};
        this.winsByType.forEach((stats, type) => {
            const total = stats.wins + stats.losses;
            winRateByType[type] = {
                ...stats,
                rate: total > 0 ? (stats.wins / total) * 100 : 0
            };
        });

        return {
            currentCapital: this.currentCapital,
            initialCapital: this.initialCapital,
            totalProfit,
            profitPercentage,
            currentStake: this.calculateStake(),
            consecutiveLosses: this.consecutiveLosses,
            consecutiveWins: this.consecutiveWins,
            totalTrades: this.tradeHistory.length,
            wins: this.wins,
            losses: this.losses,
            winRate: this.wins + this.losses > 0
                ? (this.wins / (this.wins + this.losses)) * 100
                : 0,
            winRateByType,
            isStopLossTriggered,
            isTakeProfitTriggered,
            isMaxLossesTriggered,
            isMaxWinsTriggered,
            isMaxTradesTriggered,
            shouldStop,
            stopReason,
            ticksSinceLastTrade: this.ticksSinceLastTrade,
            isCooldownActive: this.isCooldownActive(),
            bestPattern: this.getBestPattern(),
            sessionStats: { ...this.sessionStats }
        };
    }

    /**
     * Obtener historial de trades
     */
    getTradeHistory(): TradeRecord[] {
        return [...this.tradeHistory];
    }

    /**
     * Gerar relatório final da sessão
     */
    generateSessionReport(): object {
        const status = this.getStatus();
        this.sessionStats.endTime = new Date();

        return {
            summary: {
                duration: this.sessionStats.endTime.getTime() - this.sessionStats.startTime.getTime(),
                totalTrades: status.totalTrades,
                wins: status.wins,
                losses: status.losses,
                winRate: status.winRate.toFixed(1) + '%',
                totalPnL: status.totalProfit.toFixed(2),
                profitPercentage: status.profitPercentage.toFixed(1) + '%',
                bestPattern: status.bestPattern
            },
            riskMetrics: {
                maxWinStreak: this.sessionStats.maxWinStreak,
                maxLossStreak: this.sessionStats.maxLossStreak,
                largestWin: this.sessionStats.largestWin.toFixed(2),
                largestLoss: this.sessionStats.largestLoss.toFixed(2),
                avgWinSize: this.sessionStats.avgWinSize.toFixed(2),
                avgLossSize: this.sessionStats.avgLossSize.toFixed(2)
            },
            winRateByType: status.winRateByType,
            config: this.config,
            trades: this.tradeHistory.map(t => ({
                time: t.timestamp.toLocaleTimeString('es-ES'),
                type: t.contractType,
                stake: t.stake.toFixed(2),
                profit: t.profit.toFixed(2),
                result: t.result,
                conditions: t.conditionsMet
            })),
            suggestions: this.generateSuggestions(status)
        };
    }

    /**
     * Gerar sugestões de ajuste
     */
    private generateSuggestions(status: RiskStatus): string[] {
        const suggestions: string[] = [];

        if (status.winRate < 50) {
            suggestions.push('Consider ajustar el threshold de confidence a >75%');
        }
        if (status.winRate > 70) {
            suggestions.push('Excelente performance! Considere aumentar stake a 4%');
        }
        if (this.sessionStats.maxLossStreak >= 2) {
            suggestions.push('Hubo streaks de pérdida. Verificar condiciones de entrada.');
        }
        if (status.totalTrades < 5 && status.profitPercentage > 5) {
            suggestions.push('Buena eficiencia. El sistema está siendo selectivo.');
        }

        return suggestions;
    }

    /**
     * Exportar historial como JSON
     */
    exportHistoryJSON(): string {
        return JSON.stringify(this.generateSessionReport(), null, 2);
    }

    /**
     * Resetear estado
     */
    reset(): void {
        this.tradeHistory = [];
        this.currentCapital = this.initialCapital;
        this.consecutiveLosses = 0;
        this.consecutiveWins = 0;
        this.wins = 0;
        this.losses = 0;
        this.ticksSinceLastTrade = 0;
        this.winsByType = new Map();
        this.patternWinRates = new Map();
        this.sessionStats = this.createEmptySessionStats();
    }

    /**
     * Generar ID único para trade
     */
    private generateTradeId(): string {
        return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtener configuración actual
     */
    getConfig(): RiskConfig {
        return { ...this.config };
    }
}
