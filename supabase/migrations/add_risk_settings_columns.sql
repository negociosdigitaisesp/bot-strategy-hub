-- Migration: Add missing risk settings columns to profiles
-- Execute in Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS risk_mode text DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS global_stop_loss numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS global_take_profit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS soros_levels integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_stake numeric DEFAULT 0;

-- Descriptive comments
COMMENT ON COLUMN profiles.risk_mode IS 'Risk mode: fixed or soros';
COMMENT ON COLUMN profiles.global_stop_loss IS 'Global Stop Loss value';
COMMENT ON COLUMN profiles.global_take_profit IS 'Global Take Profit value';
COMMENT ON COLUMN profiles.soros_levels IS 'Number of Soros levels';
COMMENT ON COLUMN profiles.base_stake IS 'Base stake amount';
