-- ============================================================
-- DERIV ENGINE – Supabase Tables Setup
-- Projeto: GLITCH PROTOCOL V5.0 – Million Bots
-- Executar via: Supabase Studio SQL Editor ou CLI
-- ============================================================

-- ── Tabela: active_bots ─────────────────────────────────────
-- Controla quais clientes têm o bot Deriv LIGADO.
-- O frontend escreve aqui quando o usuário clica em "Ligar".
-- O engine Python lê esta tabela a cada 5 segundos.

CREATE TABLE IF NOT EXISTS active_bots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    broker          TEXT NOT NULL DEFAULT 'deriv',
    deriv_token     TEXT NOT NULL,
    strategy_id     TEXT NOT NULL DEFAULT 'digitdiff_v1',
    stake_amount    NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    is_active       BOOLEAN NOT NULL DEFAULT true,

    -- Configurações de gestão de risco (replicadas do frontend)
    use_martingale      BOOLEAN NOT NULL DEFAULT false,
    max_gale            INT NOT NULL DEFAULT 3,
    martingale_factor   NUMERIC(4, 2) NOT NULL DEFAULT 2.50,
    stop_win            NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    stop_loss           NUMERIC(10, 2) NOT NULL DEFAULT 25.00,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para buscas rápidas pelo engine
CREATE INDEX IF NOT EXISTS idx_active_bots_deriv_active
ON active_bots (broker, is_active)
WHERE broker = 'deriv' AND is_active = true;

-- Índice para busca por user_id
CREATE INDEX IF NOT EXISTS idx_active_bots_user_id
ON active_bots (user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_active_bots_updated_at ON active_bots;
CREATE TRIGGER set_active_bots_updated_at
BEFORE UPDATE ON active_bots
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ── Tabela: trade_history ────────────────────────────────────
-- O engine Python escreve aqui depois de executar cada ordem.
-- O frontend LEIA aqui para mostrar resultados (via Supabase Realtime).

CREATE TABLE IF NOT EXISTS trade_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    broker          TEXT NOT NULL DEFAULT 'deriv',
    strategy_id     TEXT NOT NULL,
    contract_type   TEXT,                   -- 'DIGITDIFF', 'CALL', 'PUT', etc.
    stake           NUMERIC(10, 2),
    status          TEXT NOT NULL,          -- 'opened', 'failed', 'auth_error', 'order_error', 'exception'
    profit          NUMERIC(10, 2) DEFAULT 0,
    contract_id     TEXT,                   -- ID do contrato na Deriv
    raw_response    JSONB,                  -- Resposta bruta da Deriv (para debug)
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas por usuário + data (mais recente primeiro)
CREATE INDEX IF NOT EXISTS idx_trade_history_user_date
ON trade_history (user_id, executed_at DESC);

-- Índice para queries por status (útil para analytics)
CREATE INDEX IF NOT EXISTS idx_trade_history_status
ON trade_history (status, executed_at DESC);

-- ── RLS Policies ────────────────────────────────────────────
-- active_bots: apenas o service_role pode ler/escrever (engine usa service_role)
-- Usuários autenticados podem ler/escrever seus próprios registros

ALTER TABLE active_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

-- Política: service_role tem acesso total (engine Python)
CREATE POLICY "service_role_full_access_active_bots"
ON active_bots FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_full_access_trade_history"
ON trade_history FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Política: usuários autenticados só veem seus próprios dados
CREATE POLICY "users_own_active_bots"
ON active_bots FOR ALL
TO authenticated
USING (user_id = auth.uid()::TEXT)
WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "users_own_trade_history"
ON trade_history FOR SELECT
TO authenticated
USING (user_id = auth.uid()::TEXT);

-- ── Verificação final ────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_bots')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trade_history')
    THEN
        RAISE NOTICE '✅ Tabelas active_bots e trade_history criadas com sucesso!';
    ELSE
        RAISE EXCEPTION '❌ Erro: tabelas não foram criadas corretamente.';
    END IF;
END $$;
