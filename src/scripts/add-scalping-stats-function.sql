-- Função RPC para buscar estatísticas exactas do scalping_accumulator_bot_logs
-- Execute este script no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION get_scalping_stats_exact()
RETURNS TABLE (
  wins_20 bigint,
  losses_20 bigint,
  losses_10 bigint,
  wins_10 bigint,
  wins_5 bigint,
  losses_5 bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(CASE WHEN rn <= 20 AND operation_result = 'WIN' THEN 1 END) as wins_20,
    COUNT(CASE WHEN rn <= 20 AND operation_result = 'LOSS' THEN 1 END) as losses_20,
    COUNT(CASE WHEN rn <= 10 AND operation_result = 'LOSS' THEN 1 END) as losses_10,
    COUNT(CASE WHEN rn <= 10 AND operation_result = 'WIN' THEN 1 END) as wins_10,
    COUNT(CASE WHEN rn <= 5 AND operation_result = 'WIN' THEN 1 END) as wins_5,
    COUNT(CASE WHEN rn <= 5 AND operation_result = 'LOSS' THEN 1 END) as losses_5
  FROM (
    SELECT operation_result, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
    FROM scalping_accumulator_bot_logs
    WHERE operation_result IN ('WIN', 'LOSS')
  ) ranked
  WHERE rn <= 20;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION get_scalping_stats_exact() IS 'Função RPC que retorna estatísticas exactas das últimas 20 operações do scalping_accumulator_bot_logs, incluindo contadores para wins/losses nas últimas 20, 10 e 5 operações';

-- Exemplo de uso:
-- SELECT * FROM get_scalping_stats_exact();