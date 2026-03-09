import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ BANCO HFT QUANT — Catalogador Mayk (ypqekkkrfklaqlzhkbwg)
// Tabelas: hft_oracle_results, agent_cycles, hft_catalogo_estrategias
//
// ⚠️ REGRA DE ISOLAMENTO:
//    Este cliente é EXCLUSIVO da página /oracle-quant e seus hooks.
//    NÃO use este cliente para tabelas do banco Central
//    (profiles, iq_bots, calcular_estatisticas_por_periodo).
//    Para o banco Central → use src/lib/supabaseClient.ts
// ═══════════════════════════════════════════════════════════════════════════════

// ── Tipos Baseados no Schema HFT ────────────────────────────────────────────

export interface OracleResult {
  id?: number;
  ativo: string;
  estrategia: string;
  win_rate: number;
  n_amostral: number;
  ev_real: number;
  edge_vs_be: number;
  status: string; // 'APROVADO', 'CONDICIONAL'
  config_otimizada?: Record<string, any> | null;
  last_update?: string;
  p_value?: number | null;
  win_rate_gale1?: number | null;
  ev_gale1?: number | null;
  strategy_id?: string | null;
  sharpe?: number | null;
  sizing_override?: number | null; // 1.0 ou 0.5
  valid_until?: number | null;
  variacao_estrategia?: string | null;
  n_win_1a?: number;
  n_win_g1?: number;
  n_win_g2?: number;
  n_hit?: number;
  n_total?: number;
}

export interface Signal {
  entrar: boolean;
  tipo: string;
  ativo: string;
  digito: number;
  ev: number;
  percentil: number;
  rtt: number;
  ts: number;
}

// ── Cliente HFT Isolado ─────────────────────────────────────────────────────

const hftUrl = import.meta.env.VITE_HFT_SUPABASE_URL as string;
const hftAnonKey = import.meta.env.VITE_HFT_SUPABASE_ANON_KEY as string;

if (!hftUrl || !hftAnonKey) {
  console.error('❌ BANCO HFT: VITE_HFT_SUPABASE_URL ou VITE_HFT_SUPABASE_ANON_KEY ausentes no .env.local');
}

// Cliente isolado — BANCO HFT (SÓ para /oracle-quant)
export const hftSupabase = createClient(
  hftUrl || '',
  hftAnonKey || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-hft-auth', // ← Chave isolada do banco HFT
    },
    db: {
      schema: 'public',
    },
  }
);
