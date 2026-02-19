-- SQL Validation Queries for Supabase Data Integrity
-- Execute estas queries no Supabase SQL Editor ou via CLI

-- ============================================
-- 1. STRATEGY_SCORES VALIDATION
-- ============================================

-- Verificar existência de estratégias
SELECT 
    COUNT(*) as total_strategies,
    COUNT(DISTINCT strategy_name) as unique_strategies
FROM strategy_scores;
-- Esperado: ≥10 estratégias

-- Verificar freshness (últimas atualizações)
SELECT 
    strategy_name,
    last_updated,
    EXTRACT(EPOCH FROM (NOW() - last_updated))/60 as minutes_ago
FROM strategy_scores
WHERE last_updated < NOW() - INTERVAL '10 minutes'
ORDER BY last_updated ASC;
-- Esperado: 0 linhas (todas atualizadas nos últimos 10 min)

-- Verificar estratégias com dados inconsistentes
SELECT 
    strategy_name,
    expected_wr,
    total_trades,
    score
FROM strategy_scores
WHERE total_trades > 0 
  AND (expected_wr < 0 OR expected_wr > 100)
ORDER BY strategy_name;
-- Esperado: 0 linhas (WR deve estar entre 0-100)

-- ============================================
-- 2. STRATEGY_PERFORMANCE VALIDATION
-- ============================================

-- Verificar consistência: total_trades = wins + losses
SELECT 
    strategy_name,
    total_trades,
    wins,
    losses,
    wins + losses as calculated_total,
    total_trades - (wins + losses) as difference
FROM strategy_performance
WHERE total_trades != wins + losses;
-- Esperado: 0 linhas (todos devem bater)

-- Verificar win rate calculado
SELECT 
    strategy_name,
    wins,
    total_trades,
    ROUND((wins::numeric / NULLIF(total_trades, 0) * 100), 2) as calculated_wr,
    win_rate as stored_wr,
    ABS(ROUND((wins::numeric / NULLIF(total_trades, 0) * 100), 2) - win_rate) as difference
FROM strategy_performance
WHERE total_trades >= 10
  AND ABS(ROUND((wins::numeric / NULLIF(total_trades, 0) * 100), 2) - win_rate) > 2;
-- Esperado: 0 linhas (diferença deve ser <2%)

-- ============================================
-- 3. ACTIVE_SIGNALS VALIDATION
-- ============================================

-- Verificar sinais antigos (devem ser limpos)
SELECT 
    id,
    strategy,
    asset,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_old
FROM active_signals
WHERE created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at ASC;
-- Esperado: 0 linhas (sinais >5min devem ser deletados)

-- Verificar sinais duplicados (mesmo strategy + asset + direction)
SELECT 
    strategy,
    asset,
    direction,
    COUNT(*) as duplicate_count
FROM active_signals
GROUP BY strategy, asset, direction
HAVING COUNT(*) > 1;
-- Esperado: 0 linhas (não deve haver duplicatas)

-- ============================================
-- 4. BOT_ACTIVITY_LOGS VALIDATION
-- ============================================

-- Verificar atividade recente (última 1 hora)
SELECT 
    COUNT(*) as recent_logs,
    COUNT(DISTINCT strategy_name) as active_strategies,
    SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losses
FROM bot_activity_logs
WHERE created_at > NOW() - INTERVAL '1 hour';
-- Esperado: >0 logs (se bot está rodando)

-- Verificar logs com dados incompletos
SELECT 
    id,
    strategy_name,
    result,
    profit,
    created_at
FROM bot_activity_logs
WHERE strategy_name IS NULL 
   OR result IS NULL
   OR result NOT IN ('WIN', 'LOSS')
ORDER BY created_at DESC
LIMIT 10;
-- Esperado: 0 linhas (todos os logs devem estar completos)

-- ============================================
-- 5. SCORING LOGIC VALIDATION
-- ============================================

-- Verificar estratégias com WR >60% mas score baixo
SELECT 
    s.strategy_name,
    s.expected_wr,
    s.score,
    s.total_trades,
    s.frequency_1h
FROM strategy_scores s
WHERE s.total_trades >= 10
  AND s.expected_wr > 60
  AND s.score < 50
ORDER BY s.expected_wr DESC;
-- Esperado: 0 linhas (WR alto deve ter score alto)

-- Verificar estratégias com frequency_1h = 0 e score = 0
-- (Bug: frequency_1h = 0 não deveria zerar o score)
SELECT 
    strategy_name,
    frequency_1h,
    score,
    expected_wr,
    total_trades
FROM strategy_scores
WHERE frequency_1h = 0 
  AND score = 0
  AND total_trades >= 10;
-- Esperado: 0 linhas (score deve ser neutro ~45-50, não zero)

-- Verificar distribuição de scores
SELECT 
    CASE 
        WHEN score >= 80 THEN '80-100 (Excelente)'
        WHEN score >= 60 THEN '60-79 (Bom)'
        WHEN score >= 40 THEN '40-59 (Médio)'
        WHEN score >= 20 THEN '20-39 (Baixo)'
        ELSE '0-19 (Muito Baixo)'
    END as score_range,
    COUNT(*) as count,
    ROUND(AVG(expected_wr), 2) as avg_wr,
    ROUND(AVG(total_trades), 2) as avg_trades
FROM strategy_scores
WHERE total_trades >= 10
GROUP BY score_range
ORDER BY score_range DESC;
-- Informativo: Mostra distribuição de scores

-- ============================================
-- 6. CROSS-TABLE CONSISTENCY
-- ============================================

-- Verificar estratégias em strategy_scores mas não em strategy_performance
SELECT s.strategy_name
FROM strategy_scores s
LEFT JOIN strategy_performance p ON s.strategy_name = p.strategy_name
WHERE p.strategy_name IS NULL
  AND s.total_trades > 0;
-- Esperado: 0 linhas (todas devem estar em ambas tabelas)

-- Verificar estratégias em strategy_performance mas não em strategy_scores
SELECT p.strategy_name
FROM strategy_performance p
LEFT JOIN strategy_scores s ON p.strategy_name = s.strategy_name
WHERE s.strategy_name IS NULL
  AND p.total_trades > 0;
-- Esperado: 0 linhas (todas devem estar em ambas tabelas)

-- ============================================
-- 7. PERFORMANCE METRICS
-- ============================================

-- Top 5 estratégias por score
SELECT 
    strategy_name,
    score,
    expected_wr,
    total_trades,
    frequency_1h,
    last_updated
FROM strategy_scores
WHERE total_trades >= 10
ORDER BY score DESC
LIMIT 5;

-- Bottom 5 estratégias por score
SELECT 
    strategy_name,
    score,
    expected_wr,
    total_trades,
    frequency_1h,
    last_updated
FROM strategy_scores
WHERE total_trades >= 10
ORDER BY score ASC
LIMIT 5;

-- Estatísticas gerais
SELECT 
    COUNT(*) as total_strategies,
    ROUND(AVG(score), 2) as avg_score,
    ROUND(AVG(expected_wr), 2) as avg_wr,
    ROUND(AVG(total_trades), 2) as avg_trades,
    MAX(score) as max_score,
    MIN(score) as min_score
FROM strategy_scores
WHERE total_trades >= 10;
