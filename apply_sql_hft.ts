import postgres from 'postgres';
import * as fs from 'fs';

const sql_hft = "postgresql://postgres:1CIwYGQv09MUQA@db.ypqekkkrfklaqlzhkbwg.supabase.co:5432/postgres";

async function run() {
  const sql = postgres(sql_hft);

  try {
    console.log("Applying vw_grade_unificada (v2 Soberana)...");
    const viewSql = fs.readFileSync('c:/Users/brend/Videos/bot-strategy-hub/bot-strategy-hub/bot-strategy-hub/newimplement/banco de dados/08_view_grade_unificada.sql', 'utf8');
    await sql.unsafe(viewSql);
    console.log("View vw_grade_unificada updated successfully.");

    console.log("Creating hft_audit_logs table...");
    await sql`
      CREATE TABLE IF NOT EXISTS public.hft_audit_logs (
          id BIGSERIAL PRIMARY KEY,
          client_id UUID NOT NULL,
          contract_id TEXT UNIQUE,
          bot_id TEXT NOT NULL,
          ativo TEXT NOT NULL,
          status TEXT DEFAULT 'PENDING',
          lucro_liquido NUMERIC DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log("Table hft_audit_logs ready.");

    console.log("Enabling Realtime for hft_audit_logs...");
    // Check if it's already in the publication to avoid errors
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'hft_audit_logs'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.hft_audit_logs;
        END IF;
      END $$;
    `;
    console.log("Realtime enabled.");

    console.log("Creating vw_daily_results...");
    await sql`
      CREATE OR REPLACE VIEW public.vw_daily_results AS
      SELECT 
          client_id,
          bot_id,
          COUNT(*) FILTER (WHERE status = 'WIN') as total_wins,
          COUNT(*) FILTER (WHERE status = 'LOSS') as total_losses,
          SUM(lucro_liquido) as profit_total
      FROM public.hft_audit_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY client_id, bot_id;
    `;
    console.log("View vw_daily_results ready.");

  } catch (err) {
    console.error("Error applying SQL:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
