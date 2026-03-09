/**
 * IQQuant.tsx — IQ Option Copy Trading Style (Gestión de Riesgos)
 *
 * Dashboard profesional enfocado en el motor HFT y gestión de riesgo.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useIQBot } from '@/hooks/useIQBot'
import { iqSupabase } from '@/lib/iqSupabase'
import { useClientId } from '@/hooks/useClientId'
import { useIQSignalMonitor } from '@/hooks/useIQSignalMonitor'
import { Link } from 'react-router-dom'
import { ShieldAlert, Settings2, Activity, Play, Square, Save, AlertCircle, User, LayoutGrid } from 'lucide-react'

// ── Constantes & Interfaces ──────────────────────────────────────────────────
const GALE_MULTIPLIERS = [1.0, 2.2, 5.0] as const
const IQ_RECOVERY_KEY = 'iq_active_recovery'

interface Trader { id: string; nome: string; level: string; win_rate: number; status: string; risco: string; estrategia_id?: string; descricao?: string; lucro_estimado_30d?: number; chart_data?: number[] }
interface OpenPosition { id: string; asset: string; direction: 'CALL' | 'PUT'; stake: number; gale: number; openTime: number; durationSecs: number; bot: string }

const TRADER_CHARTS: Record<string, number[]> = {
    'Marcus Vega': [60, 65, 70, 68, 75, 78, 81],
    'Aria Chen': [55, 60, 58, 65, 70, 75, 81],
    'Odin Quant': [70, 72, 68, 74, 76, 79, 85],
};
const DEFAULT_CHART = [50, 55, 52, 60, 65, 68, 72];

// ── Componentes Visuais ──────────────────────────────────────────────────────

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
                <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#grad-${color.replace('#', '')})`} />
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 2px 4px ${color}40)` }} />
            {points.length > 0 && (
                <circle cx={scaled[scaled.length - 1].split(',')[0]} cy={scaled[scaled.length - 1].split(',')[1]} r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
            )}
        </svg>
    );
}

// ── App Principal ────────────────────────────────────────────────────────────

export default function IQQuant() {
    const { clientId } = useClientId()

    const {
        bot, isActive, mode, sessionStatus,
        loading, logs: rawLogs, showConfirmModal, setShowConfirmModal,
        toggleBot, confirmActivateReal, saveRiskConfig, changeMode, executeOrder,
        activeEstrategia, updateActiveEstrategia, sessionStats, iqEmail, recentTrades,
    } = useIQBot()

    const isConnected = sessionStatus === 'connected'
    const hasCredentials = !!iqEmail

    const motorLabel = isActive ? 'Activo en Servidor ✅' : 'En Espera'

    const [masterOn, setMasterOn] = useState(true)
    const [openPositions, setOpenPositions] = useState<OpenPosition[]>([])
    
    // Risco States
    const [stakeInput, setStakeInput] = useState('10')
    const [tpInput, setTpInput] = useState('50')
    const [slInput, setSlInput] = useState('25')
    const [martingaleOn, setMartingaleOn] = useState(true)
    const [riskSaving, setRiskSaving] = useState(false)
    const [riskConfigured, setRiskConfigured] = useState(false)
    const [galeLogs, setGaleLogs] = useState<{ ts: string; level: 'info' | 'ok' | 'error' | 'warn'; msg: string }[]>([])

    const [traders, setTraders] = useState<Trader[]>([])
    const [tradersLoading, setTradersLoading] = useState(true)

    const handleToggleBot = useCallback(() => {
        if (!riskConfigured && !isActive) {
            toast.error('¡Atención! Por favor, configura y guarda tu Gestión de Riesgos antes de iniciar la automatización.');
            return;
        }
        toggleBot()
    }, [toggleBot, riskConfigured, isActive])

    // Carregamento de traders do banco
    useEffect(() => {
        setTradersLoading(true)
        iqSupabase
            .from('iq_traders')
            .select('*')
            .order('win_rate', { ascending: false })
            .then(({ data }) => {
                if (data) setTraders(data as any)
                setTradersLoading(false)
            })
    }, [])

    const executingAssetsRef = useRef<Set<string>>(new Set())
    const executeGaleRef = useRef<(a: string, d: string, e?: string) => Promise<void>>(async () => { })

    const addLog = useCallback((level: 'info' | 'ok' | 'error' | 'warn', msg: string) => {
        const ts = new Date().toISOString().substring(11, 23)
        setGaleLogs(prev => [{ ts, level, msg }, ...prev].slice(0, 80))
    }, [])

    // upsertGaleState removido — tabela iq_gale_state não existe no Supabase B.
    // VPS gerencia o estado de gale. Frontend apenas monitora via iq_trade_results.
    const upsertGaleState = useCallback(async (
        _signalId: string, _activo: string, _direccion: string,
        _base: number, _level: number, _result: 'pending' | 'win' | 'loss',
    ) => { /* no-op */ }, [])

    // ── Gale Chain Execute ──
    const executeIQGaleChain = useCallback(async (
        activo: string, direccion: string, estrategia = 'COPY'
    ) => {
        if (!isActive || !isConnected) {
            addLog('warn', `[🛑] Señal Ignorada: Bot Apagado u Oflline.`);
            executingAssetsRef.current.delete(activo); return
        }

        const base = parseFloat(stakeInput) || 10.0
        const signalId = `${estrategia}_${new Date().toISOString().slice(0, 10)}`

        await upsertGaleState(signalId, activo, direccion, base, 0, 'pending')

        let finalWon = false; let totalProfit = 0; let finalResult = 'LOSS'

        try {
            for (let i = 0; i < (martingaleOn ? 3 : 1); i++) {
                const stake = base * GALE_MULTIPLIERS[i]
                if (i > 0) await new Promise(r => setTimeout(r, 200 + Math.random() * 400))

                localStorage.setItem(IQ_RECOVERY_KEY, JSON.stringify({ activo, direccion, proximo_gale: i, estrategia, ts: Date.now() }))
                addLog('info', `[⚡ G${i}] Enviando ${activo} ${direccion} $${stake.toFixed(2)}`)

                const posId = `iq-${activo}-G${i}-${Date.now()}`
                setOpenPositions(p => [...p, { id: posId, asset: activo, direction: direccion as 'CALL' | 'PUT', stake, gale: i, openTime: Date.now(), durationSecs: 62, bot: estrategia }])

                const result = await executeOrder({
                    asset: activo, direction: direccion, amount: stake, action: 'buy'
                })

                setOpenPositions(p => p.filter(x => x.id !== posId))

                const tradeWon = result.win
                const profit = tradeWon ? result.profit : -stake
                totalProfit += profit

                await upsertGaleState(signalId, activo, direccion, base, i, tradeWon ? 'win' : 'loss')

                if (tradeWon) {
                    addLog('ok', `[🏆 WIN G${i}] ${activo} +$${profit.toFixed(2)}`)
                    finalWon = true; finalResult = 'WIN'; break
                } else {
                    addLog('error', `[🟥 LOSS G${i}] ${activo} -$${stake.toFixed(2)}`)
                }
            }
        } finally {
            executingAssetsRef.current.delete(activo)
            localStorage.removeItem(IQ_RECOVERY_KEY)
        }
        addLog(finalWon ? 'ok' : 'error', `[FIN] ${activo} → ${finalResult} P&L $${totalProfit.toFixed(2)}`)
    }, [isActive, isConnected, stakeInput, martingaleOn, addLog, upsertGaleState, executeOrder])

    useEffect(() => { executeGaleRef.current = executeIQGaleChain }, [executeIQGaleChain])

    // Recovery
    useEffect(() => {
        try {
            const raw = localStorage.getItem(IQ_RECOVERY_KEY); if (!raw || !isConnected) return
            const rec = JSON.parse(raw) as { activo: string; direccion: string; estrategia?: string; ts: number }
            if (Date.now() - rec.ts > 90_000) { localStorage.removeItem(IQ_RECOVERY_KEY); return }
            addLog('warn', `[🔄 RECOVERY] ${rec.activo} retomando en 3s...`)
            setTimeout(() => executeGaleRef.current(rec.activo, rec.direccion, rec.estrategia), 3000)
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected])

    useIQSignalMonitor({
        masterOn,
        // isActive = bot rodando no VPS; sinais são recebidos quando o motor está ativo
        isIQConnected: isActive,
        executingAssetsRef,
        onSignal: (a, d, e) => executeGaleRef.current(a, d, e),
        onLog: addLog,
    })

    const handleSaveRisk = async () => {
        setRiskSaving(true)
        const res = await saveRiskConfig({
            stake:         parseFloat(stakeInput) || 1,
            stop_win:      parseFloat(tpInput)    || 50,
            stop_loss:     parseFloat(slInput)    || 25,
            martingale_on: martingaleOn,
        })
        setRiskSaving(false)
        if (res?.error) {
            toast.error('Error al guardar: ' + res.error)
        } else {
            toast.success('Configuración de riesgo guardada. Motor liberado.')
            setRiskConfigured(true)
        }
    }


    // ── Render ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#070b14]">
            <motion.div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-[#0B1221]"
                style={{ background: 'linear-gradient(135deg,#00FF88,#00B4FF)' }}
                animate={{ scale: [1, 1.08, 1], opacity: [1, 0.8, 1] }} transition={{ duration: 1.8, repeat: Infinity }} >IQ</motion.div>
        </div>
    )

    // Se o usuário não tem credenciais configuradas na aba "Mi Brokers", um bloqueio elegante é mostrado
    if (!hasCredentials) {
        return (
            <div className="flex bg-[#070B14] min-h-screen text-slate-300 font-sans p-6 sm:p-12 items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
                    className="max-w-md w-full bg-[#0B1221] border border-[#00B4FF]/20 p-8 rounded-3xl text-center shadow-[0_0_50px_rgba(0,180,255,0.05)] relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00FF88] to-[#00B4FF]"></div>
                    <ShieldAlert size={64} className="mx-auto text-[#00B4FF] mb-6 opacity-80" />
                    <h2 className="text-2xl font-black text-white mb-2">Conexión Requerida</h2>
                    <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                        Para acceder al Copy Trading - Quant, primero debes vincular tu cuenta de IQ Option.
                    </p>
                    <Link to="/mis-brokers" className="inline-flex items-center justify-center w-full py-4 rounded-xl text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white">
                        Vincular Cuenta en Mis Brokers
                    </Link>
                </motion.div>
            </div>
        )
    }

    // Stats exclusivamente de sessionStats (vw_iq_session_stats — Supabase B)
    const displayWins = sessionStats.wins;
    const displayLosses = sessionStats.losses;
    const displayTotalOps = displayWins + displayLosses; // Calculado das vitórias e derrotas para evitar delays da view
    const displayPnl = sessionStats.pnl;
    const displayWinRate = displayTotalOps > 0 ? ((displayWins / displayTotalOps) * 100).toFixed(1) : '0.0';

    return (
        <div className="flex bg-[#070B14] min-h-screen text-slate-300 font-sans overflow-y-auto overflow-x-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700;800&display=swap');
                body, .font-sans { font-family: 'Plus Jakarta Sans', sans-serif; }
                .mono { font-family: 'JetBrains Mono', monospace; }
                .card-surface { background: #0B1221; border: 1px solid rgba(255,255,255,0.03); border-radius: 16px; }
                .card-surface:hover { border-color: rgba(255,255,255,0.08); }
                .scroll-hide::-webkit-scrollbar { display: none; }
                .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
                
                /* Custom Premium Glass Effects */
                .glass-header {
                    background: rgba(11, 18, 33, 0.7);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
                }
                .stat-box {
                    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
                    border: 1px solid rgba(255,255,255,0.05);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
                    border-radius: 14px;
                    transition: all 0.3s ease;
                }
                .stat-box:hover {
                    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
                    border-color: rgba(255,255,255,0.1);
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>

            {/* Confirm Real Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowConfirmModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                            className="bg-[#0B1221] border border-[#FFB800]/20 p-6 rounded-2xl max-w-sm w-full shadow-[0_0_30px_rgba(255,184,0,0.1)]"
                            onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-2 text-white flex items-center gap-2"><AlertCircle className="text-[#FFB800]"/> ¿Activar en Modo Real?</h2>
                            <p className="text-sm text-slate-400 mb-6">El bot ejecutará operaciones utilizando el saldo real de tu cuenta vinculada. Asegúrate de tener saldo suficiente para el sistema de recuperación (Gale).</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 text-sm font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all">Cancelar</button>
                                <button onClick={confirmActivateReal} className="flex-1 py-3 text-sm font-bold rounded-xl bg-[#00FF88] text-black shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:bg-[#00e077] transition-all">Confirmar Operación</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            <div className="flex-1 flex flex-col min-h-screen">
                {/* ── UNIFIED PREMIUM HEADER ── */}
                <header className="flex-shrink-0 glass-header sticky top-0 z-40">
                    {/* Top Row: Branding & Controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between px-6 sm:px-8 py-5 gap-4">
                        <div className="flex items-center gap-5">
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0, rotate: -10 }} 
                                animate={{ scale: 1, opacity: 1, rotate: 0 }} 
                                transition={{ type: "spring", duration: 0.8 }}
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black relative group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-[#00FF88] to-[#00B4FF] rounded-2xl blur-md opacity-40 group-hover:opacity-70 transition-opacity"></div>
                                <div className="relative w-full h-full bg-gradient-to-br from-[#00FF88] to-[#00B4FF] rounded-2xl flex items-center justify-center text-[#070B14] shadow-inner border border-white/20">IQ</div>
                            </motion.div>
                            <div>
                                <motion.h1 
                                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
                                    className="text-xl font-black text-white tracking-wide leading-tight drop-shadow-md"
                                >
                                    Copy Trading - Quant
                                </motion.h1>
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
                                    className="flex items-center gap-2 mt-1"
                                >
                                    <span className="text-[10px] text-[#00B4FF] font-mono tracking-widest uppercase">Copie los Mejores Traders</span>
                                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                    <span className="flex items-center gap-1.5">
                                        <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-red-500")} />
                                        <span className={cn("text-[9px] font-bold mono uppercase tracking-wider", isConnected ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" : "text-red-500")}>
                                            {isConnected ? 'Conexión Estable' : 'Desconectado'}
                                        </span>
                                    </span>
                                </motion.div>
                            </div>
                        </div>

                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
                            className="flex items-center justify-between md:justify-end gap-4"
                        >
                            {/* Mode Toggle Container */}
                            <div className="flex items-center rounded-xl p-1 bg-black/40 border border-white/5 shadow-inner backdrop-blur-md relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-[shimmer_3s_infinite]"></div>
                                <button disabled={isActive} onClick={() => changeMode('demo')}
                                    className={cn('relative z-10 px-6 py-2 text-[11px] font-bold rounded-lg uppercase tracking-wider mono transition-all duration-300',
                                        mode === 'demo' ? 'bg-[#00B4FF]/20 text-[#00B4FF] border border-[#00B4FF]/40 shadow-[0_0_15px_rgba(0,180,255,0.3)]' : 'text-slate-500 hover:text-slate-300 border border-transparent')}>
                                    DEMO
                                </button>
                                <button disabled={isActive} onClick={() => changeMode('real')}
                                    className={cn('relative z-10 px-6 py-2 text-[11px] font-bold rounded-lg uppercase tracking-wider mono transition-all duration-300',
                                        mode === 'real' ? 'bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/40 shadow-[0_0_15px_rgba(255,184,0,0.3)]' : 'text-slate-500 hover:text-slate-300 border border-transparent')}>
                                    REAL
                                </button>
                            </div>

                            {/* Motor Badge */}
                            <div className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all duration-500', 
                                isActive ? 'bg-[#00FF88]/10 border-[#00FF88]/40 shadow-[0_0_20px_rgba(0,255,136,0.15)]' : 'bg-black/40 border-white/5')}>
                                <div className="relative flex h-2 w-2">
                                  {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75"></span>}
                                  <span className={cn("relative inline-flex rounded-full h-2 w-2", isActive ? "bg-[#00FF88]" : "bg-slate-600")}></span>
                                </div>
                                <span className={cn('text-[11px] font-black mono tracking-widest', isActive ? 'text-[#00FF88] drop-shadow-[0_0_4px_rgba(0,255,136,0.4)]' : 'text-slate-500')}>
                                    {isActive ? 'MOTOR ACTIVO' : 'EN ESPERA'}
                                </span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Bottom Row: Animated Data Stats */}
                    <div className="px-6 sm:px-8 pb-5">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-box p-4 relative overflow-hidden group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5 flex items-center justify-between">
                                    Beneficio Neto
                                </div>
                                <div className={cn("text-3xl font-black mono tracking-tighter", displayPnl >= 0 ? "text-[#00FF88] drop-shadow-[0_0_10px_rgba(0,255,136,0.3)]" : "text-[#FF3B5C] drop-shadow-[0_0_10px_rgba(255,59,92,0.3)]")}>
                                    {displayPnl >= 0 ? '+' : '-'}${Math.abs(displayPnl).toFixed(2)}<span className="text-xs text-slate-500 font-medium ml-1 drop-shadow-none tracking-normal">USD</span>
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="stat-box p-4 relative overflow-hidden group border-l-2 border-l-[#00B4FF]/40">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Win Rate Global</div>
                                <div className="text-2xl font-black mono text-white tracking-tighter flex items-baseline gap-1">
                                    {displayWinRate}
                                    <span className="text-sm text-[#00B4FF] font-bold">%</span>
                                </div>
                                {/* Mini progress bar */}
                                <div className="h-1.5 w-full bg-black/50 rounded-full mt-3 overflow-hidden shadow-inner">
                                    <motion.div 
                                        initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(displayWinRate))}%` }} 
                                        transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-[#00B4FF] to-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.5)]"
                                    />
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="stat-box p-4 flex flex-col justify-center">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Op. Totales</div>
                                <div className="text-2xl font-black mono text-white tracking-tighter">{displayTotalOps}</div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="stat-box p-4 flex flex-col justify-center relative border-l-2 border-l-[#00FF88]/40">
                                <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88]" />
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Victorias</div>
                                <div className="text-2xl font-black mono text-[#00FF88] tracking-tighter">{displayWins}</div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="stat-box p-4 flex flex-col justify-center relative border-l-2 border-l-[#FF3B5C]/40">
                                <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-[#FF3B5C] shadow-[0_0_8px_#FF3B5C]" />
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Derrotas</div>
                                <div className="text-2xl font-black mono text-[#FF3B5C] tracking-tighter">{displayLosses}</div>
                            </motion.div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto space-y-6 lg:space-y-8">
                    
                    {/* ── ALERTA DE RIESGO OBLIGATORIO ── */}
                    <AnimatePresence>
                        {!riskConfigured && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFB800]" />
                                    <div className="flex items-start gap-4 z-10">
                                        <div className="p-3 bg-[#FFB800]/20 rounded-xl">
                                            <AlertCircle className="text-[#FFB800]" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg mb-1">Acción Requerida: Gestión de Riesgos</h3>
                                            <p className="text-slate-400 text-sm max-w-xl">El motor HFT está temporalmente bloqueado. Para proteger tu capital, debes definir y guardar tu límite de pérdida y meta de ganancia diaria en el panel lateral.</p>
                                        </div>
                                    </div>
                                    <div className="z-10 bg-black/40 px-4 py-2 rounded-lg border border-white/5 whitespace-nowrap hidden lg:block">
                                        <span className="text-xs text-slate-400 block mb-1">Estatus del Motor</span>
                                        <span className="text-sm font-bold text-[#FFB800] px-2 py-0.5 bg-[#FFB800]/10 rounded border border-[#FFB800]/20">Bloqueo de Seguridad Activado</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── LAYOUT PRINCIPAL (TRADERS + FEED VS RIESGO + STTATS) ── */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
                        
                        {/* Columna Izquierda / Central: Operaciones (8/12 lg) */}
                        <div className="xl:col-span-8 space-y-6 lg:space-y-8">
                            
                            {/* Traders Grid */}
                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Activity size={20} className="text-[#00B4FF]" /> Mercado y Algoritmos Analizados</h2>
                                    <button
                                        onClick={() => {
                                            if (isActive) return
                                            if (activeEstrategia === 'ALL') {
                                                updateActiveEstrategia(null)
                                                toast.info('Modo individual restaurado.')
                                            } else {
                                                updateActiveEstrategia('ALL')
                                                toast.success('Todos los traders activados — modo test.')
                                            }
                                        }}
                                        disabled={isActive}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 ${
                                            activeEstrategia === 'ALL'
                                                ? 'bg-[#00FF88]/15 border-[#00FF88]/40 text-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                        }`}>
                                        <LayoutGrid size={14} />
                                        {activeEstrategia === 'ALL' ? '✓ Todos Activos' : 'Activar Todos'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {tradersLoading ? (
                                        [...Array(3)].map((_, i) => (
                                            <div key={i} className="card-surface p-5 animate-pulse"><div className="h-4 bg-white/10 rounded mb-3 w-2/3" /><div className="h-24 bg-white/5 rounded" /></div>
                                        ))
                                    ) : (
                                        traders.map((trader) => {
                                            const isSelected = activeEstrategia === 'ALL' || !!(trader.estrategia_id && trader.estrategia_id === activeEstrategia);
                                            const levelColor = trader.level === 'ELITE' ? '#00FF88' : trader.level === 'PRO' ? '#00B4FF' : '#FFB800';
                                            return (
                                                <div key={trader.id} onClick={() => {
                                                    if (isActive) return
                                                    if (isSelected) {
                                                        updateActiveEstrategia(null)
                                                        toast.info('Trader desvinculado.')
                                                    } else if (trader.estrategia_id) {
                                                        updateActiveEstrategia(trader.estrategia_id)
                                                        toast.success(`Trader ${trader.nome} vinculado.`)
                                                    }
                                                }}
                                                     className={cn(
                                                         'card-surface p-5 cursor-pointer relative overflow-hidden transition-all duration-300 group',
                                                         isActive && 'cursor-not-allowed opacity-60'
                                                     )}
                                                     style={{ borderColor: isSelected ? `${levelColor}50` : undefined, boxShadow: isSelected ? `0 8px 30px ${levelColor}15` : undefined }}>
                                                    
                                                    {/* Indicador activo */}
                                                    {isSelected && <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${levelColor}, transparent)` }} />}

                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex gap-3 items-center">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-black shadow-lg" 
                                                                 style={{ background: `linear-gradient(135deg, ${levelColor}, ${levelColor}88)` }}>
                                                                {trader.nome.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-white text-[15px] leading-tight">{trader.nome}</div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${trader.status === 'OPERANDO' ? 'bg-[#00FF88] shadow-[0_0_4px_#00FF88]' : 'bg-amber-500'}`} />
                                                                    <span className="text-[10px] font-semibold mono" style={{ color: trader.status==='OPERANDO' ? '#00FF88' : '#FFB800' }}>
                                                                        {trader.status === 'OPERANDO' ? 'Operando' : trader.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black mono tracking-widest bg-white/5 border border-white/10" style={{ color: levelColor }}>
                                                            {trader.level}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                                        <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Win Rate</div>
                                                            <div className="text-sm font-black mono" style={{ color: levelColor }}>{trader.win_rate}%</div>
                                                        </div>
                                                        <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Mínimo</div>
                                                            <div className="text-[11px] font-bold mono text-white">Gale 2</div>
                                                        </div>
                                                        <div className="bg-black/30 rounded-lg p-2.5 text-center">
                                                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Riesgo</div>
                                                            <div className="text-[11px] font-bold mono text-emerald-400">{trader.risco}</div>
                                                        </div>
                                                    </div>

                                                    <div className="-mx-1 mb-4 overflow-hidden rounded-[10px]"><Sparkline color={levelColor} points={TRADER_CHARTS[trader.nome] || DEFAULT_CHART} /></div>

                                                    <button className="w-full py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5"
                                                        style={isSelected 
                                                            ? { background: `${levelColor}20`, color: levelColor, borderColor: `${levelColor}60`, boxShadow: `0 0 16px ${levelColor}30` }
                                                            : { background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#64748b' }}>
                                                        {activeEstrategia === 'ALL' ? <><LayoutGrid size={11} /> TODOS</> : isSelected ? <><User size={11} /> VINCULADO</> : 'Vincular'}
                                                    </button>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>


                        </div>

                        {/* Columna Derecha: Live Feed + Riesgo + Stats (4/12 lg) */}
                        <div className="xl:col-span-4 space-y-6 lg:space-y-8">

                            {/* ── LIVE FEED — Últimas 5 operações em tempo real ── */}
                            <div className="card-surface overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Últimas Operaciones</span>
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
                                        <span className="text-[9px] font-black text-[#00FF88] mono tracking-widest">LIVE</span>
                                    </span>
                                </div>

                                <div className="max-h-[260px] overflow-y-auto scroll-hide divide-y divide-white/[0.04]">
                                    <AnimatePresence initial={false}>
                                        {recentTrades.slice(0, 5).length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                                                <Activity size={20} className="mb-2 opacity-40" />
                                                <span className="text-[11px]">Aguardando operações...</span>
                                            </div>
                                        ) : (
                                            recentTrades.slice(0, 5).map((t) => {
                                                const isWin = t.resultado === 'win'
                                                const profit = Number(t.profit)
                                                const hasProfit = profit !== 0
                                                const dirColor = t.direcao === 'CALL' ? '#00FF88' : '#FF3B5C'
                                                return (
                                                    <motion.div
                                                        key={t.id}
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                                                    >
                                                        {/* Dir badge */}
                                                        <span className="w-14 shrink-0 text-center py-1 rounded text-[9px] font-black uppercase border"
                                                            style={{ color: dirColor, borderColor: `${dirColor}40`, background: `${dirColor}12` }}>
                                                            {t.direcao === 'CALL' ? '▲ BUY' : '▼ SELL'}
                                                        </span>

                                                        {/* Ativo + Gale */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[12px] font-bold text-white truncate">{t.ativo}</div>
                                                            <div className="text-[9px] text-slate-500 mono">G{t.gale_level ?? 0} · ${Number(t.stake).toFixed(2)}</div>
                                                        </div>

                                                        {/* Resultado */}
                                                        <div className="shrink-0 text-right">
                                                            {isWin ? (
                                                                <span className="text-[11px] font-black text-[#00FF88]">
                                                                    {hasProfit ? `+$${profit.toFixed(2)}` : '✓ WIN'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] font-bold text-[#FF3B5C]">
                                                                    {hasProfit ? `-$${Math.abs(profit).toFixed(2)}` : '✗ LOSS'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )
                                            })
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Panel de Gestión de Riesgo */}
                            <div className="card-surface overflow-hidden relative">
                                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30 text-indigo-400">
                                            <Settings2 size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-white font-bold text-lg">Gestión de Riesgo</h2>
                                            <p className="text-xs text-slate-400">Configuración Obligatoria</p>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4 shadow-inner">
                                            <div>
                                                <label className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 font-semibold flex items-center justify-between">
                                                    Inversión Base (Stake)
                                                    <span className="text-xs text-[#00B4FF] font-mono">${parseFloat(stakeInput||'0').toFixed(2)}</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                                                    <input type="number" min="1" step="0.5" value={stakeInput} onChange={e => {setStakeInput(e.target.value); setRiskConfigured(false)}} disabled={isActive}
                                                        className="w-full bg-[#0B1221] border border-white/10 rounded-lg pl-8 pr-4 py-3 text-sm text-white mono focus:outline-none focus:border-[#00B4FF]/50 disabled:opacity-50 transition-colors" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[11px] text-emerald-400/80 uppercase tracking-wider mb-2 block font-semibold">Stop Win</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/50 font-mono">$</span>
                                                        <input type="number" min="1" value={tpInput} onChange={e => {setTpInput(e.target.value); setRiskConfigured(false)}} disabled={isActive}
                                                            className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg pl-8 pr-3 py-2.5 text-sm text-emerald-400 mono focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 transition-colors" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-red-400/80 uppercase tracking-wider mb-2 block font-semibold">Stop Loss</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500/50 font-mono">$</span>
                                                        <input type="number" min="1" value={slInput} onChange={e => {setSlInput(e.target.value); setRiskConfigured(false)}} disabled={isActive}
                                                            className="w-full bg-red-500/5 border border-red-500/20 rounded-lg pl-8 pr-3 py-2.5 text-sm text-red-400 mono focus:outline-none focus:border-red-500/50 disabled:opacity-50 transition-colors" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Protección Martingala</label>
                                                    <span className="text-[10px] text-slate-500">(Gale 0-1-2)</span>
                                                </div>
                                                <button onClick={() => {setMartingaleOn(p => !p); setRiskConfigured(false)}} disabled={isActive}
                                                    className={cn('w-full py-3 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 flex justify-center items-center gap-2',
                                                        martingaleOn
                                                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                                            : 'bg-[#0B1221] border-white/10 text-slate-500 hover:bg-white/5')}>
                                                    {martingaleOn ? '✓ ACTIVADO' : '✕ DESACTIVADO'}
                                                </button>
                                            </div>

                                        </div>

                                        <button disabled={isActive || riskSaving || riskConfigured}
                                            onClick={handleSaveRisk}
                                            className={cn("w-full py-4 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2", 
                                                riskConfigured 
                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default"
                                                : "bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                            )}>
                                            {riskSaving ? 'Guardando...' : riskConfigured ? '✓ Configuración Segura' : <><Save size={18} /> Guardar Riesgo Mínimo</>}
                                        </button>
                                    </div>

                                    {/* Action Button Principal */}
                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        <button onClick={handleToggleBot}
                                            className="w-full relative group overflow-hidden rounded-xl text-sm font-black uppercase tracking-widest transition-all p-[2px]"
                                            style={{ filter: (!riskConfigured && !isActive) ? 'grayscale(1)' : 'none' }}>
                                            
                                            {/* Gradiente girando (background animado) */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#00FF88] via-[#00B4FF] to-[#00FF88] opacity-70 group-hover:opacity-100 transition-opacity" 
                                                 style={!isActive ? { backgroundSize: '200% auto', animation: 'gradientMove 3s linear infinite' } : { background: '#FF3B5C' }}></div>
                                            
                                            {/* Capa interna pra fazer o cutout e formar borda colorida se precisar (neste caso o botón é chapado) */}
                                            <div className="relative flex items-center justify-center gap-3 w-full h-full py-4 rounded-[10px] transition-all"
                                                 style={{ background: isActive ? '#FF3B5C' : 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(11,18,33,0.9))', color: isActive ? '#fff' : '#00FF88' }}>
                                                
                                                {isActive ? (
                                                    <><Square size={18} fill="currentColor" /> <span className="text-white">Detener Automatización</span></>
                                                ) : (
                                                    <><Play size={18} fill="currentColor" /> <span>Iniciar HFT Quant</span></>
                                                )}
                                            </div>
                                        </button>
                                        {!riskConfigured && <p className="text-[10px] text-center text-red-400/80 mt-3 font-medium">Por favor, guarda la configuración para liberar el motor.</p>}
                                    </div>

                                </div>
                            </div>


                        </div>
                    </div>

                </div>
            </div>
            {/* Definições de animação base */}
            <style>{`
                @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
            `}</style>
        </div>
    )
}
