-- 01_create_schema.sql
CREATE SCHEMA IF NOT EXISTS hft_lake;

-- 02_create_hft_raw_metrics.sql
CREATE TABLE IF NOT EXISTS hft_lake.hft_raw_metrics (
  id              BIGSERIAL PRIMARY KEY,

  -- Identificadores
  ativo           TEXT NOT NULL,    -- "R_10", "R_25", "R_50", "R_75", "R_100"
  hh_mm           TEXT NOT NULL,    -- "00:00" até "23:59"
  direcao         TEXT NOT NULL,    -- "CALL" ou "PUT"

  -- Janela 30 dias (histórico completo)
  n_30d           INT NOT NULL DEFAULT 0,
  win_1a_30d      INT NOT NULL DEFAULT 0,
  win_g1_30d      INT NOT NULL DEFAULT 0,
  win_g2_30d      INT NOT NULL DEFAULT 0,
  hit_30d         INT NOT NULL DEFAULT 0,

  -- Janela 7 dias (recência)
  n_7d            INT NOT NULL DEFAULT 0,
  win_1a_7d       INT NOT NULL DEFAULT 0,
  win_g1_7d       INT NOT NULL DEFAULT 0,
  win_g2_7d       INT NOT NULL DEFAULT 0,
  hit_7d          INT NOT NULL DEFAULT 0,

  -- Janela 3 dias (momentum)
  n_3d            INT NOT NULL DEFAULT 0,
  win_1a_3d       INT NOT NULL DEFAULT 0,
  win_g1_3d       INT NOT NULL DEFAULT 0,
  win_g2_3d       INT NOT NULL DEFAULT 0,
  hit_3d          INT NOT NULL DEFAULT 0,

  -- Controle
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Chave única: um ativo+horário+direção por upload
  CONSTRAINT hft_raw_metrics_upsert UNIQUE (ativo, hh_mm, direcao)
);

-- Índices para performance das Views
CREATE INDEX IF NOT EXISTS idx_raw_ativo   ON hft_lake.hft_raw_metrics(ativo);
CREATE INDEX IF NOT EXISTS idx_raw_hh_mm  ON hft_lake.hft_raw_metrics(hh_mm);
CREATE INDEX IF NOT EXISTS idx_raw_direcao ON hft_lake.hft_raw_metrics(direcao);

-- 03_view_fv1_minuto_solido.sql
-- FV1 — Minuto Sólido (Substituto da V4)
-- Horários que ganham consistentemente nos 30 dias E confirmam nos últimos 7.
-- Score ponderado 60/40. EV positivo obrigatório.

CREATE OR REPLACE VIEW hft_lake.vw_fv1_minuto_solido AS
SELECT
  ativo,
  hh_mm,
  direcao,
  n_30d                                                                              AS n_total,

  -- Win Rates calculadas
  ROUND((win_1a_30d::numeric / NULLIF(n_30d,0)), 4)                                AS wr_1a_30d,
  ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)   AS wr_g2_30d,
  ROUND(((win_1a_7d  + win_g1_7d  + win_g2_7d )::numeric / NULLIF(n_7d, 0)), 4)   AS wr_g2_7d,

  -- Score ponderado 60/40
  ROUND(
    (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.6) +
    (((win_1a_7d  + win_g1_7d  + win_g2_7d )::numeric / NULLIF(n_7d, 0)) * 0.4)
  , 4)                                                                               AS score_30_7,

  -- EV Gale 2 (payout 85%, custo hit = 8.2 unidades)
  ROUND(
    (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.85) -
    ((hit_30d::numeric / NULLIF(n_30d,0)) * 8.2)
  , 4)                                                                               AS ev_g2,

  hit_30d                                                                            AS n_hit,
  'FV1'                                                                              AS filtro

