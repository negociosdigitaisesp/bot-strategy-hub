-- ═══════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: iq_quant.pending_trades
-- Banco HFT Quant (Supabase B) — Projeto: ypqekkkrfklaqlzhkbwg
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/ypqekkkrfklaqlzhkbwg/sql/new
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Schema
CREATE SCHEMA IF NOT EXISTS iq_quant;

-- 2. Tabela de sinais da VPS para a extensão executar
CREATE TABLE IF NOT EXISTS iq_quant.pending_trades (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID    NOT NULL,
  signal_id        TEXT    NOT NULL,
  ativo            TEXT    NOT NULL,          -- ex: "EURUSD-OTC"
  direcao          TEXT    NOT NULL,          -- "CALL" | "PUT"
  stake_g0         NUMERIC NOT NULL DEFAULT 1.0,
  stake_g1         NUMERIC NOT NULL DEFAULT 2.2,
  stake_g2         NUMERIC NOT NULL DEFAULT 5.0,
  gale_level       INT     DEFAULT 0,         -- 0 | 1 | 2
  status           TEXT    DEFAULT 'pending', -- pending | executing | executed | expired
  result           TEXT,                      -- win | loss | NULL (enquanto em aberto)
  profit           NUMERIC,
  idempotency_key  TEXT    UNIQUE,            -- evita execução dupla
  created_at       TIMESTAMPTZ DEFAULT now(),
  executed_at      TIMESTAMPTZ
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_pending_trades_client_status
  ON iq_quant.pending_trades (client_id, status);

CREATE INDEX IF NOT EXISTS idx_pending_trades_created_at
  ON iq_quant.pending_trades (created_at DESC);

-- 4. RLS
ALTER TABLE iq_quant.pending_trades ENABLE ROW LEVEL SECURITY;

-- Política: cliente vê apenas seus próprios trades
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pending_trades'
      AND schemaname = 'iq_quant'
      AND policyname = 'own_trades'
  ) THEN
    CREATE POLICY own_trades ON iq_quant.pending_trades
      FOR ALL
      USING (client_id::text = auth.uid()::text)
      WITH CHECK (client_id::text = auth.uid()::text);
  END IF;
END $$;

-- Política de serviço (para VPS inserir sinais via service_role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pending_trades'
      AND schemaname = 'iq_quant'
      AND policyname = 'service_insert'
  ) THEN
    CREATE POLICY service_insert ON iq_quant.pending_trades
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Realtime (para o React monitor receber updates em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE iq_quant.pending_trades;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO: Após executar, rode este SELECT para confirmar:
-- SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'iq_quant';
-- ═══════════════════════════════════════════════════════════════════════
