-- SECURITY HARDENING MIGRATION (CORRECTED)
-- Author: Antigravity Agent (SaaS Security Specialist)
-- Date: 2026-01-16
-- Description:
-- 1. Enables RLS on 'profiles' (User Private Data).
-- 2. Enables RLS on 'operacoes' (Global System Data - Public Read, Admin Write).
-- 3. Provides Secure RPC for leaderboards (Optional but good practice).

-- =============================================================================
-- 1. PROFILES SECURITY
-- =============================================================================
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
    FOR SELECT 
    USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
    FOR UPDATE 
    USING (auth.uid() = id);

-- Allow users to insert their own profile (on signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- =============================================================================
-- 2. OPERATIONS SECURITY (Global Bot Logs)
-- =============================================================================
ALTER TABLE IF EXISTS operacoes ENABLE ROW LEVEL SECURITY;

-- Allow everyone (Authenticated and Anon) to View Global Operations (since they are system bots)
-- If this was private data, we would need a user_id column.
DROP POLICY IF EXISTS "Public read access" ON operacoes;
CREATE POLICY "Public read access" ON operacoes 
    FOR SELECT 
    USING (true);

-- DENY ALL WRITES for regular users (Audit Trail Integrity)
-- No INSERT/UPDATE/DELETE policies created.
-- Only Service Role (Backend/Admin) can write.

-- =============================================================================
-- 3. SECURE LEADERBOARD FUNCTION
-- =============================================================================
-- Even though operacoes is public read, keeping this RPC is good for future-proofing
-- and abstraction.
CREATE OR REPLACE FUNCTION get_global_bot_stats()
RETURNS SETOF estatisticas_bots
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM estatisticas_bots ORDER BY lucro_total DESC;
$$;

GRANT EXECUTE ON FUNCTION get_global_bot_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_bot_stats() TO anon;
