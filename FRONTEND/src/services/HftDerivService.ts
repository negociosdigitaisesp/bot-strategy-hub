// src/services/HftDerivService.ts
// [PASSO 3] Socket injetado — reutiliza a única conexão do DerivContext.
// Quando um WebSocket aberto é fornecido via parâmetro, NENHUMA nova conexão é criada.

export interface DerivExecutionResult {
  success: boolean;
  won: boolean;
  profit: number;
  error?: string;
  errorCode?: string;
  contractId?: number;
}

export interface DerivOrderParams {
  token: string;
  ativo: string;
  tipo: string; // 'CALL', 'PUT', 'DIGITDIFF', etc.
  stake: number;
  duration?: number; // em ticks ou minutos
  durationUnit?: 't' | 'm';
  digito?: number;
  /** [PASSO 3] Socket injetado do DerivContext — evita criar nova conexão */
  socket?: WebSocket | null;
}

export class HftDerivService {
  private static getAppId(): string {
    return (
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DERIV_APP_ID) ||
      '1089'
    );
  }

  // Pool de fallback — usado APENAS se socket não for injetado
  private static connections: Map<string, WebSocket> = new Map();

  // ── Mapeamento canônico → IDs aceitos pela Deriv ─────────────────────────
  private static readonly ASSET_MAP: Record<string, string> = {
    'R_10':    'R_10',
    'R_25':    'R_25',
    'R_50':    'R_50',
    'R_75':    'R_75',
    'R_100':   'R_100',
    '1HZ10V':  '1HZ10V',
    '1HZ25V':  '1HZ25V',
    '1HZ50V':  '1HZ50V',
    '1HZ75V':  '1HZ75V',
    '1HZ100V': '1HZ100V',
  };

  private static resolveSymbol(ativo: string): string {
    const upper = ativo.toUpperCase().trim();
    const mapped = this.ASSET_MAP[upper];
    if (!mapped) {
      console.warn(`[ASSET_MAP] '${ativo}' sem mapeamento. Enviando original para Deriv.`);
    }
    return mapped ?? upper;
  }

  // ── Jitter Queue — 250ms entre disparos consecutivos ─────────────────────
  private static orderQueue: Promise<void> = Promise.resolve();
  private static readonly JITTER_MS = 250;

  private static acquireSlot(): Promise<void> {
    const slot = this.orderQueue;
    this.orderQueue = slot.then(() => new Promise<void>(r => setTimeout(r, this.JITTER_MS)));
    return slot;
  }

  /**
   * [PASSO 3] Handshake inicial (Auth) — guarda WS aberto no pool de fallback.
   * Só usado quando socket injetado NÃO está disponível (ex: useHftExecutionBridge standalone).
   */
  public static async prepareConnection(ativo: string, token: string, injectedSocket?: WebSocket | null): Promise<boolean> {
    // Se socket injetado está aberto, não precisa de handshake adicional
    if (injectedSocket && injectedSocket.readyState === WebSocket.OPEN) {
      console.log('[HftDerivService] Usando socket injetado do DerivContext, skipping prepareConnection.');
      return true;
    }

    const symbol = this.resolveSymbol(ativo);
    return new Promise((resolve) => {
      if (this.connections.has(symbol)) {
        const ws = this.connections.get(symbol);
        if (ws && ws.readyState === WebSocket.OPEN) return resolve(true);
      }

      const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${this.getAppId()}`);

      const timeoutId = setTimeout(() => { ws.close(); resolve(false); }, 5000);

      ws.onopen = () => ws.send(JSON.stringify({ authorize: token }));
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.msg_type === 'authorize') {
          clearTimeout(timeoutId);
          if (data.error) { ws.close(); resolve(false); }
          else { this.connections.set(symbol, ws); resolve(true); }
        }
      };
      ws.onerror = () => { clearTimeout(timeoutId); resolve(false); };
    });
  }

  /**
   * Botão de Pânico — encerra todas as conexões do pool de fallback.
   */
  public static killAllConnections() {
    this.connections.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.close(); });
    this.connections.clear();
  }

  /**
   * [PASSO 3] Lê saldo.
   * Preferência: socket injetado → pool de fallback.
   */
  public static async getBalance(injectedSocket?: WebSocket | null): Promise<number> {
    let ws: WebSocket | null = injectedSocket && injectedSocket.readyState === WebSocket.OPEN
      ? injectedSocket
      : null;

    if (!ws) {
      // Fallback: qualquer WS aberto no pool
      for (const [, s] of this.connections) {
        if (s.readyState === WebSocket.OPEN) { ws = s; break; }
      }
    }
    if (!ws) return 0;

    return new Promise<number>((resolve) => {
      const reqId = Math.floor(Math.random() * 900000) + 100000;
      const timeout = setTimeout(() => { ws!.removeEventListener('message', handler); resolve(0); }, 3000);
      const handler = (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.req_id === reqId && data.msg_type === 'balance') {
            clearTimeout(timeout);
            ws!.removeEventListener('message', handler);
            resolve(parseFloat(data.balance?.balance ?? '0'));
          }
        } catch { /* ignore */ }
      };
      ws!.addEventListener('message', handler);
      ws!.send(JSON.stringify({ balance: 1, req_id: reqId }));
    });
  }

  /**
   * [PASSO 3] Executa ordem na Deriv.
   * Quando params.socket está aberto → usa DIRETAMENTE (zero novas conexões).
   * Fallback: pool de conexões pré-aquecidas.
   */
  public static async executeDerivOrder(
    params: DerivOrderParams
  ): Promise<DerivExecutionResult> {
    await this.acquireSlot();
    const symbol = this.resolveSymbol(params.ativo);

    return new Promise((resolve) => {
      let resolved = false;

      // [PASSO 3] Prioridade: socket injetado do DerivContext
      const injected = params.socket;
      const useInjected = injected && injected.readyState === WebSocket.OPEN;

      let ws: WebSocket;

      if (useInjected) {
        // Usa o único socket global — NENHUMA conexão nova criada ✅
        ws = injected!;
        console.log('[HftDerivService] Usando socket injetado — zero novas conexões.');
      } else {
        // Fallback: pool ou nova conexão
        const poolWs = this.connections.get(symbol);
        if (poolWs && poolWs.readyState === WebSocket.OPEN) {
          ws = poolWs;
        } else {
          ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${this.getAppId()}`);
          console.warn('[HftDerivService] Abrindo nova conexão de fallback (socket injetado indisponível).');
        }
      }

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (!useInjected) { ws.close(); this.connections.delete(symbol); }
          resolve({ success: false, won: false, profit: 0, error: 'Timeout', errorCode: 'Timeout' });
        }
      }, 15000);

      const sendBuy = (socket: WebSocket) => {
        const parameters: Record<string, string | number> = {
          amount: params.stake,
          basis: 'stake',
          contract_type: params.tipo.toUpperCase(),
          currency: 'USD',
          symbol: symbol,
          duration: 1,
          duration_unit: 'm',
        };
        if (params.digito !== undefined && params.tipo.includes('DIGIT')) {
          parameters.barrier = params.digito.toString();
        }
        socket.send(JSON.stringify({ buy: 1, subscribe: 1, price: params.stake, parameters }));
      };

      const handleMessage = (msg: MessageEvent) => {
        const data = JSON.parse(msg.data);

        if (data.error) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            if (!useInjected) { ws.close(); this.connections.delete(symbol); }
            // [PASSO 3] Remove listener se socket injetado
            if (useInjected) ws.removeEventListener('message', handleMessage);
            resolve({ success: false, won: false, profit: 0, error: data.error.message, errorCode: data.error.code });
          }
          return;
        }

        if (data.msg_type === 'authorize' && !useInjected) {
          sendBuy(ws);
        }

        if (data.msg_type === 'buy') {
          console.log('[HftDerivService] Compra aceita:', data);
        }

        if (data.msg_type === 'proposal_open_contract') {
          const contract = data.proposal_open_contract;
          if (
            contract.is_sold ||
            contract.status === 'sold' ||
            contract.status === 'won' ||
            contract.status === 'lost'
          ) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              if (useInjected) ws.removeEventListener('message', handleMessage);
              const profit = parseFloat(contract.profit);
              resolve({ success: true, won: contract.status === 'won', profit, contractId: contract.contract_id });
            }
          }
        }
      };

      if (useInjected) {
        // Usa addEventListener para não sobrescrever outros listeners no socket compartilhado
        ws.addEventListener('message', handleMessage);
        sendBuy(ws);
      } else {
        ws.onmessage = handleMessage;
        if (ws.readyState === WebSocket.OPEN) {
          sendBuy(ws);
        } else {
          ws.onopen = () => ws.send(JSON.stringify({ authorize: params.token }));
        }
        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            this.connections.delete(symbol);
            resolve({ success: false, won: false, profit: 0, error: 'Websocket connection error', errorCode: 'NetworkError' });
          }
        };
      }
    });
  }
}
