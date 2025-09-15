export interface RadarScalpingSignal {
  id: number;
  created_at: string;
  bot_name: string;
  is_safe_to_operate: boolean;
  reason: string | null;
  last_pattern_found: string | null;
  losses_in_last_10_ops: number | null;
  wins_in_last_5_ops: number | null;
  historical_accuracy: number | null;
  pattern_found_at: string | null;
  operations_after_pattern: number;
  auto_disable_after_ops: number;
  strategy_used: string | null;
  strategy_confidence: number | null;
  strategy_details: Record<string, any> | null;
  available_strategies: number;
  filters_applied: string[] | null;
  execution_time_ms: number;
  tracking_id: string | null;
}

export interface RadarScalpingStats {
  totalBots: number;
  safeBots: number;
  unsafeBots: number;
  averageAccuracy: number;
  averageConfidence: number;
}

export interface RadarScalpingFilters {
  showSafeOnly: boolean;
  minAccuracy: number;
  minConfidence: number;
  strategyFilter: string;
}