FROM hft_lake.hft_raw_metrics
WHERE
  -- N mínimo por grupo de volatilidade
  CASE
    WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20
    ELSE n_30d >= 15
  END
  -- WR G2 mínima (break-even de segurança)
  AND ((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) >= 0.88
  -- EV positivo obrigatório
  AND (
    (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.85) -
    ((hit_30d::numeric / NULLIF(n_30d,0)) * 8.2)
  ) > 0.0

ORDER BY score_30_7 DESC;

-- 04_view_fv2_minuto_de_primeira.sql
-- FV2 — Minuto de Primeira
-- Horários onde a primeira entrada já ganha sem depender do Gale.
-- Estratégia mais robusta — baixo drawdown real.

CREATE OR REPLACE VIEW hft_lake.vw_fv2_minuto_de_primeira AS
SELECT
  ativo,
  hh_mm,
  direcao,
  n_30d                                                                              AS n_total,
  ROUND((win_1a_30d::numeric / NULLIF(n_30d,0)), 4)                                AS wr_1a,
  ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)   AS wr_g2,

  -- EV da primeira entrada pura (payout 85%)
  ROUND(
    ((win_1a_30d::numeric / NULLIF(n_30d,0)) * 0.85) -
    (((n_30d - win_1a_30d)::numeric / NULLIF(n_30d,0)) * 1.0)
  , 4)                                                                               AS ev_1a_puro,

  hit_30d                                                                            AS n_hit,
  'FV2'                                                                              AS filtro

FROM hft_lake.hft_raw_metrics
WHERE
  CASE
    WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20
    ELSE n_30d >= 15
  END
  -- Ganha de primeira na maioria dos ciclos (EV positivo sem Gale)
  AND (win_1a_30d::numeric / NULLIF(n_30d,0)) >= 0.55
  -- WR G2 mínima mantida
  AND ((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) >= 0.88

ORDER BY wr_1a DESC;

-- 05_view_fv3_minuto_quente.sql
-- FV3 — Minuto Quente (Momentum 3 Dias)
-- Horários em ciclo ativo agora. Captura o padrão algorítmico corrente.

CREATE OR REPLACE VIEW hft_lake.vw_fv3_minuto_quente AS
SELECT
  ativo,
  hh_mm,
  direcao,
  n_30d                                                                              AS n_total,
  n_3d                                                                               AS n_recente,
  ROUND(((win_1a_3d + win_g1_3d + win_g2_3d)::numeric / NULLIF(n_3d,0)), 4)       AS wr_g2_3d,
  ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)   AS wr_g2_30d,
  hit_3d                                                                             AS n_hit_recente,
  'FV3'                                                                              AS filtro

FROM hft_lake.hft_raw_metrics
WHERE
  -- N mínimo no histórico (base estatística)
  CASE
    WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20
    ELSE n_30d >= 15
  END
  -- N mínimo nos últimos 3 dias (precisa ter ocorrido)
  AND n_3d >= 2
  -- Quente agora: WR G2 dos últimos 3 dias acima de 85%
  AND ((win_1a_3d + win_g1_3d + win_g2_3d)::numeric / NULLIF(n_3d,0)) >= 0.85
  -- Sem hit nos últimos 3 dias (ciclo limpo)
  AND hit_3d = 0

ORDER BY wr_g2_3d DESC, wr_g2_30d DESC;

-- 06_view_fv4_minuto_resiliente.sql
-- FV4 — Minuto Resiliente (Proteção de Sequência)
-- Horários que erram isolado — nunca em sequência.
-- Protege a banca de drawdowns concentrados.

CREATE OR REPLACE VIEW hft_lake.vw_fv4_minuto_resiliente AS
SELECT
  ativo,
  hh_mm,
  direcao,
  n_30d                                                                              AS n_total,
  ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)   AS wr_g2,
  hit_30d                                                                            AS n_hit_total,

  -- Hits por semana (média)
  ROUND(hit_30d::numeric / 4.0, 2)                                                  AS hits_por_semana,

  -- EV Gale 2
  ROUND(
    (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.85) -
    ((hit_30d::numeric / NULLIF(n_30d,0)) * 8.2)
  , 4)                                                                               AS ev_g2,

  'FV4'                                                                              AS filtro

