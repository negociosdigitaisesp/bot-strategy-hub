// iqExecutor.js — WebSocket client para o servidor de sinais IQ Option na VPS
// Conecta em VITE_SIGNAL_SERVER_URL (ws://VPS:4001) com backoff exponencial

const SIGNAL_SERVER_URL =
    import.meta.env.VITE_SIGNAL_SERVER_URL || 'ws://191.252.182.208:4001'

const IS_DEV = import.meta.env.DEV

// Níveis de reconexão: 3s, 5s, 10s, 10s, ...
const RECONNECT_DELAYS = [3000, 5000, 10000]

class IQSignalClient {
    constructor(onSignal, onHeartbeat, onConnect, onDisconnect) {
        this.onSignal = onSignal
        this.onHeartbeat = onHeartbeat
        this.onConnect = onConnect
        this.onDisconnect = onDisconnect

        this.ws = null
        this.connected = false
        this.reconnectTimer = null
        this.reconnectAttempts = 0
    }

    connect = () => {
        if (this.ws) {
            this.ws.onclose = null // evita recursão
            this.ws.close()
        }

        if (IS_DEV) {
            console.log(`[IQ Signal] Conectando → ${SIGNAL_SERVER_URL} (tentativa ${this.reconnectAttempts + 1})`)
        }

        try {
            this.ws = new WebSocket(SIGNAL_SERVER_URL)

            this.ws.onopen = () => {
                if (IS_DEV) console.log('[IQ Signal] ✅ Conectado ao Servidor de Sinais')
                this.connected = true
                this.reconnectAttempts = 0 // reset backoff

                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer)
                    this.reconnectTimer = null
                }
                if (this.onConnect) this.onConnect()
            }

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)

                    if (data.type === 'signal' && this.onSignal) {
                        this.onSignal(data)
                    } else if (data.type === 'heartbeat' && this.onHeartbeat) {
                        this.onHeartbeat(data)
                    }
                } catch (e) {
                    if (IS_DEV) console.error('[IQ Signal] Erro ao parsear mensagem:', e)
                }
            }

            this.ws.onclose = () => {
                this.connected = false
                if (this.onDisconnect) this.onDisconnect()

                // Backoff exponencial: 3s → 5s → 10s → 10s...
                const delayIdx = Math.min(this.reconnectAttempts, RECONNECT_DELAYS.length - 1)
                const delay = RECONNECT_DELAYS[delayIdx]
                this.reconnectAttempts++

                if (IS_DEV) {
                    console.log(`[IQ Signal] Desconectado. Reconectando em ${delay / 1000}s...`)
                }

                this.reconnectTimer = setTimeout(this.connect, delay)
            }

            this.ws.onerror = () => {
                // onerror sempre é seguido de onclose; só loga em DEV
                if (IS_DEV) console.warn('[IQ Signal] Erro de WebSocket (reconexão automática em breve)')
            }
        } catch (e) {
            if (IS_DEV) console.error('[IQ Signal] Falha ao criar WebSocket:', e)

            const delayIdx = Math.min(this.reconnectAttempts, RECONNECT_DELAYS.length - 1)
            this.reconnectAttempts++
            this.reconnectTimer = setTimeout(this.connect, RECONNECT_DELAYS[delayIdx])
        }
    }

    disconnect = () => {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
        this.reconnectAttempts = 0

        if (this.ws) {
            this.ws.onclose = null // impede auto-reconexão
            this.ws.close()
            this.ws = null
        }

        this.connected = false
        if (this.onDisconnect) this.onDisconnect()
    }
}

export default IQSignalClient
