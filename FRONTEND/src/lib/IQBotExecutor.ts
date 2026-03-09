import { io, Socket } from 'socket.io-client';
import { IQMonitor } from '@/utils/iqWsMonitor';

const IQ_WS_URL = 'wss://iqoption.com/echo/websocket';
const SIGNAL_SERVER_URL = import.meta.env.VITE_SIGNAL_SERVER_URL || 'http://68.183.216.216:4001';
const IS_DEV = import.meta.env.DEV;

export interface ExecutorConfig {
    ssid: string;
    stake: number;
    take_profit?: number;
    stop_loss?: number;
    martingale_steps?: number;
    mode: 'demo' | 'real';
    onLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
    onTrade: (trade: any) => void;
    onStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

/** Dados de uma ordem pendente aguardando resultado */
interface PendingOrder {
    orderId: number | string;
    asset: string;
    direction: string;
    stake: number;
    openedAt: string;
    resolver?: (win: boolean, profit: number, orderId?: string) => void;
}

export class IQBotExecutor {
    private config: ExecutorConfig;
    private iqWs: WebSocket | null = null;
    private signalSocket: Socket | null = null;
    private isRunning = false;
    private heartbeatWorker: Worker | null = null;
    private activeBalanceId: string | null = null;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null; // Fix 1 — classe, não closure
    private reconnectAttempts = 0;                                         // Fix 1 — Backoff
    private readonly MAX_RECONNECT_ATTEMPTS = 5;                           // Fix 1 — Cap 5 tentativas
    private resultBuffer = new Map<string, { msg: any; ts: number }>();    // Fix 3 — Race condition

    // ── Martingale & Risk State ──────────────────────────────────────
    private currentSessionPnl = 0;
    private consecutiveLosses = 0;
    private pendingOrders: Map<string, PendingOrder> = new Map();

    constructor(config: ExecutorConfig) {
        this.config = config;
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.config.onStatus('connecting');
        this.config.onLog('[CLIENTE] Iniciando motor local...', 'warn');

        this.connectSignalServer();
        this.connectIQ();
    }

    public stop() {
        this.isRunning = false;
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.heartbeatWorker) {
            this.heartbeatWorker.terminate();
            this.heartbeatWorker = null;
        }

        if (this.iqWs) {
            this.iqWs.onclose = null;
            this.iqWs.close();
            this.iqWs = null;
        }

        if (this.signalSocket) {
            this.signalSocket.disconnect();
            this.signalSocket = null;
        }

        this.config.onStatus('disconnected');
    }