FROM hft_lake.hft_raw_metrics
WHERE
  CASE
    WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20
    ELSE n_30d >= 15
  END
  AND ((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) >= 0.88
  -- Máximo 1 hit por semana em média (resiliente)
  AND (hit_30d::numeric / 4.0) <= 1.0
  -- Sem hit nos últimos 3 dias (não está em sequência ruim agora)
  AND hit_3d = 0

ORDER BY hits_por_semana ASC, wr_g2 DESC;
-- 07_view_fv5_minuto_dominante.sql
-- FV5 — Minuto Dominante (Assimetria Direcional)
-- Horários onde CALL domina PUT de forma inequívoca.
-- Vantagem estrutural algorítmica.

CREATE OR REPLACE VIEW hft_lake.vw_fv5_minuto_dominante AS
WITH base AS (
  SELECT
    ativo,
    hh_mm,
    direcao,
    n_30d,
    ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4) AS wr_g2,
    hit_30d
  FROM hft_lake.hft_raw_metrics
  WHERE
    CASE
      WHEN ativo IN ('R_10','R_25') THEN n_30d >= 20
      ELSE n_30d >= 15
    END
    AND ((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) >= 0.88
),
comparado AS (
  SELECT
    a.ativo,
    a.hh_mm,
    a.direcao,
    a.n_30d,
    a.wr_g2,
    a.hit_30d,
    b.wr_g2 AS wr_g2_oposto,
    ROUND(a.wr_g2 - COALESCE(b.wr_g2, 0), 4) AS assimetria
  FROM base a
  LEFT JOIN base b
    ON a.ativo = b.ativo
    AND a.hh_mm = b.hh_mm
    AND a.direcao != b.direcao
)
SELECT
  ativo,
  hh_mm,
  direcao,
  n_30d    AS n_total,
  wr_g2,
  wr_g2_oposto,
  assimetria,
  hit_30d  AS n_hit,
  'FV5'    AS filtro
FROM comparado
WHERE
  -- Diferença de pelo menos 15pp entre CALL e PUT no mesmo horário
  assimetria >= 0.15

ORDER BY assimetria DESC, wr_g2 DESC;
-- 08_view_grade_unificada.sql
-- Grade Unificada — View Principal do Sistema
-- Consolida todos os filtros com hierarquia de confiança.
-- Horários que aparecem em mais filtros têm maior confiança.

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
    ativo,
    hh_mm,
    direcao,
    COUNT(*) AS n_filtros,
    STRING_AGG(filtro, ', ' ORDER BY filtro) AS filtros_aprovados
  FROM convergencia
  GROUP BY ativo, hh_mm, direcao
),
metricas AS (
  SELECT
    ativo,
    hh_mm,
    direcao,
    ROUND(((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)), 4)  AS wr_g2,
    ROUND((win_1a_30d::numeric / NULLIF(n_30d,0)), 4)                               AS wr_1a,
    ROUND(
      (((win_1a_30d + win_g1_30d + win_g2_30d)::numeric / NULLIF(n_30d,0)) * 0.85) -
      ((hit_30d::numeric / NULLIF(n_30d,0)) * 8.2)
    , 4)                                                                              AS ev_g2,
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

  -- Status baseado em convergência de filtros
  CASE
    WHEN c.n_filtros >= 4 THEN 'APROVADO'
    WHEN c.n_filtros >= 2 THEN 'CONDICIONAL'
    ELSE 'MONITORAMENTO'
  END AS status,

  -- Stake baseado em convergência
  CASE
    WHEN c.n_filtros >= 4 THEN 1.0
    WHEN c.n_filtros >= 2 THEN 0.5
    ELSE 0.0
  END AS stake_multiplier

FROM contagem c
JOIN metricas m ON c.ativo = m.ativo AND c.hh_mm = m.hh_mm AND c.direcao = m.direcao

ORDER BY c.n_filtros DESC, m.ev_g2 DESC;
