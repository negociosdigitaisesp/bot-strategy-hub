import React, { useEffect, useState } from 'react';
import { TrendingUp, Flame, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

interface GainItem {
    nome_bot: string;
    assertividade_percentual: number;
}

interface RecentGainsTickerProps {
    className?: string;
}

const RecentGainsTicker: React.FC<RecentGainsTickerProps> = ({ className = '' }) => {
    const [gains, setGains] = useState<GainItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRealGains = async () => {
        try {
            console.log('[TICKER] Buscando dados reais (1 hora)...');
            const { data, error } = await supabase.rpc(
                'calcular_estatisticas_por_periodo',
                { periodo: '1 hour' }
            );

            if (error) {
                console.error('[TICKER] Erro ao buscar dados:', error);
                return;
            }

            if (data && data.length > 0) {
                // Filtrar bots com 80%+ de assertividade
                const hotBots = data
                    .filter((bot: any) => (bot.assertividade_percentual || 0) >= 80)
                    .map((bot: any) => ({
                        nome_bot: bot.nome_bot,
                        assertividade_percentual: bot.assertividade_percentual
                    }));

                setGains(hotBots);
            }
        } catch (err) {
            console.error('[TICKER] Erro inesperado:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial load
        fetchRealGains();

        // Update every 60 seconds (1 minute is enough for 1h window ticker)
        const interval = setInterval(fetchRealGains, 60000);

        return () => clearInterval(interval);
    }, []);

    if (loading && gains.length === 0) {
        return (
            <div className={`ticker-container relative w-full overflow-hidden bg-black/20 py-2 border-y border-teal-500/10 flex items-center justify-center ${className}`}>
                <Loader2 size={14} className="text-teal-500 animate-spin mr-2" />
                <span className="text-xs text-teal-500/70 font-medium">Sincronizando resultados reales...</span>
            </div>
        );
    }

    if (gains.length === 0) {
        return null;
    }

    // Duplicate for seamless loop
    const duplicatedGains = [...gains, ...gains];

    return (
        <div
            className={`ticker-container relative w-full overflow-hidden bg-gradient-to-r from-black/40 via-black/20 to-black/40 py-2 border-y border-teal-500/20 ${className}`}
        >
            {/* Glow effect at top */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

            {/* Left fade */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black/80 to-transparent z-10 pointer-events-none" />

            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black/80 to-transparent z-10 pointer-events-none" />

            {/* Ticker title */}
            <div className="absolute left-0 top-0 bottom-0 flex items-center z-20 pl-3 pr-4 bg-gradient-to-r from-black/90 via-black/80 to-transparent">
                <div className="flex items-center gap-1.5">
                    <Flame size={14} className="text-alert-500 animate-pulse" />
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                        HOT
                    </span>
                </div>
            </div>

            {/* Scrolling content */}
            <motion.div
                className="flex items-center gap-8 pl-20"
                animate={{
                    x: [0, -50 * (gains.length || 1)],
                }}
                transition={{
                    x: {
                        duration: Math.max(gains.length * 5, 20),
                        repeat: Infinity,
                        ease: 'linear',
                    },
                }}
            >
                {duplicatedGains.map((gain, index) => (
                    <div
                        key={`${gain.nome_bot}-${index}`}
                        className="flex items-center gap-2 whitespace-nowrap"
                    >
                        {/* Green indicator */}
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/40">
                            <TrendingUp size={10} className="text-teal-500" />
                        </div>

                        {/* Bot name */}
                        <span className="text-sm font-medium text-foreground/90">
                            {gain.nome_bot}
                        </span>

                        {/* Assertividade */}
                        <span className="text-sm font-bold text-teal-400">
                            +{gain.assertividade_percentual.toFixed(1)}%
                        </span>

                        {/* Separator */}
                        <span className="text-muted-foreground/40 mx-2">|</span>
                    </div>
                ))}
            </motion.div>

            {/* Glow effect at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
        </div>
    );
};

export default RecentGainsTicker;
