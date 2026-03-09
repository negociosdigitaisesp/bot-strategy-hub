/**
 * TradingBot - Controlador principal del bot de trading avanzado
 * 
 * Sistema Multi-Layer de Entrada:
 * - Layer 1: Distribución even/odd > 10% desbalanceamento
 * - Layer 2: Streak de 3+ consecutivos del lado "fuerte"
 * - Layer 3: Pattern confidence > 70%
 * - Layer 4: Tick actual es el 3er consecutivo (trigger)
 * 
 * Dirección: Apostar en el lado DÉBIL (regresión a la media)
 * 
 * Zero Martingale - Stake fijo 3%
 */

import { StatisticalAnalyzer, StatisticalResult, DigitFrequency } from './StatisticalAnalyzer';
import { RiskManager, RiskConfig, TradeRecord, RiskStatus } from './RiskManager';
import { PatternHeatmap, PatternPrediction } from './PatternHeatmap';
import { StreakDetector, StreakStatus } from './StreakDetector';
import { DiffersStrategy, DiffersConditions, DiffersSignal } from './DiffersStrategy';

export interface BotConfig {
    symbol: string;
    stakePercentage: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
    maxConsecutiveLosses: number;
    contractDuration: number;
    preferredContractType: 'EVENODD' | 'DIFFERS' | 'AUTO';
}

export interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'signal' | 'trade' | 'analysis' | 'layer';
}

export type ContractType = 'DIGITEVEN' | 'DIGITODD' | 'DIGITDIFF' | 'DIGITOVER' | 'DIGITUNDER';

export interface PendingContract {
    type: ContractType;
    digit?: number;
    barrier?: number;
    stake: number;
    reason: string;
    conditionsMet: string[];
    signalType: 'MULTILAYER' | 'DIFFERS';
}

export interface MultiLayerStatus {
    layer1_distribution: boolean; // >10% desbalanceamento
    layer2_streak: boolean;       // 3+ consecutivos  
    layer3_pattern: boolean;      // Pattern confidence >70%
    layer4_trigger: boolean;      // 3er consecutivo exacto
    allLayersMet: boolean;
    weakSide: 'EVEN' | 'ODD' | null;
    distributionDiff: number;
    streakCount: number;
    patternConfidence: number;
}

export interface AdvancedAnalysis {
    statistical: StatisticalResult;
    streak: StreakStatus;
    patternPrediction: PatternPrediction | null;
    differsConditions: DiffersConditions;
    multiLayer: MultiLayerStatus;
    tickCount: number;
}

const SYMBOLS: Record<string, string> = {
    'R_10': 'Volatility 10 Index',
    'R_25': 'Volatility 25 Index',
    'R_50': 'Volatility 50 Index',
    'R_75': 'Volatility 75 Index',
    'R_100': 'Volatility 100 Index',
    '1HZ10V': 'Volatility 10 (1s) Index',
    '1HZ25V': 'Volatility 25 (1s) Index',
    '1HZ50V': 'Volatility 50 (1s) Index',
    '1HZ75V': 'Volatility 75 (1s) Index',
    '1HZ100V': 'Volatility 100 (1s) Index'
};

export class TradingBot {
    // Analyzers
    private analyzer: StatisticalAnalyzer;
    private patternHeatmap: PatternHeatmap;
    private streakDetector: StreakDetector;
    private differsStrategy: DiffersStrategy;
    private riskManager: RiskManager;

    // State
    private config: BotConfig;
    private logs: LogEntry[] = [];
    private isRunning: boolean = false;
    private isWaitingForContract: boolean = false;
    private pendingContract: PendingContract | null = null;
    private lastAnalysis: AdvancedAnalysis | null = null;

    // Multi-layer thresholds
    private readonly DISTRIBUTION_THRESHOLD = 10; // >10% desbalanceamento
    private readonly PATTERN_CONFIDENCE_THRESHOLD = 70; // >70%
    private readonly MIN_STREAK = 3;

    // Callbacks para UI
    private onLogCallback?: (log: LogEntry) => void;
    private onStatsUpdateCallback?: (analysis: AdvancedAnalysis, risk: RiskStatus) => void;
    private onStopCallback?: (reason: string) => void;

    constructor(initialCapital: number = 100) {
        this.analyzer = new StatisticalAnalyzer();
        this.patternHeatmap = new PatternHeatmap();
        this.streakDetector = new StreakDetector();
        this.differsStrategy = new DiffersStrategy();
        this.riskManager = new RiskManager({ initialCapital });

        this.config = {
            symbol: '1HZ100V',
            stakePercentage: 3, // 3% fixo
            stopLossPercentage: 8,
            takeProfitPercentage: 15,
            maxConsecutiveLosses: 2,
            contractDuration: 5,
            preferredContractType: 'AUTO'
        };
    }

