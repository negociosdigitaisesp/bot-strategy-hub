import React from 'react';
import { Search, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useMarketDiscovery } from '../../hooks/useMarketDiscovery';

export const MarketDiscoveryPanel: React.FC = () => {
    const {
        logs,
        availableMarkets,
        isDiscovering,
        discoveryComplete,
        testMarkets,
        getRecommendedMarkets,
    } = useMarketDiscovery();

    const recommendation = discoveryComplete ? getRecommendedMarkets() : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0019] to-[#0a0014] p-4 sm:p-6">
            <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">

                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/20 via-cyan-900/20 to-blue-900/20 border border-blue-500/30 p-6 sm:p-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-blue-500/5 animate-pulse"></div>
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight font-mono mb-2">
                                MARKET <span className="text-cyan-400">DISCOVERY</span>
                            </h1>
                            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-[0.2em] font-mono font-bold">
                                Fase 1: Descobrindo mercados com estrutura
                            </p>
                        </div>
                        <button
                            onClick={testMarkets}
                            disabled={isDiscovering}
                            className={`px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300 ${isDiscovering
                                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/50'
                                }`}
                        >
                            {isDiscovering ? (
                                <>
                                    <Loader className="inline w-4 h-4 mr-2 animate-spin" />
                                    DESCOBRINDO...
                                </>
                            ) : (
                                <>
                                    <Search className="inline w-4 h-4 mr-2" />
                                    INICIAR DESCOBERTA
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Recommendation */}
                {recommendation && (
                    <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/40 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-3 font-mono flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                            RECOMENDAÇÃO FINAL
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Estratégia Recomendada:</p>
                                <p className="text-xl font-bold text-green-400 font-mono">{recommendation.strategy}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Win Rate Esperado:</p>
                                <p className="text-xl font-bold text-green-400 font-mono">{recommendation.expectedWR}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Mercados:</p>
                                <p className="text-sm text-white font-mono">{recommendation.markets.join(', ')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Frequência:</p>
                                <p className="text-sm text-white font-mono">{recommendation.frequency}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Markets Grid */}
                {availableMarkets.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-white mb-3 font-mono">📊 MERCADOS TESTADOS</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {availableMarkets.map((market) => (
                                <div
                                    key={market.symbol}
                                    className={`p-3 rounded-lg border transition-all ${market.available === true
                                            ? 'bg-green-900/20 border-green-500/40'
                                            : market.available === false
                                                ? 'bg-red-900/20 border-red-500/40'
                                                : 'bg-gray-800/50 border-gray-700/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-white font-mono">{market.symbol}</span>
                                        {market.available === true && <CheckCircle className="w-4 h-4 text-green-400" />}
                                        {market.available === false && <XCircle className="w-4 h-4 text-red-400" />}
                                        {market.available === null && <Loader className="w-4 h-4 text-gray-400 animate-spin" />}
                                    </div>
                                    <p className={`text-[10px] font-mono ${market.family === 'CRASH' || market.family === 'BOOM' ? 'text-yellow-400' :
                                            market.family === 'JUMP' ? 'text-blue-400' :
                                                'text-gray-500'
                                        }`}>
                                        {market.family}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Logs */}
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-white mb-3 font-mono">📡 LOGS DE DESCOBERTA</h3>
                    <div className="space-y-1 max-h-[500px] overflow-y-auto font-mono text-xs">
                        {logs.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-8">
                                Clique em "INICIAR DESCOBERTA" para começar
                            </p>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className={`py-1 px-2 rounded ${log.type === 'success' ? 'bg-green-900/20 text-green-400' :
                                        log.type === 'error' ? 'bg-red-900/20 text-red-400' :
                                            log.type === 'warning' ? 'bg-yellow-900/20 text-yellow-400' :
                                                'bg-gray-800/50 text-gray-400'
                                    }`}>
                                    <span className="text-gray-500">{log.time}</span>
                                    {' | '}
                                    {log.message}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3 font-mono">📋 INSTRUÇÕES</h3>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p><strong className="text-cyan-400">Passo 1:</strong> Clique em "INICIAR DESCOBERTA" para testar todos os mercados disponíveis</p>
                        <p><strong className="text-cyan-400">Passo 2:</strong> Aguarde ~1 minuto enquanto testamos 30+ símbolos</p>
                        <p><strong className="text-cyan-400">Passo 3:</strong> Veja a RECOMENDAÇÃO FINAL com a melhor estratégia</p>
                        <p><strong className="text-cyan-400">Passo 4:</strong> Use os mercados descobertos para implementar a estratégia recomendada</p>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                        <p className="text-xs text-yellow-400 font-mono">
                            ⚠️ IMPORTANTE: CRASH/BOOM têm 67-72% win rate comprovado vs 47% do Volatility atual
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};
