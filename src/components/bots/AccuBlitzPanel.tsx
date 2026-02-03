import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Square, TrendingUp, TrendingDown, Activity, Target, Zap, Shield, Moon, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useVolatilityBlitz } from '../../hooks/useVolatilityBlitz';
import { toast } from 'sonner';

interface AntiDetectPanelProps {
    isActive: boolean;
    onToggle: () => void;
    onBack: () => void;
}

export const AccuBlitzPanel: React.FC<AntiDetectPanelProps> = ({ isActive, onToggle, onBack }) => {
    const {
        isRunning,
        currentMode,
        stats,
        logs,
        activeContracts,
        riskConfig,
        setRiskConfig,
        startBot,
        stopBot,
    } = useVolatilityBlitz();

    // Local state for configuration form
    const [configForm, setConfigForm] = useState(riskConfig);
    const [showConfig, setShowConfig] = useState(false);

    // Update form when riskConfig changes
    useEffect(() => {
        setConfigForm(riskConfig);
    }, [riskConfig]);

    const handleStartBot = () => {
        const success = startBot(configForm);
        if (success) {
            toast.success('Titán Híbrida iniciado');
            setShowConfig(false);
        }
    };

    const handleToggleBot = () => {
        if (isRunning) {
            stopBot();
            toast.success('Titán Híbrida detenido');
        } else {
            handleStartBot();
        }
    };

    // Mode display configuration - SIMPLIFIED (only ESTABLE)
    const getModeConfig = () => {
        switch (currentMode) {
            case 'ESTABLE':
            case 'SNIPER': // Treat SNIPER same as ESTABLE now
                return {
                    icon: Shield,
                    label: '🛡️ MODO ESTABLE',
                    description: `Mercado Calmo • 2% Growth | TP: ${(riskConfig?.stableTakeProfit ?? 3)}% | Stake: $${(riskConfig?.stableStake ?? 5.00).toFixed(2)}`,
                    bgColor: 'from-green-900/30 to-emerald-900/30',
                    borderColor: 'border-green-500/50',
                    textColor: 'text-green-400',
                    glowColor: 'shadow-green-500/50',
                };
            case 'SHADOW':
            default:
                return {
                    icon: Moon,
                    label: '🌑 SHADOW MODE',
                    description: 'Mercado en Squeeze • Sin Operaciones',
                    bgColor: 'from-gray-900/30 to-gray-800/30',
                    borderColor: 'border-gray-500/50',
                    textColor: 'text-gray-400',
                    glowColor: 'shadow-gray-500/50',
                };
        }
    };

    const modeConfig = getModeConfig();
    const ModeIcon = modeConfig.icon;
    const dailyProgress = (stats.dailyTradeCount / 80) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0019] to-[#0a0014] p-4 sm:p-6">
            <div className="max-w-[1800px] mx-auto space-y-4 sm:space-y-6">

                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-purple-900/20 border border-purple-500/30 p-6 sm:p-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 animate-pulse"></div>
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight font-mono mb-2">
                                ACCU <span className="text-purple-400">BLITZ</span>
                            </h1>
                            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-[0.2em] font-mono font-bold">
                                Estrategia Titán Híbrida • Modo Dual • Win Rate: 65-70%
                            </p>
                        </div>
                        <button
                            onClick={handleToggleBot}
                            className={`px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300 ${isRunning
                                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/50'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/50'
                                }`}
                        >
                            {isRunning ? (
                                <>
                                    <Square className="inline w-4 h-4 mr-2" />
                                    PARAR
                                </>
                            ) : (
                                <>
                                    <Play className="inline w-4 h-4 mr-2" />
                                    INICIAR
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Risk Management Configuration Panel */}
                {!isRunning && (
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="w-full flex items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-purple-400" />
                                <h3 className="text-sm font-bold text-white font-mono">⚙️ CONFIGURACIÓN DE RIESGO</h3>
                            </div>
                            {showConfig ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>

                        {showConfig && (
                            <div className="mt-4 space-y-4">
                                {/* Account Balance Config */}
                                <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/10 border border-purple-500/30 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center">
                                        <Settings className="w-4 h-4 mr-2" />
                                        VALOR DE LA CUENTA
                                    </h4>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Balance Inicial ($)</label>
                                        <input
                                            type="number"
                                            min="100"
                                            max="1000000"
                                            step="100"
                                            value={configForm.accountBalance}
                                            onChange={(e) => setConfigForm({ ...configForm, accountBalance: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Balance de tu cuenta para cálculo de riesgo</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Only ESTABLE Mode Config - SNIPER removed for simplicity */}

                                    {/* Stable Mode Config */}
                                    <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border border-green-500/30 rounded-lg p-4">
                                        <h4 className="text-sm font-bold text-green-400 mb-3 flex items-center">
                                            <Shield className="w-4 h-4 mr-2" />
                                            MODO ESTABLE
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">Stake ($)</label>
                                                <input
                                                    type="number"
                                                    min="0.35"
                                                    step="0.01"
                                                    value={configForm.stableStake}
                                                    onChange={(e) => setConfigForm({ ...configForm, stableStake: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">Take Profit (%)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    step="1"
                                                    value={configForm.stableTakeProfit}
                                                    onChange={(e) => setConfigForm({ ...configForm, stableTakeProfit: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Global Stop Loss */}
                                    <div className="md:col-span-2 bg-gradient-to-br from-red-900/20 to-red-900/10 border border-red-500/30 rounded-lg p-4">
                                        <h4 className="text-sm font-bold text-red-400 mb-3">🛑 STOP LOSS GLOBAL</h4>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Stop Loss ($)</label>
                                            <input
                                                type="number"
                                                min="-10000"
                                                max="0"
                                                step="1.00"
                                                value={configForm.globalStopLoss}
                                                onChange={(e) => setConfigForm({ ...configForm, globalStopLoss: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none"
                                                placeholder="-50.00"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Valor negativo (ej: -50.00 para perder máx $50)</p>
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <div className="md:col-span-2">
                                        <button
                                            onClick={() => {
                                                setRiskConfig(configForm);
                                                localStorage.setItem('accublitz_risk_config', JSON.stringify(configForm));
                                                toast.success('Configuración guardada');
                                                setShowConfig(false);
                                            }}
                                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-lg transition-all"
                                        >
                                            💾 GUARDAR CONFIGURACIÓN
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Session Progress Bar */}
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 font-mono">PROGRESO DE SESIÓN</p>
                        <p className="text-sm font-bold text-white font-mono">
                            {stats.dailyTradeCount}/80 trades
                        </p>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${dailyProgress >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                dailyProgress >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                    'bg-gradient-to-r from-purple-500 to-pink-500'
                                }`}
                            style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 font-mono">
                        {dailyProgress >= 90 ? '⚠️ Aproximando límite diario' :
                            dailyProgress >= 70 ? '📊 Sesión avanzada' :
                                '🎯 Sesión en progreso'}
                    </p>
                </div>

                {/* Global Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1 font-mono">Total Trades</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.totalTrades}</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1 font-mono">Win Rate</p>
                        <p className={`text-2xl font-black font-mono ${stats.winRate >= 65 ? 'text-green-400' : stats.winRate >= 55 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {stats.winRate.toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1 font-mono">P&L Global</p>
                        <p className={`text-2xl font-black font-mono ${stats.globalPnl > 0 ? 'text-green-400' : stats.globalPnl < 0 ? 'text-red-400' : 'text-gray-400'
                            }`}>
                            {stats.globalPnl > 0 ? '+' : ''}${stats.globalPnl.toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1 font-mono">W/L Ratio</p>
                        <p className="text-2xl font-black text-white font-mono">
                            {stats.totalWins}/{stats.totalLosses}
                        </p>
                    </div>
                </div>

                {/* Strategy Performance - Only ESTABLE Mode (SNIPER removed) */}
                <div className="grid grid-cols-1 gap-4">

                    {/* ESTABLE Mode Card */}
                    <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/10 border border-green-500/30 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-green-400 font-mono flex items-center">
                                    <Shield className="w-5 h-5 mr-2" />
                                    MODO ESTABLE
                                </h3>
                                <p className="text-xs text-gray-500">2% Growth | TP: ${(riskConfig?.stableTakeProfit ?? 3)}% | Mercado Calmo</p>
                            </div>
                            <Activity className={`w-6 h-6 ${currentMode === 'ESTABLE' ? 'text-green-400 animate-pulse' : 'text-gray-600'}`} />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                                <p className="text-[10px] text-gray-400 mb-1">Trades</p>
                                <p className="text-xl font-black text-white font-mono">{stats.stableTrades}</p>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                                <p className="text-[10px] text-gray-400 mb-1">Win Rate</p>
                                <p className={`text-xl font-black font-mono ${stats.stableTrades > 0
                                    ? ((stats.stableWins / stats.stableTrades) * 100) >= 65 ? 'text-green-400' : 'text-yellow-400'
                                    : 'text-gray-400'
                                    }`}>
                                    {stats.stableTrades > 0 ? ((stats.stableWins / stats.stableTrades) * 100).toFixed(0) : '0'}%
                                </p>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                                <p className="text-[10px] text-gray-400 mb-1">Ativos</p>
                                <p className="text-xl font-black text-green-400 font-mono">
                                    {activeContracts.filter(c => c.mode === 'ESTABLE').length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Contracts */}
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-white mb-3 font-mono">📊 CONTRATOS ATIVOS</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {activeContracts.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-4">Nenhum contrato ativo</p>
                        ) : (
                            activeContracts.map(contract => {
                                const elapsed = Math.floor((Date.now() - contract.openTime) / 1000);
                                const modeEmoji = contract.mode === 'SNIPER' ? '⚡' : '🛡️';
                                const modeColor = contract.mode === 'SNIPER' ? 'border-yellow-500/30' : 'border-green-500/30';
                                const profit = contract.currentProfit || 0;
                                const profitColor = profit >= 0 ? 'text-green-400' : 'text-red-400';
                                const profitPct = contract.stake > 0 ? (profit / contract.stake) * 100 : 0;

                                return (
                                    <div key={contract.id} className={`bg-gray-900/70 rounded-lg p-3 border ${modeColor}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className={`text-xs font-bold ${contract.mode === 'SNIPER' ? 'text-yellow-400' : 'text-green-400'}`}>
                                                    {modeEmoji} {contract.mode} • ${contract.stake.toFixed(2)}
                                                </span>
                                                <p className="text-[10px] text-gray-500 mt-1">
                                                    Growth: {(contract.growthRate * 100).toFixed(0)}% | TP: ${contract.targetProfit.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm font-bold ${profitColor}`}>
                                                    {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                                                </span>
                                                <p className="text-[10px] text-gray-500">
                                                    {profitPct.toFixed(1)}% | {elapsed}s
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* System Logs */}
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-white mb-3 font-mono">📡 SYSTEM LOGS</h3>
                    <div className="space-y-1 max-h-[400px] overflow-y-auto font-mono text-xs">
                        {logs.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-8">Sin logs aún</p>
                        ) : (
                            logs.slice().reverse().map(log => (
                                <div key={log.id} className={`py-1 px-2 rounded ${log.logType === 'success' ? 'bg-green-900/20 text-green-400' :
                                    log.logType === 'error' ? 'bg-red-900/20 text-red-400' :
                                        log.logType === 'warning' ? 'bg-yellow-900/20 text-yellow-400' :
                                            log.logType === 'signal' ? 'bg-blue-900/20 text-blue-400' :
                                                'bg-gray-800/50 text-gray-400'
                                    }`}>
                                    <span className="text-gray-500">{log.time}</span>
                                    {' | '}
                                    <span className={
                                        log.type === 'SNIPER' ? 'text-yellow-400' :
                                            log.type === 'ESTABLE' ? 'text-green-400' :
                                                log.type === 'SHADOW' ? 'text-gray-400' :
                                                    'text-purple-400'
                                    }>[{log.type}]</span>
                                    {' | '}
                                    {log.message}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
