import { createClient } from '@supabase/supabase-js';

// ── Tipos Baseados no Schema ───────────────────────────────────────────────

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

// ── Cliente HFT Isolado ────────────────────────────────────────────────────

// Utiliza import.meta.env (Vite) — apenas variáveis com prefixo VITE_ são expostas
const supabaseUrl = import.meta.env.VITE_HFT_SUPABASE_URL as string | undefined;

const supabaseAnonKey = import.meta.env.VITE_HFT_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ HFT Supabase environment variables are missing! Verifique NEXT_PUBLIC_HFT_SUPABASE_URL e NEXT_PUBLIC_HFT_SUPABASE_ANON_KEY no .env.local');
}

// Exportando o hftSupabase - cliente isolado para o schema_hft / banco separado
export const hftSupabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public',
    },
  }
);
