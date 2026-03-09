/**
 * StrategySelector.tsx
 * @INTEGRATOR_EXPERT: Dual Supabase — grade do Banco B, identidade do Banco A
 * @SHIELD_AGENT: clientId validado (UUID v4) antes de qualquer escrita
 */

import { useEffect, useState, useCallback } from 'react'
import {
  Database,
  Clock,
  TrendingUp,
  Zap,
  CheckCircle2,
  AlertCircle,
  Search,
  BarChart3,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabaseOracle, isOracleConfigured } from '@/lib/supabase-oracle'
import { useClientId } from '@/hooks/useClientId'

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  stake_multiplier: number
}

interface ClientConfig {
  strategy_id: string
  ativo_flag: boolean
}

type ConfigMap = Record<string, boolean>
type FilterType = 'ALL' | 'APROVADO' | 'CONDICIONAL'

/** Persona ativa — controla quais filtros FV são exibidos */
export type ActiveBot = 'ORACLE_QUANTUM' | 'BUG_DERIV' | 'EFEITO_MIDAS' | null

/**
 * @SHIELD_AGENT: Mapeamento de persona → filtros FV permitidos.
 * ORACLE_QUANTUM: FV1 (Sólido) e FV4 (Resiliente) — máxima assertividade
 * BUG_DERIV:      FV2 (Primeira) — MHI/Quebra de cor
 * EFEITO_MIDAS:   Crash/Boom — não vem do hft_lake (grade ficará vazia)
 */
const PERSONA_FILTROS: Record<NonNullable<ActiveBot>, string[] | 'CRASH_BOOM'> = {
  ORACLE_QUANTUM: ['FV1', 'FV4'],
  BUG_DERIV:      ['FV2'],
  EFEITO_MIDAS:   'CRASH_BOOM',
}

function filterGradeByPersona(grade: GradeRow[], activeBot: ActiveBot): GradeRow[] {
  if (!activeBot) return grade // sem persona: mostra tudo

  const regra = PERSONA_FILTROS[activeBot]

  if (regra === 'CRASH_BOOM') {
    // EFEITO_MIDAS: filtra ativos Crash/Boom (não presentes no hft_lake)
    return grade.filter((s) => /^(CRASH|BOOM)/i.test(s.ativo))
  }

  // ORACLE_QUANTUM / BUG_DERIV: filtra pela presença dos filtros FV em filtros_aprovados
  return grade.filter((s) =>
    regra.some((fv) => s.filtros_aprovados.toUpperCase().includes(fv))
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
          : 'bg-white/10'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg',
          'transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isAprovado = status === 'APROVADO'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        isAprovado
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
          : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
      )}
    >
      {isAprovado ? (
        <CheckCircle2 size={9} />
      ) : (
        <AlertCircle size={9} />
      )}
      {status}
    </span>
  )
}

function DirecaoBadge({ direcao }: { direcao: 'CALL' | 'PUT' }) {
  return (
    <span
      className={cn(
        'inline-flex rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
        direcao === 'CALL'
          ? 'bg-blue-500/15 text-blue-400'
          : 'bg-red-500/15 text-red-400'
      )}
    >
      {direcao}
    </span>
  )
}

function FiltrosDots({ n, aprovados }: { n: number; aprovados: string }) {
  return (
    <div className="flex items-center gap-1" title={aprovados}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i <= n ? 'bg-emerald-400' : 'bg-white/10'
          )}
        />
      ))}
      <span className="ml-1 text-[10px] text-white/30">{aprovados}</span>
    </div>
  )
}

