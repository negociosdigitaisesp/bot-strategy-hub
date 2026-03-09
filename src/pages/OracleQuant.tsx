/**
 * OracleQuant.tsx — Trading Command Center
 * Arsenal de 5 bots especialistas com dados do Supabase B (hft_lake)
 * 
 * @INTEGRATOR_EXPERT: Conexão ao schema hft_lake.vw_grade_unificada
 * @SHIELD_AGENT: clientId do Supabase A via useClientId
 * @DEBUG_SENTINEL: Realtime subscription + error boundaries
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Database,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Target,
  Activity,
  BarChart3,
  Timer,
  ChevronRight,
  Sparkles,
  Eye,
  Crosshair,
  Gem,
  Radio,
  RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabaseOracle, isOracleConfigured } from '@/lib/supabase-oracle'
import { useClientId } from '@/hooks/useClientId'

// ─── Constants ────────────────────────────────────────────────────────────────

const BOT_ARSENAL = [
  {
    id: 'V1',
    name: 'MARCUS VEGA',
    slogan: 'Scalper de alta precisão',
    filter: 'FV1',
    filterLabel: 'Sólido',
    icon: Clock,
    color: 'emerald',
    badge: '🏅 PRO',
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
    name: 'HELENA MIDAS',
    slogan: 'Timing cirúrgico de reversão',
    filter: 'FV2',
    filterLabel: 'Primeira',
    icon: Eye,
    color: 'sky',
    badge: '💎 ELITE',
    gradient: 'from-sky-600 to-blue-700',
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
    id: 'V4',
    name: 'ORION ALMEIDA',
    slogan: 'Leitura algorítmica institucional',
    filter: 'FV4',
    filterLabel: 'Resiliente',
    icon: Crosshair,
    color: 'violet',
    badge: '🧠 QUANT',
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
    filter: 'FV5',
    filterLabel: 'Dominante',
    icon: Sparkles,
    color: 'amber',
    badge: '⚡ FLOW',
    gradient: 'from-amber-600 to-orange-700',
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
    id: 'V7',
    name: 'SOFIA CENTINELA',
    slogan: 'Proteção profissional de capital',
    filter: 'FV3',
    filterLabel: 'Quente',
    icon: Shield,
    color: 'rose',
    badge: '🛡️ RISK',
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeRow {
  strategy_id_lake: string
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
  n_win_1a?: number
  n_win_g1?: number
  n_win_g2?: number
  stake_multiplier: number
}

interface ClientConfig {
  strategy_id: string
  ativo_flag: boolean
}

interface SessionEntry {
  id: string
  time: string
  bot: string
  result: 'WIN' | 'LOSS'
  profit: number
}

// ─── Bot Stats Aggregation ────────────────────────────────────────────────────

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
    return {
      strategies,
      count: 0,
      avgWrG2: 0,
      maxWrG2: 0,
      avgWr1a: 0,
      avgEvG2: 0,
      totalN: 0,
      isElite: false,
      lowSample: true,
    }
  }

  const avgWrG2 = strategies.reduce((s, r) => s + r.wr_g2, 0) / strategies.length
  const maxWrG2 = Math.max(...strategies.map((r) => r.wr_g2))
  const avgWr1a = strategies.reduce((s, r) => s + r.wr_1a, 0) / strategies.length
  const avgEvG2 = strategies.reduce((s, r) => s + r.ev_g2, 0) / strategies.length
  const totalN = strategies.reduce((s, r) => s + (r.n_total || 0), 0)

  return {
    strategies,
    count: strategies.length,
    avgWrG2,
    maxWrG2,
    avgWr1a,
    avgEvG2,
    totalN,
    isElite: maxWrG2 > 0.95,
    lowSample: totalN / Math.max(strategies.length, 1) < 15,
  }
}

// ─── RX Distribution Bar ──────────────────────────────────────────────────────

function RxBar({ strategies }: { strategies: GradeRow[] }) {
  const total1a = strategies.reduce((s, r) => s + (r.n_win_1a || 0), 0)
  const totalG1 = strategies.reduce((s, r) => s + (r.n_win_g1 || 0), 0)
  const totalG2 = strategies.reduce((s, r) => s + (r.n_win_g2 || 0), 0)
  const totalHit = strategies.reduce((s, r) => s + (r.n_hit || 0), 0)
  const max = Math.max(total1a, totalG1, totalG2, totalHit, 1)

  const bars = [
    { label: '1ª', value: total1a, color: 'bg-emerald-400' },
    { label: 'G1', value: totalG1, color: 'bg-teal-400' },
    { label: 'G2', value: totalG2, color: 'bg-cyan-400' },
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

// ─── Timer Component ──────────────────────────────────────────────────────────

function CountdownTimer({ activeBots, grade }: { activeBots: Set<BotId>; grade: GradeRow[] }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Find next operation time from active bots' strategies
  const nextOp = useMemo(() => {
    if (activeBots.size === 0) return null

    const activeFilters = BOT_ARSENAL
      .filter((b) => activeBots.has(b.id))
      .map((b) => b.filter)

    const activeStrategies = grade.filter((s) =>
      activeFilters.some((f) => s.filtros_aprovados.toUpperCase().includes(f))
    )

    if (activeStrategies.length === 0) return null

    const utcH = now.getUTCHours()
    const utcM = now.getUTCMinutes()
    const nowMinutes = utcH * 60 + utcM

    let closest: { hh_mm: string; diff: number } | null = null

    for (const s of activeStrategies) {
      const [hh, mm] = s.hh_mm.split(':').map(Number)
      const stratMinutes = hh * 60 + mm
      let diff = stratMinutes - nowMinutes
      if (diff <= 0) diff += 1440 // next day
      if (!closest || diff < closest.diff) {
        closest = { hh_mm: s.hh_mm, diff }
      }
    }

    return closest
  }, [activeBots, grade, now])

  if (!nextOp) {
    return (
      <div className="text-center">
        <div className="text-3xl font-black text-white/20 font-mono">--:--:--</div>
        <p className="text-[10px] text-white/20 mt-1">Ningún bot activo</p>
      </div>
    )
  }

  const h = Math.floor(nextOp.diff / 60)
  const m = nextOp.diff % 60
  const s = 59 - now.getUTCSeconds()

  return (
    <div className="text-center">
      <div className="text-3xl font-black text-emerald-400 font-mono tracking-wider">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </div>
      <p className="text-[10px] text-white/40 mt-1">
        Próxima operación: <span className="text-emerald-400 font-bold">{nextOp.hh_mm} UTC</span>
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const OracleQuant = () => {
  const { clientId, loading: authLoading } = useClientId()

  // ─── State ────────────────────────────────────────────────────────
  const [grade, setGrade] = useState<GradeRow[]>([])
  const [config, setConfig] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [activeBots, setActiveBots] = useState<Set<BotId>>(() => {
    try {
      const saved = localStorage.getItem('oracle_active_bots')
      return saved ? new Set(JSON.parse(saved) as BotId[]) : new Set<BotId>()
    } catch {
      return new Set<BotId>()
    }
  })
  const [selectedBot, setSelectedBot] = useState<BotId | null>(null)
  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([])
  const [sessionWins, setSessionWins] = useState(0)
  const [sessionLosses, setSessionLosses] = useState(0)
  const [sessionProfit, setSessionProfit] = useState(0)
  const [togglingStrategy, setTogglingStrategy] = useState<string | null>(null)
  const realtimeRef = useRef<ReturnType<typeof supabaseOracle.channel> | null>(null)

  // ─── Persist active bots ──────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('oracle_active_bots', JSON.stringify([...activeBots]))
  }, [activeBots])

  // ─── Fetch Grade from Supabase B ──────────────────────────────────
  const fetchGrade = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabaseOracle
      .schema('hft_lake')
      .from('vw_grade_unificada')
      .select(
        'strategy_id_lake, ativo, hh_mm, direcao, status, wr_g2, wr_1a, ev_g2, n_filtros, filtros_aprovados, n_total, n_hit, n_win_1a, n_win_g1, n_win_g2, stake_multiplier'
      )
      .in('status', ['APROVADO', 'CONDICIONAL'])
      .order('n_filtros', { ascending: false })

    if (error) {
      console.error('[OracleQuant][GRADE]', error)
      toast.error('Error cargando grade: ' + error.message)
    } else {
      setGrade((data as GradeRow[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isOracleConfigured) fetchGrade()
  }, [fetchGrade])

  // ─── Fetch Client Config from Supabase B ──────────────────────────
  useEffect(() => {
    if (!clientId || !isOracleConfigured) return

    supabaseOracle
      .schema('hft_lake')
      .from('client_strategy_config')
      .select('strategy_id, ativo_flag')
      .eq('client_id', clientId)
      .then(({ data, error }) => {
        if (error) {
          console.error('[OracleQuant][CONFIG]', error)
        } else {
          const mapa: Record<string, boolean> = {}
            ; ((data as ClientConfig[]) ?? []).forEach((c) => {
              mapa[c.strategy_id] = c.ativo_flag
            })
          setConfig(mapa)
        }
      })
  }, [clientId])

  // ─── Supabase Realtime ────────────────────────────────────────────
  useEffect(() => {
    if (!isOracleConfigured) return

    const channel = supabaseOracle
      .channel('oracle_grade_realtime')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'hft_lake',
          table: 'hft_raw_metrics',
        },
        () => {
          console.log('[OracleQuant][REALTIME] Grade updated — reloading')
          fetchGrade()
        }
      )
      .subscribe()

    realtimeRef.current = channel

    return () => {
      supabaseOracle.removeChannel(channel)
    }
  }, [fetchGrade])

  // ─── Bot Toggle ───────────────────────────────────────────────────
  const toggleBot = useCallback((botId: BotId) => {
    setActiveBots((prev) => {
      const next = new Set(prev)
      if (next.has(botId)) {
        next.delete(botId)
      } else {
        next.add(botId)
      }
      return next
    })
  }, [])

  // ─── Strategy Toggle (client_strategy_config) ─────────────────────
  const toggleStrategy = useCallback(
    async (strategy: GradeRow) => {
      if (!clientId) {
        toast.error('Inicie sesión para activar estrategias')
        return
      }

      const sid = strategy.strategy_id_lake
      const novoFlag = !(config[sid] ?? false)
      setTogglingStrategy(sid)

      // Optimistic update
      setConfig((prev) => ({ ...prev, [sid]: novoFlag }))

      const { error } = await supabaseOracle
        .schema('hft_lake')
        .from('client_strategy_config')
        .upsert(
          {
            client_id: clientId,
            strategy_id: sid,
            ativo: strategy.ativo,
            hh_mm: strategy.hh_mm,
            direcao: strategy.direcao,
            ativo_flag: novoFlag,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_id,strategy_id' }
        )

      if (error) {
        console.error('[OracleQuant][TOGGLE]', error)
        setConfig((prev) => ({ ...prev, [sid]: !novoFlag }))
        toast.error(`Error: ${error.message}`)
      } else {
        toast.success(
          novoFlag
            ? `${strategy.ativo} ${strategy.hh_mm} ${strategy.direcao} activada`
            : `${strategy.ativo} ${strategy.hh_mm} ${strategy.direcao} desactivada`
        )
      }

      setTogglingStrategy(null)
    },
    [clientId, config]
  )

  // ─── Computed Stats ───────────────────────────────────────────────
  const botStats = useMemo(() => {
    const map: Record<string, BotStats> = {}
    for (const bot of BOT_ARSENAL) {
      map[bot.id] = computeBotStats(grade, bot.filter)
    }
    return map
  }, [grade])

  const globalStats = useMemo(() => {
    const totalStrategies = grade.length
    const totalActive = Object.values(config).filter(Boolean).length
    const allWrG2 = grade.length > 0
      ? grade.reduce((s, r) => s + r.wr_g2, 0) / grade.length
      : 0

    return { totalStrategies, totalActive, allWrG2 }
  }, [grade, config])

  // ─── Selected bot strategies ──────────────────────────────────────
  const selectedBotData = useMemo(() => {
    if (!selectedBot) return null
    const bot = BOT_ARSENAL.find((b) => b.id === selectedBot)
    if (!bot) return null
    return { bot, stats: botStats[bot.id] }
  }, [selectedBot, botStats])

  // ─── Not configured ───────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }
  }

  return (
    <div className="min-h-screen bg-[#020505] relative overflow-hidden p-4 md:p-6">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        className="max-w-[1400px] mx-auto space-y-6 relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >

        {/* ═══════════════ HEADER ═══════════════ */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center border border-emerald-400/20">
                <Database className="text-white" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-0.5 tracking-tight">
                Copy Trading
              </h1>
              <p className="text-xs md:text-sm text-white/40">
                Central de Comando — Arsenal de Bots Quantitativos
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={fetchGrade}
              disabled={loading}
              className="p-2.5 rounded-xl border border-white/10 text-white/30 hover:border-white/20 hover:text-white/50 transition-all disabled:opacity-40"
            >
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Realtime
              </span>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════ TOP STATS BAR ═══════════════ */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Wins */}
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-black/20 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 md:p-5 group hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-colors relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp size={64} className="text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">
                Wins
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-black text-emerald-400 relative z-10">{sessionWins}</div>
          </motion.div>

          {/* Losses */}
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-black/20 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4 md:p-5 group hover:border-red-500/40 hover:bg-red-500/[0.03] transition-colors relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingDown size={64} className="text-red-400" />
            </div>
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <TrendingDown size={16} className="text-red-400" />
              </div>
              <span className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider">
                Losses
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-black text-red-400 relative z-10">{sessionLosses}</div>
          </motion.div>

          {/* P&L */}
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 group hover:border-white/20 transition-colors relative overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Target size={16} className="text-white/50" />
              </div>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                Lucro / Prejuízo
              </span>
            </div>
            <div className={cn(
              'text-2xl md:text-3xl font-black relative z-10',
              sessionProfit > 0 ? 'text-emerald-400' : sessionProfit < 0 ? 'text-red-400' : 'text-white/40'
            )}>
              {sessionProfit >= 0 ? '+' : ''}{sessionProfit.toFixed(2)}
              <span className="text-xs ml-1 opacity-50">USD</span>
            </div>
          </motion.div>

          {/* Assertividade G2 */}
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-black/20 backdrop-blur-xl border border-violet-500/20 rounded-2xl p-4 md:p-5 group hover:border-violet-500/40 hover:bg-violet-500/[0.03] transition-colors relative overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <BarChart3 size={16} className="text-violet-400" />
              </div>
              <span className="text-[10px] font-bold text-violet-400/70 uppercase tracking-wider">
                Assertividade G2
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-black text-violet-400 relative z-10">
              {(globalStats.allWrG2 * 100).toFixed(1)}
              <span className="text-sm ml-0.5 opacity-70">%</span>
            </div>
          </motion.div>
        </motion.div>

        {/* ═══════════════ MAIN GRID: Arsenal + Side Panel ═══════════════ */}
        <div className="grid grid-cols-12 gap-4 md:gap-6">

          {/* ─── Left: Bot Arsenal (5 cards) ─────────────────────────── */}
          <div className="col-span-12 lg:col-span-8 space-y-4">

            {/* Arsenal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Arsenal de Bots
                </h2>
                <span className="text-[10px] text-white/20 font-mono ml-2">
                  {activeBots.size}/{BOT_ARSENAL.length} activos
                </span>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-52 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Bot Cards Grid */}
            {!loading && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {BOT_ARSENAL.map((bot) => {
                  const stats = botStats[bot.id]
                  const isActive = activeBots.has(bot.id)
                  const isSelected = selectedBot === bot.id
                  const BotIcon = bot.icon

                  return (
                    <motion.div
                      variants={itemVariants}
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      layout
                      key={bot.id}
                      className={cn(
                        'relative rounded-2xl border p-5 transition-all duration-300 cursor-pointer group',
                        'backdrop-blur-sm overflow-hidden',
                        isActive
                          ? `${bot.activeBg} ${bot.activeBorder}`
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20',
                        isSelected && 'ring-1 ring-white/20'
                      )}
                      onClick={() => setSelectedBot(isSelected ? null : bot.id)}
                    >
                      {/* Glow effect */}
                      {isActive && (
                        <div className={cn(
                          'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30',
                          bot.glow
                        )} />
                      )}

                      <div className="relative">
                        {/* Top: Icon + Name + Badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center border',
                              bot.iconBg, bot.iconBorder
                            )}>
                              <BotIcon size={20} className={bot.text} />
                            </div>
                            <div>
                              <h3 className="text-xs font-black text-white tracking-wide leading-tight">
                                {bot.name}
                              </h3>
                              <p className="text-[10px] text-white/30 mt-0.5">{bot.slogan}</p>
                            </div>
                          </div>

                          {/* Badge */}
                          {stats?.isElite && (
                            <span className={cn(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded-md',
                              bot.badgeBg, bot.text
                            )}>
                              {bot.badge}
                            </span>
                          )}
                        </div>

                        {/* Low sample warning */}
                        {stats?.lowSample && stats.count > 0 && (
                          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                            <Radio size={10} className="text-yellow-400" />
                            <span className="text-[9px] text-yellow-400 font-bold">
                              Aguardando Amostra
                            </span>
                          </div>
                        )}

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-black/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-[8px] text-white/25 font-bold uppercase block">
                              WR G2
                            </span>
                            <span className={cn(
                              'text-sm font-black',
                              stats?.avgWrG2 >= 0.88 ? bot.text : 'text-white/50'
                            )}>
                              {(stats?.avgWrG2 * 100 || 0).toFixed(1)}%
                            </span>
                          </div>
                          <div className="bg-black/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-[8px] text-white/25 font-bold uppercase block">
                              WR 1ª
                            </span>
                            <span className="text-sm font-black text-white/60">
                              {(stats?.avgWr1a * 100 || 0).toFixed(1)}%
                            </span>
                          </div>
                          <div className="bg-black/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-[8px] text-white/25 font-bold uppercase block">
                              EV G2
                            </span>
                            <span className={cn(
                              'text-sm font-black',
                              (stats?.avgEvG2 || 0) > 0 ? 'text-emerald-400' : 'text-red-400'
                            )}>
                              {(stats?.avgEvG2 || 0) > 0 ? '+' : ''}{(stats?.avgEvG2 || 0).toFixed(3)}
                            </span>
                          </div>
                          <div className="bg-black/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-[8px] text-white/25 font-bold uppercase block">
                              Estrategias
                            </span>
                            <span className="text-sm font-black text-white/60">
                              {stats?.count || 0}
                            </span>
                          </div>
                        </div>

                        {/* RX distribution bar */}
                        {stats && stats.count > 0 && (
                          <div className="mb-3 px-1">
                            <RxBar strategies={stats.strategies} />
                          </div>
                        )}

                        {/* Filter badge + Toggle */}
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            'text-[9px] font-bold px-2 py-0.5 rounded-md border',
                            bot.badgeBg, bot.text, bot.border
                          )}>
                            {bot.filter} — {bot.filterLabel}
                          </span>

                          {/* ON/OFF Toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleBot(bot.id)
                            }}
                            className={cn(
                              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                              'transition-colors duration-200 ease-in-out focus:outline-none',
                              isActive
                                ? `${bot.toggleActive} shadow-[0_0_12px_rgba(16,185,129,0.3)]`
                                : 'bg-white/10'
                            )}
                          >
                            <span
                              className={cn(
                                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg',
                                'transition-transform duration-200 ease-in-out',
                                isActive ? 'translate-x-5' : 'translate-x-0'
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}

            {/* ─── Selected Bot Detail: Strategy List ──────────────── */}
            <AnimatePresence mode="wait">
              {selectedBotData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'rounded-2xl border p-5 backdrop-blur-sm overflow-hidden',
                    selectedBotData.bot.activeBg,
                    selectedBotData.bot.activeBorder,
                  )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <selectedBotData.bot.icon size={16} className={selectedBotData.bot.text} />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {selectedBotData.bot.name} — Horarios
                      </h3>
                    </div>
                    <span className="text-[10px] text-white/20 font-mono">
                      {selectedBotData.stats.count} estrategias
                    </span>
                  </div>

                  {selectedBotData.stats.count === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-white/30">
                        Sin estrategias disponibles para {selectedBotData.bot.filter}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {selectedBotData.stats.strategies.map((s) => {
                        const isOn = config[s.strategy_id_lake] ?? false
                        const isSaving = togglingStrategy === s.strategy_id_lake

                        return (
                          <div
                            key={s.strategy_id_lake}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
                              isOn
                                ? `${selectedBotData.bot.activeBg} ${selectedBotData.bot.activeBorder}`
                                : 'bg-white/[0.02] border-white/10 hover:border-white/15'
                            )}
                          >
                            {/* Asset + Time */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-white">{s.ativo}</span>
                                <span className="text-xs font-mono text-white/50">{s.hh_mm}</span>
                                <span className={cn(
                                  'text-[9px] font-black px-1.5 py-0.5 rounded uppercase',
                                  s.direcao === 'CALL'
                                    ? 'bg-blue-500/15 text-blue-400'
                                    : 'bg-red-500/15 text-red-400'
                                )}>
                                  {s.direcao}
                                </span>
                                {s.wr_g2 > 0.95 && (
                                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-500/15 text-amber-400">
                                    ELITE
                                  </span>
                                )}
                                {s.n_total < 15 && (
                                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                                    Baja N
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px]">
                                <span className={cn(
                                  'font-bold',
                                  s.wr_g2 >= 0.88 ? 'text-emerald-400' : 'text-white/40'
                                )}>
                                  G2: {(s.wr_g2 * 100).toFixed(1)}%
                                </span>
                                <span className="text-white/30">
                                  1ª: {(s.wr_1a * 100).toFixed(1)}%
                                </span>
                                <span className={cn(
                                  s.ev_g2 > 0 ? 'text-emerald-400' : 'text-red-400'
                                )}>
                                  EV: {s.ev_g2 > 0 ? '+' : ''}{s.ev_g2.toFixed(3)}
                                </span>
                                <span className="text-white/20">N: {s.n_total}</span>
                              </div>
                            </div>

                            {/* Toggle */}
                            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => toggleStrategy(s)}
                                disabled={isSaving || !clientId}
                                className={cn(
                                  'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                                  'transition-colors duration-200 ease-in-out focus:outline-none',
                                  'disabled:cursor-not-allowed disabled:opacity-50',
                                  isOn
                                    ? `${selectedBotData.bot.toggleActive} shadow-[0_0_8px_rgba(16,185,129,0.3)]`
                                    : 'bg-white/10'
                                )}
                              >
                                <span
                                  className={cn(
                                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg',
                                    'transition-transform duration-200 ease-in-out',
                                    isOn ? 'translate-x-4' : 'translate-x-0'
                                  )}
                                />
                              </button>
                              <span className={cn(
                                'text-[8px] font-bold uppercase',
                                isSaving ? 'text-white/20' : isOn ? selectedBotData.bot.text : 'text-white/20'
                              )}>
                                {isSaving ? '...' : isOn ? 'ON' : 'OFF'}
                              </span>
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

          {/* ─── Right: Timer + Active Bots + Historico ───────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* Timer Card */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Timer size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Próxima Operación
                  </h3>
                  <p className="text-[10px] text-white/30">Countdown UTC</p>
                </div>
              </div>
              <CountdownTimer activeBots={activeBots} grade={grade} />
            </div>

            {/* Active Bots Summary */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                  <Activity size={16} className="text-violet-400" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Bots Activos
                </h3>
              </div>

              {activeBots.size === 0 ? (
                <p className="text-xs text-white/20 text-center py-4">
                  Ningún bot activado
                </p>
              ) : (
                <div className="space-y-2">
                  {BOT_ARSENAL.filter((b) => activeBots.has(b.id)).map((bot) => {
                    const stats = botStats[bot.id]
                    return (
                      <div
                        key={bot.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border',
                          bot.activeBg, bot.activeBorder,
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <bot.icon size={14} className={bot.text} />
                          <span className="text-xs font-bold text-white/80 truncate max-w-[120px]">
                            {bot.name}
                          </span>
                        </div>
                        <span className={cn('text-xs font-black', bot.text)}>
                          {(stats?.avgWrG2 * 100 || 0).toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Historico */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <BarChart3 size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Histórico
                    </h3>
                    <p className="text-[10px] text-white/30">Resultados da sessão</p>
                  </div>
                </div>
                <span className="text-[10px] text-white/20 font-mono">
                  {sessionHistory.length} ops
                </span>
              </div>

              <div className="h-[280px] overflow-y-auto">
                {sessionHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/5 flex items-center justify-center mb-3 border border-emerald-500/10">
                      <Database size={24} className="text-emerald-400/30" />
                    </div>
                    <p className="text-xs text-white/20 text-center">
                      Los resultados aparecerán aquí cuando los bots operen
                    </p>
                  </div>
                ) : (
                  <div className="p-3 space-y-1.5">
                    {sessionHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all',
                          entry.result === 'WIN'
                            ? 'bg-emerald-500/5 border-emerald-500/15'
                            : 'bg-red-500/5 border-red-500/15'
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                          entry.result === 'WIN'
                            ? 'bg-emerald-500/15'
                            : 'bg-red-500/15'
                        )}>
                          {entry.result === 'WIN' ? (
                            <TrendingUp size={14} className="text-emerald-400" />
                          ) : (
                            <TrendingDown size={14} className="text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white/70 truncate">{entry.bot}</p>
                          <p className="text-[10px] text-white/30 font-mono">{entry.time}</p>
                        </div>
                        <span className={cn(
                          'text-xs font-black',
                          entry.result === 'WIN' ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-white/15 font-mono">
            hft_lake.vw_grade_unificada · {grade.length} estrategias · Supabase B Copy Trading
          </p>
          <p className="text-[10px] text-white/15 font-mono">
            {activeBots.size} bots · {globalStats.totalActive} horarios activos
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default OracleQuant
