/**
 * Verifica a estrutura atual das tabelas e aplica migração segura.
 * Uso: node supabase/migrate_iq_schema.cjs
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:8JRDwROj5lc8jDuDXV8W3AZXP@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

const MIGRATION_SQL = `
-- ─── Ver colunas existentes em iq_bots ─────────────────────
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'iq_bots';
`;

const SCHEMA_SQL = `
-- ==========================================================
-- MIGRAÇÃO SEGURA — IQ Bot Schema
-- ==========================================================

-- 1. CRIAR tabelas se não existirem
CREATE TABLE IF NOT EXISTS public.iq_bots (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  iq_email      text,
  iq_password_enc text,
  stake         numeric     NOT NULL DEFAULT 10,
  trader_id     text,
  mode          text        NOT NULL DEFAULT 'demo',
  is_active     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT iq_bots_user_id_unique UNIQUE (user_id)
);

-- 2. ADICIONAR colunas que podem não existir (ALTER TABLE IF NOT EXISTS coluna)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='iq_bots' AND column_name='iq_email'
  ) THEN ALTER TABLE public.iq_bots ADD COLUMN iq_email text; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='iq_bots' AND column_name='iq_password_enc'
  ) THEN ALTER TABLE public.iq_bots ADD COLUMN iq_password_enc text; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='iq_bots' AND column_name='stake'
  ) THEN ALTER TABLE public.iq_bots ADD COLUMN stake numeric NOT NULL DEFAULT 10; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='iq_bots' AND column_name='trader_id'
  ) THEN ALTER TABLE public.iq_bots ADD COLUMN trader_id text; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='iq_bots' AND column_name='mode'
  ) THEN ALTER TABLE public.iq_bots ADD COLUMN mode text NOT NULL DEFAULT 'demo'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='iq_bots' AND column_name='is_active'
  ) THEN ALTER TABLE public.iq_bots ADD COLUMN is_active boolean NOT NULL DEFAULT false; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='iq_bots' AND column_name='updated_at'
  ) THEN ALTER TABLE public.iq_bots ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(); END IF;
END $$;

-- 3. CRIAR tabela de logs de trades
CREATE TABLE IF NOT EXISTS public.iq_trade_logs (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id      uuid        NOT NULL REFERENCES public.iq_bots(id) ON DELETE CASCADE,
  asset       text        NOT NULL,
  direction   text        NOT NULL,
  result      text        NOT NULL,
  profit      numeric     NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now()
);

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS iq_trade_logs_bot_id_idx      ON public.iq_trade_logs (bot_id);
CREATE INDEX IF NOT EXISTS iq_trade_logs_executed_at_idx ON public.iq_trade_logs (executed_at DESC);
CREATE INDEX IF NOT EXISTS iq_bots_user_id_idx           ON public.iq_bots (user_id);

-- 5. RLS
ALTER TABLE public.iq_bots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iq_trade_logs ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES — recriar de forma idempotente
DROP POLICY IF EXISTS "iq_bots_select_own"   ON public.iq_bots;
DROP POLICY IF EXISTS "iq_bots_insert_own"   ON public.iq_bots;
DROP POLICY IF EXISTS "iq_bots_update_own"   ON public.iq_bots;
DROP POLICY IF EXISTS "iq_bots_delete_own"   ON public.iq_bots;
DROP POLICY IF EXISTS "iq_trades_select_own" ON public.iq_trade_logs;
DROP POLICY IF EXISTS "iq_trades_insert_own" ON public.iq_trade_logs;

CREATE POLICY "iq_bots_select_own" ON public.iq_bots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "iq_bots_insert_own" ON public.iq_bots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "iq_bots_update_own" ON public.iq_bots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "iq_bots_delete_own" ON public.iq_bots FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "iq_trades_select_own" ON public.iq_trade_logs
  FOR SELECT USING (bot_id IN (SELECT id FROM public.iq_bots WHERE user_id = auth.uid()));
CREATE POLICY "iq_trades_insert_own" ON public.iq_trade_logs
  FOR INSERT WITH CHECK (bot_id IN (SELECT id FROM public.iq_bots WHERE user_id = auth.uid()));

-- 7. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.iq_bots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.iq_trade_logs;

-- 8. TRIGGER updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS set_iq_bots_updated_at ON public.iq_bots;
CREATE TRIGGER set_iq_bots_updated_at
  BEFORE UPDATE ON public.iq_bots
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 9. VERIFICAÇÃO FINAL
SELECT 'iq_bots' AS tabela, count(*) AS linhas FROM public.iq_bots
UNION ALL
SELECT 'iq_trade_logs', count(*) FROM public.iq_trade_logs;
`;

async function main() {
    const client = new Client({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando ao Supabase...');
        await client.connect();
        console.log('✅ Conectado!\n');

        /* Verificar estrutura atual */
        const infoResult = await client.query(MIGRATION_SQL);
        const colunasExistentes = infoResult.rows.map(r => r.column_name);
        console.log('📋 Colunas atuais em iq_bots:', colunasExistentes.join(', ') || '(tabela não existe)');

        console.log('\n⚙️  Aplicando migração...');
        const results = await client.query(SCHEMA_SQL);

        /* A última query é o SELECT de verificação */
        const allResults = Array.isArray(results) ? results : [results];
        const lastResult = allResults[allResults.length - 1];
        if (lastResult?.rows?.length > 0) {
            console.log('\n📊 Status final das tabelas:');
            lastResult.rows.forEach(r => console.log(`   ✅ ${r.tabela}: ${r.linhas} linha(s)`));
        }

        console.log('\n🎉 Migração concluída com sucesso!');
        console.log('   ✅ iq_bots — todas as colunas presentes');
        console.log('   ✅ iq_trade_logs — criada');
        console.log('   ✅ RLS habilitado + Policies criadas');
        console.log('   ✅ Realtime habilitado');
        console.log('   ✅ Trigger updated_at configurado');

    } catch (err) {
        console.error('\n❌ Erro na migração:', err.message);
        console.error('Detail:', err.detail || '');
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
