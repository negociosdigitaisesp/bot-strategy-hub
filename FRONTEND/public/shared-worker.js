// FRONTEND/public/shared-worker.js
// Thread separada — nunca throttled pelo browser
// Responsabilidade única: manter WebSocket vivo e repassar mensagens

const ports = new Set()
let ws = null
let derivToken = null
let missedPongs = 0
let heartbeatInterval = null
let pendingPongTimers = []

self.onconnect = (event) => {
  const port = event.ports[0]
  ports.add(port)
  port.onmessage = (e) => handleMessage(e.data, port)
  port.start()
  port.postMessage({ type: 'SW_READY' })
}

function handleMessage(msg, port) {
  if (msg.type === 'INIT') {
    derivToken = msg.token
    connectDeriv()
  }
  if (msg.type === 'SEND') {
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify(msg.payload))
    } else {
      port.postMessage({ type: 'WS_ERROR', error: 'WS_NOT_OPEN' })
    }
  }
  if (msg.type === 'DISCONNECT') {
    ports.delete(port)
  }
}

function connectDeriv() {
  if (ws && ws.readyState === 1) return

  // ⚠️ app_id=1089 é o padrão público da Deriv
  // Se o projeto usa app_id diferente, ajuste aqui
  ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089')

  ws.onopen = () => {
    broadcast({ type: 'WS_STATUS', status: 'OPEN' })
    ws.send(JSON.stringify({ authorize: derivToken }))
    startHeartbeat()
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.msg_type === 'pong') {
      missedPongs = 0
      const t = pendingPongTimers.shift()
      if (t) clearTimeout(t)
      return
    }
    broadcast({ type: 'DERIV_MSG', payload: msg })
  }

  ws.onclose = () => {
    broadcast({ type: 'WS_STATUS', status: 'CLOSED' })
    stopHeartbeat()
    if (ports.size > 0 && derivToken) {
      setTimeout(connectDeriv, 2000)
    }
  }

  ws.onerror = () => {
    broadcast({ type: 'WS_STATUS', status: 'ERROR' })
  }
}

function startHeartbeat() {
  stopHeartbeat()
  heartbeatInterval = setInterval(() => {
    if (ws?.readyState !== 1) return
    ws.send(JSON.stringify({ ping: 1 }))
    const t = setTimeout(() => {
      missedPongs++
      if (missedPongs >= 2) {
        broadcast({ type: 'SW_LOG', msg: '[⚠️ SW] Zumbi detectado. Reconectando...' })
        ws.close()
      }
    }, 8000)
    pendingPongTimers.push(t)
  }, 30000)
}

function stopHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval)
  pendingPongTimers.forEach(clearTimeout)
  pendingPongTimers = []
  missedPongs = 0
}

function broadcast(msg) {
  ports.forEach(port => {
    try { port.postMessage(msg) }
    catch { ports.delete(port) }
  })
}
