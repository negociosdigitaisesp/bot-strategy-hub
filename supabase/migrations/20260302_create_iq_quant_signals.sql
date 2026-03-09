-- ═══════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: public.iq_quant_signals
-- Banco HFT Quant (Supabase B) — Projeto: ypqekkkrfklaqlzhkbwg
-- Espelha hft_catalogo_estrategias (Deriv) para IQ Option
-- Execute em: https://supabase.com/dashboard/project/ypqekkkrfklaqlzhkbwg/sql/new
-- ═══════════════════════════════════════════════════════════════════════

-- Tabela de sinais do Sniper IQ → consumida pela extensão Chrome
CREATE TABLE IF NOT EXISTS public.iq_quant_signals (
  id                BIGSERIAL    PRIMARY KEY,
  ativo             TEXT         NOT NULL,           -- ex: "EURUSD-OTC"
  estrategia        TEXT         NOT NULL,           -- strategy_id do config_iq_lake.json
  direcao           TEXT         NOT NULL,           -- "CALL" | "PUT"
  p_win_historica   NUMERIC,                         -- win_rate_g2 (0.0–1.0)
  status            TEXT         NOT NULL DEFAULT 'PRE_SIGNAL',
  -- PRE_SIGNAL → CONFIRMED → executing → executed
  timestamp_sinal   BIGINT,                          -- epoch Deriv (segundos)
  contexto          JSONB,                           -- { win_counts, metrics, execution }
  created_at        TIMESTAMPTZ  DEFAULT now()
);

-- Índices para polling eficiente
CREATE INDEX IF NOT EXISTS idx_iq_signals_status
  ON public.iq_quant_signals (status);

CREATE INDEX IF NOT EXISTS idx_iq_signals_created_at
  ON public.iq_quant_signals (created_at DESC);

-- RLS: extensão lê com anon key — libera SELECT/UPDATE sem auth
ALTER TABLE public.iq_quant_signals ENABLE ROW LEVEL SECURITY;

-- Política: leitura pública (extensão usa anon key, sem auth.uid())
CREATE POLICY "allow_read_signals"
  ON public.iq_quant_signals FOR SELECT
  USING (true);

-- Política: insert para o sniper (service_role ou anon com permissão)
CREATE POLICY "allow_insert_signals"
  ON public.iq_quant_signals FOR INSERT
  WITH CHECK (true);

-- Política: update para a extensão marcar executing/executed
CREATE POLICY "allow_update_signals"
  ON public.iq_quant_signals FOR UPDATE
  USING (true);

-- Realtime: extensão pode usar tanto polling quanto Realtime no futuro
ALTER PUBLICATION supabase_realtime ADD TABLE public.iq_quant_signals;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO: rode após executar
-- SELECT id, ativo, direcao, status, created_at
-- FROM public.iq_quant_signals
-- ORDER BY created_at DESC LIMIT 5;
-- ═══════════════════════════════════════════════════════════════════════
