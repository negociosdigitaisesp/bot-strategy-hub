-- ============================================================
-- 11_signals_table_with_variacao.sql
-- EXECUTAR NO SUPABASE A (Million Bots) — banco principal
-- @DEBUG_SENTINEL: fix para variacao=null nos logs do console
-- ============================================================

-- Cria tabela signals se não existir com o campo variacao correto
CREATE TABLE IF NOT EXISTS public.signals (
  id           BIGSERIAL PRIMARY KEY,
  client_id    TEXT NOT NULL,        -- uid do Supabase A (vem do vw_sinais_autorizados)
  strategy_id  TEXT NOT NULL,        -- strategy_id_lake, ex: "T1430_R100_CALL"
  ativo        TEXT NOT NULL,        -- "R_10", "R_25", etc.
  hh_mm        TEXT NOT NULL,        -- "14:30"
  direcao      TEXT NOT NULL,        -- "CALL" ou "PUT"
  status       TEXT NOT NULL,        -- "PRE_SIGNAL" ou "CONFIRMED"

  -- @DEBUG_SENTINEL: este campo estava NULL — o VPS não enviava filtros_aprovados
  -- Deve conter: "FV1", "FV1, FV4", "FV2", etc.
  variacao     TEXT,                 -- filtros_aprovados da vw_grade_unificada

  stake_final  NUMERIC DEFAULT 1.0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Se a tabela já existe, garante que variacao existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'signals'
      AND column_name  = 'variacao'
  ) THEN
    ALTER TABLE public.signals ADD COLUMN variacao TEXT;
    RAISE NOTICE 'Coluna variacao adicionada à tabela signals';
  ELSE
    RAISE NOTICE 'Coluna variacao já existe';
  END IF;
END $$;

-- Índices para o Realtime filter e queries do frontend
CREATE INDEX IF NOT EXISTS idx_signals_client_id  ON public.signals(client_id);
CREATE INDEX IF NOT EXISTS idx_signals_strategy   ON public.signals(strategy_id);
CREATE INDEX IF NOT EXISTS idx_signals_status     ON public.signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.signals(created_at DESC);

-- RLS: cada cliente só vê seus próprios sinais
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Política para o frontend (usuário autenticado)
DROP POLICY IF EXISTS "cliente_ve_seus_sinais" ON public.signals;
CREATE POLICY "cliente_ve_seus_sinais"
  ON public.signals
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid()::text);

-- Política para o VPS inserir (service_role)
-- O VPS usa a service_role key — não precisa de política explícita (bypassa RLS)
-- Se usar anon key no VPS, criar:
-- CREATE POLICY "vps_insert_signals" ON public.signals FOR INSERT TO anon USING (true);

-- ============================================================
-- DIAGNÓSTICO: query para verificar se variacao está preenchida
-- SELECT id, strategy_id, variacao, status, created_at
-- FROM public.signals ORDER BY created_at DESC LIMIT 20;
-- ============================================================