function StatPill({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'green' | 'red' | 'neutral'
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-black/30 px-3 py-1.5">
      <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">
        {label}
      </span>
      <span
        className={cn(
          'text-xs font-black',
          highlight === 'green' && 'text-emerald-400',
          highlight === 'red' && 'text-red-400',
          (!highlight || highlight === 'neutral') && 'text-white/80'
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────

interface StrategySelectorProps {
  /** Persona ativa: filtra grade por FV1/FV4, FV2 ou Crash/Boom */
  activeBot?: ActiveBot
  /** Callback quando config muda — útil para sync com useHftExecutionBridge */
  onConfigChange?: (activeStrategies: Set<string>) => void
}

export function StrategySelector({ activeBot = null, onConfigChange }: StrategySelectorProps = {}) {
  const { clientId, loading: authLoading, error: authError } = useClientId()

  const [grade, setGrade] = useState<GradeRow[]>([])
  const [config, setConfig] = useState<ConfigMap>({})
  const [gradeLoading, setGradeLoading] = useState(true)
  const [configLoading, setConfigLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [gradeError, setGradeError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterType>('ALL')
  const [refreshing, setRefreshing] = useState(false)

  // @DEBUG_SENTINEL: Guard se Oracle B não está configurado
  if (!isOracleConfigured) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <Database size={28} className="text-red-400" />
        </div>
        <p className="text-sm font-bold text-red-400">Supabase B não configurado</p>
        <p className="text-xs text-white/30 mt-1">
          Adicione VITE_ORACLE_SUPABASE_URL e VITE_ORACLE_SUPABASE_ANON_KEY ao .env.local
        </p>
      </div>
    )
  }

  // ─── Fetch da grade (Banco B, independente de auth) ──────────────────────────

  const fetchGrade = useCallback(async () => {
    setGradeLoading(true)
    setGradeError(null)

    const { data, error } = await supabaseOracle
      .schema('hft_lake')
      .from('vw_grade_unificada')
      .select(
        'strategy_id_lake, ativo, hh_mm, direcao, status, wr_g2, wr_1a, ev_g2, n_filtros, filtros_aprovados, n_total, n_hit, stake_multiplier'
      )
      .in('status', ['APROVADO', 'CONDICIONAL'])
      .order('n_filtros', { ascending: false })

    if (error) {
      console.error('[StrategySelector][GRADE]', error)
      setGradeError(error.message)
      toast.error('Erro ao carregar grade Oracle: ' + error.message)
    } else {
      setGrade((data as GradeRow[]) ?? [])
    }
    setGradeLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchGrade()
  }, [fetchGrade])

  // ─── Fetch da config do cliente (Banco B, usando clientId do Banco A) ────────

  useEffect(() => {
    if (!clientId) return
    setConfigLoading(true)

    supabaseOracle
      .schema('hft_lake')
      .from('client_strategy_config')
      .select('strategy_id, ativo_flag')
      .eq('client_id', clientId)
      .then(({ data, error }) => {
        if (error) {
          console.error('[StrategySelector][CONFIG]', {
            msg: error.message,
            client_prefix: clientId.substring(0, 8),
          })
        } else {
          const mapa: ConfigMap = {}
          ;((data as ClientConfig[]) ?? []).forEach((c) => {
            mapa[c.strategy_id] = c.ativo_flag
          })
          setConfig(mapa)
        }
        setConfigLoading(false)
      })
  }, [clientId])

  // ─── Toggle ON/OFF — upsert no Banco B com clientId do Banco A ───────────────

  const toggle = useCallback(
    async (strategy: GradeRow) => {
      // @SHIELD_AGENT: clientId obrigatório — nunca escreve sem identidade validada
      if (!clientId) {
        toast.error('Faça login para ativar estratégias')
        return
      }

      const sid = strategy.strategy_id_lake
      const novoFlag = !(config[sid] ?? false)
      setSaving(sid)

      // Atualização otimista
      setConfig((prev) => ({ ...prev, [sid]: novoFlag }))

      const { error } = await supabaseOracle
        .schema('hft_lake')
        .from('client_strategy_config')
        .upsert(
          {
            client_id: clientId,      // @SHIELD_AGENT: UID do Banco A — única fonte
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
        // @DEBUG_SENTINEL: reverte otimismo + toast de erro
        console.error('[StrategySelector][TOGGLE]', {
          sid,
          msg: error.message,
          code: error.code,
          client_prefix: clientId.substring(0, 8),
        })
        setConfig((prev) => ({ ...prev, [sid]: !novoFlag }))
        toast.error(`Erro ao salvar "${sid}": ${error.message}`)
      } else {
        toast.success(
          novoFlag
            ? `Estratégia ${strategy.ativo} ${strategy.hh_mm} ${strategy.direcao} ativada`
            : `Estratégia ${strategy.ativo} ${strategy.hh_mm} ${strategy.direcao} desativada`
        )
      }

      setSaving(null)
    },
    [clientId, config]
  )

  // ─── Filtros / busca ──────────────────────────────────────────────────────────

  // @SHIELD_AGENT: Aplica filtro de persona ANTES da busca por texto
  // ORACLE_QUANTUM → FV1 + FV4 | BUG_DERIV → FV2 | EFEITO_MIDAS → Crash/Boom
  const gradeByPersona = filterGradeByPersona(grade, activeBot)

  const gradeFiltrada = gradeByPersona.filter((s) => {
    const matchSearch =
      search === '' ||
      s.ativo.toLowerCase().includes(search.toLowerCase()) ||
      s.hh_mm.includes(search) ||
      s.direcao.toLowerCase().includes(search.toLowerCase()) ||
      s.strategy_id_lake.toLowerCase().includes(search.toLowerCase())

    const matchStatus =
      filterStatus === 'ALL' || s.status === filterStatus

    return matchSearch && matchStatus
  })

  const ativas = Object.values(config).filter(Boolean).length
  const isLoading = authLoading || gradeLoading

  // Notifica o pai com o Set de strategies ativas sempre que config muda
  // Usado pelo useHftExecutionBridge para filtrar execução
  useEffect(() => {
    if (!onConfigChange) return
    const activeSet = new Set(
      Object.entries(config)
        .filter(([, v]) => v)
        .map(([k]) => k)
    )
    onConfigChange(activeSet)
  }, [config, onConfigChange])

  // ─── Render ───────────────────────────────────────────────────────────────────

  // Label visual da persona ativa
  const personaLabel: Record<NonNullable<ActiveBot>, { label: string; color: string }> = {
    ORACLE_QUANTUM: { label: 'Oracle Quantum — FV1 + FV4', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    BUG_DERIV:      { label: 'Bug Deriv — FV2 (MHI)', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    EFEITO_MIDAS:   { label: 'Efeito Midas — Crash/Boom', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  }

  return (
    <div className="space-y-6">
      {/* Badge de persona ativa */}
      {activeBot && (
        <div className={cn(
          'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider border',
          personaLabel[activeBot].color
        )}>
          <Filter size={12} />
          {personaLabel[activeBot].label}
        </div>
      )}

      {/* Header estatístico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-5 group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">
              Ativas
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {ativas}
            <span className="text-sm ml-1 opacity-50">/ {grade.length}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl p-5 group hover:border-blue-500/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <TrendingUp size={16} className="text-blue-400" />
            </div>
            <span className="text-[10px] font-bold text-blue-400/70 uppercase tracking-wider">
              Aprovadas
            </span>
          </div>
          <div className="text-2xl font-black text-blue-400">
            {grade.filter((s) => s.status === 'APROVADO').length}
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/20 rounded-2xl p-5 group hover:border-yellow-500/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
              <AlertCircle size={16} className="text-yellow-400" />
            </div>
            <span className="text-[10px] font-bold text-yellow-400/70 uppercase tracking-wider">
              Condicionais
            </span>
          </div>
          <div className="text-2xl font-black text-yellow-400">
            {grade.filter((s) => s.status === 'CONDICIONAL').length}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 group hover:border-white/20 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
              <BarChart3 size={16} className="text-white/50" />
            </div>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
              Total grade
            </span>
          </div>
          <div className="text-2xl font-black text-white/60">{grade.length}</div>
        </div>
      </div>

      {/* Barra de busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar ativo, horário, direção..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
          />
        </div>

        <div className="flex gap-2">
          {(['ALL', 'APROVADO', 'CONDICIONAL'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all',
                filterStatus === f
                  ? f === 'APROVADO'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : f === 'CONDICIONAL'
                    ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                    : 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
              )}
            >
              {f === 'ALL' ? 'Todas' : f}
            </button>
          ))}

          <button
            onClick={() => {
              setRefreshing(true)
              fetchGrade()
            }}
            disabled={refreshing || gradeLoading}
            title="Atualizar grade"
            className="px-3 py-2.5 rounded-xl border border-white/10 text-white/30 hover:border-white/20 hover:text-white/50 transition-all disabled:opacity-40"
          >
            <RefreshCw
              size={14}
              className={cn(refreshing && 'animate-spin')}
            />
          </button>
        </div>
      </div>

      {/* Auth / loading states */}
      {authError && (
        <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">Erro de autenticação: {authError}</p>
        </div>
      )}

      {!authLoading && !clientId && !authError && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
          <AlertCircle size={16} className="text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-300">
            Faça login para salvar suas preferências de estratégia.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Grade error */}
      {gradeError && !isLoading && (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
          <Database size={32} className="text-red-400/50 mb-3" />
          <p className="text-sm text-red-400 font-medium">Erro ao carregar grade</p>
          <p className="text-xs text-white/30 mt-1">{gradeError}</p>
          <button
            onClick={fetchGrade}
            className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white/70 transition-all"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Lista de estratégias */}
      {!isLoading && !gradeError && (
        <div className="space-y-3">
          {gradeFiltrada.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
              <Filter size={28} className="text-white/20 mb-3" />
              <p className="text-sm text-white/40">
                {grade.length === 0
                  ? 'Nenhuma estratégia disponível no momento.'
                  : 'Nenhuma estratégia encontrada com esse filtro.'}
              </p>
            </div>
          ) : (
            gradeFiltrada.map((s) => {
              const ativa = config[s.strategy_id_lake] ?? false
              const isSaving = saving === s.strategy_id_lake

              return (
                <div
                  key={s.strategy_id_lake}
                  className={cn(
                    'group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200',
                    ativa
                      ? 'bg-emerald-500/[0.04] border-emerald-500/20 hover:border-emerald-500/30'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  )}
                >
                  {/* Coluna esquerda: indicador de filtros */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-10 flex-shrink-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border',
                        s.n_filtros >= 4
                          ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                          : 'bg-yellow-500/10 border-yellow-500/15 text-yellow-500'
                      )}
                    >
                      {s.n_filtros}/5
                    </div>
                  </div>

                  {/* Corpo */}
                  <div className="flex-1 min-w-0">
                    {/* Linha 1: badges + ID */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusBadge status={s.status} />
                      <DirecaoBadge direcao={s.direcao} />
                      <span className="text-[10px] text-white/20 font-mono hidden sm:inline">
                        {s.strategy_id_lake}
                      </span>
                    </div>

                    {/* Linha 2: info principal */}
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Zap size={12} className="text-white/30" />
                        <span className="text-sm font-bold text-white">
                          {s.ativo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-white/30" />
                        <span className="text-sm font-mono text-white/80">
                          {s.hh_mm}
                        </span>
                      </div>
                    </div>

                    {/* Linha 3: métricas glass-box */}
                    <div className="flex flex-wrap gap-2">
                      <StatPill
                        label="WR G2"
                        value={`${(s.wr_g2 * 100).toFixed(1)}%`}
                        highlight={s.wr_g2 >= 0.92 ? 'green' : 'neutral'}
                      />
                      <StatPill
                        label="WR 1a"
                        value={`${(s.wr_1a * 100).toFixed(1)}%`}
                        highlight={s.wr_1a >= 0.55 ? 'green' : 'neutral'}
                      />
                      <StatPill
                        label="EV"
                        value={`${s.ev_g2 > 0 ? '+' : ''}${s.ev_g2.toFixed(3)}`}
                        highlight={s.ev_g2 > 0 ? 'green' : 'red'}
                      />
                      <StatPill
                        label="N"
                        value={String(s.n_total)}
                        highlight="neutral"
                      />
                      <StatPill
                        label="Hits"
                        value={String(s.n_hit)}
                        highlight={s.n_hit > 2 ? 'red' : 'neutral'}
                      />
                      <StatPill
                        label="Stake"
                        value={`${s.stake_multiplier}x`}
                        highlight={s.stake_multiplier >= 1 ? 'green' : 'neutral'}
                      />
                    </div>

                    {/* Linha 4: filtros aprovados */}
                    <div className="mt-2">
                      <FiltrosDots
                        n={s.n_filtros}
                        aprovados={s.filtros_aprovados}
                      />
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <ToggleSwitch
                      checked={ativa}
                      onChange={() => toggle(s)}
                      disabled={isSaving || configLoading || !clientId}
                    />
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-wider',
                        isSaving
                          ? 'text-white/20'
                          : ativa
                          ? 'text-emerald-400'
                          : 'text-white/20'
                      )}
                    >
                      {isSaving ? '...' : ativa ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Rodapé info */}
      {!isLoading && !gradeError && gradeFiltrada.length > 0 && (
        <p className="text-center text-[10px] text-white/20 font-mono">
          {gradeFiltrada.length} estratégias exibidas — {ativas} ativa
          {ativas !== 1 ? 's' : ''} — Banco B: Copy Trading
        </p>
      )}
    </div>
  )
}
