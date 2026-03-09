import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIQBot } from '../hooks/useIQBot';
import { useIQTrades } from '../hooks/useIQTrades';
import { useIQCountdown } from '../hooks/useIQCountdown';
import IQBotCredentials from '../components/IQBot/IQBotCredentials';
import IQBotConsole from '../components/IQBot/IQBotConsole';
import { useMotorDetector } from '../hooks/useMotorDetector';

/* ══════════════════════════════════════════════════════════════════════
   SPARKLINE CHART (micro SVG)
══════════════════════════════════════════════════════════════════════ */
function Sparkline({ color, points }: { color: string; points: number[] }) {
    const width = 200, height = 40, pad = 4;
    const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
    const scaled = points.map((p, i) => {
        const x = (i / (points.length - 1)) * (width - pad * 2) + pad;
        const y = height - pad - ((p - min) / range) * (height - pad * 2);
        return `${x},${y}`;
    });
    const pathD = `M ${scaled.join(' L ')}`;
    const area = `${pathD} L ${width - pad},${height} L ${pad},${height} Z`;
    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
                <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#grad-${color})`} />
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 2px 4px ${color}40)` }} />
            {points.length > 0 && (
                <circle
                    cx={scaled[scaled.length - 1].split(',')[0]}
                    cy={scaled[scaled.length - 1].split(',')[1]}
                    r="3" fill="#fff" stroke={color} strokeWidth="1.5"
                />
            )}
        </svg>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   TRADERS TYPES
══════════════════════════════════════════════════════════════════════ */
interface Trader {
    id: string;
    nome: string;
    level: string;
    win_rate: number;
    status: string;
    risco: string;
    lucro_estimado_30d: number;
    [key: string]: unknown;
}

const IQ_API_TRADERS = 'http://191.252.182.208:4003/api/traders';

const TRADER_CHARTS: Record<string, number[]> = {
    'Marcus Vega': [60, 65, 70, 68, 75, 78, 81],
    'Aria Chen': [55, 60, 58, 65, 70, 75, 81],
    'Rafael Dumont': [70, 72, 68, 74, 76, 79, 80],
};
const DEFAULT_CHART = [50, 55, 52, 60, 65, 68, 72];

const TRADER_IMAGES: Record<string, string> = {
    'Marcus Vega': '/marcus.png',
    'Aria Chen': '/aria.png',
    'Rafael Dumont': '/rafael.png',
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function IQBotPage() {
    const [winFlash, setWinFlash] = useState<'win' | 'loss' | null>(null);
    const [activeTraderIdx, setActiveTraderIdx] = useState(0);
    const [showInstallModal, setShowInstallModal] = useState(false);

    const { motorStatus, motorVersion, startMotor, stopMotor } = useMotorDetector();

    const {
        bot, isActive, mode, pnlToday, winRate, wins, losses, loading, serverStatus,
        logs, showConfirmModal, setShowConfirmModal, toggleBot, confirmActivateReal,
        saveConfig, changeMode,
    } = useIQBot();

    const { trades } = useIQTrades(bot?.id);
    const { countdown, isUrgent } = useIQCountdown();

    // Flash on new trade
    useEffect(() => {
        if (!trades || !trades.length) return;
        const latest = trades[0];
        if (latest?.result === 'win') { setWinFlash('win'); setTimeout(() => setWinFlash(null), 1200); }
        else if (latest?.result === 'loss') { setWinFlash('loss'); setTimeout(() => setWinFlash(null), 1200); }
    }, [trades]);

    // ── Traders from VPS API ──
    const [traders, setTraders] = useState<Trader[]>([]);
    const [tradersLoading, setTradersLoading] = useState(true);

    useEffect(() => {
        setTradersLoading(true);
        // Usando dados mockados para evitar poluir o console com ERR_CONNECTION_REFUSED caso a API de traders esteja offline
        setTimeout(() => {
            setTraders([
                { id: '1', nome: 'Marcus Vega', level: 'ELITE', win_rate: 85.4, status: 'OPERANDO', risco: 'Moderado', lucro_estimado_30d: 142 },
                { id: '2', nome: 'Aria Chen', level: 'PRO', win_rate: 78.2, status: 'OPERANDO', risco: 'Baixo', lucro_estimado_30d: 95 },
                { id: '3', nome: 'Rafael Dumont', level: 'EXPERT', win_rate: 71.8, status: 'VALIDANDO', risco: 'Alto', lucro_estimado_30d: 180 }
            ]);
            setTradersLoading(false);
        }, 500);
    }, []);

    // Animated server load
    const [serverLoad, setServerLoad] = useState(67);
    useEffect(() => {
        const i = setInterval(() => setServerLoad(v => Math.max(40, Math.min(95, v + (Math.random() - 0.5) * 6))), 2000);
        return () => clearInterval(i);
    }, []);

    const totalOps = wins + losses;
    const hasSSID = !!bot?.ssid;

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#070b14]">
                <motion.div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-[#0B1221]"
                    style={{ background: 'linear-gradient(135deg,#00FF88,#00B4FF)' }}
                    animate={{ scale: [1, 1.08, 1], opacity: [1, 0.8, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                    IQ
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex bg-[#070B14] min-h-screen text-slate-300 font-sans overflow-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700;800&display=swap');
                body, .font-sans { font-family: 'Plus Jakarta Sans', sans-serif; }
                .mono { font-family: 'JetBrains Mono', monospace; }
                .card-surface { background: #0B1221; border: 1px solid rgba(255,255,255,0.03); border-radius: 16px; }
                .card-surface:hover { border-color: rgba(255,255,255,0.08); }
                .scroll-hide::-webkit-scrollbar { display: none; }
                .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* ── WIN/LOSS FLASH ── */}
            <AnimatePresence>
                {winFlash && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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

            {/* ── INSTALL MOTOR HFT MODAL ── */}
            <AnimatePresence>
                {showInstallModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowInstallModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="bg-[#0B1221] border border-white/10 p-6 rounded-2xl max-w-sm w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00FF88] to-[#00B4FF] flex items-center justify-center text-black font-black text-lg mb-4">
                                ⚡
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Motor de Execução HFT</h2>
                            <p className="text-sm text-slate-400 mb-4">
                                O Motor HFT executa suas ordens diretamente do seu computador,
                                com seu IP, em background — mesmo com a aba fechada.
                            </p>
                            <div className="bg-black/30 rounded-xl p-4 mb-5 space-y-2">
                                {['Baixe e extraia o motor-hft.zip', 'Abra chrome://extensions', 'Ative "Modo desenvolvedor"', 'Clique "Carregar sem compactação"', 'Selecione a pasta extraída'].map((step, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                        <span className="w-5 h-5 rounded-full bg-[#00FF88]/15 text-[#00FF88] text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        {step}
                                    </div>
                                ))}
                            </div>
                            <a
                                href="/motor-hft.zip"
                                download
                                className="block w-full py-3 text-center text-sm font-black rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00C866] text-black"
                            >
                                ⬇ Baixar Motor HFT v1.0
                            </a>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── CONFIRM REAL MODE MODAL ── */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowConfirmModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-[#0B1221] border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold mb-2 text-white">¿Activar en Modo Real?</h2>
                            <p className="text-sm text-slate-400 mb-6">El bot ejecutará operaciones reales utilizando saldo real de tu cuenta IQ Option.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 text-sm font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={confirmActivateReal} className="flex-1 py-3 text-sm font-bold rounded-xl bg-[#00FF88] hover:bg-[#00e077] text-black transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]">
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════════════
                MAIN CONTENT AREA
            ══════════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#070b14]">

                {/* ── TOP HEADER ── */}
                <header className="h-20 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-8 bg-[#0B1221]/50 backdrop-blur-md sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black"
                            style={{ background: 'linear-gradient(135deg, #00FF88, #00B4FF)', color: '#000' }}
                        >
                            IQ
                        </div>
                        <div>
                            <span className="text-sm font-bold text-white">IQ Option — Copy Trading</span>
                            <span className="block text-[10px] text-slate-500">Módulo de execução automatizada</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* VPS Status */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full"
                            style={{
                                background: serverStatus === 'online' ? 'rgba(0,255,136,0.08)' : serverStatus === 'dev' ? 'rgba(100,116,139,0.08)' : serverStatus === 'checking' ? 'rgba(255,184,0,0.08)' : 'rgba(255,59,92,0.08)',
                                border: `1px solid ${serverStatus === 'online' ? 'rgba(0,255,136,0.25)' : serverStatus === 'dev' ? 'rgba(100,116,139,0.25)' : serverStatus === 'checking' ? 'rgba(255,184,0,0.25)' : 'rgba(255,59,92,0.25)'}`,
                            }}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest mono"
                                style={{ color: serverStatus === 'online' ? '#00FF88' : serverStatus === 'dev' ? '#94a3b8' : serverStatus === 'checking' ? '#FFB800' : '#FF3B5C' }}
                            >
                                {serverStatus === 'online' ? '● SERVIDOR ONLINE' : serverStatus === 'dev' ? '○ MODO DEV' : serverStatus === 'checking' ? '● RECONECTANDO...' : '● SERVIDOR OFFLINE'}
                            </span>
                        </div>

                        {/* Motor HFT Badge */}
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full ${
                            motorStatus === 'connected'
                                ? 'bg-[#00FF88]/[0.08] border border-[#00FF88]/25'
                                : 'bg-[#FF3B5C]/[0.08] border border-[#FF3B5C]/25'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                                motorStatus === 'connected' ? 'bg-[#00FF88] shadow-[0_0_4px_#00FF88]' : 'bg-[#FF3B5C]'
                            }`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest mono ${
                                motorStatus === 'connected' ? 'text-[#00FF88]' : 'text-[#FF3B5C]'
                            }`}>
                                {motorStatus === 'not_installed' && '● MOTOR NÃO INSTALADO'}
                                {motorStatus === 'connecting'    && '● MOTOR CONECTANDO...'}
                                {motorStatus === 'connected'     && '● MOTOR HFT ATIVO'}
                                {motorStatus === 'disconnected'  && '● MOTOR OFFLINE'}
                                {motorStatus === 'ssid_expired'  && '● SSID EXPIRADO'}
                                {motorStatus === 'iq_offline'    && '● IQ OFFLINE'}
                            </span>
                        </div>

                        {/* Server Load */}
                        <div className="hidden sm:flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-500 mono uppercase">Carga</span>
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-gradient-to-r from-[#00FF88] to-[#00B4FF]" animate={{ width: `${serverLoad}%` }} />
                            </div>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex items-center rounded-lg p-1 bg-black/40 border border-white/5">
                            <button
                                disabled={isActive}
                                onClick={() => changeMode('demo')}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wide mono transition-colors
                                    ${mode === 'demo' ? 'bg-[#00B4FF]/20 text-[#00B4FF] border border-[#00B4FF]/30' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                DEMO
                            </button>
                            <button
                                disabled={isActive}
                                onClick={() => changeMode('real')}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wide mono transition-colors
                                    ${mode === 'real' ? 'bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                REAL
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── MAIN DASHBOARD ── */}
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* ── HERO BANNER ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                            className="relative overflow-hidden rounded-2xl p-8 border border-[#00B4FF]/20"
                            style={{ background: 'linear-gradient(105deg, #0B1221 0%, #071E2D 100%)' }}
                        >
                            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at center, #00B4FF 0%, transparent 70%)' }} />
                            <div className="relative z-10 max-w-xl">
                                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Copia a los Mejores Traders del Mundo</h1>
                                <p className="text-slate-400 text-sm mb-6">Ejecuta señales profesionales en tiempo real directamente en tu cuenta IQ Option via SSID.</p>
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

                        {/* ── TRADERS GRID ── */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white">Mejores Traders</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {tradersLoading ? (
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
                                        const levelColor = trader.level === 'ELITE' ? '#00FF88' : trader.level === 'PRO' ? '#00B4FF' : '#FFB800';
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
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex gap-3 items-center">
                                                        {TRADER_IMAGES[trader.nome] ? (
                                                            <img src={TRADER_IMAGES[trader.nome]} alt={trader.nome} className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-lg" style={{ border: `2px solid ${levelColor}60` }} />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-black shadow-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, ${levelColor}, ${levelColor}88)` }}>
                                                                {trader.nome?.charAt(0)?.toUpperCase() ?? '?'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-white text-[15px] leading-tight">{trader.nome}</div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${isOperando ? 'bg-[#00FF88] shadow-[0_0_4px_#00FF88]' : 'bg-slate-500'}`} />
                                                                <span className="text-[10px] font-semibold mono" style={{ color: isOperando ? '#00FF88' : '#64748b' }}>
                                                                    {isOperando ? 'OPERANDO' : 'EN VALIDACIÓN'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black mono tracking-widest" style={{ background: `${levelColor}15`, border: `1px solid ${levelColor}40`, color: levelColor }}>
                                                        {trader.level}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 mb-4">
                                                    <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Efectividad</div>
                                                        <div className="text-sm font-black mono" style={{ color: levelColor }}>{typeof trader.win_rate === 'number' ? `${trader.win_rate.toFixed(1)}%` : trader.win_rate}</div>
                                                    </div>
                                                    <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Riesgo</div>
                                                        <div className="text-[11px] font-bold mono text-white">{trader.risco ?? '—'}</div>
                                                    </div>
                                                    <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Ganancia 30D</div>
                                                        <div className="text-[11px] font-bold mono" style={{ color: (trader.lucro_estimado_30d ?? 0) >= 0 ? '#00FF88' : '#FF3B5C' }}>
                                                            {typeof trader.lucro_estimado_30d === 'number' ? `${trader.lucro_estimado_30d >= 0 ? '+' : ''}${trader.lucro_estimado_30d.toFixed(0)}%` : '—'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="-mx-1 mb-4 overflow-hidden" style={{ borderRadius: '10px' }}>
                                                    <Sparkline color={levelColor} points={(trader as any).chart_data ?? TRADER_CHARTS[trader.nome] ?? DEFAULT_CHART} />
                                                </div>

                                                <button className="w-full py-2 rounded-xl text-xs font-bold transition-all"
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

                        {/* ══════════════════════════════════════════════════════════════
                            LOWER SECTION: CREDENTIALS + STATS | CONSOLE + TRADE FEED
                        ══════════════════════════════════════════════════════════════ */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-8">

                            {/* ── LEFT COLUMN (4/12): Credentials + Bot Status ── */}
                            <div className="xl:col-span-4 space-y-5">
                                {/* Risk & Credentials */}
                                <IQBotCredentials
                                    onSave={saveConfig}
                                    initialConfig={bot ? {
                                        ssid: bot.ssid,
                                        stake: bot.stake_amount,
                                        take_profit: bot.take_profit,
                                        stop_loss: bot.stop_loss,
                                        martingale_steps: bot.martingale_steps
                                    } : undefined}
                                    hasSSID={hasSSID}
                                    loading={loading}
                                />

                                {/* Bot Status + Stats Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.15 }}
                                    className="card-surface"
                                >
                                    <div className="p-5 border-b border-white/5">
                                        <h3 className="font-bold text-white text-sm">Estado del Bot</h3>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                                <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">PnL Hoy</div>
                                                <div className={`text-xl font-black mono ${pnlToday >= 0 ? 'text-[#00FF88]' : 'text-[#FF3B5C]'}`}>
                                                    {pnlToday >= 0 ? '+' : ''}{pnlToday.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                                <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">Efectividad</div>
                                                <div className="text-xl font-black mono text-white">
                                                    {totalOps > 0 ? winRate.toFixed(1) : '0.0'}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-xs py-2 border-y border-white/5">
                                            <span className="text-slate-400">Total Operaciones:</span>
                                            <span className="font-bold text-white mono">{totalOps}</span>
                                        </div>

                                        {/* Action Button */}
                                        {!hasSSID && (
                                            <p className="text-xs text-center text-[#FFB800] font-medium">⚠️ Configure seu SSID primeiro.</p>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (motorStatus === 'not_installed') {
                                                    setShowInstallModal(true);
                                                    return;
                                                }
                                                if (isActive) {
                                                    stopMotor();
                                                    toggleBot();
                                                } else {
                                                    startMotor(bot?.client_id ?? '');
                                                    toggleBot();
                                                }
                                            }}
                                            disabled={!hasSSID}
                                            className={`w-full py-4 text-sm font-black rounded-xl transition-all duration-300 uppercase tracking-widest relative overflow-hidden group border
                                                ${!hasSSID ? 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed' :
                                                    isActive ? 'bg-gradient-to-r from-[#FF3B5C] to-[#CC0032] text-white border-[#FF3B5C] shadow-[0_0_25px_#FF3B5C50]'
                                                        : 'bg-gradient-to-r from-[#00FF88] to-[#00C866] text-black border-[#00FF88] shadow-[0_0_25px_#00FF8850]'}`}
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                {isActive ? (
                                                    <><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Detener Bot</>
                                                ) : (
                                                    <>▶ Iniciar Automatización</>
                                                )}
                                            </span>
                                        </button>
                                    </div>
                                </motion.div>
                            </div>

                            {/* ── RIGHT COLUMN (8/12): Console + Trade Feed ── */}
                            <div className="xl:col-span-8 space-y-5">
                                {/* Terminal Console */}
                                <IQBotConsole logs={logs} />

                                {/* Trade Feed */}
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                    className="card-surface flex flex-col min-h-[300px]"
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
                                            Próxima: <span className={`mono font-bold ${isUrgent ? 'text-[#FF3B5C]' : 'text-[#00B4FF]'}`}>{countdown}</span>
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
                                                        {['Hora', 'Activo', 'Acción', 'Monto', 'Resultado'].map(h => (
                                                            <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                                                                {h}
                                                            </th>
                                                        ))}
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
                                                                <td className="px-4 py-3 text-[13px] font-semibold text-white mono">{log.pair || '—'}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`px-2.5 py-1 flex items-center justify-center gap-1.5 w-20 rounded text-[10px] font-black uppercase mono border ${log.direction === 'CALL' ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20' : 'bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/20'}`}>
                                                                        {log.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-[13px] font-medium text-slate-300 mono">${log.amount?.toFixed(2) ?? '—'}</td>
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
        </div>
    );
}
