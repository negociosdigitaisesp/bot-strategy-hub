export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING' | 'TICK' | 'WAITING';
  message: string;
  subMessage?: string;
  profit?: number;
}

export interface TradingStats {
  balance: number;
  totalProfit: number;
  wins: number;
  losses: number;
  totalOps: number;
}

export interface BotConfig {
  stake: number;
  stopLoss: number;
  takeProfit: number;
  useMartingale: boolean;
}