    /**
     * Configurar callbacks para actualizaciones de UI
     */
    setCallbacks(callbacks: {
        onLog?: (log: LogEntry) => void;
        onStatsUpdate?: (analysis: AdvancedAnalysis, risk: RiskStatus) => void;
        onStop?: (reason: string) => void;
    }): void {
        this.onLogCallback = callbacks.onLog;
        this.onStatsUpdateCallback = callbacks.onStatsUpdate;
        this.onStopCallback = callbacks.onStop;
    }

    /**
     * Iniciar bot con configuración
     */
    start(config: Partial<BotConfig> & { initialCapital?: number }): boolean {
        if (this.isRunning) {
            this.addLog('Bot ya está en ejecución', 'warning');
            return false;
        }

        // Actualizar configuración
        this.config = { ...this.config, ...config };

        // Configurar risk manager
        if (config.initialCapital) {
            this.riskManager.setInitialCapital(config.initialCapital);
        }

        this.riskManager.updateConfig({
            stakePercentage: this.config.stakePercentage,
            stopLossPercentage: this.config.stopLossPercentage,
            takeProfitPercentage: this.config.takeProfitPercentage,
            maxConsecutiveLosses: this.config.maxConsecutiveLosses
        });

        // Resetear estados
        this.analyzer.reset();
        this.patternHeatmap.reset();
        this.streakDetector.reset();
        this.riskManager.reset();
        this.logs = [];
        this.isWaitingForContract = false;
        this.pendingContract = null;

        this.isRunning = true;

        const symbolName = SYMBOLS[this.config.symbol] || this.config.symbol;
        this.addLog(`🚀 Bot iniciado - ${symbolName}`, 'success');
        this.addLog(`⚡ Sistema Multi-Layer ACTIVADO`, 'info');
        this.addLog(`📊 Stake: ${this.config.stakePercentage}% FIJO | SL: -${this.config.stopLossPercentage}% | TP: +${this.config.takeProfitPercentage}%`, 'info');
        this.addLog(`🎯 Modo: ${this.config.preferredContractType} | Recolectando 200 ticks...`, 'info');

        return true;
    }

    /**
     * Detener bot
     */
    stop(reason: string = 'Detenido por usuario'): void {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.isWaitingForContract = false;
        this.pendingContract = null;

        this.addLog(`⏹️ ${reason}`, 'warning');

        // Gerar relatório final
        const report = this.riskManager.generateSessionReport();
        console.log('📊 Reporte Final de Sesión:', report);

        this.onStopCallback?.(reason);
    }

    /**
     * Procesar tick entrante
     */
    processTick(price: number): { shouldTrade: boolean; contract?: PendingContract } {
        if (!this.isRunning) return { shouldTrade: false };

        // Extraer dígito
        const priceStr = price.toFixed(2);
        const lastDigit = parseInt(priceStr.charAt(priceStr.length - 1));

        // Atualizar todos os analyzers
        const statistical = this.analyzer.processTick(price);
        const streakStatus = this.streakDetector.processDigit(lastDigit);
        this.patternHeatmap.processDigit(lastDigit);

        // Tick para cooldown do risk manager
        this.riskManager.tick();

        // Análise de pattern
        const patternPrediction = this.patternHeatmap.getCurrentPrediction(this.PATTERN_CONFIDENCE_THRESHOLD);

        // Análise DIFFERS
        const differsConditions = this.differsStrategy.analyze(
            statistical.frequencies.map(f => ({ digit: f.digit, percentage: f.percentage })),
            lastDigit
        );

        // Calcular status multi-layer
        const multiLayer = this.calculateMultiLayerStatus(statistical, streakStatus, patternPrediction);

        // Montar análise avançada
        const analysis: AdvancedAnalysis = {
            statistical,
            streak: streakStatus,
            patternPrediction,
            differsConditions,
            multiLayer,
            tickCount: statistical.tickCount
        };
        this.lastAnalysis = analysis;

        // Verificar condições de risco
        const riskStatus = this.riskManager.getStatus();

        // Notificar UI
        this.onStatsUpdateCallback?.(analysis, riskStatus);

        // Verificar se deve parar
        if (riskStatus.shouldStop) {
            this.stop(riskStatus.stopReason || 'Límite de riesgo alcanzado');
            return { shouldTrade: false };
        }

        // Se esperando contrato, não processar
        if (this.isWaitingForContract) {
            return { shouldTrade: false };
        }

        // Verificar se pode operar
        const canTradeResult = this.riskManager.canTrade();
        if (!canTradeResult.allowed) {
            return { shouldTrade: false };
        }

        // Mínimo 50 ticks para análises confiáveis
        if (statistical.tickCount < 50) {
            if (statistical.tickCount % 25 === 0) {
                this.addLog(`📊 Recopilando datos: ${statistical.tickCount}/200 ticks`, 'info');
            }
            return { shouldTrade: false };
        }

        // ESTRATÉGIA PRINCIPAL: Multi-Layer Even/Odd
        if (multiLayer.allLayersMet && multiLayer.weakSide) {
            return this.executeMultiLayerTrade(multiLayer, analysis);
        }

        // ESTRATÉGIA SECUNDÁRIA: DIFFERS (se configurado)
        if ((this.config.preferredContractType === 'DIFFERS' || this.config.preferredContractType === 'AUTO')
            && differsConditions.signal) {
            return this.executeDiffersTrade(differsConditions.signal, analysis);
        }

        return { shouldTrade: false };
    }

