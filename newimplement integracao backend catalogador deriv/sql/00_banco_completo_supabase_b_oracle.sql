-- ============================================================
-- 00_banco_completo_supabase_b_oracle.sql
-- EXECUTAR NO SUPABASE B (Oracle Quant) — BANCO COMPLETO
-- Ordem de execução: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10
-- @INTEGRATOR_EXPERT: schema completo do data lake
-- ============================================================

-- ============================================================
-- 01 — Schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS hft_lake;

-- ============================================================
-- 02 — Tabela base de métricas brutas
-- ============================================================
CREATE TABLE IF NOT EXISTS hft_lake.hft_raw_metrics (
  id              BIGSERIAL PRIMARY KEY,
  ativo           TEXT NOT NULL,    -- "R_10", "R_25", "R_50", "R_75", "R_100"
  hh_mm           TEXT NOT NULL,    -- "00:00" até "23:59"
  direcao         TEXT NOT NULL,    -- "CALL" ou "PUT"

  -- Janela 30 dias
  n_30d           INT NOT NULL DEFAULT 0,
  win_1a_30d      INT NOT NULL DEFAULT 0,
  win_g1_30d      INT NOT NULL DEFAULT 0,
  win_g2_30d      INT NOT NULL DEFAULT 0,
  hit_30d         INT NOT NULL DEFAULT 0,

  -- Janela 7 dias
  n_7d            INT NOT NULL DEFAULT 0,
  win_1a_7d       INT NOT NULL DEFAULT 0,
  win_g1_7d       INT NOT NULL DEFAULT 0,
  win_g2_7d       INT NOT NULL DEFAULT 0,
  hit_7d          INT NOT NULL DEFAULT 0,

  -- Janela 3 dias
  n_3d            INT NOT NULL DEFAULT 0,
  win_1a_3d       INT NOT NULL DEFAULT 0,
  win_g1_3d       INT NOT NULL DEFAULT 0,
  win_g2_3d       INT NOT NULL DEFAULT 0,
  hit_3d          INT NOT NULL DEFAULT 0,

  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT hft_raw_metrics_upsert UNIQUE (ativo, hh_mm, direcao)
);

CREATE INDEX IF NOT EXISTS idx_raw_ativo    ON hft_lake.hft_raw_metrics(ativo);
CREATE INDEX IF NOT EXISTS idx_raw_hh_mm   ON hft_lake.hft_raw_metrics(hh_mm);
CREATE INDEX IF NOT EXISTS idx_raw_direcao  ON hft_lake.hft_raw_metrics(direcao);

-- ============================================================
-- 03 — FV1: Minuto Sólido (Score ponderado 60/40, EV obrigatório)
-- ============================================================
CREATE OR REPLACE VIEW hft_lake.vw_fv1_minuto_solido AS
SELECT
  ativo, hh_mm, direcao,
  n_30d AS n_total,
  ROUND((win_1a_30d::numeric / NULLIF(n_30d,0)), 4)                                AS wr_1a_30d,
  ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)   AS wr_g2_30d,
  ROUND(((win_1a_7d  + win_g1_7d  + win_g2_7d )::numeric / NULLIF(n_7d, 0)), 4)   AS wr_g2_7d,
  ROUND(
    (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.6) +
    (((win_1a_7d  + win_g1_7d  + win_g2_7d )::numeric / NULLIF(n_7d, 0)) * 0.4)
  , 4) AS score_30_7,
  ROUND(
    (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.85) -
    ((hit_30d::numeric / NULLIF(n_30d,0)) * 8.2)
  , 4) AS ev_g2,
  hit_30d AS n_hit,
  'FV1' AS filtro
