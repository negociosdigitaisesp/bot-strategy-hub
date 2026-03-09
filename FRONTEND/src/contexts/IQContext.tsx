/**
 * IQContext.tsx — WebSocket Context para IQ Option
 * Gêmeo isolado do DerivContext.tsx — ZERO shared state
 *
 * Responsabilidades:
 * - Gerencia 1 WebSocket global: wss://iqoption.com/echo/websocket
 * - SSID auth + profile parsing
 * - Heartbeat via Web Worker (anti-throttle Chrome background)
 * - Zombie detector: ping 9.5s, timeout 3s → reconecta
 * - Exponential backoff: 3s→6s→12s→24s→48s (5 tentativas)
 * - SSID: fica APENAS em sessionStorage. Hash SHA-256 vai para Supabase A
 *
 * @SHIELD_AGENT: Zero alteração em DerivContext.tsx
 * @LGN_AUDITOR:  SSID nunca persiste além da aba (sessionStorage, não localStorage)
 */

import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, ReactNode,
} from 'react'
import { toast } from 'sonner'
import { supabaseOracle } from '@/lib/supabase-oracle'
import { useClientId } from '@/hooks/useClientId'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface IQBalance {
  id: string
  type: number     // 1 = real, 4 = demo
  currency: string
  amount: number
}

export interface IQProfile {
  userId: number
  name: string
  email: string
  balances: IQBalance[]
}

interface IQContextType {
  isConnected:    boolean
  isConnecting:   boolean
  isZombie:       boolean        // WS aberto mas ssid morto
  profile:        IQProfile | null
  activeBalance:  IQBalance | null
  mode:           'demo' | 'real'
  socket:         WebSocket | null
  ssidHint:       string | null  // últimos 6 chars do ssid (debug)
  connect:        (ssid: string, mode?: 'demo' | 'real') => void
  disconnect:     () => void
  setMode:        (mode: 'demo' | 'real') => void
  sendIQ:         (msg: object) => boolean
  lastError:      string | null
}

// ── Constantes ────────────────────────────────────────────────────────────────

const IQ_WS_URL              = 'wss://iqoption.com/echo/websocket'
const HEARTBEAT_INTERVAL_MS  = 9_500   // Web Worker tick
const ZOMBIE_TIMEOUT_MS      = 3_000   // se não houver pong em 3s → zombie
const SSID_SESSION_KEY       = 'iq_ssid'   // sessionStorage (not localStorage)
const MODE_LOCAL_KEY         = 'iq_mode'
const RECONNECT_DELAYS       = [3000, 6000, 12000, 24000, 48000]

// ── Context ───────────────────────────────────────────────────────────────────

const IQContext = createContext<IQContextType | undefined>(undefined)

