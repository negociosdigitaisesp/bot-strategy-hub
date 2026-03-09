-- @INTEGRATOR_EXPERT: Filtro de concorrência atômica

DROP VIEW IF EXISTS hft_lake.vw_grade_unificada CASCADE;

CREATE OR REPLACE VIEW hft_lake.vw_grade_unificada AS
WITH convergencia AS (
  SELECT ativo, hh_mm, direcao, 'FV1' AS filtro FROM hft_lake.vw_fv1_minuto_solido
  UNION ALL
  SELECT ativo, hh_mm, direcao, 'FV2' AS filtro FROM hft_lake.vw_fv2_minuto_de_primeira
  UNION ALL
  SELECT ativo, hh_mm, direcao, 'FV3' AS filtro FROM hft_lake.vw_fv3_minuto_quente
  UNION ALL
  SELECT ativo, hh_mm, direcao, 'FV4' AS filtro FROM hft_lake.vw_fv4_minuto_resiliente
  UNION ALL
  SELECT ativo, hh_mm, direcao, 'FV5' AS filtro FROM hft_lake.vw_fv5_minuto_dominante
),
contagem AS (
  SELECT
    ativo, hh_mm, direcao,
    COUNT(*) AS n_filtros,
    STRING_AGG(filtro, ', ' ORDER BY filtro) AS filtros_aprovados
  FROM convergencia
  GROUP BY ativo, hh_mm, direcao
),
metricas AS (
  SELECT
    ativo, hh_mm, direcao,
    ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)  AS wr_g2,
    ROUND((win_1a_30d::numeric / NULLIF(n_30d,0)), 4)                               AS wr_1a,
    ROUND(
      (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.85) -
      ((hit_30d::numeric / NULLIF(n_30d,0)) * 8.2)
    , 4) AS ev_g2,
    n_30d,
    hit_30d AS n_hit
  FROM hft_lake.hft_raw_metrics
),
-- AQUI COMEÇA O MINUTO SOBERANO
ranking_por_minuto AS (
  SELECT
    c.*, m.wr_g2, m.wr_1a, m.ev_g2, m.n_30d as n_total, m.n_hit,
    ROW_NUMBER() OVER (
        PARTITION BY c.hh_mm 
        ORDER BY m.ev_g2 DESC, c.n_filtros DESC
    ) as rank_minuto
  FROM contagem c
  JOIN metricas m ON c.ativo = m.ativo AND c.hh_mm = m.hh_mm AND c.direcao = m.direcao
)
SELECT
  ativo, hh_mm, direcao, n_filtros, filtros_aprovados, wr_g2, wr_1a, ev_g2, n_total, n_hit,
  
  -- Status baseado em convergência
  CASE
    WHEN n_filtros >= 4 THEN 'APROVADO'
    WHEN n_filtros >= 2 THEN 'CONDICIONAL'
    ELSE 'MONITORAMENTO'
  END AS status,

  -- Stake baseado em convergência
  CASE
    WHEN n_filtros >= 4 THEN 1.0
    WHEN n_filtros >= 2 THEN 0.5
    ELSE 0.0
  END AS stake_multiplier,

  -- ID único padrão LAKE
  CONCAT('T', REPLACE(hh_mm, ':', ''), '_LAKE_', REPLACE(ativo, '_', ''), '_', direcao) AS strategy_id_lake

FROM ranking_por_minuto
WHERE rank_minuto = 1 -- SÓ DEIXA PASSAR O MELHOR DE CADA MINUTO
ORDER BY hh_mm ASC;
