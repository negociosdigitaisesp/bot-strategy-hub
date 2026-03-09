/**
 * OpenPositions.tsx — Live trade monitor
 * Mostra contratos abertos em tempo real com countdown e barra de progresso
 */
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface OpenPosition {
  id: string
  asset: string
  direction: 'CALL' | 'PUT'
  stake: number
  gale: number
  openTime: number
  durationSecs: number
  bot?: string
}

// Mapeamento de símbolos Deriv → nomes legíveis
const SYMBOL_NAMES: Record<string, string> = {
  R_10: 'Volatility 10 Index',
  R_25: 'Volatility 25 Index',
  R_50: 'Volatility 50 Index',
  R_75: 'Volatility 75 Index',
  R_100: 'Volatility 100 Index',
  '1HZ10V': 'Vol 10 (1s) Index',
  '1HZ25V': 'Vol 25 (1s) Index',
  '1HZ50V': 'Vol 50 (1s) Index',
  '1HZ75V': 'Vol 75 (1s) Index',
  '1HZ100V': 'Vol 100 (1s) Index',
  RDBULL: 'Bull Market Index',
  RDBEAR: 'Bear Market Index',
  frxEURUSD: 'EUR/USD',
  frxGBPUSD: 'GBP/USD',
  frxUSDJPY: 'USD/JPY',
  frxAUDUSD: 'AUD/USD',
  frxUSDCAD: 'USD/CAD',
  frxEURGBP: 'EUR/GBP',
}

function getSymbolShort(symbol: string): string {
  const m = symbol.match(/R_(\d+)/)
  if (m) return m[1]
  const m2 = symbol.match(/1HZ(\d+)V/)
  if (m2) return m2[1]
  return symbol.slice(0, 3)
}

function getAssetName(symbol: string): string {
  return SYMBOL_NAMES[symbol] || symbol
}

// ─── Position Card ────────────────────────────────────────────────────────────

const PositionCard = React.forwardRef<HTMLDivElement, { pos: OpenPosition; onExpire: (id: string) => void }>(function PositionCard({ pos, onExpire }, ref) {
  const [now, setNow] = useState(Date.now())
  const expiredRef = React.useRef(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const elapsed = (now - pos.openTime) / 1000
  const remaining = Math.max(0, pos.durationSecs - elapsed)
  const progress = Math.min(100, (elapsed / pos.durationSecs) * 100)

  // Auto-remove card when timer expires (regardless of executeDerivContract state)
  useEffect(() => {
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true
      setTimeout(() => onExpire(pos.id), 500) // 500ms grace for exit animation
    }
  }, [remaining, onExpire, pos.id])

  const totalSecs = Math.floor(remaining)
  const hh = Math.floor(totalSecs / 3600)
  const mm = Math.floor((totalSecs % 3600) / 60)
  const ss = totalSecs % 60
  const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`

  const isRise = pos.direction === 'CALL'
  const isExpiring = remaining <= 10

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.25 }}
      className="relative bg-[#0a0f0e] border border-white/10 rounded-xl overflow-hidden"
    >
      {/* Top row */}
      <div className="flex items-center gap-3 p-3 pb-2">
        {/* Symbol badge */}
        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center">
          <span className="text-[8px] font-bold text-white/30 uppercase leading-none">VOL</span>
          <span className="text-base font-black text-white/80 leading-tight">{getSymbolShort(pos.asset)}</span>
        </div>

        {/* Asset + direction */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white/80 truncate leading-tight">{getAssetName(pos.asset)}</p>
          <div className={cn(
            'inline-flex items-center gap-1 mt-0.5 text-[11px] font-black',
            isRise ? 'text-emerald-400' : 'text-red-400'
          )}>
            {isRise ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isRise ? 'Rise' : 'Fall'}
          </div>
        </div>

        {/* Gale badge */}
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/10 flex-shrink-0">
          G{pos.gale}
        </span>
      </div>

      {/* Timer */}
      <div className="px-3 pb-1">
        <motion.span
          className={cn(
            'text-2xl font-black font-mono tracking-widest tabular-nums',
            isExpiring ? 'text-red-400' : 'text-white/90'
          )}
          animate={isExpiring ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
          transition={{ duration: 0.8, repeat: isExpiring ? Infinity : 0 }}
        >
          {timeStr}
        </motion.span>
      </div>

      {/* Progress bar */}
      <div className="mx-3 mb-3 mt-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            isExpiring ? 'bg-red-400' : 'bg-amber-400'
          )}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.25, ease: 'linear' }}
        />
      </div>

      {/* Stake info */}
      <div className="absolute bottom-2 right-3">
        <span className="text-[9px] text-white/20 font-mono">${pos.stake.toFixed(2)}</span>
      </div>
    </motion.div>
  )
})

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  positions: OpenPosition[]
  onExpire?: (id: string) => void
}

export function OpenPositionsPanel({ positions, onExpire }: Props) {
  return (
    <AnimatePresence mode="popLayout">
      {positions.length > 0 && (
        <motion.div
          key="open-positions-panel"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="bg-white/[0.02] border border-amber-500/20 rounded-2xl p-4 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Operações Abertas</h3>
              <span className="ml-auto text-[10px] text-amber-400/50 font-mono">
                {positions.length} ativa{positions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {positions.map(pos => (
                  <PositionCard key={pos.id} pos={pos} onExpire={onExpire ?? (() => {})} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