export const IQProvider = ({ children }: { children: ReactNode }) => {
  const { clientId }                    = useClientId()
  const [isConnected, setIsConnected]   = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isZombie, setIsZombie]         = useState(false)
  const [profile, setProfile]           = useState<IQProfile | null>(null)
  const [activeBalance, setActiveBalance] = useState<IQBalance | null>(null)
  const [mode, setModeState]            = useState<'demo' | 'real'>(
    () => (localStorage.getItem(MODE_LOCAL_KEY) as 'demo' | 'real') || 'demo'
  )
  const [lastError, setLastError]       = useState<string | null>(null)
  const [ssidHint, setSsidHint]         = useState<string | null>(null)

  // Refs internos — não causam re-render
  const socketRef          = useRef<WebSocket | null>(null)
  const heartbeatWorker    = useRef<Worker | null>(null)
  const zombieTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempts  = useRef(0)
  const shouldReconnect    = useRef(false)
  const pendingZombieCheck = useRef(false)
  const currentSsid        = useRef<string | null>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const sendIQ = useCallback((msg: object): boolean => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(msg))
    return true
  }, [])

  // SHA-256 do SSID para armazenar no Supabase A (nunca o SSID em si)
  const hashSsid = async (ssid: string): Promise<string> => {
    const enc = new TextEncoder()
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(ssid))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const persistSsidMeta = useCallback(async (ssid: string) => {
    if (!clientId) return
    try {
      const hash = await hashSsid(ssid)
      const hint = ssid.length > 6 ? `...${ssid.slice(-6)}` : ssid
      setSsidHint(hint)
      // Persiste APENAS hash + hint no Supabase A (iq_option.iq_credentials)
      await supabaseOracle
        .schema('iq_option')
        .from('iq_credentials')
        .upsert({
          client_id:  clientId,
          ssid_hash:  hash,
          ssid_hint:  hint,
          is_valid:   true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' })
    } catch { /* não crítico — falha silenciosa */ }
  }, [clientId])

  const invalidateSsidMeta = useCallback(async () => {
    if (!clientId) return
    try {
      await supabaseOracle
        .schema('iq_option')
        .from('iq_credentials')
        .update({ is_valid: false, updated_at: new Date().toISOString() })
        .eq('client_id', clientId)
    } catch { /* silencioso */ }
  }, [clientId])

  // ── Web Worker Heartbeat (anti-throttle Chrome background tab) ────────────────

  const stopHeartbeat = useCallback(() => {
    if (heartbeatWorker.current) {
      heartbeatWorker.current.postMessage('stop')
      heartbeatWorker.current.terminate()
      heartbeatWorker.current = null
    }
    if (zombieTimer.current) {
      clearTimeout(zombieTimer.current)
      zombieTimer.current = null
    }
  }, [])

  const startHeartbeat = useCallback(() => {
    stopHeartbeat()

    const workerCode = `
      let timer;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          timer = setInterval(() => self.postMessage('tick'), ${HEARTBEAT_INTERVAL_MS});
        } else if (e.data === 'stop') {
          clearInterval(timer);
        }
      };
    `
    const blob   = new Blob([workerCode], { type: 'application/javascript' })
    const worker = new Worker(URL.createObjectURL(blob))

    worker.onmessage = (e) => {
      if (e.data !== 'tick') return
      const sent = sendIQ({ name: 'heartbeat', msg: { heartbeatTime: Date.now() } })
      if (!sent) return

      // ── Zombie Detector ───────────────────────────────────────────────
      // Se WS readyState=OPEN mas IQ não responde em 3s → zombie
      if (pendingZombieCheck.current) return
      pendingZombieCheck.current = true

      zombieTimer.current = setTimeout(() => {
        // Não recebemos nenhuma mensagem no intervalo → zombie
        if (pendingZombieCheck.current) {
          setIsZombie(true)
          console.warn('[IQContext] Zombie detectado — ssid expirado. Reconectando...')
          toast.warning('⚠️ Sessão IQ Option expirada. Reconectando...')
          // Dispara reconexão com o ssid atual (ainda em sessionStorage)
          const ssid = sessionStorage.getItem(SSID_SESSION_KEY)
          if (ssid && shouldReconnect.current) {
            socketRef.current?.close()
          }
        }
      }, ZOMBIE_TIMEOUT_MS)
    }

    worker.postMessage('start')
    heartbeatWorker.current = worker
  }, [sendIQ, stopHeartbeat])

  // Qualquer mensagem da IQ cancela o zombie timer
  const resetZombieCheck = useCallback(() => {
    if (zombieTimer.current) {
      clearTimeout(zombieTimer.current)
      zombieTimer.current = null
    }
    pendingZombieCheck.current = false
    if (isZombie) setIsZombie(false)
  }, [isZombie])

  // ── Seleção de balance por mode ───────────────────────────────────────────────

  const resolveActiveBalance = useCallback((balances: IQBalance[], targetMode: 'demo' | 'real') => {
    const type   = targetMode === 'demo' ? 4 : 1
    const found  = balances.find(b => b.type === type)
    setActiveBalance(found ?? null)
    return found ?? null
  }, [])

  // ── Conexão WebSocket ─────────────────────────────────────────────────────────

  const connectWs = useCallback((ssid: string) => {
    // Evita múltiplas conexões simultâneas
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.CONNECTING ||
       socketRef.current.readyState === WebSocket.OPEN)
    ) return

    setIsConnecting(true)
    setLastError(null)
    setIsZombie(false)
    currentSsid.current = ssid

    const ws = new WebSocket(IQ_WS_URL)
    socketRef.current = ws

    ws.onopen = () => {
      // Fase 1: envia SSID imediatamente
      ws.send(JSON.stringify({ name: 'ssid', msg: ssid, request_id: 'auth_1' }))
    }

    ws.onmessage = (event) => {
      resetZombieCheck()  // qualquer mensagem prova que o WS não está zombie
      try {
        const data = JSON.parse(event.data as string)

        if (data.name === 'profile') {
          // Auth bem-sucedida
          const p = data.msg as any
          const balances: IQBalance[] = (p.balances || []).map((b: any) => ({
            id:       String(b.id),
            type:     Number(b.type),
            currency: b.currency || 'USD',
            amount:   Number(b.amount) || 0,
          }))
          const parsed: IQProfile = {
            userId:   p.id,
            name:     p.name || '',
            email:    p.email || '',
            balances,
          }
          setProfile(parsed)
          resolveActiveBalance(balances, mode)
          setIsConnected(true)
          setIsConnecting(false)
          reconnectAttempts.current = 0
          persistSsidMeta(ssid)
          startHeartbeat()

        } else if (data.name === 'profile-balance-changed') {
          // Atualiza saldo em tempo real sem re-auth
          const updated = data.msg as any
          setProfile(prev => {
            if (!prev) return prev
            const newBalances = prev.balances.map(b =>
              String(b.id) === String(updated.id)
                ? { ...b, amount: Number(updated.amount) || b.amount }
                : b
            )
            resolveActiveBalance(newBalances, mode)
            return { ...prev, balances: newBalances }
          })
        }
      } catch { /* ignora erros de parse */ }
    }

    ws.onerror = () => {
      setLastError('Erro de conexão com IQ Option')
    }

    ws.onclose = (e) => {
      stopHeartbeat()
      setIsConnected(false)
      setIsConnecting(false)
      socketRef.current = null

      if (!shouldReconnect.current) return

      const attempt = reconnectAttempts.current
      if (attempt >= RECONNECT_DELAYS.length) {
        setLastError('Máximo de tentativas atingido. Insira o SSID novamente.')
        toast.error('❌ IQ Option desconectada após 5 tentativas.')
        invalidateSsidMeta()
        return
      }

      const delay = RECONNECT_DELAYS[attempt]
      reconnectAttempts.current++
      console.log(`[IQContext] Reconectando em ${delay / 1000}s... (tentativa ${attempt + 1}/5)`)
      setTimeout(() => {
        const ssid = sessionStorage.getItem(SSID_SESSION_KEY)
        if (ssid && shouldReconnect.current) connectWs(ssid)
      }, delay)
    }
  }, [mode, persistSsidMeta, invalidateSsidMeta, resolveActiveBalance, resetZombieCheck, startHeartbeat, stopHeartbeat])

  // ── API pública ───────────────────────────────────────────────────────────────

  const connect = useCallback((ssid: string, targetMode: 'demo' | 'real' = mode) => {
    if (!ssid.trim()) { toast.error('SSID inválido'); return }
    shouldReconnect.current    = true
    reconnectAttempts.current  = 0
    // [@LGN_AUDITOR] SSID apenas em sessionStorage — some ao fechar a aba
    sessionStorage.setItem(SSID_SESSION_KEY, ssid)
    setModeState(targetMode)
    localStorage.setItem(MODE_LOCAL_KEY, targetMode)
    connectWs(ssid)
  }, [mode, connectWs])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    stopHeartbeat()
    sessionStorage.removeItem(SSID_SESSION_KEY)
    socketRef.current?.close()
    socketRef.current = null
    setIsConnected(false)
    setIsConnecting(false)
    setProfile(null)
    setActiveBalance(null)
    setSsidHint(null)
    invalidateSsidMeta()
  }, [stopHeartbeat, invalidateSsidMeta])

  const setMode = useCallback((m: 'demo' | 'real') => {
    setModeState(m)
    localStorage.setItem(MODE_LOCAL_KEY, m)
    if (profile) resolveActiveBalance(profile.balances, m)
    // Troca de balance na IQ Option via WS
    if (activeBalance) {
      const target = profile?.balances.find(b => b.type === (m === 'demo' ? 4 : 1))
      if (target) sendIQ({ name: 'changebalance', msg: { balance_id: Number(target.id) } })
    }
  }, [profile, activeBalance, resolveActiveBalance, sendIQ])

  // ── Auto-connect ao montar (ssid em sessionStorage sobrevive F5, não fechar aba) ──
  useEffect(() => {
    const ssid = sessionStorage.getItem(SSID_SESSION_KEY)
    if (ssid) {
      shouldReconnect.current = true
      connectWs(ssid)
    }
    return () => {
      shouldReconnect.current = false
      stopHeartbeat()
      socketRef.current?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Expose ────────────────────────────────────────────────────────────────────

  return (
    <IQContext.Provider value={{
      isConnected,
      isConnecting,
      isZombie,
      profile,
      activeBalance,
      mode,
      socket:    socketRef.current,
      ssidHint,
      connect,
      disconnect,
      setMode,
      sendIQ,
      lastError,
    }}>
      {children}
    </IQContext.Provider>
  )
}

export const useIQ = (): IQContextType => {
  const ctx = useContext(IQContext)
  if (!ctx) throw new Error('useIQ must be used inside <IQProvider>')
  return ctx
}
