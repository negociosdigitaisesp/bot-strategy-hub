/**
 * TradeHistory.tsx — Professional trade history table
 * Shows results and profits of recent operations (real data only)
 */
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TradeEntry {
  id: string
  time: string
  asset: string
  direction: 'CALL' | 'PUT'
  bot: string
  result: 'WIN' | 'LOSS' | 'CANCELLED'
  profit: number
  stake: number
}

interface Props {
  history: TradeEntry[]
}

export function TradeHistoryPanel({ history }: Props) {
  const entries = history
  const totalProfit = entries.reduce((sum, e) => sum + e.profit, 0)
  const wins = entries.filter((e) => e.result === 'WIN').length
  const losses = entries.filter((e) => e.result === 'LOSS').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <BarChart3 size={16} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Histórico de Operaciones
              </h3>
              <p className="text-[10px] text-white/30">
                {entries.length === 0 ? 'Aguardando operações' : `${entries.length} operaciones`}
              </p>
            </div>
          </div>
          {entries.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className={cn(
                  'text-sm font-black',
                  totalProfit > 0 ? 'text-emerald-400' : totalProfit < 0 ? 'text-red-400' : 'text-white/40'
                )}>
                  {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                </span>
                <p className="text-[9px] text-white/20">{wins}W / {losses}L</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <BarChart3 size={32} className="text-white/10 mb-3" />
          <p className="text-sm text-white/25 font-medium">Nenhuma operação ainda</p>
          <p className="text-[10px] text-white/15 mt-1">As operações reais aparecerão aqui</p>
        </div>
      )}

      {/* Table Header */}
      {entries.length > 0 && (
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-white/5 text-[9px] font-bold text-white/20 uppercase tracking-wider">
          <div className="col-span-2">Hora</div>
          <div className="col-span-3">Par</div>
          <div className="col-span-2">Dir.</div>
          <div className="col-span-2 text-center">Result.</div>
          <div className="col-span-3 text-right">Lucro</div>
        </div>
      )}

      {/* Entries */}
      {entries.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto">
          <AnimatePresence>
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-white/[0.03] items-center transition-colors hover:bg-white/[0.02]"
              >
                {/* Time */}
                <div className="col-span-2 flex items-center gap-1">
                  <Clock size={10} className="text-white/20" />
                  <span className="text-[11px] font-mono text-white/50">{entry.time}</span>
                </div>

                {/* Asset */}
                <div className="col-span-3">
                  <span className="text-[11px] font-bold text-white/70 truncate block">{entry.asset}</span>
                </div>

                {/* Direction */}
                <div className="col-span-2">
                  <span className={cn(
                    'inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded',
                    entry.direction === 'CALL'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  )}>
                    {entry.direction === 'CALL' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {entry.direction}
                  </span>
                </div>

                {/* Result */}
                <div className="col-span-2 text-center">
                  <span className={cn(
                    'inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full',
                    entry.result === 'WIN'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : entry.result === 'CANCELLED'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'
                  )}>
                    {entry.result === 'WIN' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {entry.result === 'CANCELLED' ? 'ERR' : entry.result}
                  </span>
                </div>

                {/* Profit */}
                <div className="col-span-3 text-right">
                  <span className={cn(
                    'text-xs font-black',
                    entry.profit > 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {entry.profit >= 0 ? '+' : ''}${Math.abs(entry.profit).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

export type { TradeEntry }
