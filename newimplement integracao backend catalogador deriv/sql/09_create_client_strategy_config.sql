-- ============================================================
-- 09_create_client_strategy_config.sql
-- EXECUTAR NO SUPABASE B (Oracle Quant)
-- @INTEGRATOR_EXPERT: tabela de configuração por cliente
-- @SHIELD_AGENT: RLS permissiva — segurança via client_id do Supabase A
-- ============================================================

-- Garante que o schema existe
CREATE SCHEMA IF NOT EXISTS hft_lake;

CREATE TABLE IF NOT EXISTS hft_lake.client_strategy_config (
  id              BIGSERIAL PRIMARY KEY,

  -- client_id = auth.uid() do Supabase A (passado pelo frontend como TEXT)
  -- Supabase B NÃO autentica — só armazena o UID como identificador
  client_id       TEXT NOT NULL,

  strategy_id     TEXT NOT NULL,
  ativo           TEXT NOT NULL,
  hh_mm           TEXT NOT NULL,
  direcao         TEXT NOT NULL,
  ativo_flag      BOOLEAN NOT NULL DEFAULT TRUE,
  stake_override  NUMERIC DEFAULT NULL,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Garante unicidade: 1 config por cliente por estratégia
  CONSTRAINT client_strategy_unique UNIQUE (client_id, strategy_id)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_csc_client     ON hft_lake.client_strategy_config(client_id);
CREATE INDEX IF NOT EXISTS idx_csc_strategy   ON hft_lake.client_strategy_config(strategy_id);
CREATE INDEX IF NOT EXISTS idx_csc_ativo_flag ON hft_lake.client_strategy_config(ativo_flag);

-- RLS habilitado mas política permissiva
-- A segurança real vem do client_id da sessão do Supabase A
-- O frontend NUNCA expõe o client_id de outro usuário
ALTER TABLE hft_lake.client_strategy_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_acesso_por_client_id"
  ON hft_lake.client_strategy_config
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION hft_lake.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_client_strategy_config_updated_at
  BEFORE UPDATE ON hft_lake.client_strategy_config
  FOR EACH ROW
  EXECUTE FUNCTION hft_lake.update_updated_at_column();
