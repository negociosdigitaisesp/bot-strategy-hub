/**
 * IQ WS Monitor — Sentinela de produção
 * Loga métricas críticas sem interferir na lógica
 */

interface WsMetrics {
  connectionsTotal: number
  reconnectsTotal: number
  zombiesDetected: number
  ssidInvalidCount: number
  tiesDetected: number
  ordersOutOfOrder: number
  lastHeartbeatAt: number | null
  sessionStartAt: number
}

const metrics: WsMetrics = {
  connectionsTotal: 0,
  reconnectsTotal: 0,
  zombiesDetected: 0,
  ssidInvalidCount: 0,
  tiesDetected: 0,
  ordersOutOfOrder: 0,
  lastHeartbeatAt: null,
  sessionStartAt: Date.now(),
}

export const IQMonitor = {
  onConnect:       () => { metrics.connectionsTotal++ },
  onReconnect:     () => { metrics.reconnectsTotal++ },
  onZombie:        () => { metrics.zombiesDetected++;     console.warn('[SENTINELA] 🧟 Zombie #' + metrics.zombiesDetected) },
  onSsidInvalid:   () => { metrics.ssidInvalidCount++;    console.error('[SENTINELA] ❌ SSID inválido #' + metrics.ssidInvalidCount) },
  onTie:           () => { metrics.tiesDetected++;        console.log('[SENTINELA] 🟡 Tie #' + metrics.tiesDetected) },
  onOutOfOrder:    () => { metrics.ordersOutOfOrder++;    console.warn('[SENTINELA] 🔀 Ordem fora de ordem #' + metrics.ordersOutOfOrder) },
  onHeartbeat:     () => { metrics.lastHeartbeatAt = Date.now() },
  
  getReport: (): WsMetrics => ({ ...metrics }),
  
  printReport: () => {
    const uptime = Math.floor((Date.now() - metrics.sessionStartAt) / 60000)
    console.table({
      ...metrics,
      uptimeMinutes: uptime,
      lastHeartbeat: metrics.lastHeartbeatAt 
        ? `${Math.floor((Date.now() - metrics.lastHeartbeatAt) / 1000)}s atrás`
        : 'nunca'
    })
  }
}

// Auto-report a cada 5 minutos no console (só em dev)
if (import.meta.env.DEV) {
  setInterval(() => IQMonitor.printReport(), 5 * 60 * 1000)
}
