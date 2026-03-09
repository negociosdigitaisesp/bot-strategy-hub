/**
 * useHftExecutionBridge.ts
 * @INTEGRATOR_EXPERT: Ponte entre Supabase Realtime (sinal) e Deriv API (execução)
 * @SHIELD_AGENT: Filtra sinais apenas do client_id autenticado
 * @DEBUG_SENTINEL: Fila anti-timeout com 300ms entre execuções
 *
 * Fluxo:
 *   VPS Sniper → INSERT signals (Supabase A) → Realtime → este hook
 *   → verifica se strategy está ativa para o cliente → enfileira
 *   → executa via HftDerivService com 300ms de gap entre ordens
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { useDeriv } from '@/contexts/DerivContext'
import { useClientId } from '@/hooks/useClientId'
import { executeDerivOrder, sanitizeAtivo } from '@/services/HftDerivService'

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Shape do registro que chega do Supabase Realtime (tabela signals do Supabase A) */
export interface HftSignal {
  id: number
  client_id: string
  strategy_id: string    // strategy_id_lake, ex: "T1430_R100_CALL"
  ativo: string          // "R_100"
  direcao: 'CALL' | 'PUT'
  hh_mm: string
  status: 'PRE_SIGNAL' | 'CONFIRMED'
  variacao: string | null // "FV1, FV4" — VPS deve preencher (se null, aceitamos mesmo assim)
  stake_final: number
  created_at: string
}

export interface BridgeStats {
  signalsReceived: number
  signalsExecuted: number
  signalsIgnored: number
  lastSignalAt: string | null
  queueLength: number
  isExecuting: boolean
}

/** Persona ativa do cliente — controla filtro de sinais por variacao */
export type ActivePersona = 'ORACLE_QUANTUM' | 'BUG_DERIV' | 'EFEITO_MIDAS' | null

/** Delay entre execuções na fila (anti-timeout / anti-flood) */
const QUEUE_DELAY_MS = 300

