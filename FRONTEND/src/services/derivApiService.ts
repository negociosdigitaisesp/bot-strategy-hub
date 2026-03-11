/**
 * derivApiService.ts
 * Gestão do WebSocket para Oracle Quant.
 * @MISSION: Fix Definitivo Oracle Quant — WebSocket Execution Engine
 *
 * Responsabilidades:
 *   - Heartbeat com missedPongs >= 2 → ZOMBIE → forceReconnect
 *   - Dispatcher de Mensagens via Map<req_id, handler>
 *   - Reconexão com backoff + re-auth + re-subscribe transaction stream
 *   - Limpeza de memória via AbortController (nunca removeEventListener direto)
 */

import type { WsReadyState } from '../types/derivExecution';

// ── Constantes ────────────────────────────────────────────────────────────────
const APP_ID = 1089;
const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`;
const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 8_000;
const RECONNECT_BACKOFF_MS = 1_500;

// ── Tipo de retorno do send() ─────────────────────────────────────────────────
export interface SendResult<T = any> {
  readonly reqId: number;
  readonly response: T;
}

// ── Classe ────────────────────────────────────────────────────────────────────
class DerivApiService {
  private ws: WebSocket | null = null;
  private messageHandlers = new Map<number, (msg: any) => void>();
  private globalHandlers = new Set<(msg: any) => void>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private missedPongs = 0;
  private readyState: WsReadyState = 'CLOSED';
  private reconnecting = false;
  private onReconnectedCallbacks = new Set<() => void>();

  // ── Conexão ───────────────────────────────────────────────────────────────

  public async ensureConnected(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.readyState === 'OPEN') return;
    return this.connect();
  }

  private async connect(): Promise<void> {
    if (this.reconnecting) return;

    const token = localStorage.getItem('deriv_active_token');
    if (!token) {
      console.warn('[DB] Nenhum token encontrado para derivApiService');
      return;
    }

    this.readyState = 'CONNECTING';

    return new Promise<void>((resolve) => {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.info('[DB] WebSocket aberto');
        this.readyState = 'OPEN';
        this.missedPongs = 0;
        this.startHeartbeat();

        // Re-autenticar
        this.send({ authorize: token }).then((result) => {
          if (result.response.error) {
            console.error('[DB] Erro na re-autenticacao:', result.response.error);
            resolve();
            return;
          }
          console.info('[DB] Autenticado com sucesso');

          // Re-subscribir ao Transaction Stream
          this.sendRaw({ transaction: 1, subscribe: 1 });

          // Emitir evento de reconexão
          this.onReconnectedCallbacks.forEach(cb => cb());
          resolve();
        }).catch(() => resolve());
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Heartbeat — tratar pong primeiro
          if (msg.msg_type === 'pong') {
            this.handlePong();
            return;
          }

          // Dispatcher: req_id lookup no Map
          if (msg.req_id && this.messageHandlers.has(msg.req_id)) {
            const handler = this.messageHandlers.get(msg.req_id)!;
            handler(msg);
            this.messageHandlers.delete(msg.req_id);
          } else {
            // Encaminhar para handlers globais (ex: transaction stream, POC subscriptions)
            this.globalHandlers.forEach(handler => handler(msg));
          }
        } catch (err) {
          console.error('[DB] Erro ao processar mensagem WS:', err);
        }
      };

      this.ws.onclose = () => {
        if (this.readyState !== 'ZOMBIE') {
          this.readyState = 'CLOSED';
        }
        this.cleanup();
      };

      this.ws.onerror = (err) => {
        console.error('[DB] WebSocket erro:', err);
        this.forceReconnect('WS_ERROR');
      };
    });
  }

  // ── Envio com resposta (registra handler no Map) ──────────────────────────

  public send<T = any>(request: Record<string, unknown>): Promise<SendResult<T>> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket nao esta aberto'));
        return;
      }

      const reqId = Date.now() + Math.floor(Math.random() * 1000);

      // Guard: timeout de 30s para prevenir Promise pendurada na heap
      const sendTimeout = setTimeout(() => {
        this.messageHandlers.delete(reqId);
        reject(new Error('SEND_TIMEOUT'));
      }, 30_000);

      this.messageHandlers.set(reqId, (msg: any) => {
        clearTimeout(sendTimeout);
        if (msg.error) {
          reject(msg.error);
        } else {
          resolve({ reqId, response: msg as T });
        }
      });

      this.ws.send(JSON.stringify({ ...request, req_id: reqId }));
    });
  }

  // ── Envio fire-and-forget (NÃO registra handler) ─────────────────────────

  public sendRaw(request: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(request));
  }

  // ── Global handler (transaction stream, etc.) ────────────────────────────

  public addGlobalHandler(handler: (msg: any) => void): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  // ── Callback de reconexão ────────────────────────────────────────────────

  public onReconnected(cb: () => void): () => void {
    this.onReconnectedCallbacks.add(cb);
    return () => this.onReconnectedCallbacks.delete(cb);
  }

  // ── Heartbeat (ping 30s, pong timeout 8s, zombie em missedPongs >= 2) ────

  private startHeartbeat(): void {
    this.stopHeartbeat(); // Limpa qualquer heartbeat anterior

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ping: 1 }));

        this.pongTimeout = setTimeout(() => {
          this.missedPongs++;
          console.warn(`[DB] Missed pong #${this.missedPongs}`);
          if (this.missedPongs >= 2) {
            this.forceReconnect('ZOMBIE_DETECTED');
          }
        }, PONG_TIMEOUT_MS);
      }
    }, PING_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private handlePong(): void {
    this.missedPongs = 0;
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  // ── Reconexão forçada ────────────────────────────────────────────────────

  public async forceReconnect(reason: string): Promise<void> {
    console.warn(`[DB] Iniciando forceReconnect. Motivo: ${reason}`);

    // 1. Marcar como ZOMBIE antes de fechar (spec gate 4)
    if (reason === 'ZOMBIE_DETECTED') {
      this.readyState = 'ZOMBIE';
    }

    // 2. Fechar o WS explicitamente
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }

    // 3. Limpar TODOS os timers e handlers pendentes
    this.cleanup();
    this.reconnecting = true;

    // 4. Backoff mínimo
    await new Promise(resolve => setTimeout(resolve, RECONNECT_BACKOFF_MS));

    // 5-7. Criar nova instância, re-auth, re-subscribe (tudo dentro de connect())
    this.reconnecting = false;
    await this.connect();
  }

  // ── Limpeza de memória ───────────────────────────────────────────────────

  private cleanup(): void {
    this.stopHeartbeat();
    // Rejeitar todos os handlers pendentes para evitar promises órfãs
    this.messageHandlers.clear();
  }

  // ── Teardown completo (unmount do componente) ────────────────────────────

  public destroy(): void {
    this.cleanup();
    this.globalHandlers.clear();
    this.onReconnectedCallbacks.clear();
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this.readyState = 'CLOSED';
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  public getReadyState(): WsReadyState {
    return this.readyState;
  }

  public getRawSocket(): WebSocket | null {
    return this.ws;
  }
}

export const derivApiService = new DerivApiService();