    private connectIQ() {
        if (!this.isRunning) return;

        // Fix 3 — cancela reconnect pendente antes de abrir novo socket
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.config.onLog('[CLIENTE] Autenticando SSID diretamente na IQ Option...', 'info');
        
        try {
            this.iqWs = new WebSocket(IQ_WS_URL);

            const HEARTBEAT_INTERVAL = 9500 // 9.5s
            let lastPongAt: number = Date.now()
            const ZOMBIE_THRESHOLD = 25000 // 25s sem pong = socket morto

            // Fix 1 — startHeartbeat usa this.heartbeatTimer (propriedade de classe)
            const startHeartbeat = () => {
                if (this.heartbeatTimer) {
                    clearInterval(this.heartbeatTimer)
                    this.heartbeatTimer = null
                }
                this.heartbeatTimer = setInterval(() => {
                    if (this.iqWs?.readyState !== WebSocket.OPEN) return
                    
                    // Detectar zombie ANTES de enviar ping
                    const silenceDuration = Date.now() - lastPongAt
                    if (silenceDuration > ZOMBIE_THRESHOLD) {
                        this.config.onLog('[IQ WS] ⚠️ Socket zombie detectado — forçando reconexão', 'error')
                        IQMonitor.onZombie()
                        if (this.iqWs) this.iqWs.close(4001, 'zombie_detected')
                        return
                    }
                    
                    this.sendIQ({ name: 'heartbeat', msg: {} })
                }, HEARTBEAT_INTERVAL)
            }

            // Fix 1 — stopHeartbeat usa this.heartbeatTimer
            const stopHeartbeat = () => {
                if (this.heartbeatTimer) {
                    clearInterval(this.heartbeatTimer)
                    this.heartbeatTimer = null
                }
            }

            this.iqWs.onopen = () => {
                IQMonitor.onConnect()
                // Send SSID immediately upon connection
                this.sendIQ({ name: 'ssid', msg: this.config.ssid, request_id: 'auth_1' });
                
                this.reconnectAttempts = 0  // Fix 1 — reset ao conectar com sucesso
                lastPongAt = Date.now()
                startHeartbeat()
            };

            this.iqWs.onmessage = (event) => {
                lastPongAt = Date.now()
                IQMonitor.onHeartbeat()
                
                try {
                    const data = JSON.parse(event.data);
                    
                    // Se receber heartbeat de volta, loga silenciosamente
                    if (data?.name === 'heartbeat') return // não processa, só registra o pong
                    
                    if (data.name === 'profile') {
                        // Fix 2 — SSID inválido: para imediatamente sem loop
                        if (data.msg?.isSuccessful === false) {
                            IQMonitor.onSsidInvalid()
                            this.config.onLog('[IQ] ❌ SSID inválido ou expirado. Atualize o SSID nas configurações.', 'error')
                            this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS // força parada
                            this.stop()
                            return
                        }

                        if (!this.heartbeatWorker) {
                            this.config.onLog('[IQ] Perfil autenticado com sucesso.', 'success');
                            this.checkFullConnectionStatus();
                        }
                        
                        const balances = data.msg.balances || [];
                        const type = this.config.mode === 'demo' ? 4 : 1; 
                        const targetBalance = balances.find((b: any) => b.type === type);
                        if (targetBalance) {
                            this.activeBalanceId = targetBalance.id;
                            // Only log balance ID discovery once
                            if (!this.heartbeatWorker) {
                                this.config.onLog(`[IQ] Saldo selecionado (${this.config.mode}): ID ${this.activeBalanceId}`, 'info');
                            }
                        }
                        
                        // Start robust heartbeat via Web Worker
                        this.startHeartbeatWorker();

                    } else if (data.name === 'socket-option-opened') {
                        // ── ORDEM ABERTA — registrar como pendente ──────────────
                        const msg = data.msg;
                        const orderId = String(msg.id);
                        
                        // Try to find a temp pending order by socket-option-opened info
                        let matchedKey = null;
                        for (const [k, v] of this.pendingOrders.entries()) {
                            if (k.startsWith('pending_') && v.asset === (msg.active_name || msg.asset) && v.stake === (msg.price || this.config.stake)) {
                                matchedKey = k;
                                break;
                            }
                        }

                        if (matchedKey) {
                            const pendingData = this.pendingOrders.get(matchedKey)!;
                            pendingData.orderId = orderId;
                            this.pendingOrders.delete(matchedKey);
                            this.pendingOrders.set(orderId, pendingData);
                        } else {
                            if (!this.pendingOrders.get(orderId)) {
                                this.pendingOrders.set(orderId, {
                                    orderId: msg.id,
                                    asset: msg.active_name || msg.asset || 'Unknown',
                                    direction: msg.dir === 'call' ? 'CALL' : 'PUT',
                                    stake: msg.price || this.config.stake,
                                    openedAt: new Date().toISOString()
                                });
                            }
                        }
                        this.config.onLog(`[IQ] Ordem aberta com sucesso: #${orderId}`, 'success');

                        // Fix 3 — Race condition: resultado já chegou antes da abertura?
                        if (this.resultBuffer.has(orderId)) {
                            const buffered = this.resultBuffer.get(orderId)!
                            this.resultBuffer.delete(orderId)
                            this.config.onLog(`[IQ] 🔄 Resultado bufferizado encontrado para #${orderId} — resolvendo`, 'info')
                            this.handleTradeResult(buffered.msg)
                        }

                    } else if (data.name === 'socket-option-closed') {
                        // ── RESULTADO REAL DA IQ — alimenta martingale ───────────
                        this.handleTradeResult(data.msg);

                    } else if (data.name === 'listInfoData') {
                        // Ignorar silenciosamente (dados de mercado)
                    }
                } catch (e) {
                    if (IS_DEV) console.error('IQ WS Parse Error:', e);
                }
            };

            this.iqWs.onerror = () => {
                // Ignore standard onerror, it always triggers onclose right after
            };

            this.iqWs.onclose = (e) => {
                stopHeartbeat()
                if (this.isRunning) {
                    this.config.onLog('[CLIENTE] ⚠ Conexão IQ perdida.', 'warn');
                    if (this.heartbeatWorker) {
                        this.heartbeatWorker.terminate();
                        this.heartbeatWorker = null;
                    }
                    this.iqWs = null;

                    // Fix 1 — Backoff exponencial com cap 5 tentativas
                    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
                        this.config.onLog('[IQ] ❌ Máximo de tentativas atingido (5/5). Bot parado. Verifique o SSID.', 'error')
                        this.stop()
                        return
                    }
                    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 30000)
                    this.reconnectAttempts++
                    this.config.onLog(`[IQ] Reconectando em ${delay / 1000}s (tentativa ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`, 'warn')
                    IQMonitor.onReconnect()

                    // Fix 2 — cancela timer anterior antes de criar novo
                    if (this.reconnectTimeout) {
                        clearTimeout(this.reconnectTimeout);
                        this.reconnectTimeout = null;
                    }
                    this.reconnectTimeout = setTimeout(() => {
                        this.connectIQ();
                    }, delay);
                }
            };
        } catch (err: any) {
            this.config.onLog(`[CLIENTE] Erro crítico ao criar WebSocket IQ: ${err.message}`, 'error');
        }
    }

    private connectSignalServer() {
        if (!this.isRunning) return;

        this.config.onLog('[CLIENTE] Conectando ao servidor de sinais (VPS via Socket.io)...', 'info');
        
        try {
            // Note: Use http:// URL for socket.io, it handles WS upgrade automatically
            this.signalSocket = io(SIGNAL_SERVER_URL, { 
                transports: ['websocket', 'polling'], 
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 2000
            });

            this.signalSocket.on('connect', () => {
                this.config.onLog('[VPS] 📡 Link de sinais Socket.io estabelecido.', 'success');
                this.checkFullConnectionStatus();
            });

            this.signalSocket.on('signal', (data: any) => {
                this.config.onLog(`[SINAL] Recebido: ${data.asset || data.pair} ${data.direction}`, 'info');
                this.executeTrade(data);
            });

            this.signalSocket.on('disconnect', (reason) => {
                if (this.isRunning) {
                    this.config.onLog(`[CLIENTE] ⚠ Conexão com VPS perdida: ${reason}. Auto-reconectando...`, 'warn');
                }
            });

            this.signalSocket.on('connect_error', (error) => {
                 // Prevent spamming connect_error logs if connection is down long-term
                 // Just log it in dev mode
                 if (IS_DEV) console.error("Signal Socket.io Error", error);
            });

        } catch (err: any) {
            this.config.onLog(`[CLIENTE] Erro crítico Socket.io: ${err.message}`, 'error');
        }
    }

    private checkFullConnectionStatus() {
        // If both IQ heartbeat worker is active (meaning authenticated) and signal socket is connected
        if (this.heartbeatWorker && this.signalSocket && this.signalSocket.connected) {
            this.config.onStatus('connected');
            this.config.onLog('[CLIENTE] 🟢 Sistema V2 online. Aguardando sinais.', 'success');
        }
    }

    private startHeartbeatWorker() {
        // Fix 4 — limpa AMBOS os heartbeats antes de iniciar Worker
        if (this.heartbeatWorker) {
            this.heartbeatWorker.terminate();
            this.heartbeatWorker = null;
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        // Create an inline Web Worker for precise heartbeats (avoids browser background tab throttling)
        const workerCode = `
            let timer;
            self.onmessage = function(e) {
                if (e.data === 'start') {
                    timer = setInterval(() => {
                        self.postMessage('tick');
                    }, 9500); // Send slightly faster than 15s to be safe
                } else if (e.data === 'stop') {
                    clearInterval(timer);
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.heartbeatWorker = new Worker(URL.createObjectURL(blob));

        this.heartbeatWorker.onmessage = (e) => {
            if (e.data === 'tick') {
                try {
                    this.sendIQ({ name: 'heartbeat', msg: { heartbeatTime: Date.now() }});
                } catch {
                    // Ignore send errors during disconnects
                }
            }
        };

        this.heartbeatWorker.postMessage('start');
    }

    private sendIQ(message: any) {
        if (this.iqWs && this.iqWs.readyState === WebSocket.OPEN) {
            this.iqWs.send(JSON.stringify(message));
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  TRADE RESULT HANDLER — Real IQ WebSocket results
    // ═══════════════════════════════════════════════════════════════

    private handleTradeResult(msg: any) {
        const orderId = String(msg.id || '');
        const winField = msg.win;   // 'win' | 'equal' | 'loose'

        // Determine result
        let resultStatus: 'win' | 'loss' | 'tie';
        if (winField === 'win') {
            resultStatus = 'win';
        } else if (winField === 'equal') {
            resultStatus = 'tie';
        } else {
            resultStatus = 'loss';
        }

        // ── TIE HANDLER: campo 'equal' OU win_amount=0 e loss=0 (stalemate) ──────
        const isTie = resultStatus === 'tie' ||
            (!msg.id && Number(msg.win_amount) === 0 && Number(msg.loss) === 0)

        if (isTie) IQMonitor.onTie();

        if (isTie && !this.pendingOrders.has(orderId)) {
            // Resolve o pending mais antigo como empate (sem contar LOSS)
            const oldestKey = [...this.pendingOrders.keys()][0]
            if (oldestKey) {
                const p = this.pendingOrders.get(oldestKey)!
                this.config.onLog(`[IQ] 🟡 TIE detectado — resolvendo #${oldestKey} como empate (stake devolvida)`, 'info')
                if (p.resolver) p.resolver(false, 0, oldestKey)
                this.pendingOrders.delete(oldestKey)
            }
            return
        }

        // Fix 3 — Race condition: orderId ainda não está no Map (socket-option-opened não chegou ainda)
        if (!this.pendingOrders.has(orderId) && !isTie) {
            IQMonitor.onOutOfOrder();
            this.config.onLog(`[IQ] 🟡 Resultado #${orderId} chegou antes da abertura — bufferizando por 5s`, 'warn')
            this.resultBuffer.set(orderId, { msg, ts: Date.now() })
            setTimeout(() => this.resultBuffer.delete(orderId), 5000) // TTL 5s
            return
        }

        // Get pending order info (or fallback)
        const pending = this.pendingOrders.get(orderId);
        const asset = pending?.asset || msg.active_name || 'Unknown';
        const direction = pending?.direction || (msg.dir === 'call' ? 'CALL' : 'PUT');
        const stakeUsed = pending?.stake || Number(msg.amount) || this.config.stake;

        // Clean up pending
        this.pendingOrders.delete(orderId);

        // ── Calculate real profit ─────────────────────────────────
        let realProfit: number;
        if (resultStatus === 'win') {
            realProfit = Number(msg.win_amount) - stakeUsed;
            if (isNaN(realProfit) || realProfit <= 0) {
                realProfit = stakeUsed * 0.85; // fallback payout 85%
            }
        } else if (resultStatus === 'tie') {
            realProfit = 0;
        } else {
            realProfit = -stakeUsed;
        }

        // ── Update session PnL ────────────────────────────────────
        this.currentSessionPnl += realProfit;

        // ── Update Martingale state ───────────────────────────────
        if (resultStatus === 'loss') {
            this.consecutiveLosses++;
            this.config.onLog(
                `[IQ] ❌ LOSS #${orderId} | ${asset} | -$${stakeUsed.toFixed(2)} | Losses consecutivas: ${this.consecutiveLosses}`,
                'error'
            );
        } else if (resultStatus === 'win') {
            this.config.onLog(
                `[IQ] ✅ WIN #${orderId} | ${asset} | +$${realProfit.toFixed(2)} | Resetando martingale`,
                'success'
            );
            this.consecutiveLosses = 0;
        } else {
            this.config.onLog(
                `[IQ] ⚖️ EMPATE #${orderId} | ${asset} | $0.00`,
                'info'
            );
        }

        this.config.onLog(
            `[SESSÃO] PnL: $${this.currentSessionPnl.toFixed(2)} | Gale: ${this.consecutiveLosses}`,
            this.currentSessionPnl >= 0 ? 'success' : 'warn'
        );

        // ── Emit trade to frontend (onTrade callback) ─────────────
        this.config.onTrade({
            id: orderId,
            asset: asset,
            direction: direction,
            amount: stakeUsed,
            result: resultStatus,
            profit: realProfit,
            executed_at: pending?.openedAt || new Date().toISOString()
        });

        // ── Resolve Promise if it was initiated manually via sendOrder ──
        if (pending?.resolver) {
            // TIE resolve retorna false (sem win) e profit=0 (stake devolvida)
            pending.resolver(resultStatus === 'win', resultStatus === 'tie' ? 0 : realProfit, orderId);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  MANUAL ORDER EXECUTION (Awaits Result) — For IQQuant Gale
    // ═══════════════════════════════════════════════════════════════

    public async sendOrder(orderData: { asset: string, direction: string, amount: number, action?: string }): Promise<{ win: boolean, profit: number, orderId?: string, error?: string }> {
        if (!this.isRunning || !this.iqWs || this.iqWs.readyState !== WebSocket.OPEN || !this.activeBalanceId) {
            return { win: false, profit: 0, error: 'IQ Option desconectada ou carregando balanço' };
        }

        const asset = orderData.asset || 'EURUSD';
        const direction = orderData.direction || 'CALL';
        const currentStake = orderData.amount;
        const action = direction.toUpperCase() === 'CALL' ? 'call' : 'put';
        const expTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now

        return new Promise((resolve) => {
            const tempKey = `pending_${Date.now()}_${Math.random()}`;
            let resolved = false;

            const safeResolve = (win: boolean, profit: number, orderId?: string) => {
                if (resolved) return;
                resolved = true;
                resolve({ win, profit, orderId });
            };

            const timeout = setTimeout(() => {
                // Agente 4 — limpa do Map antes de forçar LOSS
                if (this.pendingOrders.has(tempKey)) {
                    this.config.onLog(`[IQ WS] ⏱️ Ordem ${tempKey} não resolvida em 90s — forçando LOSS`, 'error')
                    this.pendingOrders.delete(tempKey)
                }
                safeResolve(false, 0, undefined);
            }, 90000); // 90s max wait M1

            this.pendingOrders.set(tempKey, {
                orderId: tempKey,
                asset,
                direction: direction.toUpperCase(),
                stake: currentStake,
                openedAt: new Date().toISOString(),
                resolver: (win: boolean, profit: number, finalOrderId?: string) => {
                    clearTimeout(timeout);
                    safeResolve(win, profit, finalOrderId);
                }
            });

            this.sendIQ({
                name: 'changebalance',
                msg: { balance_id: Number(this.activeBalanceId) }
            });

            this.sendIQ({
                name: 'binary-options.open-option',
                msg: {
                    user_balance_id: Number(this.activeBalanceId),
                    active_id: this.getActiveId(asset),
                    option_type_id: 3,
                    direction: action,
                    expired: expTime,
                    refund_value: 0,
                    price: currentStake,
                    value: 0,
                    profit_percent: 85
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  TRADE EXECUTION — With real martingale & risk management
    // ═══════════════════════════════════════════════════════════════

    private executeTrade(signalData: any) {
        if (!this.isRunning) return;
        
        // ── RISK MANAGEMENT CHECK ──
        if (this.config.take_profit && this.currentSessionPnl >= this.config.take_profit) {
            this.config.onLog(`[RISCO] 🛑 Take Profit atingido ($${this.currentSessionPnl.toFixed(2)} >= $${this.config.take_profit}). Operações pausadas.`, 'success');
            return;
        }

        if (this.config.stop_loss && this.currentSessionPnl <= -this.config.stop_loss) {
            this.config.onLog(`[RISCO] 🛑 Stop Loss atingido ($${this.currentSessionPnl.toFixed(2)} <= -$${this.config.stop_loss}). Operações pausadas.`, 'error');
            return;
        }
        
        const asset = signalData.asset || signalData.pair || 'EURUSD';
        const direction = signalData.direction || signalData.action || 'CALL';
        
        // ── MARTINGALE LOGIC ──
        const maxGales = this.config.martingale_steps || 0;
        let currentStake = this.config.stake;
        
        if (this.consecutiveLosses > 0 && this.consecutiveLosses <= maxGales) {
            // Martingale: Stake * 2^Losses
            currentStake = currentStake * Math.pow(2, this.consecutiveLosses);
            this.config.onLog(`[GALE] 🛡️ Aplicando Martingale Nível ${this.consecutiveLosses}/${maxGales}. Nova stake: $${currentStake.toFixed(2)}`, 'warn');
        } else if (this.consecutiveLosses > maxGales && maxGales > 0) {
            this.config.onLog(`[RISCO] 🔄 Limite de Martingale (${maxGales}) atingido. Retornando aposta inicial $${this.config.stake.toFixed(2)}.`, 'info');
            this.consecutiveLosses = 0;
        }

        this.config.onLog(`[CLIENTE] ⚡ Executando ordem: ${asset} ${direction} $${currentStake.toFixed(2)}`, 'warn');

        // ── SEND REAL ORDER TO IQ OPTION ──
        const action = direction.toUpperCase() === 'CALL' ? 'call' : 'put';
        const expTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now

        // Switch to correct account type first
        if (this.activeBalanceId) {
            this.sendIQ({
                name: 'changebalance',
                msg: { balance_id: Number(this.activeBalanceId) }
            });
        }

        // Send binary options buy order
        this.sendIQ({
            name: 'binary-options.open-option',
            msg: {
                user_balance_id: Number(this.activeBalanceId),
                active_id: this.getActiveId(asset),
                option_type_id: 3,  // turbo (1min)
                direction: action,
                expired: expTime,
                refund_value: 0,
                price: currentStake,
                value: 0,
                profit_percent: 85
            }
        });

        // Store a temporary pending entry keyed by asset+time for matching 
        // (the real orderId comes from socket-option-opened)
    }

    /** Map asset names to IQ Option active_ids */
    private getActiveId(asset: string): number {
        const map: Record<string, number> = {
            'EURUSD': 1,
            'EURUSD-OTC': 76,
            'GBPUSD': 5,
            'GBPUSD-OTC': 68,
            'AUDUSD': 7,
            'AUDUSD-OTC': 78,
            'EURJPY': 3,
            'USDJPY': 2,
            'EURGBP': 6,
            'USDCHF': 4,
            'NZDUSD': 8,
            'CADCHF': 22,
            'AUDCAD': 14,
            'GBPJPY': 9,
            'USDCAD': 10,
        };
        return map[asset] || 1; // Default to EURUSD
    }
}