/** Filtros de variacao aceitos por persona */
const PERSONA_FILTROS: Record<NonNullable<ActivePersona>, string[]> = {
  ORACLE_QUANTUM: ['FV1', 'FV4'],
  BUG_DERIV:      ['FV2'],
  EFEITO_MIDAS:   [], // Crash/Boom — não vem do hft_lake
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param activeStrategies  Set de strategy_ids que o cliente ativou (do client_strategy_config)
 * @param activePersona     Persona ativa na UI — filtra por variacao/filtro
 * @param stopLoss          Limite de perda diária (USD) — para execução silenciosa
 * @param takeProfit        Meta diária (USD) — para execução silenciosa
 */
export function useHftExecutionBridge(
  activeStrategies: Set<string>,
  activePersona: ActivePersona = null,
  stopLoss = 100,
  takeProfit = 100
) {
  const { api, isConnected } = useDeriv()
  const { clientId } = useClientId()

  // Fila de sinais confirmados aguardando execução
  const queueRef = useRef<HftSignal[]>([])
  const isProcessingRef = useRef(false)
  const dailyProfitRef = useRef(0)

  const [stats, setStats] = useState<BridgeStats>({
    signalsReceived: 0,
    signalsExecuted: 0,
    signalsIgnored: 0,
    lastSignalAt: null,
    queueLength: 0,
    isExecuting: false,
  })

  // ── Atualiza stats de forma segura ─────────────────────────────────────────
  const updateStats = useCallback((patch: Partial<BridgeStats>) => {
    setStats((prev) => ({ ...prev, ...patch }))
  }, [])

  // ── Verificação de risco diário ────────────────────────────────────────────
  const isRiskLimitReached = useCallback((): boolean => {
    const profit = dailyProfitRef.current
    if (profit >= takeProfit) {
      console.warn('[Bridge][RISK] Take profit diário atingido:', profit)
      return true
    }
    if (profit <= -Math.abs(stopLoss)) {
      console.warn('[Bridge][RISK] Stop loss diário atingido:', profit)
      return true
    }
    return false
  }, [stopLoss, takeProfit])

  // ── Filtro de sinal por persona ────────────────────────────────────────────
  /**
   * @SHIELD_AGENT: Verifica se o sinal pertence à persona ativa.
   * Se variacao=null, aceita o sinal mas loga um aviso (@DEBUG_SENTINEL).
   * Isso evita bloquear execução por bug do VPS enquanto o fix não sobe.
   */
  const isSignalAllowedByPersona = useCallback((signal: HftSignal): boolean => {
    if (!activePersona) return true // sem filtro de persona — aceita tudo

    const allowedFiltros = PERSONA_FILTROS[activePersona]
    if (allowedFiltros.length === 0) {
      // EFEITO_MIDAS: filtra por ativo CRASH/BOOM
      const isDerivCrashBoom = /^(CRASH|BOOM)/i.test(signal.ativo)
      if (!isDerivCrashBoom) {
        console.debug('[Bridge][PERSONA] EFEITO_MIDAS: ativo não é CRASH/BOOM, ignorado:', signal.ativo)
        return false
      }
      return true
    }

    if (!signal.variacao) {
      // @DEBUG_SENTINEL: variacao=null — bug do VPS. Loga mas não bloqueia.
      console.warn(
        '[Bridge][DEBUG_SENTINEL] variacao=null no sinal — VPS não enviou filtros.',
        'strategy_id:', signal.strategy_id,
        '| Fix: incluir filtros_aprovados no payload do Sniper.'
      )
      // Aceita mesmo assim para não parar as operações
      return true
    }

    // Verifica se algum filtro permitido está na variacao do sinal
    const variacaoUpper = signal.variacao.toUpperCase()
    const allowed = allowedFiltros.some((f) => variacaoUpper.includes(f))

    if (!allowed) {
      console.debug(
        '[Bridge][PERSONA] Sinal ignorado — variacao não corresponde à persona:',
        { variacao: signal.variacao, persona: activePersona, allowed: allowedFiltros }
      )
    }
    return allowed
  }, [activePersona])

  // ── Processador da fila ────────────────────────────────────────────────────
  /**
   * @DEBUG_SENTINEL: Fila FIFO com await 300ms entre cada ordem.
   * Garante que sinais simultâneos não causem timeout na Deriv.
   */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return
    if (queueRef.current.length === 0) return

    isProcessingRef.current = true
    updateStats({ isExecuting: true })

    while (queueRef.current.length > 0) {
      const signal = queueRef.current.shift()!
      updateStats({ queueLength: queueRef.current.length })

      // Verifica risco antes de cada execução individual
      if (isRiskLimitReached()) {
        toast.warning('Limite diário atingido — sinal ignorado')
        updateStats({ signalsIgnored: (await getStats()).signalsIgnored + 1 })
        continue
      }

      if (!api) {
        console.error('[Bridge] API Deriv não disponível durante execução da fila')
        break
      }

      console.log('[Bridge] Executando sinal da fila:', {
        id: signal.id,
        strategy_id: signal.strategy_id,
        ativo: signal.ativo,
        direcao: signal.direcao,
        stake: signal.stake_final,
      })

      try {
        const result = await executeDerivOrder(api, {
          ativo: signal.ativo,
          direcao: signal.direcao,
          stake: signal.stake_final,
        })

        dailyProfitRef.current += result.profit

        if (result.success) {
          const lucro = result.profit > 0 ? `+$${result.profit.toFixed(2)}` : `-$${Math.abs(result.profit).toFixed(2)}`
          const isWin = result.profit > 0
          toast[isWin ? 'success' : 'error'](
            `${signal.ativo} ${signal.direcao} ${signal.hh_mm} — ${lucro}`
          )
          updateStats((prev) => ({ signalsExecuted: (prev as any).signalsExecuted + 1 }))
        } else {
          console.error('[Bridge] Falha na execução:', result.error)
          toast.error(`Erro na execução: ${result.error}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error('[Bridge] Exceção na fila:', msg, signal)
        toast.error(`Exceção: ${msg}`)
      }

      // @DEBUG_SENTINEL: Anti-timeout — 300ms entre ordens na mesma fila
      if (queueRef.current.length > 0) {
        await new Promise<void>((res) => setTimeout(res, QUEUE_DELAY_MS))
      }
    }

    isProcessingRef.current = false
    updateStats({ isExecuting: false, queueLength: 0 })
  }, [api, isRiskLimitReached, updateStats])

  // Hack: getStats via closure para uso assíncrono
  const statsRef = useRef<BridgeStats>({
    signalsReceived: 0, signalsExecuted: 0, signalsIgnored: 0,
    lastSignalAt: null, queueLength: 0, isExecuting: false,
  })
  const getStats = useCallback(() => Promise.resolve(statsRef.current), [])
  useEffect(() => { statsRef.current = stats }, [stats])

  // ── Handler de novo sinal ──────────────────────────────────────────────────

  const handleSignal = useCallback((signal: HftSignal) => {
    statsRef.current.signalsReceived++
    updateStats({
      signalsReceived: statsRef.current.signalsReceived,
      lastSignalAt: new Date().toISOString(),
    })

    // @SHIELD_AGENT: client_id obrigatório — nunca processa sinal de outro cliente
    if (signal.client_id !== clientId) {
      console.debug('[Bridge][SHIELD] Sinal de outro client_id ignorado')
      return
    }

    if (signal.status === 'PRE_SIGNAL') {
      // Aviso antecipado — apenas exibe notificação, não executa
      toast.info(`[PRE] ${signal.ativo} ${signal.direcao} ${signal.hh_mm} — preparando...`, {
        duration: 3000,
      })
      return
    }

    if (signal.status !== 'CONFIRMED') return

    // Verifica se a estratégia está ativa para este cliente
    if (!activeStrategies.has(signal.strategy_id)) {
      console.debug('[Bridge] Estratégia não ativa para este cliente:', signal.strategy_id)
      statsRef.current.signalsIgnored++
      updateStats({ signalsIgnored: statsRef.current.signalsIgnored })
      return
    }

    // Verifica filtro de persona
    if (!isSignalAllowedByPersona(signal)) {
      statsRef.current.signalsIgnored++
      updateStats({ signalsIgnored: statsRef.current.signalsIgnored })
      return
    }

    // Verifica conexão Deriv e risco
    if (!isConnected || !api) {
      toast.warning(`Sinal ${signal.strategy_id} — Deriv não conectada`)
      return
    }

    if (isRiskLimitReached()) {
      toast.warning('Limite diário — sinal descartado')
      return
    }

    // @DEBUG_SENTINEL: Ativo sanitizado antes de enfileirar
    try {
      sanitizeAtivo(signal.ativo) // lança se ativo inválido/CRASH/BOOM
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Bridge][SHIELD] Ativo rejeitado antes de enfileirar:', msg)
      toast.error(msg)
      return
    }

    // Enfileira o sinal
    queueRef.current.push(signal)
    updateStats({ queueLength: queueRef.current.length })
    console.log('[Bridge] Sinal enfileirado:', signal.strategy_id, '| fila:', queueRef.current.length)

    // Dispara processamento se não estiver rodando
    processQueue()
  }, [clientId, activeStrategies, isSignalAllowedByPersona, isConnected, api, isRiskLimitReached, processQueue, updateStats])

  // ── Supabase Realtime subscription ────────────────────────────────────────

  useEffect(() => {
    if (!clientId) {
      console.debug('[Bridge] Aguardando clientId para iniciar subscription...')
      return
    }

    console.log('[Bridge] Iniciando Realtime subscription para client_id:', clientId.substring(0, 8) + '...')

    const channel = supabase
      .channel(`hft_signals_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const signal = payload.new as HftSignal
          console.log('[Bridge][REALTIME] Sinal recebido:', signal.status, signal.strategy_id)
          handleSignal(signal)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Bridge][REALTIME] OK — ouvindo tabela signals para client', clientId.substring(0, 8))
        } else if (status === 'CHANNEL_ERROR') {
          // @DEBUG_SENTINEL: Erro de channel — tenta resubscrever
          console.error('[Bridge][REALTIME] Erro no canal — verifique RLS e schema da tabela signals')
          toast.error('Erro no canal de sinais — reconectando...')
        }
      })

    return () => {
      console.log('[Bridge] Removendo subscription Realtime')
      supabase.removeChannel(channel)
    }
  }, [clientId, handleSignal])

  return {
    stats,
    /** Reset do P&L diário (chamar a cada nova sessão) */
    resetDailyProfit: () => { dailyProfitRef.current = 0 },
    /** P&L acumulado da sessão */
    dailyProfit: dailyProfitRef.current,
  }
}
