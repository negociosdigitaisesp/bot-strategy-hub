-- Script para inserir dados de teste na tabela operacoes
-- Execute este script no Supabase SQL Editor para testar o filtro "AHORA"

-- Inserir operações de teste dos últimos minutos para diferentes bots
INSERT INTO public.operacoes (nome_bot, lucro, timestamp, created_at) VALUES
-- Bot A.I - operações recentes
('Bot A.I', 1.50, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '2 minutes'),
('Bot A.I', -0.75, NOW() - INTERVAL '4 minutes', NOW() - INTERVAL '4 minutes'),
('Bot A.I', 2.25, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 minute'),
('Bot A.I', 1.80, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes'),

-- Factor50X - operações recentes
('Factor50X', 3.20, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 minute'),
('Factor50X', 2.10, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes'),
('Factor50X', -1.00, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),

-- Wolf Bot - operações recentes
('Wolf Bot', 1.75, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '2 minutes'),
('Wolf Bot', 0.95, NOW() - INTERVAL '4 minutes', NOW() - INTERVAL '4 minutes'),
('Wolf Bot', 2.50, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 minute'),

-- Apalancamiento 100X - operações recentes
('Apalancamiento 100X', 5.00, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes'),
('Apalancamiento 100X', -2.00, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),
('Apalancamiento 100X', 3.75, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 minute'),

-- OptinTrade - operações recentes
('OptinTrade', 1.25, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '2 minutes'),
('OptinTrade', 0.80, NOW() - INTERVAL '4 minutes', NOW() - INTERVAL '4 minutes'),

-- Hunter Pro - operações recentes
('Hunter Pro', 2.80, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 minute'),
('Hunter Pro', 1.60, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes'),
('Hunter Pro', -0.50, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),

-- Quantum Bot - operações recentes
('Quantum Bot', 1.90, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '2 minutes'),
('Quantum Bot', 2.40, NOW() - INTERVAL '4 minutes', NOW() - INTERVAL '4 minutes'),

-- XBot - operações recentes
('XBot', 1.10, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 minute'),
('XBot', 0.65, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes'),
('XBot', 1.85, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),

-- AlphaBot - operações recentes
('AlphaBot', 2.70, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '2 minutes'),
('AlphaBot', 1.45, NOW() - INTERVAL '4 minutes', NOW() - INTERVAL '4 minutes'),

-- Sniper Bot - operações recentes
('Sniper Bot', 3.10, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 minute'),
('Sniper Bot', -1.20, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes'),
('Sniper Bot', 2.85, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes');

-- Verificar se os dados foram inseridos
SELECT 
    nome_bot,
    COUNT(*) as total_operacoes,
    SUM(CASE WHEN lucro > 0 THEN 1 ELSE 0 END) as vitorias,
    SUM(lucro) as lucro_total,
    ROUND(
        (SUM(CASE WHEN lucro > 0 THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as assertividade_percentual,
    MAX(timestamp) as ultima_operacao
FROM public.operacoes 
WHERE timestamp >= NOW() - INTERVAL '10 minutes'
GROUP BY nome_bot
ORDER BY assertividade_percentual DESC;

-- Verificar dados dos últimos 5 minutos (para o filtro AHORA)
SELECT 
    nome_bot,
    COUNT(*) as operacoes_5min,
    SUM(CASE WHEN lucro > 0 THEN 1 ELSE 0 END) as vitorias_5min,
    SUM(lucro) as lucro_5min,
    ROUND(
        (SUM(CASE WHEN lucro > 0 THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as assertividade_5min
FROM public.operacoes 
WHERE timestamp >= NOW() - INTERVAL '5 minutes'
GROUP BY nome_bot
ORDER BY assertividade_5min DESC;