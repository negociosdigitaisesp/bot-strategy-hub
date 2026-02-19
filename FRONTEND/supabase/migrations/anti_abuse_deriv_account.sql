-- =============================================================================
-- ANTI-ABUSE: Sistema de Proteção contra Multi-Contas
-- =============================================================================
-- Este script adiciona a infraestrutura necessária para impedir que usuários
-- criem múltiplas contas usando a mesma conta Deriv.
-- =============================================================================

-- 1. Adicionar coluna deriv_account_id na tabela profiles
-- Esta coluna armazena o ID da conta Deriv (ex: CR123456, VRTC789)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deriv_account_id TEXT;

-- 2. Adicionar constraint UNIQUE (apenas se não existir)
-- Isso garante que o mesmo ID Deriv nunca seja associado a dois perfis
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_deriv_account_id_key'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_deriv_account_id_key UNIQUE (deriv_account_id);
    END IF;
END $$;

-- 3. Criar índice para buscas rápidas por deriv_account_id
CREATE INDEX IF NOT EXISTS idx_profiles_deriv_account_id 
ON profiles(deriv_account_id) 
WHERE deriv_account_id IS NOT NULL;

-- 4. Função RPC para registrar/validar conta Deriv de forma segura
-- Retorna JSON com resultado da operação
CREATE OR REPLACE FUNCTION register_deriv_account(
    p_user_id UUID,
    p_deriv_account_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_user UUID;
    v_current_account TEXT;
BEGIN
    -- Validar parâmetros
    IF p_user_id IS NULL OR p_deriv_account_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_PARAMETERS',
            'message', 'ID de usuario o cuenta Deriv no proporcionados'
        );
    END IF;

    -- Verificar se o usuário atual já tem esta conta registrada (reconexão válida)
    SELECT deriv_account_id INTO v_current_account
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_current_account = p_deriv_account_id THEN
        -- Usuário reconectando sua própria conta - permitir
        RETURN json_build_object('success', true, 'reconnection', true);
    END IF;

    -- Verificar se a conta Deriv já está registrada em OUTRO usuário
    SELECT id INTO v_existing_user
    FROM profiles
    WHERE deriv_account_id = p_deriv_account_id
    AND id != p_user_id;
    
    IF v_existing_user IS NOT NULL THEN
        -- BLOQUEIO: Conta já usada por outro usuário
        RETURN json_build_object(
            'success', false,
            'error', 'DERIV_ACCOUNT_ALREADY_USED',
            'message', 'Esta cuenta Deriv ya está asociada a otro usuario en nuestro sistema'
        );
    END IF;
    
    -- Registrar a conta Deriv no perfil do usuário
    UPDATE profiles
    SET deriv_account_id = p_deriv_account_id,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Verificar se a atualização foi bem-sucedida
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND',
            'message', 'Perfil de usuario no encontrado'
        );
    END IF;
    
    RETURN json_build_object('success', true, 'registered', true);
END;
$$;

-- 5. Conceder permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION register_deriv_account(UUID, TEXT) TO authenticated;

-- 6. Comentários para documentação
COMMENT ON COLUMN profiles.deriv_account_id IS 'ID da conta Deriv associada (ex: CR123456, VRTC789). UNIQUE constraint impede multi-contas.';
COMMENT ON FUNCTION register_deriv_account IS 'Registra uma conta Deriv no perfil do usuário. Retorna erro se a conta já estiver em uso por outro usuário.';

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================
-- Para verificar se a migration foi aplicada corretamente, execute:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'deriv_account_id';
