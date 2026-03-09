import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { iqSupabase } from '@/lib/iqSupabase'

export interface IQTradeRecord {
  id: number
  client_id: string
  ativo: string
  direcao: string
  stake: number
  gale_level: number
  resultado: string
  profit: number
  estrategia_id?: string
  executed_at: string
}

export interface IQBotConfig {
  id: string
  user_id: string
  ssid: string
  is_active: boolean
  mode: 'demo' | 'real'
  session_status: 'connected' | 'disconnected' | 'connecting' | 'error'
  stake_amount: number
  take_profit: number
  stop_loss: number
  martingale_steps: number
  [key: string]: any
}

export interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'error' | 'warn'
}

export const useIQBot = () => {
  const { user } = useAuth()
  const userId = user?.id

  const [bot, setBot] = useState<IQBotConfig | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<'demo' | 'real'>('demo')
  const [sessionStatus, setSessionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [recentTrades, setRecentTrades] = useState<IQTradeRecord[]>([])

  const [sessionStats, setSessionStats] = useState({
    total_ops: 0, wins: 0, losses: 0, pnl: 0, win_rate: 0,
  })

  const [iqEmail, setIqEmail] = useState('')

  const [logs, setLogs] = useState<LogEntry[]>([])
  const logsRef = useRef<LogEntry[]>([])

  // Estado do trader selecionado (estratégia ativa)
  const [activeEstrategia, setActiveEstrategia] = useState<string>('FV1')

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    const entry: LogEntry = { time, message, type }
    logsRef.current = [...logsRef.current, entry]
    setLogs([...logsRef.current])
  }, [])

  // ── loadSessionStats — view primeiro; fallback direto em iq_trade_results ──
  const loadSessionStats = useCallback(async () => {
    if (!userId) return

    // 1) Tenta a view (últimas 24h)
    const { data: viewData } = await iqSupabase
      .from('vw_iq_session_stats')
      .select('*')
      .eq('client_id', userId)
      .maybeSingle()

    if (viewData && (Number(viewData.total_ops) > 0 || Number(viewData.wins) > 0)) {
      setSessionStats({
        total_ops: Number(viewData.total_ops ?? 0),
        wins:      Number(viewData.wins      ?? 0),
        losses:    Number(viewData.losses    ?? 0),
        pnl:       Number(viewData.pnl       ?? 0),
        win_rate:  Number(viewData.win_rate  ?? 0),
      })
      return
    }

    // 2) Fallback: calcula direto de iq_trade_results (sem filtro de data)
    const { data: trades } = await iqSupabase
      .from('iq_trade_results')
      .select('resultado, profit')
      .eq('client_id', userId)

    if (trades) {
      const wins    = trades.filter(t => t.resultado === 'win').length
      const losses  = trades.filter(t => t.resultado === 'loss').length
      const total   = wins + losses
      const pnl     = trades.reduce((s, t) => s + Number(t.profit ?? 0), 0)
      setSessionStats({
        total_ops: total,
        wins,
        losses,
        pnl,
        win_rate: total > 0 ? (wins / total) * 100 : 0,
      })
    }
  }, [userId])

  // ── loadRecentTrades — últimos 15 trades de iq_trade_results (Supabase B) ──
  const loadRecentTrades = useCallback(async () => {
    if (!userId) return
    const { data } = await iqSupabase
      .from('iq_trade_results')
      .select('*')
      .eq('client_id', userId)
      .order('executed_at', { ascending: false })
      .limit(15)
    if (data) setRecentTrades(data as IQTradeRecord[])
  }, [userId])

  // ── Inicialização ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return }

    let botClientSub: any = null

    const init = async () => {
      setLoading(true)
      addLog('[SISTEMA] Inicializando módulo IQ Option...', 'info')

      // 1. Busca config do bot (Supabase A — iq_bots)
      const { data: botData, error: botError } = await supabase
        .from('iq_bots')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (botError && botError.code !== 'PGRST116') {
        addLog(`[ERROR] ${botError.message}`, 'error')
        setLoading(false)
        return
      }

      if (botData) {
        setBot(botData as IQBotConfig)
        setMode(botData.mode || 'demo')
        addLog(
          `[SISTEMA] Bot configurado. Modo: ${botData.mode || 'demo'}`,
          'success'
        )
      } else {
        addLog('[SISTEMA] Configuración base pendiente.', 'info')
      }

      // Realtime bot_clients — leitura inicial + is_running
      const { data: bClient } = await iqSupabase.from('bot_clients').select('iq_email, is_running, estrategia_ativa').eq('client_id', userId).maybeSingle()
      if (bClient?.iq_email) setIqEmail(bClient.iq_email)
      if (bClient?.estrategia_ativa) setActiveEstrategia(bClient.estrategia_ativa)
      if (bClient?.is_running !== undefined) {
        setIsActive(bClient.is_running)
        setSessionStatus(bClient.is_running ? 'connected' : 'disconnected')
        addLog(
          bClient.is_running ? '[VPS] ✅ Motor activo en la nube (cargado).' : '[VPS] Motor detenido.',
          bClient.is_running ? 'success' : 'info'
        )
      }

      botClientSub = iqSupabase
        .channel(`bot-client-${userId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public',
          table: 'bot_clients', filter: `client_id=eq.${userId}`
        }, (payload) => {
          const data = payload.new as any
          const running = data?.is_running ?? false
          setIsActive(running)
          setSessionStatus(running ? 'connected' : 'disconnected')
          addLog(
            running ? '[VPS] ✅ Motor activo en la nube.' : '[VPS] Motor detenido.',
            running ? 'success' : 'info'
          )
        })
        .subscribe()

      // Carrega stats e trades recentes do Supabase B
      await loadSessionStats()
      await loadRecentTrades()

      setLoading(false)
    }

    init()
    return () => {
      if (botClientSub) botClientSub.unsubscribe()
    }
  }, [userId, addLog, loadSessionStats, loadRecentTrades])

  // Realtime: assina inserções em iq_trade_results (Supabase B)
  useEffect(() => {
    if (!userId) return

    const sub = iqSupabase
      .channel(`trade-results-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'iq_trade_results', filter: `client_id=eq.${userId}`,
      }, (payload) => {
        const t = payload.new as Record<string, unknown>
        const isWin = t.resultado === 'win'
        addLog(
          `[RESULTADO] ${t.ativo} G${t.gale_level ?? 0} → ${String(t.resultado).toUpperCase()} | ${Number(t.profit) >= 0 ? '+' : ''}$${Number(t.profit).toFixed(2)}`,
          isWin ? 'success' : 'error'
        )
        // Atualiza stats e trades recentes
        loadSessionStats()
        loadRecentTrades()
      })
      .subscribe()

    return () => { iqSupabase.removeChannel(sub) }
  }, [userId, loadSessionStats, loadRecentTrades, addLog])

  // ── Polling a cada 30s como fallback para stats em tempo real ──
  useEffect(() => {
    if (!userId) return
    const interval = setInterval(() => {
      loadSessionStats()
      loadRecentTrades()
    }, 30_000)
    return () => clearInterval(interval)
  }, [userId, loadSessionStats, loadRecentTrades])

  // ── saveCredentials — salva email e senha da IQ Option em bot_clients ──
  const saveCredentials = async (email: string, pass: string) => {
    if (!userId) return { error: 'Usuário não autenticado' }
    setLoading(true)
    addLog('[SISTEMA] Salvando credenciais da IQ Option...', 'info')
    const { error } = await iqSupabase
      .from('bot_clients')
      .upsert({
        client_id: userId,
        iq_email: email,
        iq_password: pass,
      }, { onConflict: 'client_id' })
    if (error) {
      addLog(`[ERRO] ${error.message}`, 'error')
      setLoading(false)
      return { error: error.message }
    }
    setIqEmail(email)
    addLog('[SISTEMA] ✅ Credenciais salvas com sucesso.', 'success')
    setLoading(false)
    return { success: true }
  }

  // ── saveConfig ─────────────────────────────────────────────────
  const saveConfig = async (configData: any) => {
    if (!userId) return { error: 'Usuário não autenticado' }
    setLoading(true)
    addLog('[SISTEMA] Salvando configuração base...', 'info')
    try {
      const payload: any = {
        user_id: userId,
        stake_amount: configData.stake,
        take_profit: configData.take_profit,
        stop_loss: configData.stop_loss,
        martingale_steps: configData.martingale_steps,
        is_active: false,
        session_status: 'disconnected',
        updated_at: new Date().toISOString()
      }
      if (configData.ssid) payload.ssid = configData.ssid

      const { data: existingBot } = await supabase
        .from('iq_bots').select('id').eq('user_id', userId).single()
      let result
      if (existingBot) {
        result = await supabase.from('iq_bots')
          .update(payload).eq('id', existingBot.id).select().single()
      } else {
        payload.mode = 'demo'
        result = await supabase.from('iq_bots').insert(payload).select().single()
      }
      if (result.error) throw result.error
      if (result.data) { setBot(result.data as IQBotConfig); setIsActive(false) }
      addLog('[SISTEMA] ✅ Configuração base salva.', 'success')
      setLoading(false)
      return { success: true }
    } catch (err: any) {
      addLog(`[ERRO] ${err.message}`, 'error')
      setLoading(false)
      return { error: err.message }
    }
  }

  // ── saveRiskConfig — salva apenas stake/stop/martingale em iq_session_config ────
  const saveRiskConfig = async (config: {
    stake: number
    stop_win: number
    stop_loss: number
    martingale_on: boolean
  }) => {
    if (!userId) return { error: 'No autenticado' }

    addLog('[RIESGO] Guardando configuración de riesgo...', 'info')
    const { error } = await iqSupabase
      .from('iq_session_config')
      .upsert({
        client_id:     userId,
        stake:         config.stake,
        stop_win:      config.stop_win,
        stop_loss:     config.stop_loss,
        martingale_on: config.martingale_on,
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'client_id' })
    if (error) {
      addLog(`[ERROR] ${error.message}`, 'error')
      return { error: error.message }
    }
    addLog('[RIESGO] ✅ Configuración de riesgo guardada.', 'success')
    return { success: true }
  }

  // ── updateActiveEstrategia — persiste a seleção 1:1 do trader em bot_clients ──
  const updateActiveEstrategia = async (estrategiaId: string | null) => {
    if (!userId) return
    const { error } = await iqSupabase
      .from('bot_clients')
      .update({ estrategia_ativa: estrategiaId })
      .eq('client_id', userId)
    if (error) {
      addLog(`[ERROR] No se pudo actualizar trader: ${error.message}`, 'error')
      return
    }
    setActiveEstrategia(estrategiaId ?? '')
    if (estrategiaId) {
      addLog(`[TRADER] ✅ Trader vinculado: ${estrategiaId}`, 'success')
    } else {
      addLog('[TRADER] Trader desvinculado.', 'info')
    }
  }

  // ── toggleBot — VPS via bot_clients ───────────────────────────
  const toggleBot = async () => {
    if (!bot || !userId) return
    if (!isActive && mode === 'real') { setShowConfirmModal(true); return }
    await _setRunning(!isActive)
  }

  const confirmActivateReal = async () => {
    setShowConfirmModal(false)
    await _setRunning(true)
  }

  const _setRunning = async (running: boolean) => {
    if (!userId) return

    // Busca credenciais salvas em iq_session_config
    const { data: cfg, error: cfgError } = await iqSupabase
      .from('iq_session_config')
      .select('iq_email, iq_password, stake, stop_win, stop_loss')
      .eq('client_id', userId)
      .single()

    if (cfgError) {
      addLog(`[ERRO] Falha ao ler configuração: ${cfgError.message}`, 'error')
    }

    // Bloqueia se tentar ligar sem credenciais
    if (running && (!cfg?.iq_email || !cfg?.iq_password)) {
      addLog('[ERRO] Salve seu email e senha IQ Option antes de iniciar o motor.', 'error')
      return
    }

    addLog(running ? '[VPS] Iniciando motor na nuvem...' : '[VPS] Parando motor...', 'warn')

    const { error } = await iqSupabase
      .from('bot_clients')
      .upsert({
        client_id:        userId,
        iq_email:         cfg?.iq_email    ?? '',
        iq_password:      cfg?.iq_password ?? '',
        is_running:       running,
        estrategia_ativa: activeEstrategia,
      }, { onConflict: 'client_id' })

    if (error) {
      addLog(`[ERRO] ${error.message}`, 'error')
    } else {
      setIsActive(running)
      addLog(
        running ? '[VPS] ✅ Motor ativado. Aguardando sinais.' : '[VPS] Motor parado.',
        running ? 'success' : 'info'
      )
    }
  }

  const changeMode = async (newMode: 'demo' | 'real') => {
    if (!bot) return
    if (newMode === 'real') { setShowConfirmModal(true); return }
    const { error: modeError } = await supabase
      .from('iq_bots')
      .update({ mode: 'demo', updated_at: new Date().toISOString() })
      .eq('id', bot.id)
    if (!modeError) { setMode('demo'); addLog('[SISTEMA] Modo alterado para DEMO.', 'info') }
  }

  // executeOrder — delegado à VPS, frontend só monitora
  const executeOrder = async (_orderData: any) => {
    return { win: false, profit: 0 }
  }

  return {
    bot, isActive, mode, sessionStatus,
    serverStatus: 'vps' as const,
    recentTrades,
    sessionStats, loadSessionStats,
    loading, error, logs, iqEmail,
    showConfirmModal, setShowConfirmModal,
    toggleBot, confirmActivateReal, saveConfig, saveCredentials, saveRiskConfig, changeMode,
    addLog, executeOrder,
    activeEstrategia, setActiveEstrategia, updateActiveEstrategia,
  }
}
