-- Script SQL para criar a função RPC calcular_estatisticas_desde_timestamp
-- Execute este script no SQL Editor do Supabase

-- Criar a função RPC para calcular estatísticas desde um timestamp específico
CREATE OR REPLACE FUNCTION calcular_estatisticas_desde_timestamp(timestamp_inicio TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
    nome_bot TEXT,
    total_operacoes BIGINT,
    vitorias BIGINT,
    derrotas BIGINT,
    assertividade_percentual NUMERIC,
    lucro_total NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Retornar as estatísticas calculadas desde o timestamp especificado
    RETURN QUERY
    SELECT 
        o.nome_bot::TEXT,
        COUNT(*)::BIGINT as total_operacoes,
        SUM(CASE WHEN o.lucro > 0 THEN 1 ELSE 0 END)::BIGINT as vitorias,
        SUM(CASE WHEN o.lucro <= 0 THEN 1 ELSE 0 END)::BIGINT as derrotas,
        ROUND(
            (SUM(CASE WHEN o.lucro > 0 THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
            2
        )::NUMERIC as assertividade_percentual,
        SUM(o.lucro)::NUMERIC as lucro_total
    FROM operacoes o
    WHERE o.created_at >= timestamp_inicio
    GROUP BY o.nome_bot
    HAVING COUNT(*) > 0  -- Só incluir bots que tiveram operações no período
    ORDER BY assertividade_percentual DESC;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION calcular_estatisticas_desde_timestamp(TIMESTAMP WITH TIME ZONE) IS 'Calcula estatísticas dos bots desde um timestamp específico fornecido pelo cliente';

-- Verificar se a função foi criada
SELECT 'Função calcular_estatisticas_desde_timestamp criada com sucesso!' as status;

-- Exemplo de uso:
-- SELECT * FROM calcular_estatisticas_desde_timestamp('2024-01-20 10:00:00+00');
-- SELECT * FROM calcular_estatisticas_desde_timestamp(NOW() - INTERVAL '5 minutes');