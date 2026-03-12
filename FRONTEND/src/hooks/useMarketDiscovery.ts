import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeriv } from '../contexts/DerivContext';
import { useTradingSession } from '../contexts/TradingSessionContext';
import { toast } from 'sonner';

// ============================================
// 🎯 MARKET DISCOVERY & MIGRATION SYSTEM
// Testing structured markets for better edge
// ============================================

interface MarketTest {
    symbol: string;
    family: 'CRASH' | 'BOOM' | 'JUMP' | 'RANGE' | 'STEP' | 'VOLATILITY';
    available: boolean | null; // null = testing
    error?: string;
}

export interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

export const useMarketDiscovery = () => {
    const { socket, isConnected } = useDeriv();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [availableMarkets, setAvailableMarkets] = useState<MarketTest[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveryComplete, setDiscoveryComplete] = useState(false);

    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('es-ES'),
            message,
            type,
        };
        setLogs(prev => [...prev, newLog]);
    }, []);

    const testMarkets = useCallback(async () => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast.error('Conecte a Deriv primeiro');
            return;
        }

        setIsDiscovering(true);
        addLog('🔍 INICIANDO DESCOBERTA DE MERCADOS', 'info');
        addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');

        const marketsToTest: Array<[string, MarketTest['family']]> = [
            // CRASH/BOOM (Priority 1 - Best edge)
            ['CRASH300', 'CRASH'],
            ['CRASH500', 'CRASH'],
            ['CRASH1000', 'CRASH'],
            ['BOOM300', 'BOOM'],
            ['BOOM500', 'BOOM'],
            ['BOOM1000', 'BOOM'],

            // CRASH/BOOM 150
            ['CRASH150', 'CRASH'],
            ['BOOM150', 'BOOM'],
            ['CRSH150', 'CRASH'],
            ['BOM150', 'BOOM'],

            // JUMP (Priority 2)
            ['JUMP10', 'JUMP'],
            ['JUMP25', 'JUMP'],
            ['JUMP50', 'JUMP'],
            ['JUMP75', 'JUMP'],
            ['JUMP100', 'JUMP'],

            // RANGE BREAK (Priority 3)
            ['RANGE_BREAK_10', 'RANGE'],
            ['RANGE_BREAK_25', 'RANGE'],
            ['RANGE_BREAK_50', 'RANGE'],
            ['RB_10', 'RANGE'],
            ['RB_25', 'RANGE'],

            // STEP INDICES (Priority 4)
            ['STEPINDEX', 'STEP'],
            ['STEP_INDEX', 'STEP'],
            ['MULTISTEP2', 'STEP'],
            ['MULTISTEP3', 'STEP'],

            // VOLATILITY HIGH (Backup - R_100 showed 59% WR)
            ['R_75', 'VOLATILITY'],
            ['R_100', 'VOLATILITY'],
        ];

        const results: MarketTest[] = marketsToTest.map(([symbol, family]) => ({
            symbol,
            family,
            available: null,
        }));

        setAvailableMarkets(results);

        // Test each market sequentially with delay
        for (let i = 0; i < marketsToTest.length; i++) {
            const [symbol, family] = marketsToTest[i];

            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    results[i].available = false;
                    results[i].error = 'Timeout';
                    addLog(`⏱️ ${symbol}: Timeout`, 'warning');
                    setAvailableMarkets([...results]);
                    resolve();
                }, 3000);

                const handler = (event: MessageEvent) => {
                    const data = JSON.parse(event.data);

                    if (data.echo_req?.ticks === symbol) {
                        clearTimeout(timeout);
                        socket.removeEventListener('message', handler);

                        if (data.error) {
                            results[i].available = false;
                            results[i].error = data.error.message;
                            addLog(`❌ ${symbol}: ${data.error.message}`, 'error');
                        } else if (data.tick) {
                            results[i].available = true;
                            addLog(`✅ ${symbol}: DISPONÍVEL! [${family}]`, 'success');
                        }

                        setAvailableMarkets([...results]);
                        resolve();
                    }
                };

                socket.addEventListener('message', handler);

                socket.send(JSON.stringify({
                    ticks: symbol,
                }));

                addLog(`🔎 Testando ${symbol}...`, 'info');
            });

            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Unsubscribe from all
        socket.send(JSON.stringify({ forget_all: 'ticks' }));

        // Summary
        addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
        addLog('📊 RESUMO DA DESCOBERTA:', 'info');

        const available = results.filter(r => r.available);
        const byFamily = available.reduce((acc, r) => {
            acc[r.family] = (acc[r.family] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        Object.entries(byFamily).forEach(([family, count]) => {
            addLog(`   ${family}: ${count} mercados disponíveis`, 'success');
        });

        if (available.filter(r => r.family === 'CRASH' || r.family === 'BOOM').length > 0) {
            addLog('⭐ CRASH/BOOM encontrado! Recomenda-se usar estratégia Tick Counting', 'success');
        } else if (available.filter(r => r.family === 'JUMP').length > 0) {
            addLog('⭐ JUMP encontrado! Recomenda-se usar estratégia Jump Detection', 'success');
        } else {
            addLog('⚠️ Apenas Volatility disponível. Usar R_75/R_100.', 'warning');
        }

        setIsDiscovering(false);
        setDiscoveryComplete(true);
        toast.success(`Descoberta completa: ${available.length} mercados disponíveis`);
    }, [socket, addLog]);

    const getRecommendedMarkets = useCallback(() => {
        const available = availableMarkets.filter(m => m.available);

        // Priority 1: CRASH/BOOM
        const crashBoom = available.filter(m => m.family === 'CRASH' || m.family === 'BOOM');
        if (crashBoom.length >= 2) {
            return {
                strategy: 'TICK_COUNTING',
                markets: crashBoom.slice(0, 4).map(m => m.symbol),
                expectedWR: '67-72%',
                frequency: '150-200 trades/day',
            };
        }

        // Priority 2: JUMP
        const jump = available.filter(m => m.family === 'JUMP');
        if (jump.length >= 2) {
            const r100 = available.find(m => m.symbol === 'R_100');
            return {
                strategy: 'JUMP_DETECTION',
                markets: [...jump.slice(0, 2).map(m => m.symbol), r100?.symbol].filter(Boolean),
                expectedWR: '62-68%',
                frequency: '120-180 trades/day',
            };
        }

        // Fallback: High Volatility only
        const highVol = available.filter(m => m.symbol === 'R_75' || m.symbol === 'R_100');
        return {
            strategy: 'BOLLINGER_MOMENTUM',
            markets: highVol.map(m => m.symbol),
            expectedWR: '58-62%',
            frequency: '80-120 trades/day',
        };
    }, [availableMarkets]);

    return {
        logs,
        availableMarkets,
        isDiscovering,
        discoveryComplete,
        testMarkets,
        getRecommendedMarkets,
    };
};
