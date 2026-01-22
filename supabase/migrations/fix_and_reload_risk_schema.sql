-- Comprehensive Fix for Risk Management Schema & Cache
-- Execute this entire script in Supabase SQL Editor to fix the "Could not find column" error.

-- 1. Ensure 'risk_enabled' column exists (The source of the specific error)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS risk_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.risk_enabled IS 'Activa/desactiva el sistema de gestión de riesgo inteligente';

-- 2. Ensure other required risk settings columns exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS risk_mode text DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS global_stop_loss numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS global_take_profit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS soros_levels integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_stake numeric DEFAULT 0;

-- 3. CRITICAL: Force Supabase to reload the schema cache
-- This fixes the "Could not find the 'risk_enabled' column ... in the schema cache" error.
NOTIFY pgrst, 'reload config';
