/**
 * RiskManagement.tsx — Stop Win, Stop Loss, Valor Operação + Salvar
 * Persiste no localStorage com chave oracle_risk_config
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, DollarSign, TrendingUp, TrendingDown, Save, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface RiskConfig {
  stopWin: number
  stopLoss: number
  stakeValue: number
}

const STORAGE_KEY = 'oracle_risk_config'

const defaultConfig: RiskConfig = {
  stopWin: 50,
  stopLoss: 25,
  stakeValue: 1,
}

function loadConfig(): RiskConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) }
  } catch {}
  return defaultConfig
}

export function RiskManagementPanel() {
  const [config, setConfig] = useState<RiskConfig>(loadConfig)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  const update = (field: keyof RiskConfig, value: string) => {
    const num = parseFloat(value) || 0
    setConfig((prev) => ({ ...prev, [field]: num }))
    setDirty(true)
    setSaved(false)
  }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setSaved(true)
    setDirty(false)
    toast.success('Configuración guardada correctamente')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <Shield size={16} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Gestión de Riesgo
          </h3>
          <p className="text-[10px] text-white/30">Protección inteligente</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {/* Stop Win */}
        <div className="group">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-1.5">
            <TrendingUp size={10} />
            Stop Win (USD)
          </label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="number"
              value={config.stopWin}
              onChange={(e) => update('stopWin', e.target.value)}
              min={0}
              step={5}
              className="w-full bg-black/30 border border-emerald-500/10 rounded-xl px-3 py-2.5 pl-8 text-sm font-bold text-emerald-400 
                         focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all
                         placeholder:text-white/10"
              placeholder="50.00"
            />
          </div>
        </div>

        {/* Stop Loss */}
        <div className="group">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-red-400/70 uppercase tracking-wider mb-1.5">
            <TrendingDown size={10} />
            Stop Loss (USD)
          </label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="number"
              value={config.stopLoss}
              onChange={(e) => update('stopLoss', e.target.value)}
              min={0}
              step={5}
              className="w-full bg-black/30 border border-red-500/10 rounded-xl px-3 py-2.5 pl-8 text-sm font-bold text-red-400 
                         focus:outline-none focus:border-red-500/30 focus:ring-1 focus:ring-red-500/20 transition-all
                         placeholder:text-white/10"
              placeholder="25.00"
            />
          </div>
        </div>

        {/* Valor Operação */}
        <div className="group">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400/70 uppercase tracking-wider mb-1.5">
            <DollarSign size={10} />
            Valor de Operación (USD)
          </label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="number"
              value={config.stakeValue}
              onChange={(e) => update('stakeValue', e.target.value)}
              min={0.5}
              step={0.5}
              className="w-full bg-black/30 border border-cyan-500/10 rounded-xl px-3 py-2.5 pl-8 text-sm font-bold text-cyan-400 
                         focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/20 transition-all
                         placeholder:text-white/10"
              placeholder="1.00"
            />
          </div>
        </div>
      </div>

      {/* Martingale info */}
      <div className="mt-3 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
        <p className="text-[9px] text-violet-400/60 font-medium">
          ⚡ Martingale predefinido: 1.0 → 2.2 → 5.0 (G2)
        </p>
      </div>

      {/* Save Button */}
      <motion.button
        onClick={handleSave}
        whileTap={{ scale: 0.97 }}
        className={cn(
          'mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all',
          saved
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
            : dirty
              ? 'bg-emerald-500 border border-emerald-400/50 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/25'
              : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
        )}
      >
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
              <Check size={14} /> Guardado
            </motion.div>
          ) : (
            <motion.div key="save" initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex items-center gap-2">
              <Save size={14} /> Guardar Configuración
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  )
}