    /**
     * Calcular status das 4 layers
     */
    private calculateMultiLayerStatus(
        statistical: StatisticalResult,
        streak: StreakStatus,
        pattern: PatternPrediction | null
    ): MultiLayerStatus {
        // Layer 1: Distribuição >10% desbalanceamento
        const distributionDiff = Math.abs(statistical.evenPercentage - 50);
        const layer1 = distributionDiff > this.DISTRIBUTION_THRESHOLD;

        // Layer 2: Streak de 3+ do lado "forte"
        const layer2 = streak.hasMinimumStreak;

        // Layer 3: Pattern confidence >70%
        const layer3 = pattern !== null && pattern.confidence >= this.PATTERN_CONFIDENCE_THRESHOLD;

        // Layer 4: Exatamente no 3º consecutivo (trigger)
        const layer4 = streak.isThirdConsecutive;

        // Determinar lado fraco (oposto ao streak forte)
        let weakSide: 'EVEN' | 'ODD' | null = null;
        if (layer2 && streak.streakType) {
            weakSide = streak.streakType === 'EVEN' ? 'ODD' : 'EVEN';
        }

        return {
            layer1_distribution: layer1,
            layer2_streak: layer2,
            layer3_pattern: layer3,
            layer4_trigger: layer4,
            allLayersMet: layer1 && layer2 && layer3 && layer4,
            weakSide,
            distributionDiff,
            streakCount: streak.currentStreak,
            patternConfidence: pattern?.confidence || 0
        };
    }

    /**
     * Executar trade multi-layer
     */
    private executeMultiLayerTrade(
        multiLayer: MultiLayerStatus,
        analysis: AdvancedAnalysis
    ): { shouldTrade: boolean; contract?: PendingContract } {
        if (!multiLayer.weakSide) return { shouldTrade: false };

        const stake = this.riskManager.calculateStake();
        const contractType: ContractType = multiLayer.weakSide === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD';

        const conditionsMet = [
            `L1: Dist ${multiLayer.distributionDiff.toFixed(1)}% > ${this.DISTRIBUTION_THRESHOLD}%`,
            `L2: Streak ${multiLayer.streakCount} >= ${this.MIN_STREAK}`,
            `L3: Pattern ${multiLayer.patternConfidence.toFixed(0)}% > ${this.PATTERN_CONFIDENCE_THRESHOLD}%`,
            `L4: Trigger 3º consecutivo`
        ];

        const contract: PendingContract = {
            type: contractType,
            stake,
            reason: `🎯 MULTI-LAYER: Apostando ${multiLayer.weakSide} (lado débil por regresión)`,
            conditionsMet,
            signalType: 'MULTILAYER'
        };

        this.pendingContract = contract;
        this.isWaitingForContract = true;

        // Log cada layer
        this.addLog(`✅ Layer 1: Distribución ${multiLayer.distributionDiff.toFixed(1)}%`, 'layer');
        this.addLog(`✅ Layer 2: Streak ${analysis.streak.streakType} x${multiLayer.streakCount}`, 'layer');
        this.addLog(`✅ Layer 3: Pattern confidence ${multiLayer.patternConfidence.toFixed(0)}%`, 'layer');
        this.addLog(`✅ Layer 4: Trigger activado (3º consecutivo)`, 'layer');
        this.addLog(`📡 SEÑAL MULTI-LAYER: ${contractType} | Stake: $${stake.toFixed(2)}`, 'signal');

        return { shouldTrade: true, contract };
    }

