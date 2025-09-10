-- Script para inserir dados de teste do Tunder Bot
-- Execute este script no Supabase SQL Editor

-- Inserir operações de teste para o Tunder Bot com campos result
INSERT INTO public.operacoes (bot_name, result, profit_percentage, created_at) VALUES
-- Últimas 20 operações do Tunder Bot
('Tunder Bot', 'WIN', 1.50, NOW() - INTERVAL '1 hour'),
('Tunder Bot', 'WIN', 2.25, NOW() - INTERVAL '2 hours'),
('Tunder Bot', 'LOSS', -0.75, NOW() - INTERVAL '3 hours'),
('Tunder Bot', 'WIN', 1.80, NOW() - INTERVAL '4 hours'),
('Tunder Bot', 'WIN', 3.20, NOW() - INTERVAL '5 hours'),
('Tunder Bot', 'LOSS', -1.00, NOW() - INTERVAL '6 hours'),
('Tunder Bot', 'WIN', 1.75, NOW() - INTERVAL '7 hours'),
('Tunder Bot', 'WIN', 0.95, NOW() - INTERVAL '8 hours'),
('Tunder Bot', 'WIN', 2.50, NOW() - INTERVAL '9 hours'),
('Tunder Bot', 'LOSS', -2.00, NOW() - INTERVAL '10 hours'),
('Tunder Bot', 'WIN', 3.75, NOW() - INTERVAL '11 hours'),
('Tunder Bot', 'WIN', 1.25, NOW() - INTERVAL '12 hours'),
('Tunder Bot', 'WIN', 0.80, NOW() - INTERVAL '13 hours'),
('Tunder Bot', 'WIN', 2.80, NOW() - INTERVAL '14 hours'),
('Tunder Bot', 'LOSS', -0.50, NOW() - INTERVAL '15 hours'),
('Tunder Bot', 'WIN', 1.90, NOW() - INTERVAL '16 hours'),
('Tunder Bot', 'WIN', 2.40, NOW() - INTERVAL '17 hours'),
('Tunder Bot', 'WIN', 1.10, NOW() - INTERVAL '18 hours'),
('Tunder Bot', 'LOSS', -1.20, NOW() - INTERVAL '19 hours'),
('Tunder Bot', 'WIN', 2.85, NOW() - INTERVAL '20 hours');

-- Verificar se os dados foram inseridos
SELECT 
    bot_name,
    COUNT(*) as total_operacoes,
    SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as vitorias,
    SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as derrotas,
    ROUND(
        (SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as precisao_percentual,
    MAX(created_at) as ultima_operacao
FROM public.operacoes 
WHERE bot_name = 'Tunder Bot'
GROUP BY bot_name;

-- Verificar últimas 5 operações
SELECT 
    bot_name,
    result,
    profit_percentage,
    created_at
FROM public.operacoes 
WHERE bot_name = 'Tunder Bot'
ORDER BY created_at DESC
LIMIT 5;