-- Adicionar colunas trial_end e trial_status à tabela profiles
-- Execute este SQL no Dashboard do Supabase -> SQL Editor

-- Adicionar coluna trial_end (data de término do trial)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_end DATE;

-- Adicionar coluna trial_status (status do trial: 'active', 'expired', 'converted')
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT 'active';

-- Atualizar trial_end para usuários existentes que ainda não têm (15 dias a partir de created_at)
UPDATE profiles
SET trial_end = (created_at::date + INTERVAL '15 days')::date
WHERE trial_end IS NULL AND plan_type = 'trial';

-- Verificar as alterações
SELECT id, email, plan_type, trial_end, trial_status, created_at
FROM profiles
LIMIT 10;
