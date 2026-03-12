/**
 * derivApiService.ts
 * Gestão do WebSocket para Oracle Quant.
 * @MISSION: Fix Definitivo Oracle Quant — WebSocket Execution Engine
 */

import { WsReadyState } from '../types/derivExecution';

const APP_ID = 1089;
const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`;
const PING_INTERVAL_MS = 30000;
const PONG_TIMEOUT_MS = 8000;
const RECONNECT_BACKOFF_MS = 1500;

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

  constructor() {
    // Inicialização adiada para quando o token estiver disponível
  }

  public async ensureConnected(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
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
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('[DB] WebSocket aberto');
      this.readyState = 'OPEN';
      this.missedPongs = 0;
      this.startHeartbeat();
      
      // Re-autenticar
      this.send({ authorize: token }).then((resp) => {
        if (resp.error) {
          console.error('[DB] Erro na re-autenticação:', resp.error);
          return;
        }
        console.log('[DB] Autenticado com sucesso');
        
        // Re-subscribir ao Transaction Stream
        this.send({ transaction: 1, subscribe: 1 });
        
        // Emitir evento de reconexão
        this.onReconnectedCallbacks.forEach(cb => cb());
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.msg_type === 'pong') {
          this.handlePong();
          return;
        }

        if (msg.req_id && this.messageHandlers.has(msg.req_id)) {
          const handler = this.messageHandlers.get(msg.req_id);
          if (handler) {
            handler(msg);
            this.messageHandlers.delete(msg.req_id);
          }
        } else {
          // Encaminhar para handlers globais (ex: transaction stream)
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
  }

  public send(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket não está aberto'));
        return;
      }

      const req_id = Date.now() + Math.floor(Math.random() * 1000);
      this.messageHandlers.set(req_id, (msg) => {
        if (msg.error) reject(msg.error);
        else resolve(msg);
      });

      this.ws.send(JSON.stringify({ ...request, req_id }));
    });
  }

  public addGlobalHandler(handler: (msg: any) => void): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  public onReconnected(cb: () => void): () => void {
    this.onReconnectedCallbacks.add(cb);
    return () => this.onReconnectedCallbacks.delete(cb);
  }

  private startHeartbeat(): void {
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

  private handlePong(): void {
    this.missedPongs = 0;
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  public async forceReconnect(reason: string): Promise<void> {
    console.warn(`[DB] Iniciando forceReconnect. Motivo: ${reason}`);
    
    if (reason === 'ZOMBIE_DETECTED') {
      this.readyState = 'ZOMBIE';
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.cleanup();
    this.reconnecting = true;

    await new Promise(resolve => setTimeout(resolve, RECONNECT_BACKOFF_MS));
    
    this.reconnecting = false;
    await this.connect();
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    this.messageHandlers.clear();
  }

  public getReadyState(): WsReadyState {
    return this.readyState;
  }

  public getRawSocket(): WebSocket | null {
    return this.ws;
  }
}

export const derivApiService = new DerivApiService();
