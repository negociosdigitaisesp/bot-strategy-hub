-- Função melhorada para buscar estatísticas em tempo real dos bots
-- Esta função é compatível com a estrutura existente e funciona com dados dos últimos minutos

CREATE OR REPLACE FUNCTION get_realtime_stats(periodo_em_minutos INT DEFAULT 5)
RETURNS TABLE (
    nome_bot TEXT,
    lucro_recente NUMERIC,
    operacoes_recentes BIGINT,
    vitorias_recentes BIGINT,
    assertividade_recente NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.nome_bot::TEXT,
        COALESCE(SUM(o.lucro), 0)::NUMERIC AS lucro_recente,
        COUNT(*)::BIGINT AS operacoes_recentes,
        COUNT(*) FILTER (WHERE o.lucro > 0)::BIGINT AS vitorias_recentes,
        -- Cálculo de assertividade, evitando divisão por zero
        CASE
            WHEN COUNT(*) > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE o.lucro > 0) * 100.0) / COUNT(*), 2)
            ELSE
                0
        END::NUMERIC AS assertividade_recente
    FROM
        public.operacoes o
    WHERE
        -- Filtra as operações para incluir apenas aquelas dentro do período solicitado
        o.timestamp >= NOW() - (periodo_em_minutos || ' minutes')::INTERVAL
        AND o.timestamp <= NOW()
    GROUP BY
        o.nome_bot
    HAVING
        COUNT(*) > 0  -- Só incluir bots que tiveram operações no período
    ORDER BY
        assertividade_recente DESC, lucro_recente DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentário explicativo
COMMENT ON FUNCTION get_realtime_stats(INT) IS 'Retorna estatísticas em tempo real dos bots para um período específico em minutos (padrão: 5 minutos)';

-- Criar função alternativa que usa a mesma estrutura da função principal
CREATE OR REPLACE FUNCTION calcular_estatisticas_tempo_real(periodo_em_minutos INT DEFAULT 5)
RETURNS TABLE (
    nome_bot TEXT,
    total_operacoes BIGINT,
    vitorias BIGINT,
    derrotas BIGINT,
    assertividade_percentual NUMERIC,
    lucro_total NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.nome_bot::TEXT,
        COUNT(*)::BIGINT AS total_operacoes,
        COUNT(*) FILTER (WHERE o.lucro > 0)::BIGINT AS vitorias,
        COUNT(*) FILTER (WHERE o.lucro <= 0)::BIGINT AS derrotas,
        CASE
            WHEN COUNT(*) > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE o.lucro > 0) * 100.0) / COUNT(*), 2)
            ELSE
                0
        END::NUMERIC AS assertividade_percentual,
        COALESCE(SUM(o.lucro), 0)::NUMERIC AS lucro_total
    FROM
        public.operacoes o
    WHERE
        o.timestamp >= NOW() - (periodo_em_minutos || ' minutes')::INTERVAL
        AND o.timestamp <= NOW()
    GROUP BY
        o.nome_bot
    HAVING
        COUNT(*) > 0
    ORDER BY
        assertividade_percentual DESC, lucro_total DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentário para a função alternativa
COMMENT ON FUNCTION calcular_estatisticas_tempo_real(INT) IS 'Retorna estatísticas em tempo real com a mesma estrutura da função principal';

-- Teste das funções (descomente para testar)
-- SELECT * FROM get_realtime_stats(5);
-- SELECT * FROM calcular_estatisticas_tempo_real(5);