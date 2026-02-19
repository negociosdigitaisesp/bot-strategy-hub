-- Script SQL para criar a função RPC calcular_estatisticas_por_periodo
-- Execute este script no SQL Editor do Supabase

-- Primeiro, criar a view estatisticas_bots se não existir
CREATE OR REPLACE VIEW estatisticas_bots AS
SELECT 
    nome_bot,
    COUNT(*) as total_operacoes,
    SUM(CASE WHEN lucro > 0 THEN 1 ELSE 0 END) as vitorias,
    SUM(CASE WHEN lucro <= 0 THEN 1 ELSE 0 END) as derrotas,
    ROUND(
        (SUM(CASE WHEN lucro > 0 THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as assertividade_percentual,
    SUM(lucro) as lucro_total,
    MAX(lucro) as maior_lucro,
    MIN(lucro) as maior_perda,
    MAX(created_at) as ultima_operacao
FROM operacoes
GROUP BY nome_bot
ORDER BY assertividade_percentual DESC;

-- Criar a função RPC para calcular estatísticas por período
CREATE OR REPLACE FUNCTION calcular_estatisticas_por_periodo(periodo TEXT)
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
DECLARE
    data_limite TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Determinar a data limite baseada no período
    CASE periodo
        WHEN '1 hour' THEN
            data_limite := NOW() - INTERVAL '1 hour';
        WHEN '24 hours' THEN
            data_limite := NOW() - INTERVAL '24 hours';
        WHEN '7 days' THEN
            data_limite := NOW() - INTERVAL '7 days';
        WHEN '30 days' THEN
            data_limite := NOW() - INTERVAL '30 days';
        ELSE
            -- Default para 24 horas se período não reconhecido
            data_limite := NOW() - INTERVAL '24 hours';
    END CASE;

    -- Retornar as estatísticas calculadas para o período especificado
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
    WHERE o.created_at >= data_limite
    GROUP BY o.nome_bot
    HAVING COUNT(*) > 0  -- Só incluir bots que tiveram operações no período
    ORDER BY assertividade_percentual DESC;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION calcular_estatisticas_por_periodo(TEXT) IS 'Calcula estatísticas dos bots para um período específico (1 hour, 24 hours, 7 days, 30 days)';

-- Verificar se a função foi criada
SELECT 'Função calcular_estatisticas_por_periodo criada com sucesso!' as status;

-- Exemplo de uso:
-- SELECT * FROM calcular_estatisticas_por_periodo('1 hour');
-- SELECT * FROM calcular_estatisticas_por_periodo('24 hours');
-- SELECT * FROM calcular_estatisticas_por_periodo('7 days');