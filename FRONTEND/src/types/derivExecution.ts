// derivExecution.ts — fonte da verdade. Toda lógica é escrava deste arquivo.

export type GaleLevel = 0 | 1 | 2;
export type ContractDirection = 'CALL' | 'PUT';
export type SeriesResult = 'WIN' | 'LOSS' | 'TIMEOUT_UNKNOWN';
export type WsReadyState = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'ZOMBIE';

// Contexto criado no momento do BUY — imutável após criação
export interface TradeContext {
  readonly reqId: number;          // gerado localmente: Date.now()
  readonly asset: string;          // ex: "R_100"
  readonly direction: ContractDirection;
  readonly stake: number;
  readonly galeLevel: GaleLevel;
  readonly seriesId: string;       // UUID da série (G0+G1+G2 compartilham o mesmo)
  readonly sentAt: number;         // Date.now() no momento do send
}

// Criado após receber a resposta do BUY — contém o ID real da Deriv
export interface ActiveContract extends TradeContext {
  readonly contractId: number;     // msg.buy.contract_id — número real da Deriv
  readonly abortController: AbortController;
  readonly fallbackTimer: ReturnType<typeof setTimeout>;
}

// Resultado de uma série completa de Gale
export interface SeriesOutcome {
  readonly seriesId: string;
  readonly finalResult: SeriesResult;
  readonly finalGaleLevel: GaleLevel;
  readonly totalStake: number;     // soma de todas as stakes da série
  readonly profit: number;         // lucro/prejuízo real em USD
  readonly resolvedAt: number;
}

// Estado de recuperação persistido no localStorage
export interface GaleRecoveryState {
  readonly seriesId: string;
  readonly galeLevel: GaleLevel;
  readonly contractId: number;     // ID real da Deriv — NÃO usar client_id
  readonly asset: string;
  readonly direction: ContractDirection;
  readonly stake: number;
  readonly savedAt: number;
}