FROM hft_lake.hft_raw_metrics
WHERE
  CASE WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20 ELSE n_30d >= 15 END
  AND ((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) >= 0.88
  AND (
    (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.85) -
    ((hit_30d::numeric / NULLIF(n_30d,0)) * 8.2)
  ) > 0.0
ORDER BY score_30_7 DESC;

-- ============================================================
-- 04 — FV2: Minuto de Primeira (EV positivo sem Gale)
-- ============================================================
CREATE OR REPLACE VIEW hft_lake.vw_fv2_minuto_de_primeira AS
SELECT
  ativo, hh_mm, direcao,
  n_30d AS n_total,
  ROUND((win_1a_30d::numeric / NULLIF(n_30d,0)), 4)                                AS wr_1a,
  ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)   AS wr_g2,
  ROUND(
    ((win_1a_30d::numeric / NULLIF(n_30d,0)) * 0.85) -
    (((n_30d - win_1a_30d)::numeric / NULLIF(n_30d,0)) * 1.0)
  , 4) AS ev_1a_puro,
  hit_30d AS n_hit,
  'FV2' AS filtro
FROM hft_lake.hft_raw_metrics
WHERE
  CASE WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20 ELSE n_30d >= 15 END
  AND (win_1a_30d::numeric / NULLIF(n_30d,0)) >= 0.55
  AND ((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) >= 0.88
ORDER BY wr_1a DESC;

-- ============================================================
-- 05 — FV3: Minuto Quente (Momentum 3 dias, ciclo limpo)
-- ============================================================
CREATE OR REPLACE VIEW hft_lake.vw_fv3_minuto_quente AS
SELECT
  ativo, hh_mm, direcao,
  n_30d AS n_total,
  n_3d  AS n_recente,
  ROUND(((win_1a_3d + win_g1_3d + win_g2_3d)::numeric / NULLIF(n_3d,0)), 4)       AS wr_g2_3d,
  ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)   AS wr_g2_30d,
  hit_3d AS n_hit_recente,
  'FV3' AS filtro
FROM hft_lake.hft_raw_metrics
WHERE
  CASE WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20 ELSE n_30d >= 15 END
  AND n_3d >= 2
  AND ((win_1a_3d + win_g1_3d + win_g2_3d)::numeric / NULLIF(n_3d,0)) >= 0.85
  AND hit_3d = 0
ORDER BY wr_g2_3d DESC, wr_g2_30d DESC;

-- ============================================================
-- 06 — FV4: Minuto Resiliente (máx 1 hit/semana, ciclo limpo)
-- ============================================================
CREATE OR REPLACE VIEW hft_lake.vw_fv4_minuto_resiliente AS
SELECT
  ativo, hh_mm, direcao,
  n_30d AS n_total,
  ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)   AS wr_g2,
  hit_30d AS n_hit_total,
  ROUND(hit_30d::numeric / 4.0, 2) AS hits_por_semana,
  ROUND(
    (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.85) -
    ((hit_30d::numeric / NULLIF(n_30d,0)) * 8.2)
  , 4) AS ev_g2,
  'FV4' AS filtro
