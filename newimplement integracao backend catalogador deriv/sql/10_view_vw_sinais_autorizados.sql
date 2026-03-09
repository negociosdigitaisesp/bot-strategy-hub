-- ============================================================
-- 10_view_vw_sinais_autorizados.sql
-- EXECUTAR NO SUPABASE B (Oracle Quant)
-- @INTEGRATOR_EXPERT: view consumida pelo Sniper na VPS
-- Cruza client_strategy_config com vw_grade_unificada
-- Retorna apenas sinais com ativo_flag=TRUE e status APROVADO/CONDICIONAL
-- ============================================================

CREATE OR REPLACE VIEW hft_lake.vw_sinais_autorizados AS
SELECT
  c.client_id,
  c.strategy_id,
  c.ativo_flag,

  -- stake_override do cliente tem prioridade; senão usa o stake da grade
  COALESCE(c.stake_override, g.stake_multiplier) AS stake_final,

  g.ativo,
  g.hh_mm,
  g.direcao,
  g.wr_g2,
  g.wr_1a,
  g.ev_g2,
  g.status,
  g.n_filtros,
  g.filtros_aprovados,
  g.n_total,
  g.n_hit,

  -- ID único para o Sniper identificar a estratégia
  c.strategy_id AS strategy_id_lake

FROM hft_lake.client_strategy_config c
JOIN hft_lake.vw_grade_unificada g
  ON c.strategy_id = g.strategy_id_lake
WHERE
  c.ativo_flag = TRUE
  AND g.status IN ('APROVADO', 'CONDICIONAL');

-- NOTA para o Sniper (VPS):
-- Consulta com: .eq("strategy_id", strategy_id) para filtrar por estratégia específica
-- Retorna todos os clientes autorizados para aquela estratégia no horário correto
