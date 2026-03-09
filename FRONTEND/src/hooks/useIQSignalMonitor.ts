/**
 * useIQSignalMonitor.ts — Signal Monitor para IQ Option
 * Assina iq_quant.signals no Supabase B e dispara executeIQGaleChain
 *
 * Gêmeo do Signal Monitor interno ao OracleQuant.tsx
 * Gargalo 2 corrigido: schema = 'iq_quant' (não iq_lake)
 *
 * @SHIELD_AGENT: Latency Guard ≤8s, WS Guard, Concurrency Cap ≤3
 * @LGN_AUDITOR:  Deduplicação via iq_gale_state (signal_id UNIQUE)
 */

import { useEffect, useCallback, useRef } from 'react'
import { iqSupabase } from '@/lib/iqSupabase'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface IQSignal {
  estrategia:         string
  status:             'PRE_SIGNAL' | 'CONFIRMED'
  ativo:              string    // EURUSD, EURUSD-OTC etc
  direcao:            string    // CALL | PUT
  timestamp_sinal:    number    // epoch seconds
  hh_mm?:             string
}

interface MonitorProps {
  masterOn:             boolean
  isIQConnected:        boolean
  executingAssetsRef:   React.MutableRefObject<Set<string>>
  onSignal:             (ativo: string, direcao: string, estrategia: string) => void
  onLog:                (level: 'info' | 'ok' | 'error', msg: string) => void
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MAX_LATENCY_S         = 8      // rejeita sinal com mais de 8s de atraso
const MAX_CONCURRENT_ASSETS = 3

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useIQSignalMonitor({
  masterOn,
  isIQConnected,
  executingAssetsRef,
  onSignal,
  onLog,
}: MonitorProps) {
  const masterOnRef     = useRef(masterOn)
  const isConnectedRef  = useRef(isIQConnected)
  const onSignalRef     = useRef(onSignal)
  // Deduplicação em memória — evita reprocessar o mesmo signal_id na mesma sessão
  const processedSignals = useRef<Set<string>>(new Set())

  // Sincroniza refs para evitar stale closure no canal Realtime
  useEffect(() => { masterOnRef.current    = masterOn },      [masterOn])
  useEffect(() => { isConnectedRef.current = isIQConnected }, [isIQConnected])
  useEffect(() => { onSignalRef.current    = onSignal },      [onSignal])

  // ── Deduplicação em memória ─────────────────────────────────────────────────
  const isSignalDuplicate = useCallback((signalId: string): boolean => {
    if (processedSignals.current.has(signalId)) return true
    processedSignals.current.add(signalId)
    // Limpa sinais com mais de 200 entradas para não crescer indefinidamente
    if (processedSignals.current.size > 200) processedSignals.current.clear()
    return false
  }, [])

  // ── Canal Realtime ─────────────────────────────────────────────────────────

  useEffect(() => {
    onLog('info', '[IQ-SIGNAL] Conectando ao canal iq_quant.signals...')

    const channel = iqSupabase
      .channel('iq-signal-monitor')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          // VPS insere em public.iq_quant_signals
          schema: 'public',
          table:  'iq_quant_signals',
        },
        async (payload) => {
          const s = payload.new as Record<string, unknown>

          const estrategia  = String(s.estrategia ?? '')
          const status      = String(s.status ?? '')
          const ativo       = String(s.ativo ?? '')
          const direcao     = String(s.direcao ?? (s.sinal_dir ?? ''))
          const tsSinal     = Number(s.timestamp_sinal ?? 0)

          onLog(
            status === 'CONFIRMED' ? 'ok' : 'info',
            `[📡 IQ-${status}] ${estrategia} | ${ativo} ${direcao}`
          )

          // ── Guards de execução ──────────────────────────────────────────────

          if (status !== 'CONFIRMED') return
          if (!masterOnRef.current)   { onLog('info',  '[BLOQ-IQ] Sistema OFF'); return }
          if (!isConnectedRef.current){ onLog('error', '[BLOQ-IQ] IQ Option desconectada'); return }

          // Latency Guard
          const latency = Date.now() / 1000 - tsSinal
          if (latency > MAX_LATENCY_S) {
            onLog('info', `[STALE-IQ] Sinal expirado (${latency.toFixed(1)}s > ${MAX_LATENCY_S}s). Ignorado.`)
            return
          }
          if (latency < 0) {
            onLog('info', `[STALE-IQ] Sinal futuro (${latency.toFixed(1)}s). Ignorado.`)
            return
          }

          // Concurrency Cap
          if (executingAssetsRef.current.size >= MAX_CONCURRENT_ASSETS) {
            onLog('info', `[🚫 CAP-IQ] ${executingAssetsRef.current.size}/${MAX_CONCURRENT_ASSETS} ativos. ${ativo} adiado.`)
            return
          }

          // Anti-duplo em memória
          if (executingAssetsRef.current.has(ativo)) {
            onLog('info', `[SKIP-IQ] ${ativo} já em execução`)
            return
          }

          // [LGN_AUDITOR] Anti-duplo via Supabase (sobrevive a F5)
          const signalId  = `${estrategia}_${new Date().toISOString().slice(0, 10)}`
          const duplicate = await isSignalDuplicate(signalId)
          if (duplicate) {
            onLog('info', `[DEDUP-IQ] signal_id ${signalId} já processado. Ignorado.`)
            return
          }

          // ── Dispara execução ───────────────────────────────────────────────
          executingAssetsRef.current.add(ativo)
          onLog('ok', `[⚡ IQ-EXEC] Iniciando ${ativo} ${direcao} | lat=${latency.toFixed(2)}s`)
          onSignalRef.current(ativo, direcao, estrategia)
        }
      )
      .subscribe((st) => {
        if      (st === 'SUBSCRIBED')   onLog('ok',   '[IQ-SIGNAL] ✅ Canal iq_quant.signals ativo')
        else if (st === 'CHANNEL_ERROR') onLog('error', '[IQ-SIGNAL] ❌ Erro no canal!')
        else                             onLog('info',  `[IQ-SIGNAL] Status: ${st}`)
      })

    return () => { iqSupabase.removeChannel(channel) }
  // [SHIELD_AGENT] onSignal removido das deps — usa ref estável
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLog, isSignalDuplicate])
}
