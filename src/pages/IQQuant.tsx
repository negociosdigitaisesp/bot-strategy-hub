/**
 * IQQuant.tsx — Monitor de Elite IQ Option
 * 
 * ARQUITECTURA: Este componente NO conecta WebSocket.
 * La ejecución es EXCLUSIVA del Motor HFT (extensión Chrome).
 * Este frontend es solo un Monitor de Status + Resultados.
 * 
 * Badges de estado:
 * 🔴 Motor No Instalado  — window.__millionbots_motor ausente
 * 🟡 Motor Listo/Inactivo — instalado pero sin START
 * 🟢 Ejecución HFT Activa — extensión confirmó connected: true
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  RefreshCw,
  Chrome,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  BarChart3,
  ArrowUpDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { hftSupabase } from '@/lib/hftSupabase'
import { useClientId } from '@/hooks/useClientId'

// ─── Types ─────────────────────────────────────────────────────────────────

type MotorStatus = 'not_installed' | 'idle' | 'connected' | 'executing' | 'error' | 'reconectando'

interface MotorState {
  status: MotorStatus
  connected: boolean
  isRunning: boolean
  version: string
}

interface PendingTrade {
  id: string
  signal_id: string
  ativo: string
  direcao: 'CALL' | 'PUT'
  stake_g0: number
  stake_g1: number
  stake_g2: number
  gale_level: number
  status: 'pending' | 'executing' | 'executed' | 'expired'
  result: 'win' | 'loss' | null
  profit: number | null
  created_at: string
  executed_at: string | null
}

// ─── Extension Installation Modal ──────────────────────────────────────────

function InstallModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#0f111a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
            <Chrome size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Instalar Motor HFT</h2>
            <p className="text-xs text-white/40">Se requiere la extensión para ejecutar</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { step: '1', text: 'Descargue la carpeta "EXTENSAO COPY TRADING - IQ" del proyecto' },
            { step: '2', text: 'Abra Chrome → chrome://extensions/ → active "Modo desarrollador"' },
            { step: '3', text: 'Haga clic en "Cargar descomprimida" y seleccione la carpeta' },
            { step: '4', text: 'Haga clic en el ícono ⚡ → ingrese su Client ID → presione "Encender Motor HFT"' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-emerald-400">{step}</span>
              </div>
              <p className="text-sm text-white/60">{text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
        >
          Entendido
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function MotorBadge({ motor, onClick }: { motor: MotorState; onClick: () => void }) {
  const configs: Record<MotorStatus, {
    icon: React.ElementType; label: string; sub: string;
    color: string; bg: string; border: string; pulse?: boolean
  }> = {
    not_installed: {
      icon: WifiOff, label: '🔴 Motor No Instalado',
      sub: 'Haga clic para ver instrucciones de instalación',
      color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', pulse: false,
    },
    idle: {
      icon: Wifi, label: '🟡 Motor Listo / Inactivo',
      sub: 'Extensión detectada — abra el popup para encenderla',
      color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', pulse: false,
    },
    connected: {
      icon: CheckCircle2, label: '🟢 Ejecución HFT Activa',
      sub: `Motor v${motor.version} conectado a IQ Option`,
      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', pulse: true,
    },
    executing: {
      icon: Activity, label: '⚡ Ejecutando Operación',
      sub: 'Procesando señal HFT...',
      color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', pulse: true,
    },
    reconectando: {
      icon: RefreshCw, label: '🔄 Reconectando...',
      sub: 'Intentando restablecer conexión con IQ Option',
      color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', pulse: true,
    },
    error: {
      icon: AlertCircle, label: '❌ Error en el Motor',
      sub: 'Revise la consola de la extensión para más detalles',
      color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', pulse: false,
    },
  }

  const cfg = configs[motor.status]
  const Icon = cfg.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left group',
        cfg.bg, cfg.border, 'hover:brightness-125'
      )}
    >
      <div className={cn('relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg, 'border', cfg.border)}>
        {cfg.pulse && (
          <span className={cn('absolute inset-0 rounded-xl animate-ping opacity-30', cfg.bg)} />
        )}
        <Icon size={22} className={cn(cfg.color, cfg.pulse && motor.status === 'connected' && 'animate-pulse')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold', cfg.color)}>{cfg.label}</p>
        <p className="text-xs text-white/40 mt-0.5 truncate">{cfg.sub}</p>
      </div>
      {motor.status === 'not_installed' && (
        <span className="text-xs text-white/30 group-hover:text-white/50 transition-colors flex-shrink-0">
          Ver guía →
        </span>
      )}
    </button>
  )
}

// ─── Trade Row ──────────────────────────────────────────────────────────────

function TradeRow({ trade }: { trade: PendingTrade }) {
  const isWin  = trade.result === 'win'
  const isLoss = trade.result === 'loss'
  const isPending = trade.status !== 'executed'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
        isPending
          ? 'bg-white/[0.02] border-white/5'
          : isWin
            ? 'bg-emerald-500/[0.05] border-emerald-500/15'
            : 'bg-red-500/[0.05] border-red-500/15'
      )}
    >
      {/* Direção */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        trade.direcao === 'CALL' ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-red-500/15 border border-red-500/20'
      )}>
        {trade.direcao === 'CALL'
          ? <TrendingUp size={14} className="text-emerald-400" />
          : <TrendingDown size={14} className="text-red-400" />
        }
      </div>

      {/* Ativo + Hora */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{trade.ativo}</p>
        <p className="text-[10px] text-white/30 mt-0.5">
          {new Date(trade.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          {trade.gale_level > 0 && <span className="ml-2 text-amber-400 font-bold">G{trade.gale_level}</span>}
        </p>
      </div>

      {/* Stake */}
      <div className="text-right">
        <p className="text-[10px] text-white/30">Entrada</p>
        <p className="text-xs font-bold text-white/70">
          ${[trade.stake_g0, trade.stake_g1, trade.stake_g2][trade.gale_level] ?? trade.stake_g0}
        </p>
      </div>

      {/* Resultado */}
      <div className="text-right ml-2 w-20 flex-shrink-0">
        {isPending ? (
          <span className="text-[10px] text-amber-400 animate-pulse font-bold">
            {trade.status === 'executing' ? '⚡ Ejecutando' : '⏳ Pendiente'}
          </span>
        ) : (
          <>
            <p className={cn('text-xs font-black', isWin ? 'text-emerald-400' : 'text-red-400')}>
              {isWin ? '✅ WIN' : '❌ LOSS'}
            </p>
            <p className={cn('text-[10px] font-bold', isWin ? 'text-emerald-400' : 'text-red-400')}>
              {isWin ? '+' : ''}{(trade.profit ?? 0).toFixed(2)}
            </p>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

const IQQuant = () => {
  const { clientId } = useClientId()

  // Motor state
  const [motor, setMotor] = useState<MotorState>({
    status:    'not_installed',
    connected: false,
    isRunning: false,
    version:   '2.0.0',
  })

  // Trades
  const [trades, setTrades]       = useState<PendingTrade[]>([])
  const [loadingTrades, setLoadingTrades] = useState(false)

  // Session stats
  const [sessionWins,   setSessionWins]   = useState(0)
  const [sessionLosses, setSessionLosses] = useState(0)
  const [sessionPnl,    setSessionPnl]    = useState(0)

  // Modal
  const [showModal, setShowModal] = useState(false)

  const motorDetected = useRef(false)

  // ── Detectar extensión y escuchar mensajes ──────────────────────────────
  useEffect(() => {
    // Detectar si la extensión ya está instalada (con pequeño delay para que content.js corra)
    const checkExtension = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      if (w.__millionbots_motor) {
        motorDetected.current = true
        const s = w.__millionbots_motor.status ?? 'idle'
        setMotor(prev => ({
          ...prev,
          status:    (s === 'idle' || s === 'connecting') ? 'idle' : s,
          connected: w.__millionbots_motor.connected ?? false,
          version:   w.__millionbots_motor.version ?? '2.0.0',
        }))
      }
    }

    // Revisar en t=0 y t=500ms (content.js puede tardar un poco)
    checkExtension()
    const t = setTimeout(checkExtension, 600)

    // Escuchar mensajes en tiempo real del content.js
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source !== 'millionbots_motor') return
      const { type, payload } = event.data

      motorDetected.current = true

      if (type === 'STATUS') {
        const s = (payload?.status as MotorStatus) || (payload?.connected ? 'connected' : 'idle')
        setMotor({
          status:    s,
          connected: payload?.connected ?? false,
          isRunning: payload?.isRunning ?? false,
          version:   payload?.version ?? '2.0.0',
        })
      }

      if (type === 'ERROR') {
        setMotor(prev => ({ ...prev, status: 'error', connected: false, isRunning: false }))
        toast.error(payload?.message || 'Error en el Motor HFT')
      }

      if (type === 'EXECUTING') {
        setMotor(prev => ({ ...prev, status: 'executing' }))
        toast.info(`⚡ Ejecutando: ${payload?.ativo} ${payload?.direcao} G${payload?.gale_level} — $${payload?.stake}`)
      }

      if (type === 'TRADE_RESULT') {
        if (payload?.won) {
          setSessionWins(w => w + 1)
          setSessionPnl(p => p + (payload?.profit ?? 0))
          toast.success(`✅ WIN ${payload?.ativo || ''} +$${(payload?.profit ?? 0).toFixed(2)}`)
        } else {
          setSessionLosses(l => l + 1)
          setSessionPnl(p => p - Math.abs(payload?.profit ?? 0))
          toast.error(`❌ LOSS ${payload?.ativo || ''} G${payload?.gale_level}`)
        }
        // Refrescar historial
        if (clientId) fetchTrades(clientId)
        setMotor(prev => ({ ...prev, status: 'connected' }))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      clearTimeout(t)
      window.removeEventListener('message', handleMessage)
    }
  }, [clientId])

  // ── Fetch histórico de trades ──────────────────────────────────────────
  const fetchTrades = useCallback(async (cid: string) => {
    setLoadingTrades(true)
    const { data, error } = await hftSupabase
      .schema('iq_quant')
      .from('pending_trades')
      .select('*')
      .eq('client_id', cid)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.error('[IQQuant][TRADES]', error)
    } else {
      setTrades((data as PendingTrade[]) ?? [])

      // Calcular stats de sesión desde el DB
      const today = data?.filter(t => {
        const d = new Date(t.created_at)
        const now = new Date()
        return d.toDateString() === now.toDateString()
      }) ?? []
      const wins   = today.filter(t => t.result === 'win').length
      const losses = today.filter(t => t.result === 'loss').length
      const pnl    = today.reduce((acc, t) => acc + (t.profit ?? 0), 0)
      setSessionWins(wins)
      setSessionLosses(losses)
      setSessionPnl(pnl)
    }
    setLoadingTrades(false)
  }, [])

  useEffect(() => {
    if (clientId) fetchTrades(clientId)
  }, [clientId, fetchTrades])

  // ── Realtime Supabase B ────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return

    const channel = hftSupabase
      .channel('iq_quant_trades_rt')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'iq_quant', table: 'pending_trades', filter: `client_id=eq.${clientId}` },
        () => fetchTrades(clientId)
      )
      .subscribe()

    return () => { hftSupabase.removeChannel(channel) }
  }, [clientId, fetchTrades])

  // ── Render ─────────────────────────────────────────────────────────────
  const totalOps = sessionWins + sessionLosses
  const winRate  = totalOps > 0 ? (sessionWins / totalOps) * 100 : 0

  return (
    <div className="min-h-screen bg-[#020505] relative overflow-hidden p-4 md:p-6">
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[35%] h-[35%] bg-emerald-500/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-violet-500/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1200px] mx-auto space-y-6 relative z-10">

        {/* ═══ HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center border border-emerald-400/20">
                <Zap className="text-white" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-0.5 tracking-tight">
                IQ Quant
              </h1>
              <p className="text-xs md:text-sm text-white/40">
                Monitor de Ejecución HFT — IQ Option
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => clientId && fetchTrades(clientId)}
              disabled={loadingTrades}
              className="p-2.5 rounded-xl border border-white/10 text-white/30 hover:border-white/20 hover:text-white/50 transition-all disabled:opacity-40"
            >
              <RefreshCw size={14} className={cn(loadingTrades && 'animate-spin')} />
            </button>
          </div>
        </motion.div>

        {/* ═══ MOTOR STATUS CARD ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <MotorBadge
            motor={motor}
            onClick={() => {
              if (motor.status === 'not_installed') setShowModal(true)
            }}
          />
        </motion.div>

        {/* ═══ STATS ROW ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {/* Wins */}
          <div className="bg-black/20 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <TrendingUp size={14} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">Wins</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">{sessionWins}</div>
          </div>

          {/* Losses */}
          <div className="bg-black/20 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4 group hover:border-red-500/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <TrendingDown size={14} className="text-red-400" />
              </div>
              <span className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider">Losses</span>
            </div>
            <div className="text-2xl font-black text-red-400">{sessionLosses}</div>
          </div>

          {/* P&L */}
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Target size={14} className="text-white/50" />
              </div>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">P&L Hoy</span>
            </div>
            <div className={cn('text-2xl font-black', sessionPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {sessionPnl >= 0 ? '+' : ''}{sessionPnl.toFixed(2)}
              <span className="text-xs ml-1 opacity-50">USD</span>
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-black/20 backdrop-blur-xl border border-violet-500/20 rounded-2xl p-4 hover:border-violet-500/40 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <BarChart3 size={14} className="text-violet-400" />
              </div>
              <span className="text-[10px] font-bold text-violet-400/70 uppercase tracking-wider">Efectividad</span>
            </div>
            <div className="text-2xl font-black text-violet-400">
              {winRate.toFixed(1)}<span className="text-sm ml-0.5 opacity-70">%</span>
            </div>
          </div>
        </motion.div>

        {/* ═══ INFO: Gale G0/G1/G2 ═══ */}
        {motor.status !== 'not_installed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15"
          >
            <Activity size={14} className="text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-400/80">
              <span className="font-bold">Sistema Gale G0→G1→G2</span>{' '}
              gestionado automáticamente por el motor. Entradas: $1.00 → $2.20 → $5.00.
              El frontend solo muestra la posición abierta desde Supabase.
            </p>
          </motion.div>
        )}

        {/* ═══ HISTORIAL DE OPERACIONES ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
        >
          {/* Header tabla */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-white/30" />
              <span className="text-sm font-bold text-white">Historial de Operaciones</span>
              {trades.length > 0 && (
                <span className="text-[10px] text-white/20 font-mono ml-1">{trades.length} registros</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={12} className="text-white/20" />
              <span className="text-[10px] text-white/20">Más recientes primero</span>
            </div>
          </div>

          {/* Loading */}
          {loadingTrades && (
            <div className="flex items-center justify-center py-12 gap-3">
              <RefreshCw size={16} className="text-white/20 animate-spin" />
              <span className="text-sm text-white/20">Cargando operaciones...</span>
            </div>
          )}

          {/* Sin trades */}
          {!loadingTrades && trades.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                <PlayCircle size={28} className="text-white/10" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/20">Sin operaciones aún</p>
                <p className="text-xs text-white/10 mt-1">
                  {motor.status === 'not_installed'
                    ? 'Instale la extensión y encienda el motor para comenzar'
                    : 'Encienda el Motor HFT desde el popup de la extensión'}
                </p>
              </div>
            </div>
          )}

          {/* Lista de trades */}
          {!loadingTrades && trades.length > 0 && (
            <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto">
              {trades.map(trade => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </motion.div>

        {/* ═══ INSTRUCCIONES ═══ */}
        {motor.status === 'not_installed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5"
          >
            <div className="flex items-start gap-3">
              <Chrome size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-400 mb-1">Motor HFT no detectado</p>
                <p className="text-xs text-amber-400/60 leading-relaxed">
                  Para ejecutar operaciones en IQ Option, instale la extensión Chrome "Motor HFT".
                  El WebSocket de IQ Option funciona <strong>exclusivamente en la extensión</strong> —
                  el frontend solo muestra los resultados en tiempo real desde Supabase.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-all"
                >
                  Ver instrucciones de instalación →
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* ═══ MODAL DE INSTALACIÓN ═══ */}
      <AnimatePresence>
        {showModal && <InstallModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}

export default IQQuant