    /**
     * Executar trade DIFFERS
     */
    private executeDiffersTrade(
        signal: DiffersSignal,
        analysis: AdvancedAnalysis
    ): { shouldTrade: boolean; contract?: PendingContract } {
        const stake = this.riskManager.calculateStake();

        const conditionsMet = [
            `Variant ${signal.variant}`,
            `Green[${signal.conditions.greenBar.digit}]: ${signal.conditions.greenBar.percentage.toFixed(1)}%`,
            `Red[${signal.conditions.redBar.digit}]: ${signal.conditions.redBar.percentage.toFixed(1)}%`,
            `Pointer: ${signal.conditions.pointer.current}`
        ];

        const contract: PendingContract = {
            type: signal.trade,
            barrier: signal.barrier,
            stake,
            reason: this.differsStrategy.getSignalDescription(signal),
            conditionsMet,
            signalType: 'DIFFERS'
        };

        this.pendingContract = contract;
        this.isWaitingForContract = true;

        this.addLog(`📡 SEÑAL DIFFERS-${signal.variant}: OVER ${signal.barrier} | Confidence: ${signal.confidence.toFixed(0)}%`, 'signal');

        return { shouldTrade: true, contract };
    }

    /**
     * Registrar resultado de contrato
     */
    recordContractResult(profit: number, payout: number): void {
        if (!this.pendingContract) return;

        const isWin = profit > 0;

        // Registrar pattern result se houver
        if (this.lastAnalysis?.patternPrediction) {
            this.riskManager.recordPatternResult(
                this.lastAnalysis.patternPrediction.pattern,
                isWin
            );
        }

        const trade = this.riskManager.recordTrade({
            contractType: this.pendingContract.type,
            digit: this.pendingContract.digit,
            barrier: this.pendingContract.barrier,
            stake: this.pendingContract.stake,
            payout,
            profit,
            result: isWin ? 'WIN' : 'LOSS',
            conditionsMet: this.pendingContract.conditionsMet,
            signalType: this.pendingContract.signalType
        });

        if (isWin) {
            this.addLog(`✅ VICTORIA +$${profit.toFixed(2)} | Balance: $${trade.balance.toFixed(2)}`, 'success');
        } else {
            this.addLog(`❌ PÉRDIDA -$${Math.abs(profit).toFixed(2)} | Balance: $${trade.balance.toFixed(2)}`, 'error');
        }

        // Limpiar estado
        this.isWaitingForContract = false;
        this.pendingContract = null;

        // Verificar si debe parar
        const status = this.riskManager.getStatus();
        if (status.shouldStop) {
            this.stop(status.stopReason || 'Límite de riesgo alcanzado');
        }
    }

    /**
     * Agregar entrada al log
     */
    private addLog(message: string, type: LogEntry['type']): void {
        const log: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type
        };

        this.logs = [...this.logs.slice(-100), log];
        this.onLogCallback?.(log);

        // Console log com cores
        const colors: Record<string, string> = {
            success: '\x1b[32m',
            error: '\x1b[31m',
            warning: '\x1b[33m',
            signal: '\x1b[36m',
            trade: '\x1b[35m',
            analysis: '\x1b[34m',
            layer: '\x1b[96m',
            info: '\x1b[37m'
        };
        console.log(`${colors[type] || ''}[${log.time}] ${message}\x1b[0m`);
    }

    // Getters
    getIsRunning(): boolean { return this.isRunning; }
    getIsWaitingForContract(): boolean { return this.isWaitingForContract; }
    getPendingContract(): PendingContract | null { return this.pendingContract; }
    getLogs(): LogEntry[] { return this.logs; }
    getLastAnalysis(): AdvancedAnalysis | null { return this.lastAnalysis; }
    getRiskStatus(): RiskStatus { return this.riskManager.getStatus(); }
    getConfig(): BotConfig { return this.config; }
    getSymbolName(): string { return SYMBOLS[this.config.symbol] || this.config.symbol; }

    getLastDigits(n: number = 20): number[] {
        return this.analyzer.getLastDigits(n);
    }

    getPatternHeatmap(): PatternHeatmap { return this.patternHeatmap; }
    getStreakDetector(): StreakDetector { return this.streakDetector; }

    /**
     * Gerar relatório da sessão
     */
    getSessionReport(): object {
        return this.riskManager.generateSessionReport();
    }
}