FROM hft_lake.hft_raw_metrics
WHERE
  CASE WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20 ELSE n_30d >= 15 END
  AND ((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) >= 0.88
  AND (hit_30d::numeric / 4.0) <= 1.0
  AND hit_3d = 0
ORDER BY hits_por_semana ASC, wr_g2 DESC;

-- ============================================================
-- 07 — FV5: Minuto Dominante (assimetria CALL vs PUT >= 15pp)
-- ============================================================
CREATE OR REPLACE VIEW hft_lake.vw_fv5_minuto_dominante AS
WITH base AS (
  SELECT
    ativo, hh_mm, direcao, n_30d,
    ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4) AS wr_g2,
    hit_30d
  FROM hft_lake.hft_raw_metrics
  WHERE
    CASE WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20 ELSE n_30d >= 15 END
    AND ((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) >= 0.88
),
comparado AS (
  SELECT
    a.ativo, a.hh_mm, a.direcao, a.n_30d, a.wr_g2, a.hit_30d,
    b.wr_g2 AS wr_g2_oposto,
    ROUND(a.wr_g2 - COALESCE(b.wr_g2, 0), 4) AS assimetria
  FROM base a
  LEFT JOIN base b
    ON a.ativo = b.ativo AND a.hh_mm = b.hh_mm AND a.direcao != b.direcao
)
SELECT
  ativo, hh_mm, direcao,
  n_30d AS n_total,
  wr_g2, wr_g2_oposto, assimetria,
  hit_30d AS n_hit,
  'FV5' AS filtro
FROM comparado
WHERE assimetria >= 0.15
ORDER BY assimetria DESC, wr_g2 DESC;

-- ============================================================
-- 08 — Grade Unificada (consolida FV1-FV5, gera strategy_id_lake)
-- ============================================================
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
)
SELECT
  c.ativo,
  c.hh_mm,
  c.direcao,
  c.n_filtros,
  c.filtros_aprovados,
  m.wr_g2,
  m.wr_1a,
  m.ev_g2,
  m.n_30d AS n_total,
  m.n_hit,

  -- Status por convergência de filtros
  CASE
    WHEN c.n_filtros >= 4 THEN 'APROVADO'
    WHEN c.n_filtros >= 2 THEN 'CONDICIONAL'
    ELSE 'MONITORAMENTO'
  END AS status,

  -- Stake por convergência
  CASE
    WHEN c.n_filtros >= 4 THEN 1.0
    WHEN c.n_filtros >= 2 THEN 0.5
    ELSE 0.0
  END AS stake_multiplier,

  -- ID único: ex. "T1430_R100_CALL" — usado como strategy_id_lake
  CONCAT(
    'T',
    REPLACE(c.hh_mm, ':', ''),
    '_',
    REPLACE(c.ativo, '_', ''),
    '_',
    c.direcao
  ) AS strategy_id_lake

FROM contagem c
JOIN metricas m ON c.ativo = m.ativo AND c.hh_mm = m.hh_mm AND c.direcao = m.direcao
ORDER BY c.n_filtros DESC, m.ev_g2 DESC;

-- ============================================================
-- 09 — Tabela de configuração por cliente
-- ============================================================
CREATE TABLE IF NOT EXISTS hft_lake.client_strategy_config (
  id              BIGSERIAL PRIMARY KEY,
  client_id       TEXT NOT NULL,
  strategy_id     TEXT NOT NULL,
  ativo           TEXT NOT NULL,
  hh_mm           TEXT NOT NULL,
  direcao         TEXT NOT NULL,
  ativo_flag      BOOLEAN NOT NULL DEFAULT TRUE,
  stake_override  NUMERIC DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT client_strategy_unique UNIQUE (client_id, strategy_id)
);

CREATE INDEX IF NOT EXISTS idx_csc_client     ON hft_lake.client_strategy_config(client_id);
CREATE INDEX IF NOT EXISTS idx_csc_strategy   ON hft_lake.client_strategy_config(strategy_id);
CREATE INDEX IF NOT EXISTS idx_csc_ativo_flag ON hft_lake.client_strategy_config(ativo_flag);

ALTER TABLE hft_lake.client_strategy_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_acesso_por_client_id"
  ON hft_lake.client_strategy_config
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

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

-- ============================================================
-- 10 — View de sinais autorizados (consumida pelo Sniper/VPS)
-- ============================================================
CREATE OR REPLACE VIEW hft_lake.vw_sinais_autorizados AS
SELECT
  c.client_id,
  c.strategy_id,
  c.ativo_flag,
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
  c.strategy_id AS strategy_id_lake
FROM hft_lake.client_strategy_config c
JOIN hft_lake.vw_grade_unificada g
  ON c.strategy_id = g.strategy_id_lake
WHERE
  c.ativo_flag = TRUE
  AND g.status IN ('APROVADO', 'CONDICIONAL');
