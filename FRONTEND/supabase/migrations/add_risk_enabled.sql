-- Migración: Añadir columna risk_enabled a profiles
-- Ejecutar en Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS risk_enabled BOOLEAN DEFAULT false;

-- Comentario descriptivo
COMMENT ON COLUMN profiles.risk_enabled IS 'Activa/desactiva el sistema de gestión de riesgo inteligente';
