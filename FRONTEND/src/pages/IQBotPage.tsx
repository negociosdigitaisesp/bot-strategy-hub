import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIQBot } from '../hooks/useIQBot';
import { useIQTrades } from '../hooks/useIQTrades';
import { useIQCountdown } from '../hooks/useIQCountdown';
import { supabase } from '../lib/supabaseClient';

/* ══════════════════════════════════════════════════════════════════════
   ICONS & SVGS
══════════════════════════════════════════════════════════════════════ */
const Icons = {
    Dashboard: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    Copy: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>,
    History: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Wallet: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    Settings: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Help: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

/* ══════════════════════════════════════════════════════════════════════
   MOCK SPARKLINE CHART
══════════════════════════════════════════════════════════════════════ */
function Sparkline({ color, points }: { color: string; points: number[] }) {
    const width = 200;
    const height = 40;
    const padding = 4;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    // Scale points to SVG coordinates
    const scaledPoints = points.map((p, i) => {
        const x = (i / (points.length - 1)) * (width - padding * 2) + padding;
        const y = height - padding - ((p - min) / range) * (height - padding * 2);
        return `${x},${y}`;
    });

    const pathData = `M ${scaledPoints.join(' L ')}`;

    // Create area path
    const areaPath = `${pathData} L ${width - padding},${height} L ${padding},${height} Z`;

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#gradient-${color})`} />
            <path d={pathData} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 2px 4px ${color}40)` }} />

            {/* Draw dot at the last point */}
            {points.length > 0 && (
                <circle
                    cx={scaledPoints[scaledPoints.length - 1].split(',')[0]}
                    cy={scaledPoints[scaledPoints.length - 1].split(',')[1]}
                    r="3" fill="#fff" stroke={color} strokeWidth="1.5"
                />
            )}
        </svg>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   TRADERS API — tipos
══════════════════════════════════════════════════════════════════════ */
interface Trader {
    id: string;
    nome: string;
    level: string;          // 'ELITE' | 'PRO' | 'MASTER'
    win_rate: number;       // ex: 86.44
    status: string;         // 'OPERANDO' | 'EM_VALIDACAO'
    risco: string;          // 'BAIXO' | 'MEDIO' | 'ALTO'
    lucro_estimado_30d: number;
    // campos extras que virão da API (ignorados na UI)
    [key: string]: unknown;
}

const IQ_API_TRADERS = 'http://191.252.182.208:4003/api/traders';

// Performance semanal simulada por trader (7 pontos, 0-100)
// Utilizado como fallback quando a API não retorna chart_data
const TRADER_CHARTS: Record<string, number[]> = {
    'Marcus Vega': [60, 65, 70, 68, 75, 78, 81],
    'Aria Chen': [55, 60, 58, 65, 70, 75, 81],
    'Rafael Dumont': [70, 72, 68, 74, 76, 79, 80],
    'Viktor Sorin': [50, 58, 62, 65, 70, 74, 80],
    'Luna Nakashima': [65, 68, 72, 70, 75, 78, 80],
};
const DEFAULT_CHART = [50, 55, 52, 60, 65, 68, 72];

// Fotos dos traders (arquivos em /public/*.png)
const TRADER_IMAGES: Record<string, string> = {
    'Marcus Vega': '/marcus.png',
    'Aria Chen': '/aria.png',
    'Rafael Dumont': '/rafael.png',
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function IQBotPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [winFlash, setWinFlash] = useState<'win' | 'loss' | null>(null);
    const [activeTraderIdx, setActiveTraderIdx] = useState(0);
    const [activeMenu, setActiveMenu] = useState('Copy Trading');

    // ── Credentials form state ──
    const [formEmail, setFormEmail] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formStake, setFormStake] = useState('10.00');

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUserId(data.session?.user?.id ?? null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const {
        bot, isActive, mode, pnlToday, winRate, wins, losses, loading, serverStatus,
        showConfirmModal, setShowConfirmModal, toggleBot, confirmActivateReal, saveCredentials,
    } = useIQBot();

    const { trades } = useIQTrades(bot?.id);
    const { countdown, isUrgent } = useIQCountdown();

    // Flash on new trade
    useEffect(() => {
        if (!trades || !trades.length) return;
        const latest = trades[0];
        if (latest?.result === 'win') {
            setWinFlash('win');
            setTimeout(() => setWinFlash(null), 1200);
        } else if (latest?.result === 'loss') {
            setWinFlash('loss');
            setTimeout(() => setWinFlash(null), 1200);
        }
    }, [trades]);

    // ── Traders da API VPS ──────────────────────────────────
    const [traders, setTraders] = useState<Trader[]>([]);
    const [tradersLoading, setTradersLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const fetchTraders = async () => {
            try {
                setTradersLoading(true);
                const res = await fetch(IQ_API_TRADERS, { signal: AbortSignal.timeout(8000) });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const list: Trader[] = Array.isArray(json) ? json : (json.traders ?? []);
                if (!cancelled) setTraders(list);
            } catch {
                // silencia erro (VPS inacessível em dev)
            } finally {
                if (!cancelled) setTradersLoading(false);
            }
        };
        fetchTraders();
        return () => { cancelled = true; };
    }, []);

    // Animated metrics
    const [serverLoad, setServerLoad] = useState(67);
    useEffect(() => {
        const i = setInterval(() => {
            setServerLoad(v => Math.max(40, Math.min(95, v + (Math.random() - 0.5) * 6)));
        }, 2000);
        return () => clearInterval(i);
    }, []);

    const totalOps = wins + losses;
    const hasCredentials = !!(bot?.iq_email && bot?.iq_password);

    const handleSaveCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await saveCredentials(formEmail, formPassword, parseFloat(formStake) || 10);
        if (result?.success) setShowConfig(false);
    };

    // ── Loading state ──────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#070b14]">
                <div className="text-center space-y-4">
                    <motion.div
                        className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black text-[#0B1221]"
                        style={{ background: 'linear-gradient(135deg,#00FF88,#00B4FF)' }}
                        animate={{ scale: [1, 1.08, 1], opacity: [1, 0.8, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        IQ
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-[#070B14] min-h-screen text-slate-300 font-sans overflow-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700;800&display=swap');
                
                body, .font-sans { font-family: 'Plus Jakarta Sans', sans-serif; }
                .mono { font-family: 'JetBrains Mono', monospace; }
                
                .card-surface {
                    background: #0B1221;
                    border: 1px solid rgba(255,255,255,0.03);
                    border-radius: 16px;
                }
                .card-surface:hover {
                    border-color: rgba(255,255,255,0.08);
                }

                .scroll-hide::-webkit-scrollbar { display: none; }
                .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
                
                .glass-input {
                    background: rgba(0,0,0,0.2) !important;
                    border: 1px solid rgba(255,255,255,0.05) !important;
                    color: white;
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                .glass-input:focus {
                    border-color: #00FF88 !important;
                    box-shadow: 0 0 0 2px rgba(0,255,136,0.1) !important;
                    outline: none;
                }
            `}</style>

            {/* ── WIN/LOSS FLASH ── */}
            <AnimatePresence>
                {winFlash && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 pointer-events-none z-[100]"
                        style={{
                            boxShadow: winFlash === 'win'
                                ? 'inset 0 0 100px 30px rgba(0,255,136,0.2)'
                                : 'inset 0 0 100px 30px rgba(255,59,92,0.2)',
                            border: winFlash === 'win' ? '2px solid rgba(0,255,136,0.4)' : '2px solid rgba(255,59,92,0.4)',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── CONFIRM MODAL ── */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowConfirmModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-[#0B1221] border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold mb-2 text-white">¿Activar en Modo Real?</h2>
                            <p className="text-sm text-slate-400 mb-6">El bot ejecutará operaciones reales utilizando saldo real de tu cuenta IQ Option.</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 text-sm font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmActivateReal}
                                    className="flex-1 py-3 text-sm font-bold rounded-xl bg-[#00FF88] hover:bg-[#00e077] text-black transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>




            {/* ══════════════════════════════════════════════════════════════════
                MAIN CONTENT AREA
            ══════════════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#070b14]">

                {/* ── TOP HEADER ── */}
                <header className="h-20 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-8 bg-[#0B1221]/50 backdrop-blur-md sticky top-0 z-40">

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Icons.Dashboard /> {/* Search icon equivalent */}
                        </div>
                        <span className="text-sm font-medium text-slate-400">Módulo IQ Option</span>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* VPS Server Status */}
                        <div
                            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full"
                            style={{
                                background: serverStatus === 'online'
                                    ? 'rgba(0,255,136,0.08)'
                                    : serverStatus === 'dev'
                                        ? 'rgba(100,116,139,0.08)'
                                        : serverStatus === 'checking'
                                            ? 'rgba(255,184,0,0.08)'
                                            : 'rgba(255,59,92,0.08)',
                                border: `1px solid ${serverStatus === 'online' ? 'rgba(0,255,136,0.25)'
                                    : serverStatus === 'dev' ? 'rgba(100,116,139,0.25)'
                                        : serverStatus === 'checking' ? 'rgba(255,184,0,0.25)'
                                            : 'rgba(255,59,92,0.25)'}`,
                            }}
                        >
                            <span
                                className="text-[10px] font-black uppercase tracking-widest mono"
                                style={{
                                    color: serverStatus === 'online' ? '#00FF88'
                                        : serverStatus === 'dev' ? '#94a3b8'
                                            : serverStatus === 'checking' ? '#FFB800'
                                                : '#FF3B5C',
                                }}
                            >
                                {serverStatus === 'online' ? '● SERVIDOR ONLINE'
                                    : serverStatus === 'dev' ? '○ MODO DEV'
                                        : serverStatus === 'checking' ? '● RECONECTANDO...'
                                            : '● SERVIDOR OFFLINE'}
                            </span>
                        </div>

                        {/* Server Load Metric */}
                        <div className="hidden sm:flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-500 mono uppercase">Carga del Servidor</span>
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-[#00FF88] to-[#00B4FF]"
                                    animate={{ width: `${serverLoad}%` }}
                                />
                            </div>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex items-center rounded-lg p-1 bg-black/40 border border-white/5">
                            <button
                                disabled={isActive}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wide mono transition-colors
                                    ${mode === 'demo' ? 'bg-[#00B4FF]/20 text-[#00B4FF] border border-[#00B4FF]/30' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                DEMO
                            </button>
                            <button
                                disabled={isActive}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wide mono transition-colors
                                    ${mode === 'real' ? 'bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                REAL
                            </button>
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full border border-white/10 bg-[#0B1221] flex items-center justify-center font-bold text-slate-300">
                            u
                        </div>
                    </div>
                </header>

                {/* ── MAIN DASHBOARD VIEW ── */}
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* ── HERO BANNER ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="relative overflow-hidden rounded-2xl p-8 border border-[#00B4FF]/20"
                            style={{ background: 'linear-gradient(105deg, #0B1221 0%, #071E2D 100%)' }}
                        >
                            {/* Decorative element */}
                            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at center, #00B4FF 0%, transparent 70%)' }} />

                            <div className="relative z-10 max-w-xl">
                                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Copia a los Mejores Traders del Mundo</h1>
                                <p className="text-slate-400 text-sm mb-6">Ejecuta señales profesionales en tiempo real directamente en tu cuenta IQ Option.</p>

                                <div className="flex gap-4">
                                    <button className="px-5 py-2.5 bg-gradient-to-r from-[#00FF88]/10 to-[#00B4FF]/10 border border-[#00FF88]/30 hover:border-[#00FF88]/60 text-[#00FF88] text-sm font-semibold rounded-xl transition-all">
                                        Conviértete en Trader
                                    </button>
                                    <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold rounded-xl transition-all">
                                        Guía de Copy Trading
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* ── TRADERS MATRIX ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white">Mejores Traders</h2>
                                <div className="flex gap-4 text-sm font-medium text-slate-400 hidden sm:flex">
                                    <span className="text-white border-b-2 border-[#00B4FF] pb-1 cursor-pointer">Rankings General</span>
                                    <span className="hover:text-slate-200 cursor-pointer">ROI 30D</span>
                                    <span className="hover:text-slate-200 cursor-pointer">Copiadores</span>
                                    <span className="hover:text-slate-200 cursor-pointer">Tasa de Éxito</span>
                                    <span className="hover:text-slate-200 cursor-pointer flex items-center gap-1">
                                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg> Filtrar
                                    </span>
                                </div>
                            </div>

                            {/* ── TRADERS GRID ── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {tradersLoading ? (
                                    // Skeleton
                                    [...Array(3)].map((_, i) => (
                                        <div key={i} className="card-surface p-5 animate-pulse">
                                            <div className="h-4 bg-white/10 rounded mb-3 w-2/3" />
                                            <div className="h-3 bg-white/5 rounded mb-2 w-1/2" />
                                            <div className="h-8 bg-white/5 rounded" />
                                        </div>
                                    ))
                                ) : traders.length === 0 ? (
                                    <div className="col-span-3 text-center py-10 text-slate-500 text-sm">
                                        Ningún trader disponible por el momento.
                                    </div>
                                ) : (
                                    traders.slice(0, 3).map((trader, idx) => {
                                        const isSelected = idx === activeTraderIdx;
                                        // Cor por level
                                        const levelColor = trader.level === 'ELITE' ? '#00FF88'
                                            : trader.level === 'PRO' ? '#00B4FF'
                                                : '#FFB800';
                                        const isOperando = trader.status === 'OPERANDO';
                                        return (
                                            <div
                                                key={trader.id ?? idx}
                                                onClick={() => setActiveTraderIdx(idx)}
                                                className="card-surface p-5 cursor-pointer relative overflow-hidden transition-all duration-300 group"
                                                style={{
                                                    borderColor: isSelected ? `${levelColor}50` : undefined,
                                                    boxShadow: isSelected ? `0 8px 30px ${levelColor}15` : undefined,
                                                }}
                                            >
                                                {/* Header: nome + badge level */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex gap-3 items-center">
                                                        {/* Avatar: foto ou inicial */}
                                                        {TRADER_IMAGES[trader.nome] ? (
                                                            <img
                                                                src={TRADER_IMAGES[trader.nome]}
                                                                alt={trader.nome}
                                                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-lg"
                                                                style={{ border: `2px solid ${levelColor}60` }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-black shadow-lg flex-shrink-0"
                                                                style={{ background: `linear-gradient(135deg, ${levelColor}, ${levelColor}88)` }}
                                                            >
                                                                {trader.nome?.charAt(0)?.toUpperCase() ?? '?'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            {/* NOME — único campo de identidade visível */}
                                                            <div className="font-bold text-white text-[15px] leading-tight">{trader.nome}</div>
                                                            {/* Status operacional */}
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${isOperando ? 'bg-[#00FF88] shadow-[0_0_4px_#00FF88]' : 'bg-slate-500'}`} />
                                                                <span className="text-[10px] font-semibold mono"
                                                                    style={{ color: isOperando ? '#00FF88' : '#64748b' }}
                                                                >
                                                                    {isOperando ? 'OPERANDO' : 'EN VALIDACIÓN'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Level Badge */}
                                                    <span
                                                        className="px-2.5 py-1 rounded-full text-[10px] font-black mono tracking-widest"
                                                        style={{
                                                            background: `${levelColor}15`,
                                                            border: `1px solid ${levelColor}40`,
                                                            color: levelColor,
                                                        }}
                                                    >
                                                        {trader.level}
                                                    </span>
                                                </div>

                                                {/* Metrics grid: Win Rate + Risco + Lucro 30D */}
                                                <div className="grid grid-cols-3 gap-2 mb-4">
                                                    <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Efectividad</div>
                                                        <div className="text-sm font-black mono" style={{ color: levelColor }}>
                                                            {typeof trader.win_rate === 'number' ? `${trader.win_rate.toFixed(1)}%` : trader.win_rate}
                                                        </div>
                                                    </div>
                                                    <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Riesgo</div>
                                                        <div className="text-[11px] font-bold mono text-white">{trader.risco ?? '—'}</div>
                                                    </div>
                                                    <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Ganancia 30D</div>
                                                        <div className="text-[11px] font-bold mono"
                                                            style={{ color: (trader.lucro_estimado_30d ?? 0) >= 0 ? '#00FF88' : '#FF3B5C' }}
                                                        >
                                                            {typeof trader.lucro_estimado_30d === 'number'
                                                                ? `${trader.lucro_estimado_30d >= 0 ? '+' : ''}${trader.lucro_estimado_30d.toFixed(0)}%`
                                                                : '—'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ── Sparkline: performance semanal ── */}
                                                <div
                                                    className="-mx-1 mb-4 overflow-hidden"
                                                    style={{ borderRadius: '10px' }}
                                                >
                                                    <Sparkline
                                                        color={levelColor}
                                                        points={
                                                            (trader as any).chart_data
                                                            ?? TRADER_CHARTS[trader.nome]
                                                            ?? DEFAULT_CHART
                                                        }
                                                    />
                                                </div>

                                                {/* Copiar button */}
                                                <button
                                                    className="w-full py-2 rounded-xl text-xs font-bold transition-all"
                                                    style={isSelected
                                                        ? { background: levelColor, color: '#000', boxShadow: `0 0 12px ${levelColor}40` }
                                                        : { background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.3)', color: '#00B4FF' }
                                                    }
                                                >
                                                    {isSelected ? '✓ Copiando' : 'Copiar Trader'}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>


                        {/* ── LOWER SECTION: RISK MANAGEMENT & FEED ── */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-8">

                            {/* RISK MANAGEMENT / CONTROLS (Col 4) */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="xl:col-span-4 card-surface flex flex-col"
                            >
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="font-bold text-white">Gestión de Riesgo y Bot</h3>
                                    <button
                                        onClick={() => setShowConfig(!showConfig)}
                                        className="text-xs text-[#00B4FF] hover:text-white transition-colors flex items-center gap-1 font-medium bg-[#0B1221] border border-[#00B4FF]/20 px-3 py-1.5 rounded-lg"
                                    >
                                        <Icons.Settings />
                                        {showConfig ? 'Volver' : 'Configurar'}
                                    </button>
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    {showConfig ? (
                                        <motion.form
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            onSubmit={handleSaveCredentials}
                                            className="space-y-4"
                                        >
                                            <div className="bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-lg p-3 mb-4">
                                                <p className="text-xs text-[#FFB800]">
                                                    Las credenciales de IQ Option se utilizan exclusivamente para la autenticación en la nube (motor de ejecución).
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-400 mb-2">Correo IQ Option</label>
                                                <input
                                                    type="email"
                                                    value={formEmail}
                                                    onChange={e => setFormEmail(e.target.value)}
                                                    className="w-full glass-input px-4 py-2.5 text-sm"
                                                    placeholder="tucorreo@ejemplo.com"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-400 mb-2">Contraseña</label>
                                                <input
                                                    type="password"
                                                    value={formPassword}
                                                    onChange={e => setFormPassword(e.target.value)}
                                                    className="w-full glass-input px-4 py-2.5 text-sm"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-400 mb-2">Monto de Inversión (Stake)</label>
                                                <input
                                                    type="number" step="0.01" min="1"
                                                    value={formStake}
                                                    onChange={e => setFormStake(e.target.value)}
                                                    className="w-full glass-input px-4 py-2.5 text-sm flex-1"
                                                    required
                                                />
                                            </div>
                                            <button type="submit" className="w-full mt-4 py-3 bg-gradient-to-r from-[#00FF88] to-[#00C866] text-black font-bold rounded-xl shadow-[0_0_15px_rgba(0,255,136,0.2)] hover:shadow-[0_0_25px_rgba(0,255,136,0.4)] transition-all">
                                                Guardar Configuración
                                            </button>
                                            <button type="button" onClick={() => setShowConfig(false)} className="w-full mt-2 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-all">
                                                Cancelar
                                            </button>
                                        </motion.form>
                                    ) : (
                                        <div className="flex flex-col h-full space-y-6">
                                            {/* Stats summary */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-black/30 rounded-xl p-4 border border-white/5 shadow-inner">
                                                    <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">PnL de Hoy</div>
                                                    <div className={`text-xl font-black mono ${pnlToday >= 0 ? 'text-[#00FF88]' : 'text-[#FF3B5C]'}`}>
                                                        {pnlToday >= 0 ? '+' : ''}{pnlToday.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="bg-black/30 rounded-xl p-4 border border-white/5 shadow-inner">
                                                    <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">Efectividad</div>
                                                    <div className="text-xl font-black mono text-white">
                                                        {totalOps > 0 ? winRate.toFixed(1) : '0.0'}%
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-xs py-2 border-y border-white/5">
                                                <span className="text-slate-400">Total de Operaciones:</span>
                                                <span className="font-bold text-white mono">{totalOps}</span>
                                            </div>

                                            {/* Stop Loss / Take profit visualizer */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-semibold">
                                                    <span className="text-slate-400">Progreso Take Profit</span>
                                                    <span className="text-[#00B4FF]">+$50.00 Meta</span>
                                                </div>
                                                <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                                                    <div className="h-full bg-gradient-to-r from-[#00b4ff] to-[#00FF88] w-[45%]" />
                                                </div>
                                            </div>

                                            <div className="flex-1" />

                                            {/* Action Button */}
                                            {!hasCredentials && (
                                                <p className="text-xs text-center text-[#FFB800] mb-2 font-medium">⚠️ Por favor, configura tus credenciales de IQ Option primero.</p>
                                            )}
                                            <button
                                                onClick={toggleBot}
                                                disabled={!hasCredentials}
                                                className={`w-full py-4 text-sm font-black rounded-xl transition-all duration-300 uppercase tracking-widest relative overflow-hidden group border
                                                    ${!hasCredentials ? 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed' :
                                                        isActive ? 'bg-gradient-to-r from-[#FF3B5C] to-[#CC0032] text-white border-[#FF3B5C] shadow-[0_0_25px_#FF3B5C50]'
                                                            : 'bg-gradient-to-r from-[#00FF88] to-[#00C866] text-black border-[#00FF88] shadow-[0_0_25px_#00FF8850]'}`}
                                            >
                                                <span className="relative z-10 flex items-center justify-center gap-2">
                                                    {isActive ? (
                                                        <> <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Detener Bot </>
                                                    ) : (
                                                        <> ▶ Iniciar Automatización </>
                                                    )}
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* FEED DE OPERAÇÕES (Col 8) */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="xl:col-span-8 card-surface flex flex-col min-h-[400px]"
                            >
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        Datos y Resultados
                                        {trades?.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#00B4FF]/10 text-[#00B4FF] mono font-bold border border-[#00B4FF]/20">
                                                {trades.length} operaciones
                                            </span>
                                        )}
                                    </h3>

                                    <div className="text-xs text-slate-400 font-medium">
                                        Próxima Operación: <span className={`mono font-bold ${isUrgent ? 'text-[#FF3B5C]' : 'text-[#00B4FF]'}`}>{countdown}</span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto scroll-hide p-2 relative">
                                    {!trades || trades.length === 0 ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                                            <div className="text-5xl mb-4 opacity-75">📭</div>
                                            <div className="text-sm font-medium text-slate-300">Sin datos capturados aún</div>
                                            <div className="text-xs text-slate-500 mt-2">Conecta el bot para ver los resultados en tiempo real</div>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="sticky top-0 bg-[#0B1221] z-10">
                                                <tr>
                                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">Hora</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">Activo</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">Acción</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">Monto</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 text-right">Resultado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {trades.map((log: any, i: number) => {
                                                    const isWin = log.result === 'win';
                                                    const isLoss = log.result === 'loss';
                                                    return (
                                                        <motion.tr
                                                            key={log.id ?? i}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0"
                                                        >
                                                            <td className="px-4 py-3 text-xs text-slate-400 mono">
                                                                {new Date(log.executed_at).toLocaleTimeString('es-MX')}
                                                            </td>
                                                            <td className="px-4 py-3 text-[13px] font-semibold text-white mono">
                                                                {log.pair || '—'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2.5 py-1 flex items-center justify-center gap-1.5 w-20 rounded text-[10px] font-black uppercase mono border ${isWin ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20' : 'bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/20'}`}>
                                                                    {isWin ? 'CALL' : 'PUT'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-[13px] font-medium text-slate-300 mono">
                                                                ${log.amount?.toFixed(2) ?? '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {isWin ? (
                                                                    <div className="flex items-center justify-end gap-1.5 text-[11px] text-[#00FF88] font-bold">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" /> WIN
                                                                    </div>
                                                                ) : isLoss ? (
                                                                    <div className="flex items-center justify-end gap-1.5 text-[11px] text-[#FF3B5C] font-bold">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B5C] shadow-[0_0_6px_#FF3B5C]" /> LOSS
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-end gap-1.5 text-[11px] text-[#FFB800] font-bold">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse" /> PENDIENTE
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </motion.tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
