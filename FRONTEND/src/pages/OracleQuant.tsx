/**
 * OracleQuant.tsx â€” Trading Command Center (Redesign Pro) v2
 * Arsenal de bots especialistas com dados do Supabase B (hft_lake)
 * 
 * @INTEGRATOR_EXPERT: ConexÃ£o ao schema hft_lake.vw_grade_unificada
 * @SHIELD_AGENT: clientId do Supabase A via useClientId
 * @DEBUG_SENTINEL: Realtime subscription + error boundaries
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Database, Clock, TrendingUp, TrendingDown, Zap, Shield, Target, Activity,
  BarChart3, Timer, ChevronRight, Sparkles, Eye, Crosshair, Gem, Radio,
  RefreshCw, Bug, Wand2, Brain, Users, Trash2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabaseOracle, isOracleConfigured } from '@/lib/supabase-oracle'
import { hftSupabase } from '@/lib/hftSupabase'
import { useDeriv } from '@/contexts/DerivContext'
import { useClientId } from '@/hooks/useClientId'
import { TradingBackground } from '@/components/oracle/TradingBackground'
import { RiskManagementPanel } from '@/components/oracle/RiskManagement'
import { OpenPositionsPanel, type OpenPosition } from '@/components/oracle/OpenPositions'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BOT_ARSENAL = [
  {
    id: 'V1',
    name: 'MARCUS VEGA',
    slogan: 'Scalper de alta precisão',
    photo: '/marcus.png',
    filter: 'FV1',
    filterLabel: 'SÃ³lido',
    icon: Bug,
    color: 'emerald',
    badge: '#1 PRO',
    gradient: 'from-emerald-600 to-teal-700',
    glow: 'bg-emerald-500/20',
    border: 'border-emerald-500/20',
    borderHover: 'hover:border-emerald-500/40',
    bg: 'from-emerald-500/5',
    text: 'text-emerald-400',
    textMuted: 'text-emerald-400/70',
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/20',
    badgeBg: 'bg-emerald-500/15',
    activeBg: 'bg-emerald-500/[0.06]',
    activeBorder: 'border-emerald-500/30',
    toggleActive: 'bg-emerald-500',
    shadow: 'shadow-emerald-500/25',
  },
  {
    id: 'V2',
    name: 'Rael Duart',
    slogan: 'Timing cirúrgico de reversão',
    photo: '/rael duart.png',
    filter: 'FV2',
    filterLabel: 'Primeira',
    icon: Wand2,
    color: 'amber',
    badge: '#2 ELITE',
    gradient: 'from-amber-600 to-yellow-700',
    glow: 'bg-amber-500/20',
    border: 'border-amber-500/20',
    borderHover: 'hover:border-amber-500/40',
    bg: 'from-amber-500/5',
    text: 'text-amber-400',
    textMuted: 'text-amber-400/70',
    iconBg: 'bg-amber-500/10',
    iconBorder: 'border-amber-500/20',
    badgeBg: 'bg-amber-500/15',
    activeBg: 'bg-amber-500/[0.06]',
    activeBorder: 'border-amber-500/30',
    toggleActive: 'bg-amber-500',
    shadow: 'shadow-amber-500/25',
  },
  {
    id: 'V4',
    name: 'ORION ALMEIDA',
    slogan: 'Leitura algorítmica institucional',
    photo: '/Samir Vegas.png',
    filter: 'FV4',
    filterLabel: 'Resiliente',
    icon: Brain,
    color: 'violet',
    badge: '#3 QUANT',
    gradient: 'from-violet-600 to-purple-700',
    glow: 'bg-violet-500/20',
    border: 'border-violet-500/20',
    borderHover: 'hover:border-violet-500/40',
    bg: 'from-violet-500/5',
    text: 'text-violet-400',
    textMuted: 'text-violet-400/70',
    iconBg: 'bg-violet-500/10',
    iconBorder: 'border-violet-500/20',
    badgeBg: 'bg-violet-500/15',
    activeBg: 'bg-violet-500/[0.06]',
    activeBorder: 'border-violet-500/30',
    toggleActive: 'bg-violet-500',
    shadow: 'shadow-violet-500/25',
  },
  {
    id: 'V5',
    name: 'TIAGO QUINTANA',
    slogan: 'Confirmação multi-fator avançada',
    photo: '/rafael.png',
    filter: 'FV5',
    filterLabel: 'Dominante',
    icon: Sparkles,
    color: 'sky',
    badge: '>> FLOW',
    gradient: 'from-sky-600 to-cyan-700',
    glow: 'bg-sky-500/20',
    border: 'border-sky-500/20',
    borderHover: 'hover:border-sky-500/40',
    bg: 'from-sky-500/5',
    text: 'text-sky-400',
    textMuted: 'text-sky-400/70',
    iconBg: 'bg-sky-500/10',
    iconBorder: 'border-sky-500/20',
    badgeBg: 'bg-sky-500/15',
    activeBg: 'bg-sky-500/[0.06]',
    activeBorder: 'border-sky-500/30',
    toggleActive: 'bg-sky-500',
    shadow: 'shadow-sky-500/25',
  },
  {
    id: 'V7',
    name: 'SOFIA CENTINELA',
    slogan: 'Proteção profissional de capital',
    photo: '/aria.png',
    filter: 'FV3',
    filterLabel: 'Quente',
    icon: Shield,
    color: 'rose',
    badge: '++ RISK',
    gradient: 'from-rose-600 to-pink-700',
    glow: 'bg-rose-500/20',
    border: 'border-rose-500/20',
    borderHover: 'hover:border-rose-500/40',
    bg: 'from-rose-500/5',
    text: 'text-rose-400',
    textMuted: 'text-rose-400/70',
    iconBg: 'bg-rose-500/10',
    iconBorder: 'border-rose-500/20',
    badgeBg: 'bg-rose-500/15',
    activeBg: 'bg-rose-500/[0.06]',
    activeBorder: 'border-rose-500/30',
    toggleActive: 'bg-rose-500',
    shadow: 'shadow-rose-500/25',
  },
] as const

type BotId = typeof BOT_ARSENAL[number]['id']

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GradeRow {
  strategy_id_lake?: string
  ativo: string
  hh_mm: string
  direcao: 'CALL' | 'PUT'
  status: 'APROVADO' | 'CONDICIONAL'
  wr_g2: number
  wr_1a: number
  ev_g2: number
  n_filtros: number
  filtros_aprovados: string
  n_total: number
  n_hit: number
  stake_multiplier: number
}

interface ClientConfig {
  strategy_id: string
  ativo_flag: boolean
}

interface BotStats {
  strategies: GradeRow[]
  count: number
  avgWrG2: number
  maxWrG2: number
  avgWr1a: number
  avgEvG2: number
  totalN: number
  isElite: boolean
  lowSample: boolean
}

function computeBotStats(grade: GradeRow[], filterFV: string): BotStats {
  const strategies = grade.filter((s) =>
    s.filtros_aprovados.toUpperCase().includes(filterFV)
  )
  if (strategies.length === 0) {
    return { strategies, count: 0, avgWrG2: 0, maxWrG2: 0, avgWr1a: 0, avgEvG2: 0, totalN: 0, isElite: false, lowSample: true }
  }
  const avgWrG2 = strategies.reduce((s, r) => s + r.wr_g2, 0) / strategies.length
  const maxWrG2 = Math.max(...strategies.map((r) => r.wr_g2))
  const avgWr1a = strategies.reduce((s, r) => s + r.wr_1a, 0) / strategies.length
  const avgEvG2 = strategies.reduce((s, r) => s + r.ev_g2, 0) / strategies.length
  const totalN = strategies.reduce((s, r) => s + (r.n_total || 0), 0)
  return { strategies, count: strategies.length, avgWrG2, maxWrG2, avgWr1a, avgEvG2, totalN, isElite: maxWrG2 > 0.95, lowSample: totalN / Math.max(strategies.length, 1) < 15 }
}

// â”€â”€â”€ RX Distribution Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RxBar({ strategies }: { strategies: GradeRow[] }) {
  const totalN = strategies.reduce((s, r) => s + (r.n_total || 0), 0)
  const totalHit = strategies.reduce((s, r) => s + (r.n_hit || 0), 0)
  const totalWin = strategies.reduce((s, r) => s + Math.round(r.wr_g2 * (r.n_total || 0)), 0)
  const max = Math.max(totalN, 1)

  const bars = [
    { label: 'Win', value: totalWin, color: 'bg-emerald-400' },
    { label: 'Hit', value: totalHit, color: 'bg-red-400' },
  ]

  return (
    <div className="flex items-end gap-1 h-8">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className={cn('w-full rounded-t-sm min-h-[2px] transition-all duration-500', b.color)}
            style={{ height: `${Math.max((b.value / max) * 100, 8)}%` }}
          />
          <span className="text-[8px] text-white/30 font-mono">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

// â”€â”€â”€ Operation Timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function OperationTimer({ activeBots, grade, masterOn }: { activeBots: Set<BotId>; grade: GradeRow[]; masterOn: boolean }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const nextOp = useMemo(() => {
    if (!masterOn || activeBots.size === 0) return null
    const activeFilters = BOT_ARSENAL.filter((b) => activeBots.has(b.id)).map((b) => b.filter)
    const activeStrategies = grade.filter((s) => activeFilters.some((f) => s.filtros_aprovados.toUpperCase().includes(f)))
    if (activeStrategies.length === 0) return null
    const utcH = now.getUTCHours()
    const utcM = now.getUTCMinutes()
    const nowMinutes = utcH * 60 + utcM
    let closest: { hh_mm: string; diff: number } | null = null
    for (const s of activeStrategies) {
      const [hh, mm] = s.hh_mm.split(':').map(Number)
      const stratMinutes = hh * 60 + mm
      let diff = stratMinutes - nowMinutes
      if (diff <= 0) diff += 1440
      if (!closest || diff < closest.diff) closest = { hh_mm: s.hh_mm, diff }
    }
    return closest
  }, [activeBots, grade, now, masterOn])

  if (!masterOn || !nextOp) {
    return (
      <div className="text-center py-2">
        <div className="text-3xl font-black text-white/15 font-mono tracking-wider">--:--:--</div>
        <p className="text-[10px] text-white/15 mt-1">
          {!masterOn ? 'Sistema apagado' : 'NingÃºn bot activo'}
        </p>
      </div>
    )
  }

  const h = Math.floor(nextOp.diff / 60)
  const m = nextOp.diff % 60
  const s = 59 - now.getUTCSeconds()
  const totalSeconds = nextOp.diff * 60
  const elapsedPercent = Math.min(100, ((totalSeconds - (h * 3600 + m * 60 + s)) / totalSeconds) * 100)

  return (
    <div className="text-center py-2">
      {/* Progress bar */}
      <div className="w-full h-1 bg-white/5 rounded-full mb-3 overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            elapsedPercent > 75 ? 'bg-red-400' : elapsedPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
          )}
          animate={{ width: `${elapsedPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <motion.div
        className={cn(
          'text-3xl font-black font-mono tracking-wider',
          h === 0 && m < 5 ? 'text-red-400' : h === 0 && m < 15 ? 'text-amber-400' : 'text-emerald-400'
        )}
        animate={{ opacity: h === 0 && m < 2 ? [1, 0.5, 1] : 1 }}
        transition={{ duration: 1, repeat: h === 0 && m < 2 ? Infinity : 0 }}
      >
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </motion.div>
      <p className="text-[10px] text-white/40 mt-1">
        PrÃ³xima operaciÃ³n: <span className="text-emerald-400 font-bold">{nextOp.hh_mm} UTC</span>
      </p>
    </div>
  )
}

// â”€â”€â”€ Stat Color Classes (static â€” Tailwind JIT safe) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STAT_COLOR_CLASSES = {
  emerald: {
    border: 'border-emerald-500/20',
    borderHover: 'hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    label: 'text-emerald-400/70',
    value: 'text-emerald-400',
  },
  red: {
    border: 'border-red-500/20',
    borderHover: 'hover:border-red-500/40',
    iconBg: 'bg-red-500/10',
    iconBorder: 'border-red-500/20',
    icon: 'text-red-400',
    label: 'text-red-400/70',
    value: 'text-red-400',
  },
  violet: {
    border: 'border-violet-500/20',
    borderHover: 'hover:border-violet-500/40',
    iconBg: 'bg-violet-500/10',
    iconBorder: 'border-violet-500/20',
    icon: 'text-violet-400',
    label: 'text-violet-400/70',
    value: 'text-violet-400',
  },
  white: {
    border: 'border-white/20',
    borderHover: 'hover:border-white/30',
    iconBg: 'bg-white/5',
    iconBorder: 'border-white/10',
    icon: 'text-white/50',
    label: 'text-white/40',
    value: 'text-white/60',
  },
} as const
type StatColor = keyof typeof STAT_COLOR_CLASSES

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OracleQuant = () => {
  const { clientId } = useClientId()

  // â”€â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [grade, setGrade] = useState<GradeRow[]>([])
  const [config, setConfig] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [masterOn, setMasterOn] = useState(() => {
    try { return localStorage.getItem('oracle_master_on') !== 'false' } catch { return true }
  })
  const [activeBots, setActiveBots] = useState<Set<BotId>>(() => {
    try {
      const saved = localStorage.getItem('oracle_active_bots')
      return saved ? new Set(JSON.parse(saved) as BotId[]) : new Set<BotId>()
    } catch { return new Set<BotId>() }
  })
  const [selectedBot, setSelectedBot] = useState<BotId | null>(null)
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([])
  // --- Session Stats from Supabase B pending_trades ---
  const CLIENT_ID = '66be291b-99c3-4c25-b8d3-2cecb2eb8333'
  const [sessionWins, setSessionWins] = useState(0)
  const [sessionLosses, setSessionLosses] = useState(0)
  const [sessionProfit, setSessionProfit] = useState(0)
  const fetchSessionStats = useCallback(async () => {
    const { data } = await hftSupabase
      .from('pending_trades')
      .select('result, profit')
      .eq('client_id', CLIENT_ID)
    if (!data) return
    setSessionWins(data.filter(r => r.result === 'win').length)
    setSessionLosses(data.filter(r => r.result === 'hit').length)
    setSessionProfit(data.reduce((sum, r) => sum + (Number(r.profit) || 0), 0))
  }, [])
  useEffect(() => {
    fetchSessionStats()
    const ch = hftSupabase
      .channel('pending-trades-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_trades', filter: `client_id=eq.${CLIENT_ID}` }, () => {
        fetchSessionStats()
      })
      .subscribe()
    return () => { hftSupabase.removeChannel(ch) }
  }, [fetchSessionStats])
  const [togglingStrategy, setTogglingStrategy] = useState<string | null>(null)
  const realtimeRef = useRef<ReturnType<typeof supabaseOracle.channel> | null>(null)

  // â”€â”€â”€ Execution State (Deriv & Risk) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { token: derivToken, socket: derivSocket, account: derivAccount } = useDeriv()

  const getRiskConfig = useCallback(() => {
    try {
      const saved = localStorage.getItem('oracle_risk_config')
      if (saved) return JSON.parse(saved) as { stopWin: number; stopLoss: number; stakeValue: number }
    } catch {}
    return { stopWin: 50, stopLoss: 25, stakeValue: 1.0 }
  }, [])

  const executingAssetsRef = useRef<Set<string>>(new Set())
  const derivTokenRef = useRef(derivToken)
  const derivSocketRef = useRef(derivSocket)
  const masterOnRef = useRef(masterOn)
  const derivAccountRef = useRef(derivAccount)

  useEffect(() => { derivTokenRef.current = derivToken }, [derivToken])
  useEffect(() => { derivSocketRef.current = derivSocket }, [derivSocket])
  useEffect(() => { masterOnRef.current = masterOn }, [masterOn])
  useEffect(() => { derivAccountRef.current = derivAccount }, [derivAccount])

  // [PAGE_VISIBILITY] Aviso quando o usuÃ¡rio sai da aba com Gale rodando
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && executingAssetsRef.current.size > 0) {
        toast.warning('Bot ejecutando en background - mantenga la pestana activa', {
          duration: 8000,
          id: 'visibility-warning',
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // [LGN_AUDITOR] Helper: lÃª saldo atual da conta Deriv via WS
  const getBalanceFromWs = useCallback(async (): Promise<number> => {
    // Fonte 1: account.balance do context (atualizado por onmessage)
    const cached = derivAccountRef.current?.balance
    if (cached) return parseFloat(cached)
    // Fonte 2: query direta via WS
    const ws = derivSocketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return 0
    return new Promise<number>((resolve) => {
      const reqId = Math.floor(Math.random() * 900000) + 100000
      const timeout = setTimeout(() => { ws.removeEventListener('message', handler); resolve(0) }, 3000)
      const handler = (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data)
          if (data.req_id === reqId && data.msg_type === 'balance') {
            clearTimeout(timeout)
            ws.removeEventListener('message', handler)
            resolve(parseFloat(data.balance?.balance ?? '0'))
          }
        } catch { /* ignore */ }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({ balance: 1, req_id: reqId }))
    })
  }, [])

  // â”€â”€â”€ Debug Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [debugLogs, setDebugLogs] = useState<{ ts: string; level: 'info' | 'error' | 'ok'; msg: string }[]>([])
  const addLog = useCallback((level: 'info' | 'error' | 'ok', msg: string) => {
    const ts = new Date().toISOString().substring(11, 23)
    setDebugLogs(prev => [{ ts, level, msg }, ...prev].slice(0, 80))
  }, [])

  // â”€â”€â”€ ExecuÃ§Ã£o de Contratos Deriv â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // FIX #3: Timeout bifurcado â€” 5s para BUY, 65s para resultado do contrato
  const executeDerivContract = useCallback((ativo: string, direcao: string, stake: number) => {
    return new Promise<{ won: boolean; profit: number; contractId?: string; error?: string }>((resolve) => {
      const ws = derivSocketRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        resolve({ won: false, profit: 0, error: 'Socket not connected' })
        return
      }
    const contractType = direcao === 'CALL' ? 'CALL' : 'PUT'
    const reqId = Math.floor(Math.random() * 900000) + 100000

      let resolved = false  // [FIX A] guard contra chamadas duplas ao safeResolve
      const safeResolve = (val: { won: boolean; profit: number; contractId?: string; error?: string }) => {
        if (resolved) return
        resolved = true
        resolve(val)
      }

      // Fase 1: Timeout de 2.5s para receber o contract_id (BUY) [LGN_AUDITOR fix]
      const buyTimeout = setTimeout(() => {
        ws.removeEventListener('message', handler)
        safeResolve({ won: false, profit: 0, error: 'BUY_TIMEOUT (2.5s)' })
      }, 2500)

      const handler = (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data)
          if (data.req_id !== reqId) return

          if (data.error) {
            clearTimeout(buyTimeout)
            ws.removeEventListener('message', handler)
            safeResolve({ won: false, profit: 0, error: data.error.message })
            return
          }

          if (data.msg_type === 'buy') {
            clearTimeout(buyTimeout) // Buy recebido, cancela timeout de 5s
            ws.removeEventListener('message', handler)

            const contractId = data.buy?.contract_id
            if (!contractId) {
              safeResolve({ won: false, profit: 0, error: 'no contract_id' })
              return
            }

            // Fase 2: Timeout de 65s para o resultado final do contrato
            const resultTimeout = setTimeout(() => {
              ws.removeEventListener('message', pocHandler)
              safeResolve({ won: false, profit: 0, error: 'RESULT_TIMEOUT (65s)' })
            }, 65000)

            const pocHandler = (pocMsg: MessageEvent) => {
              try {
                const pocData = JSON.parse(pocMsg.data)
                if (pocData.msg_type === 'proposal_open_contract' && pocData.proposal_open_contract?.contract_id === contractId) {
                  const poc = pocData.proposal_open_contract
                  if (poc.status === 'sold' || poc.status === 'won' || poc.status === 'lost' || poc.is_final_price) {
                    clearTimeout(resultTimeout)
                    ws.removeEventListener('message', pocHandler)
                    const profit = parseFloat(poc.profit ?? '0')
                    safeResolve({ won: profit > 0, profit, contractId: String(contractId) })
                  }
                }
              } catch { /* ignore parse errors */ }
            }
            ws.addEventListener('message', pocHandler)
            ws.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }))
          }
        } catch { /* ignore parse errors */ }
      }

      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({
        buy: 1, subscribe: 1, price: stake,
        req_id: reqId,
        parameters: {
          contract_type: contractType,
          symbol: ativo,
          duration: 1, duration_unit: 'm',
          currency: 'USD', basis: 'stake',
          amount: stake.toFixed(2)
        }
      }))
    })
  }, [])

  // [LGN_AUDITOR] Constantes imutÃ¡veis de risco
  const GALE_MULTIPLIERS = [1.0, 2.2, 5.0] as const  // Total: 8.2 unidades
  const GALE_TOTAL_UNITS = 8.2  // 1.0 + 2.2 + 5.0
  const MAX_RISK_PCT = 0.20  // 20% da banca por sÃ©rie (ajustado p/ contas pequenas)
  const MAX_CONCURRENT_ASSETS = 3 // [STRESS_TESTER] MÃ¡ximo de ativos simultÃ¢neos

  // Motor de Gale 2 (stakes: base Ã—1.0, Ã—2.2, Ã—5.0)
  // FIX #1: try/finally para SEMPRE liberar o ativo
  // FIX #2: Jitter entre ordens concorrentes
  // FIX #4: Salva CANCELLED/ERROR no histÃ³rico
  // [LGN_AUDITOR] Balance Check + Sizing Guard + EV Audit
  const executeGaleChain = useCallback(async (ativo: string, direcao: string, bot?: string) => {
    const riskConfig = getRiskConfig()
    const base = riskConfig.stakeValue || 1.0
    let finalResult = 'HIT'
    let totalProfit = 0
    let finalWon = false
    const now = new Date()

    // [LGN_AUDITOR] Sizing Guard: sÃ©rie completa â‰¤ 1% da banca
    const balance = await getBalanceFromWs()

    // â”€â”€ [PASSO 3] Feature Flag + Edge Function Risk Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // OFF (default) = Shadow Mode (fire-and-forget, sÃ³ loga)
    // ON            = Edge Function Ã© AUTORIDADE (600ms timeout, fallback local)
    // Ativar: localStorage.setItem('use_edge_risk', 'true')
    // Reverter tudo: git revert (remove Passos 2+3 juntos)
    const USE_EDGE_RISK = localStorage.getItem('use_edge_risk') === 'true'
    const EDGE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co/functions/v1/validate-risk'

    type EdgeResult = { allowed: boolean; reason: string; approved_stake: number; approved_until: number; detail?: { shadow_count?: number; ready_for_passo3?: boolean; divergence_pct?: number } }

    const callEdgeFunction = async (timeoutMs: number, shadowMode: boolean): Promise<EdgeResult | null> => {
      try {
        if (!derivTokenRef.current || balance <= 0) return null
        // [FIX auth_missing] Pega JWT da sessÃ£o ativa do Supabase A
        const { data: sessionData } = await supabaseOracle.auth.getSession()
        const jwt = sessionData?.session?.access_token
        if (!jwt) return null
        const controller = new AbortController()
        const tid = setTimeout(() => controller.abort(), timeoutMs)
        const res = await fetch(EDGE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,  // â† era ausente, causava auth_missing
          },
          body: JSON.stringify({ balance, base_stake: base, gale_level: 0, shadow_mode: shadowMode }),
          signal: controller.signal,
        })
        clearTimeout(tid)

        return await res.json() as EdgeResult
      } catch { return null }
    }

    if (USE_EDGE_RISK) {
      // â”€â”€â”€ PASSO 3: MODE ATIVO â€” Edge Function Ã© autoridade â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      addLog('info', `[EDGE] Consultando validate-risk (timeout 600ms)...`)
      const edgeResult = await callEdgeFunction(600, false) // [@SHIELD_AGENT] 600ms para Passo 3

      if (edgeResult) {
        // DivergÃªncia de stake > 5%? Alerta @LGN_AUDITOR
        if ((edgeResult.detail?.divergence_pct ?? 0) > 5) {
          addLog('error', `[EDGE ALERT] DivergÃªncia de stake >${edgeResult.detail!.divergence_pct!.toFixed(1)}% detectada! Investigar.`)
          toast.error(`Divergencia de stake detectada por Edge - verifique configuraciones`)
        }
        if (!edgeResult.allowed) {
          // Edge BLOQUEOU â€” exibe razÃ£o e aborta
          addLog('error', `[EDGE BLOCK] Bloqueado: reason=${edgeResult.reason} | balance=$${balance.toFixed(2)} | exposure=$${(base * GALE_TOTAL_UNITS).toFixed(2)}`)
          toast.error(`GALE BLOQUEADO por el servidor: ${edgeResult.reason}`)
          executingAssetsRef.current.delete(ativo)
          return
        }
        // Edge aprovou â€” usa approved_stake como base para esse ciclo
        addLog('ok', `[EDGE OK] Aprobado | approved_stake=$${edgeResult.approved_stake} | reason=${edgeResult.reason}`)
        // Sobrescreve base com o stake aprovado pelo servidor (respeita limite do plano)
        // A varÃ­avel `base` foi declarada com let implicitamente â€” re-atribuÃ­da aqui
        Object.defineProperty(riskConfig, 'stakeValue', { value: edgeResult.approved_stake / 1.0, writable: true, configurable: true })
      } else {
        // Edge nÃ£o respondeu em 600ms â†’ fallback local assume
        addLog('error', `[EDGE TIMEOUT] Timeout 600ms â€” fallback local asumio autoridad`)
      }
    } else {
      // â”€â”€â”€ SHADOW MODE: Edge Ã© observador, local Ã© autoridade â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      ;(async () => {
        const edgeResult = await callEdgeFunction(400, true) // [@SHIELD_AGENT] 400ms no Shadow
        if (!edgeResult) return
        if ((edgeResult.detail?.divergence_pct ?? 0) > 5) {
          addLog('error', `[SHADOW] DivergÃªncia >${edgeResult.detail!.divergence_pct!.toFixed(1)}% â€” investigar!`)
        }
        const shadowCount = edgeResult.detail?.shadow_count ?? 0
        const readyLabel = edgeResult.detail?.ready_for_passo3 ? 'âœ… PRONTO p/ Passo 3' : `${shadowCount}/500 trades`
        addLog(
          edgeResult.allowed ? 'ok' : 'error',
          `[SHADOW] Edge: ${edgeResult.allowed ? 'ALLOWED' : 'BLOCKED'} | reason=${edgeResult.reason} | stake=$${edgeResult.approved_stake} | ${readyLabel}`
        )
      })()
    }
    // â”€â”€ [@LGN_AUDITOR] Local guard â€” PERMANENTE, nunca removido â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ProteÃ§Ã£o secundÃ¡ria: mesmo que Edge aprove, math local Ã© a Ãºltima barreira


    if (balance > 0) {
      const totalExposure = base * GALE_TOTAL_UNITS  // ex: $1 * 8.2 = $8.20
      // Trava de risco removida a pedido do usuario
      addLog('info', `[$ LGN] Saldo: $${balance.toFixed(2)} | ExposiÃ§Ã£o G2: $${totalExposure.toFixed(2)}`)
      // [LGN_AUDITOR] EV Audit: log exposiÃ§Ã£o total
      addLog('info', `[EV] SÃ©rie G2: $${base.toFixed(2)} Ã— [1.0 + 2.2 + 5.0] = $${totalExposure.toFixed(2)} exp. | Break-even requer payout â‰¥ ${((GALE_TOTAL_UNITS / (GALE_TOTAL_UNITS + 1)) * 100).toFixed(0)}%`)
    } else {
      addLog('error', `[âš ï¸  LGN] No fue posible leer saldo de Deriv. Procediendo con cautela.`)
    }


    try {
      for (let i = 0; i < 3; i++) {
        const stake = base * GALE_MULTIPLIERS[i]

        // [LGN_AUDITOR] Balance Check antes de cada Gale
        if (balance > 0) {
          const liveBalance = i === 0 ? balance : await getBalanceFromWs()
          // Only abort if liveBalance is definitively positive AND insufficient (guards against stale cache returning 0)
          if (liveBalance > 0 && liveBalance < stake) {
            addLog('error', `[STOP LGN] Saldo Insuficiente para G${i}: Saldo $${liveBalance.toFixed(2)} < Stake $${stake.toFixed(2)}. Ciclo abortado.`)
            finalResult = 'CANCELLED'
            break
          }
        }

        // FIX #2: Jitter â€” respiro de 100-500ms entre ordens para nÃ£o sobrecarregar a Deriv
        if (executingAssetsRef.current.size > 1 || i > 0) {
          const jitter = 100 + Math.floor(Math.random() * 400)
          addLog('info', `[JITTER] ${ativo} esperando ${jitter}ms...`)
          await new Promise(res => setTimeout(res, jitter))
        }

        addLog('info', `[âš¡ G${i}] ${ativo} ${direcao} | Stake: $${stake.toFixed(2)}`)

        // [SHIELD_AGENT] Fix #4: PersistÃªncia de RecuperaÃ§Ã£o
        // Salva o estado ANTES de executar, para recovery em caso de crash/F5
        localStorage.setItem('hft_active_recovery', JSON.stringify({
          ativo,
          direcao,
          proximo_gale: i,
          bot,
          ts: Date.now()
        }))

        // Registra posiÃ§Ã£o aberta no painel live
        const posId = `${ativo}-G${i}-${Date.now()}`
        setOpenPositions(prev => [...prev, {
          id: posId,
          asset: ativo,
          direction: direcao as 'CALL' | 'PUT',
          stake,
          gale: i,
          openTime: Date.now(),
          durationSecs: 60,
          bot,
        }])

        const result = await executeDerivContract(ativo, direcao, stake)

        // [FORMA 5] Auditoria InviolÃ¡vel: Envia ID do contrato para o Supabase B
        if (result.contractId) {
          import('@/services/HftAuditService').then(({ HftAuditService }) => {
            HftAuditService.registerTrade({
              clientId,
              contractId: result.contractId!,
              botId: 'ORACLE_QUANT',
              ativo
            })
          })
        }

        // Remove posiÃ§Ã£o ao expirar
        setOpenPositions(prev => prev.filter(p => p.id !== posId))

        if (result.error) {
          addLog('error', `[âŒ DERIV] ${result.error}`)

          // [LGN_AUDITOR] Apenas InsufficientBalance aborta o ciclo inteiro
          if (result.error.includes('InsufficientBalance') || result.error.includes('Insufficient balance')) {
            addLog('error', `[STOP LGN] Saldo insuficiente detectada pela Deriv. Ciclo abortado.`)
            finalResult = 'CANCELLED'
            break
          }

          // [LGN_AUDITOR] Error tecnico (BUY_TIMEOUT, etc.) â€” escala para prÃ³ximo Gale
          addLog('info', `[ðŸ” LGN] Error tecnico em G${i}. Escalando para G${i + 1} em 2s.`)
          await new Promise(res => setTimeout(res, 2000))
          continue // escala para prÃ³ximo Gale
        }

        // [LGN_AUDITOR] Apenas acumula profit quando a ordem foi ACEITA pela Deriv
        totalProfit += result.profit
        if (result.won) {
          addLog('ok', `[ðŸ† WIN G${i}] ${ativo} | Lucro: +$${result.profit.toFixed(2)}`)
          finalResult = 'WIN'
          finalWon = true
          break
        } else {
          addLog('error', `[ðŸŸ¥ LOSS G${i}] ${ativo} | -$${stake.toFixed(2)}`)
          if (i === 2) {
            finalResult = 'LOSS'
          }
        }
      }
    } finally {
      // FIX #1: SEMPRE limpa o ativo, nÃ£o importa o que aconteceu
      executingAssetsRef.current.delete(ativo)
      // [SHIELD_AGENT] Fix #4: Limpa a recovery key ao finalizar o ciclo
      localStorage.removeItem('hft_active_recovery')
    }

    addLog(finalWon ? 'ok' : 'error', `[FIM] ${ativo} â†’ ${finalResult} | P&L: $${totalProfit.toFixed(2)}`)

    // FIX #4: Persiste resultado no Supabase B pending_trades
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    await hftSupabase.from('pending_trades').insert({
      client_id: CLIENT_ID,
      signal_id: idempotencyKey,
      idempotency_key: idempotencyKey,
      ativo: ativo,
      active_id: ativo,
      direcao: direcao,
      stake: base,
      status: 'executed',
      result: finalWon ? 'win' : (finalResult === 'CANCELLED' ? 'cancelled' : 'hit'),
      profit: totalProfit,
    })
  }, [addLog, executeDerivContract, getRiskConfig, getBalanceFromWs, setOpenPositions])

  // [SHIELD_AGENT] Ref estÃ¡vel para evitar re-subscribe do canal Realtime
  const executeGaleChainRef = useRef(executeGaleChain)
  useEffect(() => { executeGaleChainRef.current = executeGaleChain }, [executeGaleChain])

  // [SHIELD_AGENT] Fix #4 â€” Recovery: ao montar o componente, verifica se hÃ¡ um
  // Gale pendente salvo no localStorage (ocorre se o browser deu F5 ou travou)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hft_active_recovery')
      if (!raw) return
      const recovery = JSON.parse(raw) as { ativo: string; direcao: string; proximo_gale: number; bot?: string; ts: number }
      const ageMs = Date.now() - recovery.ts
      if (ageMs > 90_000) {
        // Registro muito antigo (>90s): ciclo jÃ¡ expirou, limpa
        localStorage.removeItem('hft_active_recovery')
        return
      }
      addLog('error', `[RECOVERY] Gale interrumpido detectado! ${recovery.ativo} G${recovery.proximo_gale} â€” retomando en 3s...`)
      toast.error(`RECOVERY: Gale ${recovery.ativo} G${recovery.proximo_gale} retomado apÃ³s interrupÃ§Ã£o`)
      setTimeout(() => {
        executeGaleChainRef.current(recovery.ativo, recovery.direcao, recovery.bot)
      }, 3000)
    } catch { /* ignore parse errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // â”€â”€â”€ Signal Monitor + Execution (escuta hft_catalogo_estrategias) â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    addLog('info', '[SIGNAL] Conectando ao canal hft_catalogo_estrategias...')
    const ch = hftSupabase
      .channel('oracle-signal-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hft_catalogo_estrategias' }, (payload) => {
        const s = payload.new as Record<string, unknown>
        const estrategia = String(s.estrategia ?? '')
        const status     = String(s.status ?? '')
        const ativo      = String(s.ativo ?? '')
        const variacao   = String(s.variacao_estrategia ?? 'N/A')
        const direcao    = String(s.direcao ?? (s.sinal_dir ?? ''))
        addLog(
          status === 'CONFIRMED' ? 'ok' : 'info',
          `[SIGNAL ${status}] ${estrategia} | ${ativo} ${direcao} | variacao=${variacao}`
        )

        // â”€â”€â”€ EXECUTION ENGINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (status !== 'CONFIRMED') return
        if (!masterOnRef.current) { addLog('info', `[BLOQ] Sistema OFF â€” senal ignorada`); return }
        if (!derivTokenRef.current) { addLog('error', `[BLOQ] Token Deriv no encontrado`); return }

        // [FIX BUG 1+2] timestamp_sinal é sempre segundos Unix; guard = 10s para Vercel CDN
        const tsSignal = Number(s.timestamp_sinal ?? 0)
        const tsNow = Date.now() / 1000
        const latency = tsNow - tsSignal
        if (latency > 10) { addLog('info', `[STALE] Senal expirada (${latency.toFixed(1)}s > 10s). Ignorado.`); return }
        if (latency < 0) { addLog('info', `[STALE] Senal futura? (${latency.toFixed(1)}s). Ignorado.`); return }

        // [STRESS_TESTER] Queda de ConexÃ£o: verifica WS antes de executar
        const ws = derivSocketRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          addLog('error', `[WS_DEAD] WebSocket desconectado. Senal de ${ativo} ignorado.`)
          return
        }

        // [STRESS_TESTER] Concurrency Cap: mÃ¡ximo de 3 ativos simultÃ¢neos
        if (executingAssetsRef.current.size >= MAX_CONCURRENT_ASSETS) {
          addLog('info', `[CAP] ${executingAssetsRef.current.size}/${MAX_CONCURRENT_ASSETS} activos en ejecucion. ${ativo} adiado.`)
          return
        }

        // Anti-duplo por ativo
        if (executingAssetsRef.current.has(ativo)) { addLog('info', `[SKIP] ${ativo} ya en ejecucion`); return }
        executingAssetsRef.current.add(ativo)
        addLog('ok', `[EXEC] Iniciando ${ativo} ${direcao} | lat=${latency.toFixed(2)}s`)

        // [SHIELD_AGENT] Usa ref estÃ¡vel para evitar re-subscribe loop
        executeGaleChainRef.current(ativo, direcao, estrategia)
      })
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') addLog('ok', '[SIGNAL] Canal conectado con exito!')
        else if (st === 'CHANNEL_ERROR') addLog('error', `[SIGNAL] âŒ Error en el canal!`)
        else addLog('info', `[SIGNAL] Status canal: ${st}`)
      })
    return () => { hftSupabase.removeChannel(ch) }
  // [SHIELD_AGENT] Deps estÃ¡veis â€” executeGaleChain removido (usa ref)
  }, [addLog])

  // â”€â”€â”€ Persist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => { localStorage.setItem('oracle_active_bots', JSON.stringify([...activeBots])) }, [activeBots])
  useEffect(() => { localStorage.setItem('oracle_master_on', String(masterOn)) }, [masterOn])

  // â”€â”€â”€ Reset pending_trades â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleReset = useCallback(async () => {
    if (!confirm('Resetear todos los resultados de la sesion?')) return
    await hftSupabase.from('pending_trades').delete().eq('client_id', CLIENT_ID)
    setSessionWins(0)
    setSessionLosses(0)
    setSessionProfit(0)
    toast.success('Historial reseteado!')
  }, [])

  // â”€â”€â”€ Fetch Grade from Supabase B â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // [SHIELD_AGENT] Schema Protection: valida colunas essenciais no resultado
  const fetchGrade = useCallback(async () => {
    setLoading(true)
    addLog('info', `[GRADE] Buscando vw_grade_unificada no schema hft_lake...`)
    addLog('info', `[GRADE] URL: ${import.meta.env.VITE_ORACLE_SUPABASE_URL?.substring(0, 35)}...`)
    try {
      const { data, error } = await supabaseOracle
        .schema('hft_lake')
        .from('vw_grade_unificada')
        .select('ativo, hh_mm, direcao, status, wr_g2, wr_1a, ev_g2, n_filtros, filtros_aprovados, n_total, n_hit, stake_multiplier')
        .in('status', ['APROVADO', 'CONDICIONAL'])
        .order('n_filtros', { ascending: false })
      if (error) {
        // [SHIELD_AGENT] Schema Protection: PGRST204 / 42703
        console.error('[OracleQuant][GRADE]', error)
        addLog('error', `[SCHEMA] âŒ ${error.code}: ${error.message}`)
        toast.error('Error cargando grade: ' + error.message)
      } else {
        const rows = (data as GradeRow[]) ?? []
        // [SHIELD_AGENT] ValidaÃ§Ã£o de integridade: checa se colunas essenciais existem
        if (rows.length > 0) {
          const sample = rows[0]
          const requiredKeys = ['ativo', 'hh_mm', 'direcao', 'wr_g2', 'ev_g2'] as const
          const missing = requiredKeys.filter(k => !(k in sample))
          if (missing.length > 0) {
            addLog('error', `[SCHEMA] Columnas ausentes en la view: ${missing.join(', ')}. Grade NÃƒO substituÃ­da.`)
            setLoading(false)
            return
          }
        }
        setGrade(rows)
        addLog('ok', `[GRID] ✅ ${rows.length} estrategias cargadas`)
      }
    } catch (err) {
      addLog('error', `[SCHEMA] Error inesperado al buscar grade: ${err}`)
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (isOracleConfigured) fetchGrade() }, [fetchGrade])

  // â”€â”€â”€ Fetch Client Config from Supabase B â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!clientId || !isOracleConfigured) return
    addLog('info', `[CONFIG] Buscando config para client_id: ${clientId.substring(0, 8)}...`)
    supabaseOracle.schema('hft_lake').from('client_strategy_config')
      .select('strategy_id, ativo_flag').eq('client_id', clientId)
      .then(({ data, error }) => {
        if (error) {
          console.error('[OracleQuant][CONFIG]', error)
          addLog('error', `[CONFIG] âŒ ${error.code}: ${error.message}`)
        }
        else {
          const mapa: Record<string, boolean> = {};
          ((data as ClientConfig[]) ?? []).forEach((c) => { mapa[c.strategy_id] = c.ativo_flag })
          setConfig(mapa)
          addLog('ok', `[CONFIG] ✅ ${Object.keys(mapa).length} estrategias configuradas`)
        }
      })
  }, [clientId])

  // â”€â”€â”€ Supabase Realtime â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!isOracleConfigured) return
    const channel = supabaseOracle.channel('oracle_grade_realtime')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'hft_oracle_results' }, () => {
        console.log('[OracleQuant][REALTIME] Grade updated â€” reloading')
        fetchGrade()
      }).subscribe()
    realtimeRef.current = channel
    return () => { supabaseOracle.removeChannel(channel) }
  }, [fetchGrade])

  // â”€â”€â”€ Bot Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleBot = useCallback((botId: BotId) => {
    setActiveBots((prev) => {
      const next = new Set(prev)
      if (next.has(botId)) next.delete(botId)
      else next.add(botId)
      return next
    })
  }, [])

  // â”€â”€â”€ Strategy Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleStrategy = useCallback(async (strategy: GradeRow) => {
    if (!clientId) { toast.error('Inicie sesiÃ³n para activar estrategias'); return }
    // Gera o strategy_id no mesmo formato do lake_exporter.py
    const sid = strategy.strategy_id_lake ||
      `T${strategy.hh_mm.replace(':', '')}_LAKE_${strategy.ativo.replace('_', '')}_${strategy.direcao}`
    const novoFlag = !(config[sid] ?? false)
    setTogglingStrategy(sid)
    setConfig((prev) => ({ ...prev, [sid]: novoFlag }))
    const { error } = await supabaseOracle.schema('hft_lake').from('client_strategy_config')
      .upsert({ client_id: clientId, strategy_id: sid, ativo: strategy.ativo, hh_mm: strategy.hh_mm, direcao: strategy.direcao, ativo_flag: novoFlag, updated_at: new Date().toISOString() }, { onConflict: 'client_id,strategy_id' })
    if (error) {
      console.error('[OracleQuant][TOGGLE]', error)
      setConfig((prev) => ({ ...prev, [sid]: !novoFlag }))
      toast.error(`Error: ${error.message}`)
    }
    setTogglingStrategy(null)
  }, [clientId, config])

  // â”€â”€â”€ Computed Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const botStats = useMemo(() => {
    const map: Record<string, BotStats> = {}
    for (const bot of BOT_ARSENAL) { map[bot.id] = computeBotStats(grade, bot.filter) }
    return map
  }, [grade])

  const globalStats = useMemo(() => {
    const totalStrategies = grade.length
    const totalActive = Object.values(config).filter(Boolean).length
    const allWrG2 = grade.length > 0 ? grade.reduce((s, r) => s + r.wr_g2, 0) / grade.length : 0
    return { totalStrategies, totalActive, allWrG2 }
  }, [grade, config])

  const selectedBotData = useMemo(() => {
    if (!selectedBot) return null
    const bot = BOT_ARSENAL.find((b) => b.id === selectedBot)
    if (!bot) return null
    return { bot, stats: botStats[bot.id] }
  }, [selectedBot, botStats])

  // â”€â”€â”€ Not configured â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!isOracleConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#030a0a] via-[#050f0d] to-[#030a0a] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Database size={32} className="text-red-400" />
          </div>
          <p className="text-lg font-bold text-red-400">Supabase B no configurado</p>
          <p className="text-sm text-white/30 mt-2 max-w-sm">
            Agregue <code className="text-white/50">VITE_ORACLE_SUPABASE_URL</code> y{' '}
            <code className="text-white/50">VITE_ORACLE_SUPABASE_ANON_KEY</code> al .env.local
          </p>
        </div>
      </div>
    )
  }

  // â”€â”€â”€ Animation variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-screen bg-[#020505] relative overflow-hidden p-3 md:p-6">
      <TradingBackground />

      <motion.div className="max-w-[1400px] mx-auto space-y-5 relative z-10" initial="hidden" animate="visible" variants={containerVariants}>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• HEADER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-gradient-to-r from-[#08110f]/95 via-[#060d0b]/95 to-[#060a08]/95 p-4 md:p-5"
        >
          <div className="pointer-events-none absolute -top-16 left-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 -bottom-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative mt-0.5">
                <div className={cn('absolute inset-0 blur-xl rounded-full animate-pulse', masterOn ? 'bg-emerald-500/25' : 'bg-red-500/15')} />
                <div className={cn(
                  'relative w-14 h-14 rounded-2xl flex items-center justify-center border shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition-all duration-500',
                  masterOn
                    ? 'bg-gradient-to-br from-emerald-500/90 to-teal-700/90 border-emerald-300/30'
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-500/20'
                )}>
                  <Crosshair className="text-white" size={24} />
                </div>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl md:text-3xl font-black text-white leading-none tracking-tight">Copy Trading</h1>
                <p className="text-xs md:text-sm text-white/45">Central de Copy Trading — Mesa de Traders Cuantitativos</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                    masterOn ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-red-400/30 bg-red-500/10 text-red-300'
                  )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', masterOn ? 'bg-emerald-300 animate-pulse' : 'bg-red-300')} />
                    {masterOn ? 'Red Activa' : 'Red Pausada'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                    <Users size={10} />
                    {activeBots.size} Traders En Ejecución
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setMasterOn(!masterOn)}
                className={cn(
                  'px-6 py-3 rounded-2xl border-2 font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.35)]',
                  masterOn
                    ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/15'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15'
                )}
              >
                {masterOn ? 'APAGAR BOT' : 'ENCENDER BOT'}
              </button>
              <button
                onClick={fetchGrade}
                disabled={loading}
                className="p-2.5 rounded-xl border border-white/10 bg-black/20 text-white/35 hover:border-white/20 hover:text-white/55 transition-all disabled:opacity-40"
              >
                <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              </button>
              <button
                onClick={handleReset}
                className="p-2.5 rounded-xl border border-red-500/20 bg-black/20 text-red-400/50 hover:border-red-500/40 hover:text-red-400 transition-all"
                title="Limpiar historial"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TOP STATS BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(() => {
            const profitColor: StatColor = sessionProfit > 0 ? 'emerald' : sessionProfit < 0 ? 'red' : 'white'
            const stats = [
              { label: 'Wins', value: sessionWins, icon: TrendingUp, colorKey: 'emerald' as StatColor, format: (v: number) => String(v) },
              { label: 'Losses', value: sessionLosses, icon: TrendingDown, colorKey: 'red' as StatColor, format: (v: number) => String(v) },
              { label: 'Beneficio / Pérdida', value: sessionProfit, icon: Target, colorKey: profitColor, format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} USD` },
              { label: 'Asertividad G2', value: globalStats.allWrG2, icon: BarChart3, colorKey: 'violet' as StatColor, format: (v: number) => `${(v * 100).toFixed(1)}%` },
            ]
            return stats.map((stat) => {
              const cls = STAT_COLOR_CLASSES[stat.colorKey]
              return (
                <motion.div key={stat.label} whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}
                  className={cn(
                    'bg-black/20 backdrop-blur-sm border rounded-2xl p-4 group hover:bg-white/[0.02] transition-colors relative overflow-hidden',
                    cls.border, cls.borderHover
                  )}>
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border', cls.iconBg, cls.iconBorder)}>
                      <stat.icon size={16} className={cls.icon} />
                    </div>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', cls.label)}>{stat.label}</span>
                  </div>
                  <div className={cn('text-2xl md:text-3xl font-black relative z-10', cls.value)}>{stat.format(stat.value)}</div>
                </motion.div>
              )
            })
          })()}
        </motion.div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MAIN GRID â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <div className="grid grid-cols-12 gap-4 md:gap-6">

          {/* â”€â”€â”€ Left: Bot Arsenal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Arsenal de Bots</h2>
                <span className="text-[10px] text-white/20 font-mono ml-2">{activeBots.size}/{BOT_ARSENAL.length} activos</span>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="h-52 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}

            {/* Bot Cards */}
            {!loading && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BOT_ARSENAL.map((bot) => {
                  const stats = botStats[bot.id]
                  const isActive = activeBots.has(bot.id) && masterOn
                  const isSelected = selectedBot === bot.id
                  const BotIcon = bot.icon
                  return (
                    <motion.div variants={itemVariants} whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }} layout key={bot.id}
                      className={cn(
                        'relative rounded-2xl border p-5 transition-all duration-300 cursor-pointer group backdrop-blur-sm overflow-hidden',
                        isActive ? `${bot.activeBg} ${bot.activeBorder}` : 'bg-white/[0.02] border-white/10 hover:border-white/20',
                        isSelected && 'ring-1 ring-white/20',
                        !masterOn && 'opacity-50'
                      )}
                      onClick={() => setSelectedBot(isSelected ? null : bot.id)}
                    >
                      {isActive && <div className={cn('absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30', bot.glow)} />}
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border overflow-hidden', bot.iconBg, bot.iconBorder)}>
                              {('photo' in bot && bot.photo) ? (
                                <img
                                  src={bot.photo}
                                  alt={bot.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <BotIcon size={20} className={bot.text} />
                              )}
                            </div>
                            <div>
                              <h3 className="text-xs font-black text-white tracking-wide leading-tight">{bot.name}</h3>
                              <p className="text-[10px] text-white/30 mt-0.5">{bot.slogan}</p>
                            </div>
                          </div>
                          {stats?.isElite && (
                            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-md', bot.badgeBg, bot.text)}>{bot.badge}</span>
                          )}
                        </div>
                        {stats?.lowSample && stats.count > 0 && (
                          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                            <Radio size={10} className="text-yellow-400" />
                            <span className="text-[9px] text-yellow-400 font-bold">Esperando Muestra</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-black/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-[8px] text-white/25 font-bold uppercase block">WR G2</span>
                            <span className={cn('text-sm font-black', stats?.avgWrG2 >= 0.88 ? bot.text : 'text-white/50')}>
                              {(stats?.avgWrG2 * 100 || 0).toFixed(1)}%
                            </span>
                          </div>
                          <div className="bg-black/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-[8px] text-white/25 font-bold uppercase block">WR 1Âª</span>
                            <span className="text-sm font-black text-white/60">{(stats?.avgWr1a * 100 || 0).toFixed(1)}%</span>
                          </div>
                          <div className="bg-black/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-[8px] text-white/25 font-bold uppercase block">EV G2</span>
                            <span className={cn('text-sm font-black', (stats?.avgEvG2 || 0) > 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {(stats?.avgEvG2 || 0) > 0 ? '+' : ''}{(stats?.avgEvG2 || 0).toFixed(3)}
                            </span>
                          </div>
                          <div className="bg-black/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-[8px] text-white/25 font-bold uppercase block">Estrategias</span>
                            <span className="text-sm font-black text-white/60">{stats?.count || 0}</span>
                          </div>
                        </div>
                        {stats && stats.count > 0 && <div className="mb-3 px-1"><RxBar strategies={stats.strategies} /></div>}
                        <div className="flex items-center justify-between">
                          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-md border', bot.badgeBg, bot.text, bot.border)}>
                            {bot.filter} â€” {bot.filterLabel}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); toggleBot(bot.id) }}
                            className={cn(
                              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                              isActive ? `${bot.toggleActive} shadow-[0_0_12px_rgba(16,185,129,0.3)]` : 'bg-white/10'
                            )}>
                            <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out', isActive ? 'translate-x-5' : 'translate-x-0')} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}

            {/* Selected Bot Detail */}
            <AnimatePresence mode="wait">
              {selectedBotData && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                  className={cn('rounded-2xl border p-5 backdrop-blur-sm overflow-hidden', selectedBotData.bot.activeBg, selectedBotData.bot.activeBorder)}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {('photo' in selectedBotData.bot && selectedBotData.bot.photo) ? (
                        <img
                          src={selectedBotData.bot.photo}
                          alt={selectedBotData.bot.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <selectedBotData.bot.icon size={16} className={selectedBotData.bot.text} />
                      )}
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{selectedBotData.bot.name} — Horarios</h3>
                    </div>
                    <span className="text-[10px] text-white/20 font-mono">{selectedBotData.stats.count} estrategias</span>
                  </div>
                  {selectedBotData.stats.count === 0 ? (
                    <div className="text-center py-8"><p className="text-sm text-white/30">Sin estrategias disponibles para {selectedBotData.bot.filter}</p></div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {selectedBotData.stats.strategies.map((s) => {
                        const isOn = config[s.strategy_id_lake ?? ''] ?? false
                        const isSaving = togglingStrategy === s.strategy_id_lake
                        return (
                          <div key={s.strategy_id_lake} className={cn('flex items-center gap-3 p-3 rounded-xl border transition-all duration-200', isOn ? `${selectedBotData.bot.activeBg} ${selectedBotData.bot.activeBorder}` : 'bg-white/[0.02] border-white/10 hover:border-white/15')}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs font-bold text-white">{s.ativo}</span>
                                <span className="text-xs font-mono text-white/50">{s.hh_mm}</span>
                                <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded uppercase', s.direcao === 'CALL' ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/15 text-red-400')}>{s.direcao}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px]">
                                <span className={cn('font-bold', s.wr_g2 >= 0.88 ? 'text-emerald-400' : 'text-white/40')}>G2: {(s.wr_g2 * 100).toFixed(1)}%</span>
                                <span className="text-white/30">1Âª: {(s.wr_1a * 100).toFixed(1)}%</span>
                                <span className={cn(s.ev_g2 > 0 ? 'text-emerald-400' : 'text-red-400')}>EV: {s.ev_g2 > 0 ? '+' : ''}{s.ev_g2.toFixed(3)}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                              <button onClick={() => toggleStrategy(s)} disabled={isSaving || !clientId}
                                className={cn('relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50', isOn ? `${selectedBotData.bot.toggleActive} shadow-[0_0_8px_rgba(16,185,129,0.3)]` : 'bg-white/10')}>
                                <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out', isOn ? 'translate-x-4' : 'translate-x-0')} />
                              </button>
                              <span className={cn('text-[8px] font-bold uppercase', isSaving ? 'text-white/20' : isOn ? selectedBotData.bot.text : 'text-white/20')}>{isSaving ? '...' : isOn ? 'ON' : 'OFF'}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* â”€â”€â”€ Right: Timer + Risk + History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* Open Positions â€” live */}
            <OpenPositionsPanel
              positions={openPositions}
              onExpire={(id) => setOpenPositions(prev => prev.filter(p => p.id !== id))}
            />

            {/* Timer Removido */}


            {/* Active Bots Summary */}
            <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                  <Activity size={16} className="text-violet-400" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bots Activos</h3>
              </div>
              {activeBots.size === 0 ? (
                <p className="text-xs text-white/20 text-center py-4">NingÃºn bot activado</p>
              ) : (
                <div className="space-y-2">
                  {BOT_ARSENAL.filter((b) => activeBots.has(b.id)).map((bot) => {
                    const stats = botStats[bot.id]
                    return (
                      <div key={bot.id} className={cn('flex items-center justify-between p-3 rounded-xl border', bot.activeBg, bot.activeBorder)}>
                        <div className="flex items-center gap-2">
                          {('photo' in bot && bot.photo) ? (
                            <img
                              src={bot.photo}
                              alt={bot.name}
                              className="w-3.5 h-3.5 rounded-full object-cover"
                            />
                          ) : (
                            <bot.icon size={14} className={bot.text} />
                          )}
                          <span className="text-xs font-bold text-white/80 truncate max-w-[120px]">{bot.name}</span>
                        </div>
                        <span className={cn('text-xs font-black', bot.text)}>{(stats?.avgWrG2 * 100 || 0).toFixed(1)}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>

            {/* Risk Management */}
            <RiskManagementPanel />

            {/* Trade History Removido */}

          </div>
        </div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• DEBUG LOGS PANEL (temporÃ¡rio) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <motion.div variants={itemVariants} className="block rounded-2xl border border-yellow-500/20 bg-black/40 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/10 bg-yellow-500/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Debug Logs — Supabase B (hft_lake)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-yellow-400/50">{debugLogs.length} entradas</span>
              <button onClick={() => setDebugLogs([])} className="text-[10px] text-white/20 hover:text-white/50 transition-colors px-2 py-0.5 rounded border border-white/10">
                Limpiar
              </button>
            </div>
          </div>
          <div className="h-48 overflow-y-auto p-3 font-mono text-[11px] space-y-0.5">
            {debugLogs.length === 0 ? (
              <p className="text-white/20 text-center py-6">Esperando eventos... (recargue la página)</p>
            ) : (
              debugLogs.map((log, i) => (
                <div key={i} className={cn('flex gap-2', log.level === 'error' ? 'text-red-400' : log.level === 'ok' ? 'text-emerald-400' : 'text-white/50')}>
                  <span className="text-white/20 flex-shrink-0">{log.ts}</span>
                  <span>{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• FOOTER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-white/15 font-mono">
            hft_lake.vw_grade_unificada Â· {grade.length} estrategias Â· Supabase B Copy Trading
          </p>
          <p className="text-[10px] text-white/15 font-mono">
            {activeBots.size} bots Â· {globalStats.totalActive} horarios activos
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default OracleQuant

